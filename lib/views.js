/*!
 * Copyright 2012 - 2024 Digital Bazaar, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import * as bedrock from '@bedrock/core';
import consolidate from 'consolidate';
import {middleware} from '@bedrock/express';
import path from 'node:path';

// Main HTML File Path
let mainHtmlFilePath;

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
  res.sendFile(mainHtmlFilePath, bedrock.config.views.main.file.options);
}

// configure template engine and add routes from config
bedrock.events.on('bedrock-express.configure.routes', function(app) {
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

bedrock.events.on('bedrock.init', () => {
  // store the location, in-memory, for the webpack generated index.html file
  mainHtmlFilePath = path.join(
    bedrock.config.views.bundle.paths.output.local, 'js', 'index.html');
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
  app.all('*', _whenNotHtml, _sendMainHtml);
});

// add late error handler
const _unhandledErrorHandler =
  'bedrock-express.configure.unhandledErrorHandler';
bedrock.events.on(_unhandledErrorHandler, function(app) {
  // 1. handle JSON/JSON-LD errors / log / set res.statusCode
  app.use(middleware.jsonErrorHandler());
  // 2. other handlers
  // - express will display a default HTML error page
  // - in development mode this will show the stack
  // - in production mode this will show a simple text
  // - applications can configure their own error handlers to display
  //   custom HTML if needed
});
