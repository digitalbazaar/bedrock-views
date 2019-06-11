/*
 * CLI commands.
 *
 * Copyright (c) 2012-2019 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const {callbackify} = require('util');
const logger = require('./logger');
const packages = require('./packages');

// module API
const api = {};
module.exports = api;

bedrock.events.on('bedrock-cli.init', () => {
  // add minify option
  bedrock.program.option('--minify <mode>',
    'Override configured minified mode (true, false, config) [config].',
    /^(true|false|config)$/i, 'config');
});

bedrock.events.on('bedrock-cli.init', () => {
  // add optimize command
  const command = bedrock.program
    .command('optimize')
    .description('Optimize resources for client delivery.')
    .action(() => {
      bedrock.config.cli.command = command;
      // log to console at info level
      bedrock.config.loggers.console.level = 'info';
    })
    .option(
      '--css',
      'Only optimize CSS resources.')
    .option(
      '--js',
      'Only optimize JavaScript resources.');

  bedrock.events.emit('bedrock-views.cli.optimize.configure', command);
});

bedrock.events.on('bedrock-cli.init', () => {
  // add common bundle options
  bedrock.program.option('--watch <mode>',
    'Watch resources to trigger bundle run (true, false) [false].',
    /^(true|false)$/i, 'false');
  bedrock.events.emit('bedrock-views.cli.bundle.configure', bedrock.program);
});

bedrock.events.on('bedrock-cli.ready', callback => {
  const command = bedrock.config.cli.command;
  if(command.name() === 'optimize') {
    bedrock.runOnce('bedrock-views.optimize', callback => {
      // load any bedrock configs for packages
      const pkgs = packages.readPackagesSync();
      for(const name in pkgs) {
        pkgs[name].requireBedrockConfig();
      }

      if(!command.css && !command.js) {
        // turn on defaults
        command.css = command.js = true;
      }
      // FIXME: add css/js only options?
      callbackify(_bundle)({optimize: true}, callback);
    }, err => err ? process.exit(1) : bedrock.exit());
    // run command and quit without calling callback
    return;
  }

  // set and update minify mode
  let minify = bedrock.config.views.vars.minify;
  if(bedrock.program.minify === 'true') {
    minify = bedrock.config.views.vars.minify = true;
  } else if(bedrock.program.minify === 'false') {
    minify = bedrock.config.views.vars.minify = false;
  }

  // set watch mode
  const watch = (bedrock.program.watch === 'true');

  // run watch in non-minify mode or if requested
  if(!minify || watch) {
    bedrock.runOnce('bedrock-views.watch', callback => {
      callbackify(_bundle)({
        optimize: minify,
        watch: true
      }, callback);
    }, err => {
      if(err) {
        logger.error('watch start error', {error: err});
      }
      return callback(err);
    });
  } else {
    callback();
  }
});

async function _bundle({optimize = false, watch = false}) {
  const start = Date.now();
  const pkgs = packages.readPackagesSync();

  logger.info('bundling...', {optimize, watch});

  await packages.buildRootModule();
  try {
    const options = {
      optimize,
      watch,
      input: [
        bedrock.config.views.bundle.paths.input.main
      ],
      pkgs,
      output: optimize ?
        bedrock.config.views.bundle.paths.output.optimize.main :
        bedrock.config.views.bundle.paths.output.main,
      paths: {
        local: bedrock.config.views.bundle.paths.output.local,
        public: bedrock.config.views.bundle.paths.output.public
      }
    };
    // FIXME: document this better:
    // options:
    //   input: array of input files to optimize together
    //   output: filename to output
    await bedrock.events.emit('bedrock-views.bundle.run', options);
    const timeMs = Date.now() - start;
    logger.info('bundling complete', {timeMs});
  } catch(err) {
    logger.error('bundling error', {error: err});
    throw err;
  }
}
