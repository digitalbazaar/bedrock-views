/* global SystemJS */
(async function() {

// configure SystemJS
await SystemJS.import('system/app/config.js');

// load detected modules and start angular app
await SystemJS.import('importAll');

})();
