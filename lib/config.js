/*
 * Bedrock Views Module Configuration
 *
 * Copyright (c) 2012-2016 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var c = bedrock.util.config.main;
var cc = c.computer();
var config = bedrock.config;
var path = require('path');

// dependencies
require('bedrock-server');
require('bedrock-requirejs');

config.views = {};

// return 503 Service Unavailable response or page for all requests
config.views.serviceUnavailable = false;

// less config
config.views.less = {};
config.views.less.compile = {};
config.views.less.compile.options = {
  strictMath: true,
  sourceMap: false,
  outputSourceFiles: false
};
config.views.less.compile.order = ['bootstrap', 'font-awesome'];
config.views.less.compile.packages = {
  'font-awesome': {
    files: ['less/font-awesome.less']
  }
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
var componentsUrl = config.requirejs.bower.componentsUrl;
config.views.less.compile.vars = {
  '@fa-font-path': componentsUrl + '/font-awesome/fonts/',
  '@icon-font-path': componentsUrl + '/bootstrap/dist/fonts/'
};
cc('views.less.compile.out', () => path.join(
  config.paths.cache, 'bedrock-views', 'app.css'));

// css config
config.views.css = {};
config.views.css.optimize = {};
config.views.css.optimize.options = {};
cc('views.css.optimize.out', () => path.join(
  config.paths.cache, 'bedrock-views', 'app.min.css'));

// bedrock frontend system loader config
config.views.system = {
  paths: {
    plugins: {}
  }
};

// default SystemJS config
config.views.system.config = {
  baseURL: '/bower-components',
  map: {
    'importAll': '/system/app/importAll.js',
    'plugin-babel': '/system/plugins/babel/plugin-babel.js',
    'systemjs-babel-build': '/system/plugins/babel/systemjs-babel-browser.js'
  },
  meta: {
    '*.js': {
      babelOptions: {
        es2015: false
      }
    },
    '*.json': {
      loader: '/system/plugins/package-loader.js'
    }
  },
  packageConfigPaths: [
    '/bower-components/*/bower.json'
  ],
  packages: {
    angular: {
      main: './angular.js',
      format: 'global',
      defaultExtension: 'js'
    }
  },
  transpiler: 'plugin-babel'
};
// packages to ignore in import all
config.views.system.importAllIgnore = ['angular'];

// set default system paths
config.views.system.paths.systemjs =
  path.dirname(require.resolve('systemjs'));
config.views.system.paths.plugins.babel =
  path.dirname(require.resolve('systemjs-plugin-babel'));
config.views.system.paths.plugins.packageLoader =
  path.join(__dirname, 'system', 'plugin-package-loader.js');
config.views.system.paths.main =
  path.join(__dirname, 'system', 'main.js');
cc('views.system.paths.config', () => path.join(
  config.paths.cache, 'bedrock-views', 'system', 'config.js'));
cc('views.system.paths.importAll', () => path.join(
  config.paths.cache, 'bedrock-views', 'system', 'importAll.js'));

// route for systemJS library
c.pushComputed('express.static', () => ({
  route: '/system',
  path: config.views.system.paths.systemjs
}));
// route for systemJS babel plugin
c.pushComputed('express.static', () => ({
  route: '/system/plugins/babel',
  path: config.views.system.paths.plugins.babel
}));
// route for systemJS package loader plugin
c.pushComputed('express.static', () => ({
  route: '/system/plugins/package-loader.js',
  path: config.views.system.paths.plugins.packageLoader,
  file: true
}));
// route for systemJS main application script
c.pushComputed('express.static', () => ({
  route: '/system/app/main.js',
  path: config.views.system.paths.main,
  file: true
}));
// route for import all config and module
c.pushComputed('express.static', () => ({
  route: '/system/app/config.js',
  path: bedrock.config.views.system.paths.config,
  file: true
}));
c.pushComputed('express.static', () => ({
  route: '/system/app/importAll.js',
  path: bedrock.config.views.system.paths.importAll,
  file: true
}));

// angular config
config.views.angular = {};
config.views.angular.optimize = {};
config.views.angular.optimize.templates = {};
// custom package configurations
config.views.angular.optimize.templates.packages = {};
// Example: (glob patterns are package-relative)
// config.views.optimize.angular.templates.packages.package_name = {
//   src: ['include/glob/**/*.html', '!exclude/glob/**.*.html']
// };
// package-relative default glob patterns, for any auto-detected packages these
// patterns will be appended to the package path to include or exclude
// templates; to exclude prepend '!' to the pattern
config.views.angular.optimize.templates.src = [
  '**/*.html',
  '!**/bower_components/**/*.html',
  '!**/node_modules/**/*.html'
];
// packages and files to specifically ignore when auto-detecting templates
// files must be full paths
config.views.angular.optimize.templates.ignore = {};
config.views.angular.optimize.templates.ignore.packages = ['forge'];
config.views.angular.optimize.templates.ignore.files = [];
// the angular module to add the templates to
config.views.angular.optimize.templates.module = 'bedrock.templates';
cc('views.angular.optimize.templates.out', () => path.join(
  config.paths.cache, 'bedrock-views', 'angular-templates.js'));
// htmlmin options
config.views.angular.optimize.templates.htmlmin = {
  collapseBooleanAttributes: false,
  collapseWhitespace: true,
  removeAttributeQuotes: false,
  removeComments: true,
  removeEmptyAttributes: false,
  removeEmptyElements: false,
  removeRedundantAttributes: false,
  removeScriptTypeAttributes: false,
  removeStyleLinkTypeAttributes: false,
  removeOptionalTags: false
};

// TODO: refactor some of these config settings into other modules

// branding config
config.views.brand = {};
config.views.brand.name = 'Bedrock';

// TODO: backwards compatibility, remove brand at top level of config
config.brand = config.views.brand;

// TODO: remove requirejs config
// requirejs config
config.requirejs.config.deps.push('bedrock-angular');
config.requirejs.bower.ignore.push('es5-shim');
// TODO: can these shims be autogenerated somehow?
config.requirejs.config.shim.jquery = {exports: 'jQuery'};
config.requirejs.config.shim.bootstrap = {deps: ['jquery']};
config.requirejs.config.shim.angular = {exports: 'angular', deps: ['jquery']};

config.views.cache = false;
config.views.paths = [
  path.join(__dirname, '..', 'views')
];

config.views.browserVersions = {
  IE: {major: 8, minor: 0},
  Firefox: {major: 3, minor: 6},
  Opera: {major: 10, minor: 6},
  Safari: {major: 4, minor: 0},
  Chrome: {major: 17, minor: 0}
};

config.views.vars = {
  angular: {
    templates: {
      // maps a template URL to a different template URL that overrides it
      // template URLs should be module-relative; do not include a base
      // path as these are auto-filled when scripts are unoptimized and
      // they are absent when they are optimized:
      // bedrock-angular/foo.html => my-module/replace-foo.html (good)
      // /bower-components/bedrock-angular/foo.html => ... (bad)
      overrides: {}
    }
  },
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
      src: componentsUrl + '/bedrock-angular/img/bedrock.png',
      height: '24',
      width: '182'
    }
  },
  supportDomain: config.server.domain,
  // private variables aren't sent to the client
  _private: {}
};

cc('views.vars.angular.templates.baseUrl',
  () => config.requirejs.bower.componentsUrl);

config.views.routes = [];
