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

// return 503 Service Unavailable response or page for all requests
config.views.serviceUnavailable = false;

config.views.modules = {};
// public path base for modules
config.views.modules.baseURL = '/modules';

// bedrock frontend bundle config
config.views.bundle = {
  paths: {
    input: {},
    output: {}
  },
  // custom configured pseudo packages
  packages: []
};
// backwards compatability
config.views.system = config.views.bundle;

// main entry file
config.views.bundle.paths.input.main =
  path.join(__dirname, 'bundle', 'main.js');
// generated root imports
cc('views.bundle.paths.input.root', () => path.join(
  config.paths.cache, 'bedrock-views', 'root.js'));
// common paths
cc('views.bundle.paths.output.local', () => path.join(
  config.paths.cache, 'bedrock-views', 'static'));
cc('views.bundle.paths.output.public', () => '/static');
// normal paths
cc('views.bundle.paths.output.main', () => path.join(
  config.views.bundle.paths.output.local, 'js', 'bundle.js'));
// optimized paths
cc('views.bundle.paths.output.optimize.main', () => path.join(
  config.views.bundle.paths.output.local, 'js', 'bundle.min.js'));

// route for optimized js
c.pushComputed('express.static', () => ({
  route: config.views.bundle.paths.output.public,
  path: config.views.bundle.paths.output.local
}));

// TODO: consider adding feature to read less vars (like paths)
// from package files bend toward zero config
const componentsUrl = config.views.modules.baseURL;

// TODO: refactor some of these config settings into other modules

// branding config
config.views.brand = {};
config.views.brand.name = '';

// TODO: backwards compatibility, remove brand at top level of config
config.brand = config.views.brand;

config.views.cache = false;
config.views.paths = [
  path.join(__dirname, '..', 'views')
];

config.views.browserVersions = {
  IE: {major: 11, minor: 0},
  Firefox: {major: 28, minor: 0},
  Opera: {major: 12, minor: 1},
  Safari: {major: 6, minor: 1},
  Chrome: {major: 29, minor: 0}
};

config.views.vars = {
  baseUri: config.server.baseUri,
  // contact and social media details
  // blog, email, facebook, github, googlePlus, irc, twitter, youtube
  //   *: {label: '...', url: '...'}
  //   email: {..., email: '...'}
  contact: {},
  contextUrls: {},
  contextMap: {
    'https://w3id.org/security/v1':
      config.server.baseUri + '/contexts/security-v1.jsonld'
  },
  copyright: {
    show: true,
    agent: {
      id: 'http://digitalbazaar.com/contact#company',
      name: 'Digital Bazaar, Inc.',
      url: 'http://digitalbazaar.com/'
    },
    date: '2015'
  },
  footer: {
    show: true,
    docs: {
      show: true,
      link: '/docs',
      label: 'API'
    }
  },
  debug: true,
  demoWarningUrl: 'https://bedrock.dev/wiki/Demo_Warning',
  keygen: {
    // key generation config
    bits: 2048
  },
  flags: {
    enableCreateIdentity: true
  },
  forms: {
    vocabs: []
  },
  googleAnalytics: {
    enabled: false,
    account: ''
  },
  minify: false,
  pageLayout: 'normal',
  // max time to wait in milliseconds before assuming a page is fully rendered
  renderTimeout: 500,
  title: config.brand.name,
  siteTitle: config.brand.name,
  style: {
    brand: {
      alt: config.brand.name,
      // FIXME: provide default brand image?
      src: componentsUrl + '/example/img/bedrock.png',
      height: '24',
      width: '182'
    }
  },
  supportDomain: config.server.domain,
  // private variables aren't sent to the client
  _private: {}
};

config.views.routes = [];
