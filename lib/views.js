/*
 * Bedrock views module.
 *
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 *
 * Some code taken from:
 * grunt-angular-templates
 * https://github.com/ericclemmons/grunt-angular-templates
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */
var _ = require('underscore');
var async = require('async');
var bedrock = require('bedrock');
var brRequire = require('bedrock-requirejs');
var fs = require('fs');
var glob = require('glob');
var htmlMinifier = require('html-minifier');
var less = require('less');
var minimatch = require('minimatch');
var path = require('path');
var swigcore = require('swig');
var swigLoaders = require('./swig.loaders');
var uaParser = require('ua-parser');
var BedrockError = bedrock.tools.BedrockError;
var CleanCSS = require('clean-css');

// load config defaults
require('./config');

// module API
var api = {};
module.exports = api;

var logger = bedrock.loggers.get('app');

// set the default timezone offset for the template system
swigcore.setDefaultTZOffset(0);

// add subcommands
bedrock.events.on('bedrock-cli.init', function() {
  // add compile-less command
  var command = bedrock.program
    .command('compile-less')
    .description('Compile less and combine css from installed bower ' +
      'packages into a single css file.')
    .action(function() {
      bedrock.config.cli.command = command;
      // log to console at info level
      bedrock.config.loggers.console.level = 'info';
    });
});
bedrock.events.on('bedrock-cli.init', function() {
  // add minify command
  var command = bedrock.program
    .command('optimize')
    .description('Optimize resources for client delivery.')
    .action(function() {
      bedrock.config.cli.command = command;
      // log to console at info level
      bedrock.config.loggers.console.level = 'info';
    })
    .option(
      '--css',
      'Only optimize CSS resources.')
    .option(
      '--js',
      'Only optimize JavaScript resources.');
});

bedrock.events.on('bedrock-cli.ready', function(callback) {
  var command = bedrock.config.cli.command;
  if(command.name() === 'compile-less') {
    return bedrock.runOnce('bedrock-views.compileLess', function(callback) {
      _compileLess(callback);
    }, function(err) {
      if(err) {
        process.exit(1);
      }
      bedrock.exit();
    });
  }
  if(command.name() === 'optimize') {
    return bedrock.runOnce('bedrock-views.optimize', function(callback) {
      // load any bedrock configs for bower packages
      var pkgs = brRequire.readBowerPackagesSync();
      for(var name in pkgs) {
        pkgs[name].requireBedrockConfig();
      }

      if(!command.css && !command.js) {
        // turn on defaults
        command.css = command.js = true;
      }
      async.auto({
        css: function(callback) {
          if(!command.css) {
            return callback();
          }
          _optimizeCSS(callback);
        },
        js: function(callback) {
          if(!command.js) {
            return callback();
          }
          _optimizeJS(callback);
        }
      }, function(err) {
        callback(err);
      });
    }, function(err) {
      if(err) {
        process.exit(1);
      }
      bedrock.exit();
    });
  }
  callback();
});

bedrock.events.on('bedrock-express.configure.static', function(app) {
  // always serve optimized files
  bedrock.config.express.static.push({
    route: '/css/bedrock-views.min.css',
    path: bedrock.config.views.css.optimize.out,
    file: true
  });
  bedrock.config.express.static.push({
    route: '/requirejs/bedrock-angular-templates.js',
    path: bedrock.config.views.angular.optimize.templates.out,
    file: true
  });

  if(fs.existsSync(bedrock.config.views.less.compile.out)) {
    // serve compiled css
    bedrock.config.express.static.push({
      route: '/css/bedrock-views.css',
      path: bedrock.config.views.less.compile.out,
      file: true
    });
  } else {
    // serve css from companion package
    bedrock.config.express.static.push({
      route: '/css/bedrock-views.css',
      path: path.join(
        bedrock.config.requirejs.bower.bowerrc.directory,
        'bedrock-angular/css/app.css'),
      file: true
    });
  }

  // early handler to detect obsolete browsers
  app.use(function(req, res, next) {
    var ua = req.userAgent = uaParser.parse(req.headers['user-agent'] || '');
    ua.obsolete = false;
    if(ua.family in bedrock.config.views.browserVersions) {
      var version = bedrock.config.views.browserVersions[ua.family];
      if(ua.major < version.major ||
        (ua.major === version.major && ua.minor < version.minor)) {
        ua.obsolete = true;
      }
    }
    next();
  });
});

