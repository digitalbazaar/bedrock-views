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
  config.paths.cache, 'bedrock-views', 'js'));
cc('views.bundle.paths.output.public', () => '/static/js');
// normal paths
cc('views.bundle.paths.output.main', () => path.join(
  config.paths.cache, 'bedrock-views', 'js', 'bundle.js'));
// optimized paths
cc('views.bundle.paths.output.optimize.main', () => path.join(
  config.paths.cache, 'bedrock-views', 'js', 'bundle.min.js'));

// route for optimized js
c.pushComputed('express.static', () => ({
  route: config.views.bundle.paths.output.public,
  path: config.views.bundle.paths.output.local
}));

// less config
config.views.less = {};
config.views.less.compile = {};
config.views.less.compile.options = {
  strictMath: true,
  sourceMap: false,
  outputSourceFiles: false
};
config.views.less.compile.order = [/*'bootstrap', 'font-awesome'*/];
config.views.less.compile.packages = {
/*  'font-awesome': {
    files: ['less/font-awesome.less']
  }*/
};
/* Note: to modify default compile less behavior for a package, specify
a package override:

// this will replace the default compile less behavior for the package
// `angular-material` such that only `angular-material.css` is compiled
// and it is imported as regular CSS, not as less
config.views.less.compile.packages['angular-material'] = {
  files: [{name: 'angular-material.css', importAsLess: false}]
};

// this will replace the default compile less behavior for the package
// `angular-material` such that no files are compiled
// (whatever you don't specify won't be compiled)
config.views.less.compile.packages['angular-material'] = {
  files: []
};
*/
config.views.less.compile.files = [];
// TODO: consider adding feature to read less vars (like paths)
// from package files bend toward zero config
const componentsUrl = config.views.modules.baseURL;
config.views.less.compile.vars = {
/*  '@fa-font-path': componentsUrl + '/font-awesome/fonts/' */
};
cc('views.less.compile.vars.@bedrock-module-path',
  () => config.views.modules.baseURL);
cc('views.less.compile.out', () => path.join(
  config.paths.cache, 'bedrock-views', 'css', 'main.css'));

// css config
config.views.css = {};
config.views.css.optimize = {};
config.views.css.optimize.options = {};
cc('views.css.optimize.out', () => path.join(
  config.paths.cache, 'bedrock-views', 'css', 'main.min.css'));
// route for compiled css
c.pushComputed('express.static', () => ({
  route: '/static/css/main.css',
  path: config.views.less.compile.out,
  file: true
}));
// route for compiled and minified css
c.pushComputed('express.static', () => ({
  route: '/static/css/main.min.css',
  path: config.views.css.optimize.out,
  file: true
}));

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
