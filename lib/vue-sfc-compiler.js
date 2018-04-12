const bedrock = require('bedrock');
const async = require('async');
const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const memoryfs = require('memory-fs');

const cache = {};

module.exports = enqueue;

function enqueue(filename, callback) {
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

  async.auto({
    stat: callback => fs.stat(filename, callback),
    cache: ['stat', (results, callback) => {
      const {mtimeMs: mtime} = results.stat;
      const basename = path.basename(filename);
      const cachedFilename = path.join(cacheDir, basename, `${mtime}.js`);
      let entry = cache[filename];
      if(!entry) {
        entry = cache[filename] = {
          cachedFilename,
          mtime: 0,
          // one queue for every Vue SFC with just 1 task permitted at a time
          queue: async.queue(taskHandler, 1)
        };
      }
      const task = {
        filename,
        cachedFilename,
        mtime
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
    // a newer version was already compiled, use it
    return fs.readFile(entry.cachedFilename, 'utf8', (err, bundle) => {
      if(err) {
        return callback(err);
      }
      task.bundle = bundle;
      callback();
    });
  }

  async.auto({
    compile: callback => compile(task.filename, callback),
    emptyDir: callback => fs.emptyDir(
      path.dirname(task.cachedFilename), callback),
    write: ['compile', (results, callback) => {
      task.bundle = results.compile;
      fs.writeFile(task.cachedFilename, results.compile, 'utf8', callback);
    }],
    finish: ['write', (results, callback) => {
      entry.mtime = task.mtime;
      entry.cachedFilename = task.cachedFilename;
      callback();
    }]
  }, callback);
}

function compile(fixture, callback) {
  const compiler = webpack({
    context: '/tmp',
    mode: 'development',
    target: 'web',
    entry: fixture,
    output: {
      path: path.resolve(__dirname),
      filename: 'bundle.js',
      libraryTarget: 'umd'
    },
    module: {
      rules: [{
        test: /\.vue$/,
        use: {
          loader: require.resolve('vue-loader'),
          options: {
            hotReload: false,
            cssSourceMap: false,
            loaders: {
              // disable babel, unnecessary overhead
              // TODO: to enable, must do:
              // npm install babel-loader and babel-core
              js: '',//require.resolve('babel-loader'),
              css: require.resolve('vue-style-loader') + '!' +
                require.resolve('css-loader')
            }
          }
        }
      }]
    }
  });

  compiler.outputFileSystem = new memoryfs();

  compiler.run(err => {
    if(err) {
      return callback(err);
    }
    const bundlePath = path.resolve(__dirname, 'bundle.js');
    const bundle = compiler.outputFileSystem.readFileSync(bundlePath, 'utf8');
    callback(null, bundle);
  });
}