bedrock.events.on('bedrock-express.configure.routes', configure);

/**
 * Gets a copy of the default view variables.
 *
 * @param req the current request.
 * @param callback(err, vars) called once the operation completes.
 */
api.getDefaultViewVars = function(req, callback) {
  var vars = bedrock.tools.clone(bedrock.config.views.vars);

  // include browser user agent
  vars.userAgent = req.userAgent;

  // converts a var to json for later JSON.parse() via a page script
  vars.parsify = function(v) {
    if(v === undefined) {
      // no var given, copy all vars except private data
      v = bedrock.tools.extend({}, vars);
      delete v._private;
    }
    return "JSON.parse('" + JSON.stringify(v)
      .replace(/\\n/g, '\\\\n')
      .replace(/\\r/g, '\\\\r')
      .replace(/\"/g, "\\\"")
      .replace(/'/g, "\\'") + "')";
  };

  bedrock.events.emit('bedrock-views.vars.get', req, vars, function(err) {
    callback(err, vars);
  });
};

// configure template engine and add routes from config
function configure(app) {
  // setup views
  var viewPaths = bedrock.config.views.paths;
  if(!Array.isArray(viewPaths)) {
    viewPaths = [viewPaths];
  }
  var paths = viewPaths.map(function(p) {return path.resolve(p);});

  // add swig as the default template engine
  app.engine('html', function(path, options, callback) {
    var view;
    try {
      var swig = new swigcore.Swig({
        autoescape: false,
        cache: bedrock.config.views.cache ? 'memory' : false,
        loader: swigLoaders.multipath({base: paths})
      });
      view = swig.compileFile(path)(options);
    } catch(err) {
      return callback(err);
    }
    callback(null, view);
  });
  app.set('view engine', 'html');
  app.set('views', paths);

  if(bedrock.config.views.serviceUnavailable) {
    // service unavailable for all requests
    app.all('*', function(req, res, next) {
      api.getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }
        function ldjson() {
          res.send(503, '');
        }
        res.format({
          'application/ld+json': ldjson,
          json: ldjson,
          html: function() {
            res.status(503);
            res.render('error-503.html', vars);
          },
          'default': function() {
            res.send(503);
          }
        });
      });
    });
    return;
  }

  /* Build basic routes from the config.

  The routes config value is an array. Each route value is a string that
  maps to a template filename of "path + '.html'" without the leading '/':
    path
  or an array with path and template filename and optional vars:
    [path, templateFilename, vars]
  or an options object:
  {
    path: path,
    template: templateFileName, (optional)
    vars: {k1:v1, ...} (optional extra vars)
  }
  */
  bedrock.config.views.routes.forEach(function(route) {
    var options = {};
    if(typeof route === 'string') {
      options.path = route;
    } else if(Array.isArray(route)) {
      options.path = route[0];
      options.template = route[1];
      options.vars = route[2];
    } else if(typeof route === 'object') {
      options.path = route.path;
      options.template = route.template;
      options.vars = route.vars;
    } else {
      return bedrock.events.emit(
        'bedrock.error', new Error('Invalid website route config.'));
    }
    if(!options.path) {
      return bedrock.events.emit(
        'bedrock.error', new Error('Invalid website route path.'));
    }
    if(!options.template) {
      // generate template filename from path without leading '/'
      options.template = options.path.substr(1) + '.html';
    }
    if(!options.vars) {
      options.vars = {};
    }

    app.get(options.path, function(req, res, next) {
      api.getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }
        bedrock.tools.extend(true, vars, options.vars);
        res.render(options.template, vars);
      });
    });
  });
}

