/* global SystemJS */
(async function() {

// configure SystemJS
await SystemJS.import('system/app/config.js');

// load angular and bedrock early
const angular = await SystemJS.import('angular');
const bedrock = await SystemJS.import('bedrock-angular/main.js');

// TODO: remove requirejs shim
global.requirejs = {
  toUrl: x => x
};

// load all detected modules by default
await SystemJS.import('importAll');

// bootstrap angular app
bedrock.bootstrap(
  angular.module('root', ['bedrock', 'angular-basic'])
);

})();
