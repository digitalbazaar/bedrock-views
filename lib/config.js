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
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// dependencies
import '@bedrock/express';

const c = bedrock.util.config.main;
const cc = c.computer();
const {config} = bedrock;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

config.views = {};

// frontend main HTML config
config.views.main = {
  // send file with options if set (checked first)
  file: {
    options: null
  }
};

// frontend bundle config
config.views.bundle = {
  mode: 'development',
  paths: {
    input: {},
    output: {}
  },
  // custom configured pseudo packages
  packages: []
};

// main js entry file
config.views.bundle.paths.input.main =
  path.join(__dirname, 'bundle', 'main.js');
// generated root imports
cc('views.bundle.paths.input.root', () => path.join(
  config.paths.cache, 'bedrock-views', 'root.js'));
// common paths
cc('views.bundle.paths.output.local', () => path.join(
  config.paths.cache, 'bedrock-views', config.views.bundle.mode));
cc('views.bundle.paths.output.public', () => '/static');

// route for output js
c.pushComputed('express.static', () => ({
  route: config.views.bundle.paths.output.public,
  path: config.views.bundle.paths.output.local
}));