// occurs after other modules have configured routes
bedrock.events.on('bedrock-express.start', function(app, callback) {
  // let other modules do last minute configuration before "not found"
  // handler is attached (or cancel its attachment)
  bedrock.events.emit('bedrock-views.add', function(err, result) {
    if(err || result === false) {
      return callback(err, result);
    }

    // add "not found" handler now that all other routes are configured
    app.all('*', function(req, res, next) {
      api.getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }
        function ldjson() {
          res.status(404).send('');
        }
        res.format({
          'application/ld+json': ldjson,
          json: ldjson,
          html: function() {
            res.status(404);
            res.render('error-404.html', vars);
          },
          'default': function() {
            res.send(404);
          }
        });
      });
    });

    callback();
  });
});

// add late error handler
bedrock.events.on(
  'bedrock-express.configure.unhandledErrorHandler', function(app) {
  app.use(function(err, req, res, next) {
    if(!err) {
      return next();
    }
    // special check so a custom 403 template can be used
    var isGetPermissionDenied = (req.method === 'GET' &&
      err instanceof BedrockError &&
      err.name === 'PermissionDenied');

    // wrap non-bedrock errors
    if(!(err instanceof BedrockError)) {
      err = new BedrockError(
        'An error occurred.',
        'Error', null, err);
    }

    // FIXME: check for 'critical' in exception chain and use
    // that log message instead of error ... and set up email logger
    // to only email critical messages
    var errObject = err.toObject();
    logger.error('Error', {error: errObject});

    // setup status code
    if(isGetPermissionDenied) {
      // ensure 403 for permission denied
      res.statusCode = 403;
    } else if(err.details && err.details.httpStatusCode) {
      // set status code if given in top-level error
      res.statusCode = err.details.httpStatusCode;
    } else {
      // FIXME: differentiate between 4xx and 5xx errors
      // default to generic server error
      res.statusCode = 500;
    }

    api.getDefaultViewVars(req, function(_err, vars) {
      if(_err) {
        return next(_err);
      }
      vars.exception = errObject;
      // return public error
      function ldjson() {
        res.json(err.toObject({'public':true}));
      }
      res.format({
        'application/ld+json': ldjson,
        json: ldjson,
        html: function() {
          // switch between custom or generic templates
          if(isGetPermissionDenied) {
            res.render('error-403.html', vars);
          } else {
            res.render('error.html', vars);
          }
        },
        'default': function() {
          res.send();
        }
      });
    });
  });
});

function _compileLess(callback) {
  logger.info('Compiling less and combining css from bower packages...');

  var cfg = bedrock.config.views.less.compile;
  var pkgs = brRequire.readBowerPackagesSync();

  var sorted = _sortPackages(pkgs);
  if(sorted.length === 0) {
    // nothing to compile
    logger.info('No bower packages found.');
    return callback();
  }

  // find less and css files
  var _files = [];
  sorted.forEach(function(pkg) {
    var files;
    if(pkg.manifest.name in cfg.packages) {
      // use alternative configuration
      files = cfg.packages[pkg.manifest.name].files || [];
    } else {
      // auto-find less files first, then css files
      files = pkg.findMainFiles('.less');
      if(files.length === 0) {
        files = pkg.findMainFiles('.css');
      }
    }

    if(!files) {
      // nothing to import
      return;
    }

    files.forEach(function(file) {
      _files.push(path.resolve(path.join(pkg.path, file)));
    });
  });

  // add any local less files from config
  _files.push.apply(_files, cfg.files);

  if(_files.length === 0) {
    logger.info('No less or css found.');
    return callback();
  }

  var src = '';
  _files.forEach(function(file) {
    var extension = path.extname(file);
    src += '@import ';
    if(extension === '.css') {
      src += '(less) ';
    }
    src += '"' + file + '"' + ';\n';
  });

  logger.info('Compiling less imports:\n' + src);

  // add local variables from config
  for(var varname in cfg.vars) {
    src += varname + ': "' + cfg.vars[varname] + '";\n';
  }

  less.render(src, cfg.options, function(err, output) {
    if(err) {
      logger.error('Less compilation failed', err);
      return callback(err);
    }
    // output.css = string of css
    // output.map = string of sourcemap
    // output.imports = array of string filenames of the imports referenced
    fs.writeFileSync(cfg.out, output.css, {encoding: 'utf8'});
    var bytes = _byteSizeToString(fs.statSync(cfg.out).size, 2);
    logger.info(
      'Less compilation complete. ' + bytes + ' written to: ' + cfg.out);
    callback();
  });
}

