/*
 * Frontend package handling.
 *
 * Copyright (c) 2012-2017 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
require('bedrock-express');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

// load config defaults
require('./config');

// module API
const api = {};
module.exports = api;

const logger = bedrock.loggers.get('app');

let _packageCache;
let _rootModule;

/**
 * Reads the package for the given root module and all of its browser
 * dependencies. If no root module is given, then `require.main.filename` is
 * used.
 *
 * @param [rootModule] the root module to read packages for.
 *
 * @return a object hash of module name => package info object.
 */
api.readPackagesSync = rootModule => {
  if(!rootModule) {
    // note: bedrock runs in a worker, so first child is actual main
    // TODO: potentially handle this with a new `bedrock.main` public API
    rootModule = require.main.children[0].filename;
  }

  // ensure root module path is resolved
  rootModule = _findPackageRoot(rootModule, require.resolve(rootModule));

  // return cached packages
  if(_packageCache && _rootModule === rootModule) {
    return bedrock.util.clone(_packageCache);
  }

  logger.debug(
    '[bedrock-views] reading browser packages for "' +
    rootModule + '"...');

  // initialize cache
  _packageCache = {};
  _rootModule = rootModule;

  // read manually configured packages (delay reading dependencies to
  // ensure that all manually configured packages are read first to avoid
  // attempting to read any manually configured dependencies from disk)
  const pseudoPkgs = bedrock.config.views.system.packages;
  for(const pseudoPkg of pseudoPkgs) {
    const pkg = _readPackageSync(rootModule, _packageCache, pseudoPkg);
    _packageCache[pkg.manifest.name] = pkg;
  }

  // read dependencies for manually configured packages
  for(const name in _packageCache) {
    _readDependenciesSync(_packageCache[name]);
  }

  // read root package
  const rootPackage = _readPackageSync(rootModule);

  // only add package to the cache and read its dependencies if not already
  // present (it was provided manually as a pseudo package)
  if(!(rootPackage.manifest.name in _packageCache)) {
    _packageCache[rootPackage.manifest.name] = rootPackage;
    _readDependenciesSync(rootPackage);
  }

  // sort packages according to dependencies
  _packageCache = _sortPackages(_packageCache);

  logger.debug('[bedrock-views] read packages:\n' +
    Object.keys(_packageCache)
      .map(name => _packageCache[name])
      .map(pkg => {
        let str = pkg.manifest.name;
        if(pkg.bedrock) {
          str += ' (bedrock.json found)';
        }
        return str;
      }).join('\n') + '\n');

  return _packageCache;
};

bedrock.events.on('bedrock-express.configure.static', callback => {
  try {
    // load any bedrock configs and serve custom-configured packages
    const pkgs = api.readPackagesSync();
    for(const name in pkgs) {
      const pkg = pkgs[name];
      pkg.requireBedrockConfig();

      // serve package
      bedrock.config.express.static.push({
        route: bedrock.config.views.system.config.baseURL + '/' +
          pkg.manifest.name,
        path: pkg.path
      });

      // if package manifest is not in the package path, serve it
      if(pkg.manifestPath.indexOf(pkg.path) !== 0) {
        bedrock.config.express.static.push({
          route: bedrock.config.views.system.config.baseURL + '/' +
            pkg.manifest.name + '/package.json',
          path: pkg.manifestPath,
          file: true
        });
      }
    }

    // rebuild `importAll.js` module
    _buildImportAllModule();
  } catch(e) {
    logger.error('[bedrock-views] failed to read packages and ' +
      'create "importAll" module.', e);
    return callback(e);
  }
});

/**
 * Builds a module that, if imported by a browser, will import all browser
 * dependencies for the root module.
 */
function _buildImportAllModule() {
  const imports = [];
  const cfg = bedrock.util.clone(bedrock.config.views.system.config);

  const pkgs = api.readPackagesSync();

  for(const name in pkgs) {
    const pkg = pkgs[name];
    const main = (cfg.packages[name] && cfg.packages[name].main) ?
      [cfg.packages[name].main] : pkg.findMainFiles('.js');
    if(main.length > 0) {
      // do not import if blacklisted
      if(bedrock.config.views.system.importAllIgnore.indexOf(name) === -1) {
        imports.push(pkg.manifest.name + '/' + main[0]);
      }
      // do not modify package config if already present
      if(name in cfg.packages) {
        continue;
      }
      cfg.packages[pkg.manifest.name] = {
        main: main[0],
        defaultExtension: 'js'
      };
    }
  }

  // ensure system paths are created
  mkdirp.sync(path.dirname(bedrock.config.views.system.paths.config));
  mkdirp.sync(path.dirname(bedrock.config.views.system.paths.importAll));

  // write config.js
  let data = 'SystemJS.config(' + JSON.stringify(cfg, null, 2) + ');\n';
  fs.writeFileSync(
    bedrock.config.views.system.paths.config, data,
    {encoding: 'utf8'});

  // write importAll.js
  data = '';
  if(imports.length > 0) {
    imports.forEach(lib => {
      data += 'import \'' + lib + '\';\n';
    });
  }
  fs.writeFileSync(
    bedrock.config.views.system.paths.importAll, data, {encoding: 'utf8'});
}

function _readJsonFile(filename) {
  return JSON.parse(fs.readFileSync(filename, {encoding: 'utf8'}));
}

