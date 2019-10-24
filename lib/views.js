/*
 * Bedrock views module.
 *
 * Copyright (c) 2012-2018 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const brExpress = require('bedrock-express');
const consolidate = require('consolidate');
const csrf = require('csurf');
const path = require('path');
const BedrockError = bedrock.util.BedrockError;

// module API
const api = {};
module.exports = api;

bedrock.events.on('bedrock-express.configure.routes', configure);

// configure template engine and add routes from config
function configure(app) {
  // setup views
  let viewPaths = bedrock.config.views.paths;
  if(!Array.isArray(viewPaths)) {
    viewPaths = [viewPaths];
  }
  const paths = viewPaths.map(function(p) {return path.resolve(p);});

  // add the default template engine
  app.engine('html', consolidate[bedrock.config.views.engine]);
  app.set('view engine', 'html');
  app.set('views', paths);

  if(bedrock.config.views.serviceUnavailable) {
    // service unavailable for all requests
    app.all('*', function(req, res/*, next*/) {
      if(!req.accepts('html')) {
        // send 503 with no content
        return res.status(503).send('');
      }
      res.status(503);
      res.render('error-503.html');
    });
    return;
  }
}

// occurs after other modules have configured routes
bedrock.events.on('bedrock-express.start', function(app, callback) {
  // let other modules do last minute configuration before "not found"/default
  // handler is attached (or cancel its attachment)
  bedrock.events.emit('bedrock-views.add', function(err, result) {
    if(err || result === false) {
      return callback(err);
    }

    // add "not found"/default handler now that all other routes are configured
    // include CSRF cookie to help secure <form> POSTs if desired
    // TODO: add config option for CSRF secret cookie name (defaults to `_csrf`)
    const csrfProtection = csrf({cookie: true});
    /* eslint-disable-next-line no-unused-vars */
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
      // use `XSRF-TOKEN` to be compatible w/AngularJS $http service
      res.cookie('XSRF-TOKEN', req.csrfToken());
      res.render('main.html');
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
          public: true
        });
    }
    next(err);
  });
  // 2. handle JSON/JSON-LD errors
  app.use(brExpress.middleware.jsonErrorHandler());
  // 3. handle HTML errors
  /* eslint-disable-next-line no-unused-vars */
  app.use(function(err, req, res, next) {
    // TODO: passing errors to templates was removed
    // if need to restore, pass vars with `vars.error = err.toObject();`
    res.format({
      html: function() {
        // switch between custom or generic templates
        if(res.statusCode === 403) {
          res.render('error-403.html');
        } else if(res.statusCode === 404) {
          // handle with front end
          res.render('main.html');
        } else if(res.statusCode === 503) {
          res.render('error-503.html');
        } else {
          // fallback
          res.render('error.html');
        }
      },
      default: function() {
        res.send();
      }
    });
  });
});
