/*!
 * Copyright (c) 2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const async = require('async');
const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const logger = require('./logger');
const memoryfs = require('memory-fs');
const {BedrockError} = bedrock.util;

const cache = {};

module.exports = enqueue;

function enqueue({filename, pkg, externals}, componentPath, callback) {
  /* Compiler cache + queue:

    This is a very simple compiler cache + queue system that should work for
    development mode compilation of Vue SFCs. Not for production -- which
    is fine because all Vue SFCs are precompiled for production.

    Algorithm:

    1. Stat the Vue SFC and get its last write time.
    2. Build a filename for an expected cached file based on write time.
    3. Open the cached file and read it and return the result.
    4. On error, add a task to the queue to compile and create the file.
  */
  const cacheDir = bedrock.config.views.system.paths.vue.cache;

  let entry = cache[filename];
  if(!entry) {
    entry = cache[filename] = {
      mtime: 0,
      dependencies: [filename],
      // one queue for every Vue SFC with just 1 task permitted at a time
      queue: async.queue(taskHandler, 1)
    };
  }

  async.auto({
    mtime: callback => mostRecentMtime(filename, entry.dependencies, callback),
    cache: ['mtime', (results, callback) => {
      const {mtime} = results;
      const cachedFilename = path.join(cacheDir, componentPath, `${mtime}.js`);
      const task = {
        filename,
        cachedFilename,
        mtime,
        componentPath,
        pkg,
        externals
      };
      entry.queue.push(task, err => callback(err, task.bundle));
    }]
  }, (err, results) => err ? callback(err) : callback(null, results.cache));
}

function taskHandler(task, callback) {
  /* Queue algorithm:

    1. A queue task will first check the in-memory cache for the latest
       cache entry. If its `mtime` is greater than or equal what is to be
       compiled, then the new cached file is opened and returned.
    2. The compiler is run and a new bundle is produced.
    3. Any existing cached files are removed and the new bundle is written
       to disk.
    4. The bundle is returned.
  */
  const entry = cache[task.filename];
  if(entry.mtime >= task.mtime) {
    logger.debug(`Loading cached Vue SFC: ${task.componentPath}`);

    // a newer version was already compiled, use it
    return fs.readFile(entry.cachedFilename, 'utf8', (err, bundle) => {
      if(err) {
        // clear cache for retry
        delete cache[task.filename];
        return callback(err);
      }
      task.bundle = bundle;
      callback();
    });
  }

  logger.debug(`Compiling Vue SFC: ${task.componentPath}`);
  async.auto({
    compile: callback => compile(task, callback),
    emptyDir: callback => fs.emptyDir(
      path.dirname(task.cachedFilename), callback),
    write: ['compile', 'emptyDir', (results, callback) => {
      task.bundle = results.compile.bundle;
      fs.writeFile(task.cachedFilename, task.bundle, 'utf8', callback);
    }],
    finish: ['write', (results, callback) => {
      entry.mtime = task.mtime;
      entry.cachedFilename = task.cachedFilename;
      entry.dependencies = results.compile.dependencies;
      callback();
    }]
  }, callback);
}

function compile({filename, pkg, externals}, callback) {
  const compiler = webpack({
    context: '/tmp',
    mode: 'development',
    target: 'web',
    entry: filename,
    output: {
      path: path.resolve(__dirname),
      filename: 'bundle.js',
      libraryTarget: 'umd'
    },
    /*
      Prevent bundling of certain imported packages and instead retrieve
      these external dependencies at runtime.
     */
    externals,
    module: {
      rules: [{
        test: /\.vue$/,
        use: {
          loader: require.resolve('vue-loader'),
          options: {
            hotReload: false,
            cssSourceMap: false,
            loaders: {
              // Note: this will disable babel due to its unnecessary overhead
              // (this compiler is only used when developing which is supported
              // in modern browsers only); to enable for testing on an older
              // browser in dev mode, you must uncomment and also install:
              // `npm install babel-loader babel-core`
              js: '', //require.resolve('babel-loader'),
              css: require.resolve('vue-style-loader') + '!' +
                require.resolve('css-loader')
            }
          }
        }
      }]
    }
  });

  compiler.outputFileSystem = new memoryfs();

  compiler.run((err, stats) => {
    if(err) {
      return callback(err);
    }
    if(stats.compilation.errors.length > 0) {
      logger.error(`SFC compilation error:\nFile: ${filename}\n` +
        stats.compilation.errors);
      return callback(new BedrockError(
        'Could not compile Vue Single Component File.',
        'DataError', {
          public: true,
          httpStatusCode: 500,
          errors: stats.compilation.errors.map(e => String(e))
        }));
    }

    const dependencies = [filename, ...stats.compilation.fileDependencies]
      .filter(dep => typeof dep === 'string');
    const bundlePath = path.resolve(__dirname, 'bundle.js');
    const bundle = compiler.outputFileSystem.readFileSync(
      bundlePath, 'utf8');
    callback(null, {bundle, dependencies});
  });
}

function mostRecentMtime(filename, deps, callback) {
  // find the most recent modification time for the file or any of its
  // dependencies (note: `filename` itself is perhaps counter-intuitively
  // listed in `deps`)
  let mtime = 0;
  async.each(deps, (dep, callback) => {
    fs.stat(dep, (err, stat) => {
      if(err) {
        // only report an error if the file to be compiled itself cannot
        // be stat'd ... as dependencies may have changed and they won't
        // be computed unless the file is compiled again -- and we'd never
        // compile again if we threw here in that case; so fall through
        // to `callback` when the error is for a potentially stale dependency
        if(filename === dep) {
          return callback(err);
        }
      } else {
        mtime = Math.max(mtime, stat.mtimeMs);
      }
      callback();
    });
  }, err => callback(err, mtime));
}