function _sortPackages(pkgs) {
  var sorted = bedrock.config.views.less.compile.order.slice();
  var all = Object.keys(pkgs).map(function(name) {
    return pkgs[name];
  });
  while(all.length > 0) {
    var pkg = all.shift();
    if(sorted.indexOf(pkg.manifest.name) !== -1) {
      continue;
    }
    sorted.push(pkg.manifest.name);
    var deps = pkg.manifest.dependencies || {};
    for(var dep in deps) {
      // skip missing dependencies
      if(!(dep in pkgs)) {
        continue;
      }
      if(sorted.indexOf(dep) === -1) {
        all.push(pkg);
        sorted.pop();
        break;
      }
    }
  }
  return sorted.map(function(name) {
    return pkgs[name];
  }).filter(function(pkg) {
    return pkg !== undefined;
  });
}

function _byteSizeToString(bytes, precision) {
  // cribbed from: https://gist.github.com/thomseddon/3511330
  bytes = parseFloat(bytes);

  if(bytes === 0) {
    return '0 bytes';
  }
  if(bytes === 1) {
    return '1 byte';
  }
  if(isNaN(bytes) || !isFinite(bytes)) {
    return '-';
  }
  if(typeof precision === 'undefined') {
    precision = 1;
  }

  var units = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  var number = Math.floor(Math.log(bytes) / Math.log(1024));
  var value = (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision);

  return (value.match(/\.0*$/) ?
    value.substr(0, value.indexOf('.')) : value) +  ' ' + units[number];
}

function _optimizeCSS(callback) {
  logger.info('Optimizing CSS...');

  async.auto({
    compile: function(callback) {
      _compileLess(callback);
    },
    read: ['compile', function(callback) {
      logger.info('Minifying CSS...');
      fs.readFile(
        bedrock.config.views.less.compile.out, {encoding: 'utf8'}, callback);
    }],
    minify: ['read', function(callback, results) {
      var source = results.read;
      var minified = new CleanCSS().minify(source).styles;
      fs.writeFile(
        bedrock.config.views.css.optimize.out, minified, {encoding: 'utf8'},
        callback);
    }],
    report: ['minify', function(callback) {
      var inSize = fs.statSync(bedrock.config.views.less.compile.out).size;
      var outSize = fs.statSync(bedrock.config.views.css.optimize.out).size;
      logger.info('CSS minification complete (' +
        _byteSizeToString(inSize, 2) + ' => ' + _byteSizeToString(outSize, 2) +
        '). Written to: ' + bedrock.config.views.css.optimize.out);
      callback();
    }]
  }, function(err) {
    if(err) {
      logger.error('CSS optimization failed', err);
    } else {
      logger.info('CSS optimization complete.');
    }
    callback(err);
  });
}

function _optimizeJS(callback) {
  logger.info('Optimizing JavaScript...');

  async.auto({
    templates: function(callback) {
      _optimizeAngularTemplates(callback);
    },
    requirejs: ['templates', function(callback) {
      // update requirejs config to include templates module
      var config = bedrock.config.requirejs.optimize.config;
      var out = bedrock.config.views.angular.optimize.templates.out;
      config.paths['requirejs/bedrock-angular-templates'] = path.join(
        path.dirname(path.resolve(out)), path.basename(out, '.js'));
      bedrock.config.requirejs.autoload.push(
        'requirejs/bedrock-angular-templates');
      // run optimization
      brRequire.optimize({onBuildRead: _ngAnnotate}, callback);
    }]
  }, function(err) {
    if(err) {
      logger.error('JavaScript optimization failed', err);
    } else {
      logger.info('JavaScript optimization complete.');
    }
    callback(err);
  });
}