function _readPackageSync(moduleName, cache, pseudoPkg) {
  let pkg = {};

  if(!cache) {
    cache = _packageCache;
  }

  try {
    if(!pseudoPkg) {
      pkg.manifestPath = require.resolve(moduleName + '/package.json');
      pkg.path = path.dirname(pkg.manifestPath);
    } else {
      const isDir = _isDir(pseudoPkg.path);
      pkg.path = isDir ? pseudoPkg.path : path.dirname(pseudoPkg.path);
      pkg.manifestPath = pseudoPkg.manifest;
    }
    pkg.manifest = _readJsonFile(pkg.manifestPath);
  } catch(e) {
    logger.error('[bedrock-views] could not read package for ' +
      moduleName, e);
    throw e;
  }

  // find main files by filename or extension
  pkg.findMainFiles = function(options) {
    if(typeof options === 'string') {
      options = {extension: options};
    }
    const rval = [];

    // find files in property that matches extension or in `main`
    const extension = options.extension || '.js';
    let key = extension.substr(1);
    if(key === 'css' && !(key in pkg.manifest)) {
      key = 'style';
    }
    let files = pkg.manifest[key] || pkg.manifest.main || [];
    if(!Array.isArray(files)) {
      files = [files];
    }

    // check to make sure each file matches name/extension
    for(let file of files) {
      if(options.extension === '.js') {
        const fullname = (file[0] === '/') ? file : path.join(pkg.path, file);
        const isDir = _isDir(fullname);
        if(isDir) {
          // append `index.js` to directories
          file = path.join(file, 'index.js');
        } else if(!path.extname(file)) {
          // append '.js' to files
          file += '.js';
        }
      }
      if((options.filename && path.basename(file) === options.filename) ||
        options.extension && path.extname(file) === options.extension) {
        rval.push(file);
      }
    }

    if(rval.length === 0 && options.extension === '.js') {
      // try default names
      if(fs.existsSync(path.join(pkg.path, 'index.js'))) {
        rval.push('index.js');
      } else if(fs.existsSync(path.join(pkg.path, pkg.manifest.name + '.js'))) {
        rval.push(pkg.manifest.name + '.js');
      }
    }

    return rval;
  };

  // TODO: remove `bedrock config`, if possible... potentially use `config`
  // which is official in `package.json` ... or nothing at all

  // require the bedrock config from the package, if possible
  pkg.requireBedrockConfig = function() {
    if(!pkg.bedrock || !pkg.bedrock.config) {
      return false;
    }
    // FIXME: document the purpose and usage of these dependencies
    // ensure dependencies are met before loading config
    const deps = pkg.bedrock.dependencies || {};
    for(const dep in deps) {
      // TODO: check version as well
      if(!(dep in cache)) {
        logger.warning('[bedrock-views] bedrock.json dependency not found: "' +
          dep + '" for package: "' + pkg.manifest.name + '"');
        return false;
      }
    }
    [].concat(pkg.bedrock.config).forEach(function(file) {
      require(path.resolve(pkg.path, file))(bedrock);
    });
    return true;
  };

  // load bedrock.json
  const filename = path.resolve(pkg.path, 'bedrock.json');
  if(!fs.existsSync(filename)) {
    return pkg;
  }
  try {
    pkg.bedrock = _readJsonFile(filename);
  } catch(e) {
    logger.warning('[bedrock-views] could not read "bedrock.json" from ' +
      'package "' + pkg.manifest.name + '"', e);
    return pkg;
  }

  logger.verbose('[bedrock-views] read package for ' + moduleName + ':\n' +
    JSON.stringify(pkg, null, 2));

  return pkg;
}

function _readDependenciesSync(pkg, cache) {
  if(!cache) {
    cache = _packageCache;
  }

  const deps = _getBrowserDependencies(pkg);
  for(const dep of deps) {
    if(dep in cache) {
      continue;
    }
    const depPkg = cache[dep] = _readPackageSync(dep, cache);
    _readDependenciesSync(depPkg, cache);
  }
}

function _findPackageRoot(moduleName, modulePath) {
  const isDir = fs.lstatSync(modulePath).isDirectory();
  if(!isDir) {
    modulePath = path.dirname(modulePath);
  }

  const packagePath = path.join(modulePath, 'package.json');

  if(fs.existsSync(packagePath)) {
    return modulePath;
  }

  if(modulePath === '/' ||
    modulePath.endsWith(moduleName) ||
    modulePath.endsWith('node_modules')) {
    throw new Error('Could not find "package.json" for "' + moduleName + '".');
  }

  return _findPackageRoot(moduleName, path.dirname(modulePath));
}

function _sortPackages(cache) {
  // sort packages, least dependent => most dependent (low-level to high-level)
  const unsorted = Object.keys(cache).map(name => cache[name]);
  const sorted = [];

  while(unsorted.length > 0) {
    const pkg = unsorted.shift(1);
    const deps = Object.keys(pkg.manifest.dependencies || {});

    // add pkg to sorted list after all its dependencies are added
    let add = true;
    for(const dep of deps) {
      // skip missing dependencies
      if(!(dep in cache)) {
        continue;
      }
      if(sorted.indexOf(cache[dep]) === -1) {
        add = false;
        break;
      }
    }

    if(add) {
      sorted.push(pkg);
    } else {
      unsorted.push(pkg);
    }
  }

  // rebuild key'd cache in order
  cache = {};
  for(const pkg of sorted) {
    cache[pkg.manifest.name] = pkg;
  }
  return cache;
}

function _getBrowserDependencies(pkg) {
  // `bedrock.browserDependencies` must be defined to automatically pull in
  // browser dependencies
  if(!(pkg.manifest.bedrock && pkg.manifest.bedrock.browserDependencies)) {
    return [];
  }

  let deps = pkg.manifest.bedrock.browserDependencies;
  if(deps === 'all') {
    // special value of `all` means use `pkg.manifest.dependencies`
    deps = Object.keys(pkg.manifest.dependencies || {});
  }
  return deps;
}

function _isDir(filename) {
  let stat;
  try {
    stat = fs.lstatSync(filename);
  } catch(e) {}
  return stat ? stat.isDirectory() : false;
}
