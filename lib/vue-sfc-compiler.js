const path = require('path');
const webpack = require('webpack');
const memoryfs = require('memory-fs');

module.exports = (fixture, callback) => {
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
};
