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

// bedrock frontend system loader config
config.views.system = {
  paths: {
    plugins: {}
  },
  // custom configured pseudo packages
  packages: []
};

// default SystemJS config
config.views.system.config = {
  baseURL: '/modules',
  map: {
    'importAll': '/system/app/importAll.js',
    'plugin-babel': '/system/plugins/babel.js',
    'babel-standalone': '/system/babel/babel.js'
  },
  meta: {
    '*.js': {
      babelOptions: {
        plugins: [
          'syntax-dynamic-import',
          'transform-es2015-modules-systemjs',
          'transform-object-rest-spread'
        ],
        presets: ['es2016']
        //es2015
        //es2016
        //es2017
        //latest
        //react
        //'stage-0'
        //'stage-1'
        //'stage-2'
        //'stage-3'
      }
    },
    '*.json': {
      loader: '/system/plugins/json-loader.js'
    },
    'crypto/package.json': {
      loader: '/system/plugins/package-loader.js'
    },
    'crypto/index.js': {
      loader: '/system/plugins/package-loader.js'
    },
    'package.json': {
      loader: '/system/plugins/package-loader.js'
    },
    '*.vue': {
      loader: '/system/plugins/vue-loader.js',
      vue: {
        compiler: '/system/vue/compiler'
      }
    }
  },
  packageConfigPaths: [
    '/modules/*/package.json',
    '/modules/@*/*/package.json'
  ],
  packages: {},
  transpiler: 'plugin-babel'
};
// packages to ignore in import all
config.views.system.importAllIgnore = [];

// set default system paths
config.views.system.paths.systemjs =
  path.dirname(require.resolve('systemjs'));
config.views.system.paths.babel =
  path.dirname(require.resolve('babel-standalone'));
config.views.system.paths.plugins.babel =
  path.join(__dirname, 'system', 'plugin-babel.js');
config.views.system.paths.plugins.jsonLoader =
  path.join(__dirname, 'system', 'plugin-json-loader.js');
config.views.system.paths.plugins.packageLoader =
  path.join(__dirname, 'system', 'plugin-package-loader.js');
config.views.system.paths.plugins.vueLoader =
  path.join(__dirname, 'system', 'plugin-vue-loader.js');
config.views.system.paths.main =
  path.join(__dirname, 'system', 'main.js');
config.views.system.paths.mainModule =
  path.join(__dirname, 'system', 'main-module.js');
cc('views.system.paths.config', () => path.join(
  config.paths.cache, 'bedrock-views', 'system', 'config.js'));
cc('views.system.paths.importAll', () => path.join(
  config.paths.cache, 'bedrock-views', 'system', 'importAll.js'));
// minimization cache paths
cc('views.system.paths.mainMin', () => path.join(
  config.paths.cache, 'bedrock-views', 'system', 'main.min.js'));
cc('views.system.paths.optimize.local', () => path.join(
  config.paths.cache, 'bedrock-views', 'system'));
cc('views.system.paths.optimize.public', () => '/system/app');
// vue cache paths
cc('views.system.paths.vue.cache', () => path.join(
  config.paths.cache, 'bedrock-views', 'vue', 'cache'));

// route for SystemJS library
c.pushComputed('express.static', () => ({
  route: '/system',
  path: config.views.system.paths.systemjs
}));
// route for babel standalone library
c.pushComputed('express.static', () => ({
  route: '/system/babel',
  path: config.views.system.paths.babel
}));
// route for SystemJS babel plugin
c.pushComputed('express.static', () => ({
  route: '/system/plugins/babel.js',
  path: config.views.system.paths.plugins.babel
}));
// route for SystemJS json loader plugin
c.pushComputed('express.static', () => ({
  route: '/system/plugins/json-loader.js',
  path: config.views.system.paths.plugins.jsonLoader,
  file: true
}));
// route for SystemJS package loader plugin
c.pushComputed('express.static', () => ({
  route: '/system/plugins/package-loader.js',
  path: config.views.system.paths.plugins.packageLoader,
  file: true
}));
// route for SystemJS Vue Single File Component loader plugin
c.pushComputed('express.static', () => ({
  route: '/system/plugins/vue-loader.js',
  path: config.views.system.paths.plugins.vueLoader,
  file: true
}));
// route for SystemJS main application script
c.pushComputed('express.static', () => ({
  route: '/system/app/main.js',
  path: config.views.system.paths.main,
  file: true
}));
// route for SystemJS config script
c.pushComputed('express.static', () => ({
  route: '/system/app/config.js',
  path: config.views.system.paths.config,
  file: true
}));
// route for script that imports all modules
c.pushComputed('express.static', () => ({
  route: '/system/app/importAll.js',
  path: config.views.system.paths.importAll,
  file: true
}));
// route for optimized js
c.pushComputed('express.static', () => ({
  route: config.views.system.paths.optimize.public,
  path: config.views.system.paths.optimize.local
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
const componentsUrl = config.views.system.config.baseURL;
config.views.less.compile.vars = {
/*  '@fa-font-path': componentsUrl + '/font-awesome/fonts/' */
};
cc('views.less.compile.vars.@bedrock-module-path',
  () => config.views.system.config.baseURL);
cc('views.less.compile.out', () => path.join(
  config.paths.cache, 'bedrock-views', 'app.css'));

// css config
config.views.css = {};
config.views.css.optimize = {};
config.views.css.optimize.options = {};
cc('views.css.optimize.out', () => path.join(
  config.paths.cache, 'bedrock-views', 'app.min.css'));
// route for compiled css
c.pushComputed('express.static', () => ({
  route: '/css/bedrock-views.css',
  path: config.views.less.compile.out,
  file: true
}));
// route for compiled nad minified css
c.pushComputed('express.static', () => ({
  route: '/css/bedrock-views.min.css',
  path: config.views.css.optimize.out,
  file: true
}));

// TODO: refactor some of these config settings into other modules

// branding config
config.views.brand = {};
config.views.brand.name = 'Bedrock';

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
