const babel = require('babel-standalone');

// disable SystemJS runtime detection
SystemJS._loader.loadedTranspilerRuntime = true;

babel.registerPlugin('syntax-dynamic-import', function() {
  return {
    manipulateOptions: function manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("dynamicImport");
    }
  };
});

exports.translate = function(load) {
  const {metadata: {babelOptions}} = load;
  try {
    const result = babel.transform(load.source, babelOptions);
    return result.code;
  } catch(e) {
    throw e;
  }
};
