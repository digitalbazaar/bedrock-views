/*!
 * Copyright 2012 - 2024 Digital Bazaar, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import * as bedrock from '@bedrock/core';
import * as packages from './packages.js';
import {logger} from './logger.js';

bedrock.events.on('bedrock-cli.init', async () => {
  // add global bundle mode option
  // used to pick target bundle to use
  bedrock.program.option('--bundle-mode <mode>',
    'Bundle name to use or create' +
    ' (development, production, default).',
    /^(development|production|default)$/i, 'default');

  // add common bundle options
  bedrock.program.option('--watch <mode>',
    'Watch resources to trigger bundle run (true, false, mode).',
    /^(true|false|mode)$/i, 'mode');

  // add bundle command
  const bundleCommand = bedrock.program
    .command('bundle')
    .description('Bundle resources for client delivery.')
    .action(() => {
      bedrock.config.cli.command = bundleCommand;
      // log to console at info level
      bedrock.config.loggers.console.level = 'info';
    });
  // allow custom command config
  await bedrock.events.emit(
    'bedrock-views.cli.bundle.configure', bundleCommand);
});

bedrock.events.on('bedrock-cli.ready', async () => {
  const opts = bedrock.program.opts();

  // bundle mode
  let bundleMode;
  if(opts.bundleMode === 'development') {
    bundleMode = 'development';
  } else if(opts.bundleMode === 'production') {
    bundleMode = 'production';
  } else { // 'default'
    bundleMode = bedrock.config.views.bundle.mode;
  }
  // set config to value
  bedrock.config.views.bundle.mode = bundleMode;

  // production mode
  const isProduction = bundleMode === 'production';

  const command = bedrock.config.cli.command;
  if(command.name() === 'bundle') {
    await bedrock.runOnce('bedrock-views.bundle', async () => {
      try {
        await _bundle({optimize: isProduction});
      } catch(err) {
        logger.error('bundle error', {error: err});
        process.exit(1);
      }
      bedrock.exit();
    });
    // run command and quit
    return;
  }

  // watch mode
  let watch;
  if(opts.watch === 'true') {
    watch = true;
  } else if(opts.watch === 'false') {
    watch = false;
  } else {
    watch = !isProduction;
  }

  // run watch if requested
  if(watch) {
    await bedrock.runOnce('bedrock-views.watch', async () => {
      try {
        await _bundle({
          optimize: isProduction,
          watch: true
        });
      } catch(err) {
        logger.error('watch start error', {error: err});
        throw err;
      }
    });
  }
});

async function _bundle({optimize = false, watch = false}) {
  const start = Date.now();
  const pkgs = await packages.readPackages();

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
      output: bedrock.config.views.bundle.paths.output.main,
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
