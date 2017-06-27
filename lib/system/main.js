/* global SystemJS */
(async function() {

// configure SystemJS
await SystemJS.import('system/app/config.js');

// load all detected modules
await SystemJS.import('importAll');

// start angular app
const bedrock = await SystemJS.import('bedrock-angular');
bedrock.start();

})();
