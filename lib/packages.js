/*!
 * Copyright (c) 2012-2022 Digital Bazaar, Inc. All rights reserved.
 */
import * as bedrock from 'bedrock';
import fs from 'fs';
import {logger} from './logger.js';
import path from 'path';
import 'bedrock-express';

// load config defaults
import './config.js';

let _packageCache;
let _rootModule;

/**
 * Reads the package for the given root module and all of its browser
 * dependencies. If no root module is given, then `require.main.filename` is
 * used.
 *
 * @param {string} [rootModule] - The root module to read packages for.
 *
 * @returns {Promise<object>} An object hash of module name => package info
 *   object.
 */
export async function readPackages(rootModule) {
  if(!rootModule) {
    if(bedrock.main) {
      rootModule = bedrock.main.filename;
    } else {
      // note: bedrock runs in a worker, so first child is actual main
      rootModule = require.main.children[0].filename;
    }
  }

  // ensure root module path is resolved
  rootModule = await _findPackageRoot(rootModule, require.resolve(rootModule));

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
    const pkg = await _readPackage({
      moduleName: rootModule,
      cache: _packageCache,
      pseudoPkg
    });
    logger.verbose(`Processing pseudo package "${pkg.manifest.name}"`, pkg);
    _packageCache[pkg.manifest.name] = pkg;
  }

  // read dependencies for manually configured packages
  for(const name in _packageCache) {
    await _readDependencies(_packageCache[name]);
  }

  // read root package
  const rootPackage = await _readPackage({
    moduleName: rootModule
  });

  // only add package to the cache and read its dependencies if not already
  // present (it was provided manually as a pseudo package)
  if(!(rootPackage.manifest.name in _packageCache)) {
    _packageCache[rootPackage.manifest.name] = rootPackage;
    await _readDependencies(rootPackage);
  }

  logger.verbose('Read packages:\n' +
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
}

/**
 * Reads the package for the given root module. If no root module is given,
 * then `require.main.filename` is used.
 *
 * @param {string} [rootModule] - The root module to read.
 *
 * @returns {Promise<object>} An object with root package name and path
 *   properties.
 */
export async function readRootPackage(rootModule) {
  if(!rootModule) {
    if(bedrock.main) {
      rootModule = bedrock.main.filename;
    } else {
      // note: bedrock runs in a worker, so first child is actual main
      rootModule = require.main.children[0].filename;
    }
  }

  // ensure root module path is resolved
  const rootPath =
    await _findPackageRoot(rootModule, require.resolve(rootModule));
  const rootName = path.basename(rootPath);

  return {
    path: rootPath,
    name: rootName
  };
}

bedrock.events.on(
  'bedrock-express.configure.static', () => buildRootModule());

let _buildRootModulePromise;

export async function buildRootModule() {
  if(_buildRootModulePromise) {
    return _buildRootModulePromise;
  }
  _buildRootModulePromise = _buildRootModule();
  return _buildRootModulePromise;
}

/**
 * Builds a module that imports the root modules required for an application.
 */
async function _buildRootModule() {
  const pkg = await readRootPackage();

  // root path
  const rootPath = bedrock.config.views.bundle.paths.input.root;
  // ensure system path is created
  await fs.promises.mkdir(path.dirname(rootPath), {recursive: true});

  const importPath = path.relative(path.dirname(rootPath), pkg.path);
  logger.debug(`root module`, {
    packagePath: pkg.path,
    packageName: pkg.name,
    rootPath,
    importPath
  });
  // contents
  const data = `import '${importPath}';\n`;

  logger.verbose(`Contents of 'root' file:\n${data}`);

  await fs.promises.writeFile(rootPath, data, {encoding: 'utf8'});
}

async function _readJsonFile(filename) {
  return JSON.parse(await fs.promises.readFile(filename, {encoding: 'utf8'}));
}

async function _readPackage({moduleName, cache, pseudoPkg, paths = null}) {
  const pkg = {};

  if(!cache) {
    cache = _packageCache;
  }

  try {
    if(!pseudoPkg) {
      pkg.manifestPath = paths ?
        require.resolve(moduleName + '/package.json', {paths}) :
        require.resolve(moduleName + '/package.json');
      pkg.path = path.dirname(pkg.manifestPath);
    } else {
      const isDir = await _isDir(pseudoPkg.path);
      pkg.path = isDir ? pseudoPkg.path : path.dirname(pseudoPkg.path);
      pkg.manifestPath = pseudoPkg.manifest;
    }
    pkg.manifest = await _readJsonFile(pkg.manifestPath);
  } catch(e) {
    logger.warning('Could not read package for ' + moduleName, e);
    return null;
  }

  // TODO: remove `bedrock config`, if possible... potentially use `config`
  // which is official in `package.json` ... or nothing at all

  // require the bedrock config from the package, if possible
  pkg.requireBedrockConfig = async function() {
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
    const files = [].concat(pkg.bedrock.config);
    for(const file of files) {
      const api = await import(path.resolve(pkg.path, file));
      (api.default || api)(bedrock);
    }
    return true;
  };

  // load bedrock.json
  const filename = path.resolve(pkg.path, 'bedrock.json');
  if(!fs.existsSync(filename)) {
    return pkg;
  }
  try {
    pkg.bedrock = await _readJsonFile(filename);
  } catch(e) {
    logger.warning('Could not read "bedrock.json" from package ' +
      '"' + pkg.manifest.name + '"', e);
    return pkg;
  }

  logger.verbose('Read package for ' + moduleName + ':\n' +
    JSON.stringify(pkg, null, 2));

  return pkg;
}

async function _readDependencies(pkg, cache) {
  logger.verbose(
    `Reading dependencies for package ` +
    `"${pkg.manifest.name}@${pkg.manifest.version}"`);
  if(!cache) {
    cache = _packageCache;
  }

  // scan all dependencies
  // FIXME: add peerDependencies? they should non-peer deps elsewhere.
  // FIXME: add optionalDependencies?
  const deps = Object.keys(pkg.manifest.dependencies || {});

  for(const dep of deps) {
    if(dep in cache) {
      continue;
    }
    const depPkg = await _readPackage({
      moduleName: dep,
      cache,
      paths: [
        path.dirname(pkg.manifestPath)
      ]});
    if(depPkg) {
      cache[dep] = depPkg;
      await _readDependencies(depPkg, cache);
    } else {
      // FIXME: log?
      // package not found
    }
  }
}

async function _findPackageRoot(moduleName, modulePath) {
  const isDir = await _isDir(modulePath);
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

async function _isDir(filename) {
  let stat;
  try {
    stat = await fs.promises.lstat(filename);
  } catch(e) {}
  return stat ? stat.isDirectory() : false;
}
