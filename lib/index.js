/*
 * Bedrock views module.
 *
 * Copyright (c) 2012-2017 Digital Bazaar, Inc. All rights reserved.
 */
require('bedrock');

// load config defaults
require('./config');

// module API
const api = {};
module.exports = api;

require('./commands');
const packages = require('./packages');
const views = require('./views');

// expose public API
api.getDefaultViewVars = views.getDefaultViewVars;
api.readPackagesSync = packages.readPackagesSync;
