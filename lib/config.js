/*
 * Bedrock Views Module Configuration
 *
 * Copyright (c) 2012-2018 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const c = bedrock.util.config.main;
const cc = c.computer();
const config = bedrock.config;
const path = require('path');

// dependencies
require('bedrock-server');
require('bedrock-express');

config.views = {};

// render config
// any consolidate.js engine can be used as long as proper lib is installed.
config.views.engine = 'lodash';
// paths to search for views
config.views.paths = [
  path.join(__dirname, '..', 'views')
];

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