function _ngAnnotate(moduleName, path, contents) {
  var ngAnnotate = require('ng-annotate');
  var result = ngAnnotate(contents, {
    add: true,
    single_quotes: true
  });
  if(result.errors) {
    logger.error('ng-annotate failed for ' +
      'moduleName="' + moduleName + '", path="' + path + '", ' +
      'errors=', result.errors);
    process.exit(1);
  }
  return result.src;
}

function _optimizeAngularTemplates(callback) {
  logger.info('Angular template optimizer running...');

  var cfg = bedrock.config.views.angular.optimize.templates;
  var inSize = 0;
  async.auto({
    get: function(callback) {
      _getAngularTemplates(callback);
    },
    prefix: function(callback) {
      var data = ["define(['angular'], function(angular) {\n",
        "angular.module('" + cfg.module + "', [])",
        ".run(['$templateCache', function($templateCache) {\n"].join('');
      fs.writeFile(cfg.out, data, {encoding: 'utf8'}, callback);
    },
    optimize: ['get', 'prefix', function(callback, results) {
      logger.info('Minifying angular templates...');
      try {
        var pkgCfgs = results.get;
        // TODO: implement multiprocessing?
        pkgCfgs.forEach(function(pkgCfg) {
          pkgCfg.files.forEach(function(file) {
            inSize += fs.statSync(file).size;
            var template = _optimizeTemplate(pkgCfg, file);
            fs.appendFileSync(cfg.out, template, {encoding: 'utf8'});
          });
        });
      } catch(e) {
        return callback(e);
      }
      callback();
    }],
    suffix: ['optimize', function(callback) {
      var data = '}]);\n});\n';
      fs.appendFile(cfg.out, data, {encoding: 'utf8'}, callback);
    }],
    report: ['suffix', function(callback) {
      var outSize = fs.statSync(cfg.out).size;
      logger.info('Angular template optimization complete (' +
        _byteSizeToString(inSize, 2) + ' => ' + _byteSizeToString(outSize, 2) +
        '). Written to: ' + cfg.out);
      callback();
    }]
  }, function(err) {
    callback(err);
  });
}

function _htmlToString(html) {
  return html.split(/^/gm).map(function(line) {
    return JSON.stringify(line);
  }).join(' +\n    ') || '""';
}

function _optimizeTemplate(pkgCfg, file) {
  var template;
  var url = _getTemplateUrl(pkgCfg.pkg, file);
  template = fs.readFileSync(file, {encoding: 'utf8'});
  template = htmlMinifier.minify(
    template, bedrock.config.views.angular.optimize.templates.htmlmin);
  var compiled = _.template(
    "\n  $templateCache.put('<%= url %>',\n  <%= template %>\n  );\n");
  return compiled({url: url, template: _htmlToString(template)});
}

