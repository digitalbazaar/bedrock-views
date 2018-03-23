/* global SystemJS */
(async function() {

// configure SystemJS
await SystemJS.import('system/app/config.js');

// load all detected modules
await SystemJS.import('importAll');

// start bedrock frontend
const bedrock = await SystemJS.import('bedrock-frontend');
bedrock.start();

})();
