/*
 * Bedrock views module.
 *
 * Copyright (c) 2012-2017 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const brExpress = require('bedrock-express');
const csrf = require('csurf');
const path = require('path');
const swigcore = require('swig');
const swigLoaders = require('./swig.loaders');
const uaParser = require('ua-parser');
const BedrockError = bedrock.util.BedrockError;

// module API
const api = {};
module.exports = api;

const logger = bedrock.loggers.get('app');

// set the default timezone offset for the template system
swigcore.setDefaultTZOffset(0);

/**
 * Gets a copy of the default view variables.
 *
 * @param req the current request.
 * @param callback(err, vars) called once the operation completes.
 */
api.getDefaultViewVars = function(req, callback) {
  var vars = bedrock.util.clone(bedrock.config.views.vars);

  // include browser user agent
  vars.userAgent = req.userAgent;

  // converts a var to json for later JSON.parse() via a page script
  vars.parsify = function(v) {
    if(v === undefined) {
      // no var given, copy all vars except private data
      v = bedrock.util.extend({}, vars);
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

bedrock.events.on('bedrock-express.configure.static', (app, callback) => {
  // early handler to detect obsolete browsers
  app.use((req, res, next) => {
    const ua = req.userAgent = uaParser.parse(req.headers['user-agent'] || '');
    ua.obsolete = false;
    if(ua.family in bedrock.config.views.browserVersions) {
      const version = bedrock.config.views.browserVersions[ua.family];
      if(ua.major < version.major ||
        (ua.major === version.major && ua.minor < version.minor)) {
        ua.obsolete = true;
      }
    }
    bedrock.config.views.vars.userAgent = ua;
    next();
  });

  callback();
});

bedrock.events.on('bedrock-express.configure.routes', configure);

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
      if(!req.accepts('html')) {
        // send 503 with no content
        return res.status(503).send('');
      }
      api.getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }
        res.status(503);
        res.render('error-503.html', vars);
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
        bedrock.util.extend(true, vars, options.vars);
        res.render(options.template, vars);
      });
    });
  });
}

// occurs after other modules have configured routes
bedrock.events.on('bedrock-express.start', function(app, callback) {
  // let other modules do last minute configuration before "not found"/default
  // handler is attached (or cancel its attachment)
  bedrock.events.emit('bedrock-views.add', function(err, result) {
    if(err || result === false) {
      return callback(err, result);
    }

    // add "not found"/default handler now that all other routes are configured
    // include CSRF cookie to help secure <form> POSTs if desired
    // TODO: add config option for CSRF secret cookie name (defaults to `_csrf`)
    var csrfProtection = csrf({cookie: true});
    app.all('*', csrfProtection, function(req, res, next) {
      if(!req.accepts('html')) {
        // use 404 if already set
        if(res.statusCode !== 404) {
          // send 406 Not Acceptable
          res.status(406);
        }
        // send with no content
        return res.send('');
      }
      api.getDefaultViewVars(req, function(err, vars) {
        if(err) {
          return next(err);
        }
        // use `XSRF-TOKEN` to be compatible w/AngularJS $http service
        res.cookie('XSRF-TOKEN', req.csrfToken());
        res.render('main.html', vars);
      });
    });

    callback();
  });
});

// add late error handler
bedrock.events.on(
  'bedrock-express.configure.unhandledErrorHandler', function(app) {
  // 1. handle CSRF errors
  app.use(function(err, req, res, next) {
    if(err.code === 'EBADCSRFTOKEN') {
      err = new BedrockError(
        'Invalid CSRF token.',
        'InvalidCsrfToken', {
          httpStatusCode: 403,
          'public': true
        });
    }
    next(err);
  });
  // 2. handle JSON/JSON-LD errors
  app.use(brExpress.middleware.jsonErrorHandler());
  // 3. handle HTML errors
  app.use(function(err, req, res, next) {
    api.getDefaultViewVars(req, function(_err, vars) {
      if(_err) {
        return next(_err);
      }
      vars.exception = err.toObject();
      res.format({
        html: function() {
          // switch between custom or generic templates
          if(res.statusCode === 403) {
            res.render('error-403.html', vars);
          } else if(res.statusCode === 404) {
            res.render('main.html', vars);
          } else if(res.statusCode === 503) {
            res.render('error-503.html', vars);
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
