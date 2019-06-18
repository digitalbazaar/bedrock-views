/*
 * Frontend package handling.
 *
 * Copyright (c) 2012-2018 Digital Bazaar, Inc. All rights reserved.
 */
const _ = require('lodash');
const bedrock = require('bedrock');
require('bedrock-express');
const fs = require('fs');
const logger = require('./logger');
const makeDir = require('make-dir');
const path = require('path');

// load config defaults
require('./config');

// module API
const api = {};
module.exports = api;

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

  logger.debug('Reading browser packages for "' + rootModule + '"...');

  // initialize cache
  _packageCache = {};
  _rootModule = rootModule;

  // read manually configured packages (delay reading dependencies to
  // ensure that all manually configured packages are read first to avoid
  // attempting to read any manually configured dependencies from disk)
  const pseudoPkgs = bedrock.config.views.bundle.packages;
  for(const pseudoPkg of pseudoPkgs) {
    const pkg = _readPackageSync(rootModule, _packageCache, pseudoPkg);
    logger.verbose(`Processing pseudo package "${pkg.manifest.name}"`, pkg);
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

  // manifest override must happen here to be applied to `compile-less`
  // apply manifest overrides
  Object.keys(_packageCache).forEach(
    name => _.merge(_packageCache, _getManifestOverride(_packageCache, name)));

  // sort packages according to dependencies, now with overrides
  _packageCache = _sortPackages(_packageCache);

  logger.debug('Read packages:\n' +
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

/**
 * Reads the package for the given root module. If no root module is given,
 * then `require.main.filename` is used.
 *
 * @param [rootModule] the root module to read.
 *
 * @return object with root package name and path properties.
 */
api.readRootPackageSync = rootModule => {
  if(!rootModule) {
    // note: bedrock runs in a worker, so first child is actual main
    // TODO: potentially handle this with a new `bedrock.main` public API
    rootModule = require.main.children[0].filename;
  }

  // ensure root module path is resolved
  const rootPath = _findPackageRoot(rootModule, require.resolve(rootModule));
  const rootName = path.basename(rootPath);

  return {
    path: rootPath,
    name: rootName
  };
};

bedrock.events.on(
  'bedrock-express.configure.static',
  () => api.buildRootModule());

async function _buildRootModuleOnce() {
  try {
    // load any bedrock configs and serve custom-configured packages
    const pkgs = api.readPackagesSync();
    for(const name in pkgs) {
      const pkg = pkgs[name];
      pkg.requireBedrockConfig();

      // serve package
      bedrock.config.express.static.push({
        route: bedrock.config.views.modules.baseURL + '/' +
          pkg.manifest.name,
        path: pkg.path
      });

      // if package manifest is not in the package path, serve it
      if(pkg.manifestPath.indexOf(pkg.path) !== 0) {
        bedrock.config.express.static.push({
          route: bedrock.config.views.modules.baseURL + '/' +
            pkg.manifest.name + '/package.json',
          path: pkg.manifestPath,
          file: true
        });
      }
    }

    // rebuild `root.js` module
    await _buildRootModule();
  } catch(e) {
    logger.error('Failed to read packages and create "root" module.', e);
    throw e;
  }
}

let _buildRootModulePromise;

api.buildRootModule = async () => {
  if(_buildRootModulePromise) {
    return _buildRootModulePromise;
  }
  _buildRootModulePromise = _buildRootModuleOnce();
  return _buildRootModulePromise;
};

/**
 * Builds a module that imports the root modules required for an application.
 */
async function _buildRootModule() {
  const pkg = api.readRootPackageSync();

  // root path
  const rootPath = bedrock.config.views.bundle.paths.input.root;
  // ensure system path is created
  await makeDir(path.dirname(rootPath));

  const importPath = path.relative(path.dirname(rootPath), pkg.path);
  logger.debug(`root module`, {
    packagePath: pkg.path,
    packageName: pkg.name,
    rootPath,
    importPath
  });
  // contents
  const data = `import '${importPath}';\n`;

  logger.debug(`Contents of 'root' file:\n${data}`);

  await fs.promises.writeFile(rootPath, data, {encoding: 'utf8'});
}

function _readJsonFile(filename) {
  return JSON.parse(fs.readFileSync(filename, {encoding: 'utf8'}));
}

function _readPackageSync(moduleName, cache, pseudoPkg) {
  const pkg = {};

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
    logger.error('Could not read package for ' + moduleName, e);
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
    const mainFields = options.mainFields || ['browser', 'module', 'main'];
    let key = extension.substr(1);
    if(key === 'css' && !(key in pkg.manifest)) {
      key = 'style';
    }
    let files = pkg.manifest[key];
    if(!files) {
      for(let i = 0; i < mainFields.length && !files; ++i) {
        files = pkg.manifest[mainFields[i]];
        // ignore all files if main field set to null or false
        if(files === null || files === false) {
          files = [];
        }
        // FIXME: support complex object overrides
        if(!Array.isArray(files) && typeof files === 'object') {
          logger.warning('Object "browser" field found: ' + moduleName);
          files = undefined;
        }
      }
    }
    files = files || [];
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
        logger.warning('bedrock.json dependency not found: "' +
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
    logger.warning('Could not read "bedrock.json" from package ' +
      '"' + pkg.manifest.name + '"', e);
    return pkg;
  }

  logger.verbose('Read package for ' + moduleName + ':\n' +
    JSON.stringify(pkg, null, 2));

  return pkg;
}

function _readDependenciesSync(pkg, cache) {
  logger.debug(`Reading dependencies for package "${pkg.manifest.name}"`);
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

  api._detectCycle(cache);

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
  let deps = _.get(pkg, 'manifest.bedrock.browserDependencies', []);
  if(deps === 'all') {
    // special value of `all` means use `pkg.manifest.dependencies` and
    // `pkg.manifest.peerDependencies`
    deps = [
      ...Object.keys(pkg.manifest.dependencies || {}),
      ...Object.keys(pkg.manifest.peerDependencies || {})
    ];
  }

  // search for additional dependencies in manifest overrides
  const overrides = _.get(pkg, 'manifest.bedrock.manifest', {});
  Object.keys(overrides).filter(key => overrides[key].browserDependencies)
    .forEach(key => deps = deps.concat(overrides[key].browserDependencies));

  return deps;
}

function _getManifestOverride(pkgCache, pkgName) {
  const pkg = pkgCache[pkgName];
  if(!(pkg.manifest.bedrock && pkg.manifest.bedrock.manifest)) {
    return {};
  }
  logger.debug(`Applying manifest overrides defined in ${pkg.manifest.name}`);
  const overrides = {};
  Object.keys(pkg.manifest.bedrock.manifest).forEach(k => {
    // only include override if it overrides an existing package in the cache
    // or else there will be no base manifest to layer overrides onto
    if(k in pkgCache) {
      overrides[k] = {
        manifest: pkg.manifest.bedrock.manifest[k]
      };
    } else {
      logger.warning('Package "' + pkgName + '" includes a ' +
        'manifest override for dependency "' + k + '", but "' + k + '" is ' +
        'not specified in the "browserDependencies" tree. This ' +
        'override will be ignored because "' + k + '" will not be loaded.');
    }
  });
  return overrides;
}

function _isDir(filename) {
  let stat;
  try {
    stat = fs.lstatSync(filename);
  } catch(e) {}
  return stat ? stat.isDirectory() : false;
}

api._detectCycle = (cache, name = '', visited = new Set(), recStack = {}) => {
  if(!name) { // initializes the name on first function call
    name = Object.keys(cache)[0];
  }

  if(!visited.has(name)) {
    visited.add(name);
    recStack[name] = true;

    const deps = Object.keys(cache[name].manifest.dependencies || {});
    for(const dep of deps) {
      if(!(dep in cache)) {
        continue;
      }
      if(!visited.has(dep)) {
        api._detectCycle(cache, dep, visited, recStack);
      } else if(recStack[dep]) {
        const cyc = Object.keys(recStack).filter(dep => recStack[dep] === true);
        throw new Error(`Cycle in Depedencies: ${cyc}`);
      }
    }
  }

  recStack[name] = false;
};
