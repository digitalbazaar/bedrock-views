/*
 * Bedrock views module.
 *
 * Copyright (c) 2012-2018 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const brExpress = require('bedrock-express');
const consolidate = require('consolidate');
const csrf = require('csurf');
const http = require('http');
const path = require('path');
const BedrockError = bedrock.util.BedrockError;

// module API
const api = {};
module.exports = api;

// CSRF middleware
let csrfProtection;

// handler when HTML not acceptable
function _whenNotHtml(req, res, next) {
  if(!req.accepts('html')) {
    // TODO: check if this special case is still needed or can be improved
    // use 404 if already set
    if(res.statusCode === 404) {
      // send "404 Not Found" with no content
      res.send('');
      return;
    }
    // send "406 Not Acceptable"
    res.status(406).send();
    return;
  }
  next();
}

// handler to send main HTML
// if error code set, passed to template so frontend can be configured to
// handle initial possible status codes but be ready for continued navigation
function _sendHtml(req, res) {
  const vars = {};
  // handle errors with main front end with added status indicator
  // default uses a meta http-equiv status code
  // see https://indieweb.org/meta_http-equiv_status
  // custom templates can handle this code as needed
  if(res.statusCode) {
    vars.httpStatusCode = res.statusCode;
    vars.httpStatus =
      `${res.statusCode} ${http.STATUS_CODES[res.statusCode]}`;
  }
  // use `XSRF-TOKEN` to be compatible w/AngularJS $http service
  res.cookie('XSRF-TOKEN', req.csrfToken());
  res.render(bedrock.config.views.main, vars);
}

// configure template engine and add routes from config
bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // setup csrf
  // include CSRF cookie to help secure <form> POSTs if desired
  // TODO: add config option for CSRF secret cookie name (defaults to `_csrf`)
  csrfProtection = csrf({cookie: true});

  // setup views
  let viewPaths = bedrock.config.views.paths;
  if(!Array.isArray(viewPaths)) {
    viewPaths = [viewPaths];
  }
  const paths = viewPaths.map(p => path.resolve(p));

  // add the default template engine
  app.engine('html', consolidate[bedrock.config.views.engine]);
  app.set('view engine', 'html');
  app.set('views', paths);

  if(bedrock.config.views.serviceUnavailable) {
    // service unavailable for all requests
    app.all('*', function(req, res, next) {
      next(new BedrockError(
        'Service Unavailable.',
        'ServiceUnavailable', {
          httpStatusCode: 503,
          public: true
        }));
    });
  }
});

// occurs after other modules have configured routes
bedrock.events.on('bedrock-express.start', async app => {
  // let other modules do last minute configuration before "not found"/default
  // handler is attached (or cancel its attachment)
  const finished = await bedrock.events.emit('bedrock-views.add');
  // check if cancelled
  if(finished === false) {
    return;
  }
  // add default handler now that all other routes are configured
  app.all('*', _whenNotHtml, csrfProtection, _sendHtml);
});

// add late error handler
const _unhandledErrorHandler =
  'bedrock-express.configure.unhandledErrorHandler';
bedrock.events.on(_unhandledErrorHandler, function(app) {
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
  // 2. handle JSON/JSON-LD errors / log / set res.statusCode
  app.use(brExpress.middleware.jsonErrorHandler());
  // 3. handle HTML errors
  app.use(function(err, req, res, next) {
    // continue processing and try to return main HTML for error display
    // TODO: pass errors or processed errors through via res property?
    next();
  }, _whenNotHtml, csrfProtection, _sendHtml);
});
