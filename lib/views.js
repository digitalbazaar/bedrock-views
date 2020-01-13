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
function _sendMainHtml(req, res) {
  // use `XSRF-TOKEN` to be compatible w/AngularJS $http service
  res.cookie(
    'XSRF-TOKEN', req.csrfToken(), {secure: true, sameSite: 'Strict'});
  if(bedrock.config.views.main.file.path) {
    res.sendFile(
      bedrock.config.views.main.file.path,
      bedrock.config.views.main.file.options);
  } else {
    res.render(
      bedrock.config.views.main.render.view,
      bedrock.config.views.main.render.vars);
  }
}

// configure template engine and add routes from config
bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // setup csrf
  // include CSRF cookie to help secure <form> POSTs if desired
  // TODO: add config option for CSRF secret cookie name (defaults to `_csrf`)
  csrfProtection = csrf({cookie: {secure: true, sameSite: 'Strict'}});

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
  app.all('*', _whenNotHtml, csrfProtection, _sendMainHtml);
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
  // 3. other handlers
  // - express will display a default HTML error page
  // - in development mode this will show the stack
  // - in production mode this will show a simple text
  // - applications can configure their own error handlers to display
  //   custom HTML if needed
});