function _getAngularTemplates(callback) {
  var pkgs = brRequire.readBowerPackagesSync();
  if(Object.keys(pkgs).length === 0) {
    // no templates to include
    logger.info('No bower packages found.');
    return callback();
  }

  // build package configs
  var config = bedrock.config.views.angular.optimize.templates;
  var pkgCfgs = [];
  var pkgCfgs_ = config.packages;
  var ignore = config.ignore;
  for(var name in pkgs) {
    var pkg = pkgs[name];

    // ignore any specified packages
    if(ignore.packages.indexOf(name) !== -1) {
      logger.debug('Angular template optimizer ignoring package: ' + name);
      continue;
    }

    var pkgCfg = {pkg: pkg};
    var patterns;
    if(name in pkgCfgs_) {
      // use custom source globs
      patterns = pkgCfgs_[name].src;
    } else if(pkg.manifest.dependencies &&
      (pkg.manifest.dependencies.angular ||
      pkg.manifest.dependencies['bedrock-angular'])) {
      // use default source globs
      patterns = config.src;
    } else {
      // no custom config and no angular dependency, skip package
      logger.debug(
        'Angular template optimizer ignoring non-angular-based package: ' +
        name);
      continue;
    }

    // build patterns
    pkgCfg.src = [];
    patterns.forEach(function(pattern) {
      var base = path.resolve(pkg.path);
      if(pattern.indexOf('!') === 0) {
        pkgCfg.src.push('!' + path.resolve(base, pattern.substr(1)));
      } else {
        pkgCfg.src.push(path.resolve(base, pattern));
      }
    });
    pkgCfgs.push(pkgCfg);
  }

  async.auto({
    getFiles: function(callback) {
      // convert globs to files
      var includePatterns = [];
      var excludePatterns = [];
      async.forEach(pkgCfgs, function(pkgCfg, callback) {
        var options = {
          base: path.resolve(pkg.path),
          includePatterns: includePatterns,
          excludePatterns: excludePatterns
        };
        _glob(pkgCfg.src, options, function(err, files) {
          if(err) {
            return callback(err);
          }
          pkgCfg.files = files.filter(function(file) {
            return ignore.files.indexOf(file) === -1;
          });
          callback();
        });
      }, function(err) {
        if(!err) {
          logger.debug(
            'Angular template optimizer including templates matching ' +
              'patterns:\n' + includePatterns.join('\n') + '\n');
          logger.debug(
            'Angular template optimizer excluding templates matching ' +
            'patterns:\n' + excludePatterns.join('\n') + '\n');
        }
        callback(err);
      });
    },
    filter: ['getFiles', function(callback) {
      // remove any templates that are overridden via the config system
      pkgCfgs.forEach(function(pkgCfg) {
        var pkg = pkgCfg.pkg;
        pkgCfg.files = pkgCfg.files.filter(function(file) {
          return _getTemplateOverride(pkg, file) === false;
        });
      });

      var output = 'Angular template optimizer including files:\n';
      var manifest = '';
      pkgCfgs.forEach(function(pkgCfg) {
        if(pkgCfg.files.length === 0) {
          return;
        }
        manifest += '\n' + pkgCfg.pkg.manifest.name + '\n';
        manifest += new Array(
          pkgCfg.pkg.manifest.name.length + 1).join('=') + '\n';
        pkgCfg.files.forEach(function(file) {
          manifest += file + '\n';
        });
      });
      if(manifest === '') {
        output += '\nNo templates found.\n\n';
      } else {
        output += manifest + '\n';
      }
      logger.info(output);
      callback(null, pkgCfgs);
    }]
  }, function(err) {
    callback(err, pkgCfgs);
  });
}

function _glob(patterns, options, callback) {
  var rval = [];
  var includePatterns = options.includePatterns || [];
  var excludePatterns = options.excludePatterns || [];
  var exclusions = patterns.filter(function(pattern) {
    return pattern.indexOf('!') === 0;
  }).map(function(pattern) {
    pattern = path.resolve(options.base, pattern.substr(1));
    excludePatterns.push(pattern);
    return pattern;
  });
  async.forEach(patterns, function(pattern, callback) {
    var exclusion = (pattern.indexOf('!') === 0);
    if(exclusion) {
      return callback();
    }
    pattern = path.resolve(options.base, pattern);
    includePatterns.push(pattern);
    glob(pattern, function(err, files) {
      if(err) {
        return callback(err);
      }
      // apply exclusions
      files.forEach(function(file) {
        for(var i = 0; i < exclusions.length; ++i) {
          if(minimatch(file, exclusions[i])) {
            return;
          }
        }
        rval.push(file);
      });
      callback();
    });
  }, function(err) {
    callback(err, rval);
  });
}

function _getTemplateOverride(pkg, file) {
  // remove any templates that are overridden via the config system
  var overrides = bedrock.config.views.vars.angular.templates.overrides;
  var url = _getTemplateUrl(pkg, file).substr(1);
  if(url in overrides) {
    return overrides[url];
  }
  return false;
}

function _getTemplateUrl(pkg, file) {
  // URL is only used as an ID in the template cache, due to the inability to
  // access the requirejs config, we use a simplified path here that only
  // includes the package name so modules can define relative template URLs
  // based on their package name only
  return path.join(
    '/', path.basename(pkg.path), path.relative(pkg.path, file));
}
