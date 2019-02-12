(async function() {

  // configure SystemJS
  await SystemJS.import('system/app/config.js');

  // load all detected modules
  await SystemJS.import('importAll');

  // start bedrock web app
  const bedrock = await SystemJS.import('bedrock-web');
  bedrock.start();

})();
