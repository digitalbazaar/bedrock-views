/*
 * Bedrock views module.
 *
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brRequire = require('bedrock-requirejs');
var fs = require('fs');
var path = require('path');
var swigcore = require('swig');
var swigLoaders = require('./swig.loaders');
var uaParser = require('ua-parser');
var BedrockError = bedrock.tools.BedrockError;
var less = require('less');

// load config defaults
require('./config');

// constants
var MODULE_NS = 'bedrock.website';

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
      command.name = 'compile-less';
      bedrock.config.cli.command = command;
      // log to console at info level
      bedrock.config.loggers.console.level = 'info';
    });
});

bedrock.events.on('bedrock-cli.ready', function(callback) {
  if(bedrock.config.cli.command.name === 'compile-less') {
    return _compileLess(function(err) {
      if(err) {
        process.exit(0);
      }
      bedrock.exit();
    });
  }
  callback();
});

/**
 * Gets a copy of the default view variables.
 *
 * @param req the current request.
 * @param callback(err, vars) called once the operation completes.
 */
api.getDefaultViewVars = function(req, callback) {
  var vars = bedrock.tools.clone(bedrock.config.website.views.vars);

  // include browser user agent
  vars.userAgent = req.userAgent;

  // converts a var to json for later JSON.parse() via a page script
  vars.parsify = function(v) {
    return "JSON.parse('" + JSON.stringify(v)
      .replace(/\\n/g, '\\\\n')
      .replace(/\\r/g, '\\\\r')
      .replace(/\"/g, "\\\"")
      .replace(/'/g, "\\'") + "')";
  };

  // make some config vars available to client
  vars.clientData.minify = vars.minify;
  vars.clientData.contextUrl = bedrock.config.constants.CONTEXT_URL;
  vars.clientData.identityBasePath = bedrock.config.identity.basePath;
  vars.clientData.identityBaseUri =
    vars.baseUri + bedrock.config.identity.basePath;

  if(!req.isAuthenticated()) {
    return callback(null, vars);
  }

  // add session vars
  var user = req.user;
  vars.session.auth = true;
  vars.session.loaded = true;
  vars.session.identity = bedrock.tools.clone(user.identity);
  if(user.identity.label) {
    vars.session.name = user.identity.label;
  } else {
    vars.session.name = user.identity.id;
  }
  vars.clientData.session = vars.session;

  // TODO: use event system to allow other modules to attach view vars
  async.auto({
    // TODO: get identities that session identity is a memberOf? (orgs)
    getIdentities: function(callback) {
      callback();
    },
    custom: ['getIdentities', function(callback) {
      bedrock.events.emit('bedrock-views.vars.get', req, vars, callback);
    }]
  }, function(err) {
    callback(err, vars);
  });
};

bedrock.events.on('bedrock-express.configure.static', function(app) {
  // early handler to detect obsolete browsers
  app.use(function(req, res, next) {
    var ua = req.userAgent = uaParser.parse(req.headers['user-agent'] || '');
    ua.obsolete = false;
    if(ua.family in bedrock.config.website.browserVersions) {
      var version = bedrock.config.website.browserVersions[ua.family];
      if(ua.major < version.major ||
        (ua.major === version.major && ua.minor < version.minor)) {
        ua.obsolete = true;
      }
    }
    next();
  });
});

bedrock.events.on('bedrock-express.configure.routes', configure);

// configure template engine and add routes from config
function configure(app) {
  // setup views
  var viewPaths = bedrock.config.website.views.paths;
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
        cache: bedrock.config.website.views.cache ? 'memory' : false,
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

  if(bedrock.config.environment === 'down') {
    // system down output for all requests
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
  bedrock.config.website.views.routes.forEach(function(route) {
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
          res.send(404, '');
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
      err.name === 'bedrock.permission.PermissionDenied');

    // wrap non-bedrock errors
    if(!(err instanceof BedrockError)) {
      err = new BedrockError(
        'An error occurred.',
        MODULE_NS + '.Error', null, err);
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
  logger.info('compiling less and combining css from bower packages...');

  var cfg = bedrock.config.views.less.compile;
  var pkgs = brRequire.readBowerPackagesSync();

  var sorted = _sortPackages(pkgs);
  if(sorted.length === 0) {
    // nothing to compile
    logger.info('no bower packages found.');
    return callback();
  }

  // create less source
  var src = '';
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
      var filename = path.resolve(path.join(pkg.path, file));
      var extension = path.extname(filename);
      logger.info('importing ' + extension.substr(1) + ': ' + filename);
      src += '@import ';
      if(extension === '.css') {
        src += '(less) ';
      }
      src += '"' + filename + '"' + ';\n';
    });
  });

  if(src === '') {
    logger.info('no less or css found.');
    return callback();
  }

  // add any local less files from config
  cfg.files.forEach(function(file) {
    var filename = path.resolve(file);
    src += '"' + filename + '"' + ';\n';
  });

  // add local variables from config
  for(var varname in cfg.vars) {
    src += varname + ': "' + cfg.vars[varname] + '";\n';
  }

  less.render(src, cfg.options, function(err, output) {
    if(err) {
      logger.error('less compilation failed', err);
      return callback(err);
    }
    // output.css = string of css
    // output.map = string of sourcemap
    // output.imports = array of string filenames of the imports referenced
    fs.writeFileSync(cfg.output, output.css, {encoding: 'utf8'});
    var bytes = _byteSizeToString(output.css.length, 2);
    logger.info(bytes + ' written to: ' + cfg.output);
    logger.info('finished.');
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
