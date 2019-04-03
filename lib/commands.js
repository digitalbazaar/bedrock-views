/*
 * CLI commands.
 *
 * Copyright (c) 2012-2018 Digital Bazaar, Inc. All rights reserved.
 *
 * Some code taken from:
 * grunt-angular-templates
 * https://github.com/ericclemmons/grunt-angular-templates
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */
const _ = require('lodash');
const async = require('async');
const bedrock = require('bedrock');
const fs = require('fs');
const glob = require('glob');
const htmlMinifier = require('html-minifier');
const less = require('less');
const logger = require('./logger');
const minimatch = require('minimatch');
const mkdirp = require('mkdirp');
const path = require('path');
const CleanCSS = require('clean-css');
const packages = require('./packages');

// module API
const api = {};
module.exports = api;

bedrock.events.on('bedrock-cli.init', () => {
  // add minify option
  bedrock.program.option('--minify <mode>',
    'Set minified resource mode (true, false) [false].',
    /^(true|false)$/i, 'false');
});

bedrock.events.on('bedrock-cli.init', () => {
  // add compile-less command
  const command = bedrock.program
    .command('compile-less')
    .description('Compile less and combine css from installed browser ' +
      'packages into a single css file.')
    .action(() => {
      bedrock.config.cli.command = command;
      // log to console at info level
      bedrock.config.loggers.console.level = 'info';
    });

  bedrock.events.emit('bedrock-views.cli.compile-less.configure', command);
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
  if(command.name() === 'compile-less') {
    bedrock.runOnce(
      'bedrock-views.compileLess', callback => _compileLess(callback),
      err => err ? process.exit(1) : bedrock.exit());
    // run command and quit without calling callback
    return;
  }
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
      async.auto({
        css: function(callback) {
          if(!command.css) {
            return callback();
          }
          _optimizeCSS(callback);
        },
        js: function(callback) {
          if(!command.js) {
            return callback();
          }
          _bundle({optimize: true}, callback);
        }
      }, function(err) {
        callback(err);
      });
    }, err => err ? process.exit(1) : bedrock.exit());
    // run command and quit without calling callback
    return;
  }

  // handle forced minify mode
  if(bedrock.program.minify === 'true') {
    bedrock.config.views.vars.minify = true;
  } else if(bedrock.program.minify === 'false') {
    bedrock.config.views.vars.minify = false;
  }

  // run watch in non-minify mode or if requested
  if(bedrock.program.minify === 'false' || bedrock.program.watch === 'true') {
    bedrock.runOnce('bedrock-views.watch', callback => {
      _bundle({
        optimize: bedrock.program.minify === 'true',
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

function _compileLess(callback) {
  logger.info('Compiling less and combining css from browser packages...');

  const cfg = bedrock.config.views.less.compile;
  const pkgs = packages.readPackagesSync();
  const start = Date.now();

  if(Object.keys(pkgs).length === 0) {
    // nothing to compile
    logger.info('No browser packages found.');
    return callback();
  }

  // find less and css files
  const _fileOpts = [];
  for(const name in pkgs) {
    const pkg = pkgs[name];
    let files;
    if(pkg.manifest.name in cfg.packages) {
      // use alternative configuration
      files = cfg.packages[pkg.manifest.name].files || [];
    } else {
      // auto-find less files first, then css files
      files = pkg.findMainFiles('.less');
      if(files.length === 0) {
        files = pkg.findMainFiles('.css');
      }
    }

    if(!files) {
      // nothing to import
      return;
    }

    files.forEach(file => {
      const opts = fileToOpts(file);
      opts.name = path.resolve(path.join(pkg.path, opts.name));
      _fileOpts.push(opts);
    });
  }

  // add any local less files from config
  _fileOpts.push.apply(_fileOpts, cfg.files.map(fileToOpts));

  if(_fileOpts.length === 0) {
    logger.info('No less or css found.');
    return callback();
  }

  let src = '';
  _fileOpts.forEach(opt => {
    src += '@import ';
    const extension = path.extname(opt.name);
    if(extension === '.css') {
      if(opt.importAsLess) {
        src += '(less) ';
      } else {
        src += '(inline) ';
      }
    }
    src += '"' + opt.name + '"' + ';\n';
  });

  logger.info(
    'Adding `bedrock.config.views.less.compile.vars`:\n' +
    JSON.stringify(cfg.vars, null, 2));

  // add local variables from config
  let localVars = '';
  for(const varname in cfg.vars) {
    localVars += varname + ': "' + cfg.vars[varname] + '";\n';
  }
  src += localVars;

  logger.info(
    'Compiling less imports and locally configured variables:\n' + src);

  async.auto({
    compile: callback => less.render(src, cfg.options, callback),
    mkdirp: callback => mkdirp.mkdirp(path.dirname(cfg.out), callback),
    // output.css = string of css
    // output.map = string of sourcemap
    // output.imports = array of string filenames of the imports referenced
    write: ['compile', 'mkdirp', (results, callback) =>
      fs.writeFile(cfg.out, results.compile.css, {encoding: 'utf8'}, callback)
    ],
    stat: ['write', (results, callback) => fs.stat(cfg.out, callback)],
    report: ['stat', (results, callback) => {
      const bytes = _byteSizeToString(results.stat.size, 2);
      const time = Date.now() - start;
      logger.info(
        'Less compilation complete (' + bytes + ') in ' + time + 'ms. ' +
        'Written to: ' + cfg.out);
      callback();
    }]
  }, function(err) {
    if(err) {
      logger.error('Less compilation failed', err);
    }
    callback(err);
  });

  function fileToOpts(file) {
    let opts;
    if(typeof file === 'string') {
      opts = {};
      opts.name = file;
      const extension = path.extname(file);
      if(extension === '.css') {
        // default to importing CSS as less
        opts.importAsLess = true;
      }
    } else if(typeof file === 'object') {
      opts = _.assign({}, file);
    } else {
      throw new TypeError('CSS/LESS file must be a string or an object.');
    }
    return opts;
  }
}

function _byteSizeToString(bytes, precision) {
  // cribbed from: https://gist.github.com/thomseddon/3511330
  bytes = parseFloat(bytes);

  if(bytes === 0) {
    return '0 bytes';
  }
  if(bytes === 1) {
    return '1 byte';
  }
  if(isNaN(bytes) || !isFinite(bytes)) {
    return '-';
  }
  if(typeof precision === 'undefined') {
    precision = 1;
  }

  const units = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  const number = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision);

  return (value.match(/\.0*$/) ?
    value.substr(0, value.indexOf('.')) : value) + ' ' + units[number];
}

function _optimizeCSS(callback) {
  const start = Date.now();

  logger.info('Optimizing CSS...');

  async.auto({
    compile: callback => _compileLess(callback),
    read: ['compile', (results, callback) => {
      logger.info('Minifying CSS...');
      fs.readFile(
        bedrock.config.views.less.compile.out, {encoding: 'utf8'}, callback);
    }],
    mkdirp: callback => mkdirp.mkdirp(
      path.dirname(bedrock.config.views.css.optimize.out), callback),
    minify: ['read', 'mkdirp', (results, callback) => {
      const source = results.read;
      const minified = new CleanCSS().minify(source).styles;
      fs.writeFile(
        bedrock.config.views.css.optimize.out, minified, {encoding: 'utf8'},
        callback);
    }],
    report: ['minify', (results, callback) => {
      const inSize = fs.statSync(bedrock.config.views.less.compile.out).size;
      const outSize = fs.statSync(bedrock.config.views.css.optimize.out).size;
      const time = Date.now() - start;
      logger.info('CSS minification complete (' +
        _byteSizeToString(inSize, 2) + ' => ' + _byteSizeToString(outSize, 2) +
        ') in ' + time + 'ms. Written to: ' +
        bedrock.config.views.css.optimize.out);
      callback();
    }]
  }, err => {
    if(err) {
      logger.error('CSS optimization failed', err);
    } else {
      logger.info('CSS optimization complete.');
    }
    callback(err);
  });
}

function _bundle({optimize = false, watch = false}, callback) {
  const start = Date.now();
  const pkgs = packages.readPackagesSync();

  logger.info('bundling...', {optimize, watch});

  async.auto({
    templates: callback => _optimizeAngularTemplates(callback),
    buildImportAll: callback => packages.buildImportAllModule(callback),
    bundle: ['templates', 'buildImportAll', (results, callback) => {
      const input = [
        bedrock.config.views.system.paths.mainModule
      ];
      if(results.templates) {
        // include angular templates if any were found
        input.shift(bedrock.config.views.angular.optimize.templates.out);
      }
      const options = {
        optimize,
        watch,
        input,
        pkgs,
        output: bedrock.config.views.system.paths.mainMin,
        paths: {
          local: bedrock.config.views.system.paths.optimize.local,
          public: bedrock.config.views.system.paths.optimize.public
        }
      };
      // FIXME: document this better:
      // options:
      //   input: array of input files to optimize together
      //   output: filename to output
      bedrock.events.emit('bedrock-views.bundle.run', options, callback);
    }]
  }, err => {
    const timeMs = Date.now() - start;
    if(err) {
      logger.error('bundling error', {timeMs, error: err});
    } else {
      logger.info('bundling complete', {timeMs});
    }
    callback(err);
  });
}

function _optimizeAngularTemplates(callback) {
  logger.info('Angular template optimizer running...');

  let hasTemplates = true;
  const cfg = bedrock.config.views.angular.optimize.templates;
  let inSize = 0;
  const start = Date.now();
  async.auto({
    get: callback => _getAngularTemplates(callback),
    mkdirp: callback => mkdirp.mkdirp(path.dirname(cfg.out), callback),
    prefix: ['get', 'mkdirp', (results, callback) => {
      if(!results.get) {
        // no templates to cache, remove file
        hasTemplates = false;
        return fs.unlink(cfg.out, err => {
          if(err && err.code === 'ENOENT') {
            err = null;
          }
          callback(err);
        });
      }
      const data = [
        'import angular from \'angular\';\n',
        'import \'bedrock-angular\';\n',
        'angular.module(\'bedrock\')',
        '.run([\'$templateCache\', function($templateCache) {\n'
      ].join('');
      fs.writeFile(cfg.out, data, {encoding: 'utf8'}, callback);
    }],
    optimize: ['get', 'prefix', (results, callback) => {
      if(!results.get) {
        // no templates to cache
        return callback();
      }
      logger.info('Minifying angular templates...');
      try {
        const pkgCfgs = results.get;
        // TODO: implement multiprocessing?
        pkgCfgs.forEach(pkgCfg => {
          pkgCfg.files.forEach(file => {
            inSize += fs.statSync(file).size;
            const template = _optimizeTemplate(pkgCfg, file);
            fs.appendFileSync(cfg.out, template, {encoding: 'utf8'});
          });
        });
      } catch(e) {
        return callback(e);
      }
      callback();
    }],
    suffix: ['optimize', (results, callback) => {
      if(!results.get) {
        // no templates to cache
        return callback();
      }
      const data = '}]);\n';
      fs.appendFile(cfg.out, data, {encoding: 'utf8'}, callback);
    }],
    report: ['suffix', (results, callback) => {
      if(!results.get) {
        // no templates to cache
        return callback();
      }
      const outSize = fs.statSync(cfg.out).size;
      const time = Date.now() - start;
      logger.info('Angular template optimization complete (' +
        _byteSizeToString(inSize, 2) + ' => ' + _byteSizeToString(outSize, 2) +
        ') in ' + time + 'ms. Written to: ' + cfg.out);
      callback();
    }]
  }, err => callback(err, hasTemplates));
}

function _htmlToString(html) {
  return html.split(/^/gm).map(line => JSON.stringify(line))
    .join(' +\n    ') || '""';
}

function _optimizeTemplate(pkgCfg, file) {
  const url = _getTemplateUrl(pkgCfg.pkg, file);
  let template = fs.readFileSync(file, {encoding: 'utf8'});
  try {
    template = htmlMinifier.minify(
      template, bedrock.config.views.angular.optimize.templates.htmlmin);
  } catch(e) {
    logger.warning('Could not minify "' + file + '"', e);
  }
  const compiled = _.template(
    '\n  $templateCache.put(\'<%= url %>\',\n  <%= template %>\n  );\n');
  return compiled({url, template: _htmlToString(template)});
}

function _getAngularTemplates(callback) {
  const pkgs = packages.readPackagesSync();
  if(Object.keys(pkgs).length === 0) {
    // no templates to include
    logger.info('No browser packages found.');
    return callback();
  }

  // build package configs
  const config = bedrock.config.views.angular.optimize.templates;
  let pkgCfgs = [];
  const pkgCfgs_ = config.packages;
  const ignore = config.ignore;
  for(const name in pkgs) {
    const pkg = pkgs[name];

    // ignore any specified packages
    if(ignore.packages.indexOf(name) !== -1) {
      logger.debug('Angular template optimizer ignoring package: ' + name);
      continue;
    }

    const pkgCfg = {pkg};
    let patterns;
    if(name in pkgCfgs_) {
      // use custom source globs
      patterns = pkgCfgs_[name].src;
    } else if(pkg.manifest.dependencies &&
      ('angular' in pkg.manifest.dependencies ||
      'bedrock-angular' in pkg.manifest.dependencies)) {
      // use default source globs
      patterns = config.src;
    } else {
      // no custom config and no angular dependency, skip package
      logger.debug(
        'Angular template optimizer ignoring non-angular-based package: ' +
        name);
      continue;
    }

    // build patterns
    pkgCfg.src = [];
    patterns.forEach(pattern => {
      const base = path.resolve(pkg.path);
      if(pattern.indexOf('!') === 0) {
        pkgCfg.src.push('!' + path.resolve(base, pattern.substr(1)));
      } else {
        pkgCfg.src.push(path.resolve(base, pattern));
      }
    });
    pkgCfgs.push(pkgCfg);
  }

  async.auto({
    getFiles: callback => {
      // convert globs to files
      const includePatterns = [];
      const excludePatterns = [];
      async.each(pkgCfgs, (pkgCfg, callback) => {
        const options = {
          base: path.resolve(pkgCfg.pkg.path),
          includePatterns,
          excludePatterns
        };
        _glob(pkgCfg.src, options, (err, files) => {
          if(err) {
            return callback(err);
          }
          pkgCfg.files = files.filter(
            file => ignore.files.indexOf(file) === -1);
          callback();
        });
      }, err => {
        if(!err) {
          logger.debug(
            'Angular template optimizer including templates ' +
            'matching patterns:\n' + includePatterns.join('\n') + '\n');
          logger.debug(
            'Angular template optimizer excluding templates ' +
            'matching patterns:\n' + excludePatterns.join('\n') + '\n');
        }
        callback(err);
      });
    },
    filter: ['getFiles', (results, callback) => {
      // remove any templates that are overridden via the config system
      pkgCfgs.forEach(pkgCfg => {
        pkgCfg.files = pkgCfg.files.filter(
          file => _getTemplateOverride(pkgCfg.pkg, file) === false);
      });

      let output = 'Angular template optimizer including files:\n';
      let manifest = '';
      pkgCfgs.forEach(pkgCfg => {
        if(pkgCfg.files.length === 0) {
          return;
        }
        manifest += '\n' + pkgCfg.pkg.manifest.name + '\n';
        manifest += new Array(
          pkgCfg.pkg.manifest.name.length + 1).join('=') + '\n';
        pkgCfg.files.forEach(file => {
          manifest += file + '\n';
        });
      });
      if(manifest === '') {
        output += '\nNo templates found.\n\n';
      } else {
        output += manifest + '\n';
      }
      logger.info(output);
      if(manifest === '') {
        pkgCfgs = null;
        return callback();
      }
      callback(null, pkgCfgs);
    }]
  }, err => callback(err, pkgCfgs));
}

function _glob(patterns, options, callback) {
  const rval = [];
  const includePatterns = options.includePatterns || [];
  const excludePatterns = options.excludePatterns || [];
  const exclusions = patterns
    .filter(pattern => pattern.indexOf('!') === 0)
    .map(pattern => {
      pattern = path.resolve(options.base, pattern.substr(1));
      excludePatterns.push(pattern);
      return pattern;
    });
  async.each(patterns, (pattern, callback) => {
    const exclusion = (pattern.indexOf('!') === 0);
    if(exclusion) {
      return callback();
    }
    pattern = path.resolve(options.base, pattern);
    includePatterns.push(pattern);
    glob(pattern, (err, files) => {
      if(err) {
        return callback(err);
      }
      // apply exclusions
      files.forEach(file => {
        for(let i = 0; i < exclusions.length; ++i) {
          if(minimatch(file, exclusions[i])) {
            return;
          }
        }
        rval.push(file);
      });
      callback();
    });
  }, function(err) {
    callback(err, rval);
  });
}

function _getTemplateOverride(pkg, file) {
  // remove any templates that are overridden via the config system
  const overrides = bedrock.config.views.vars.angular.templates.overrides;
  const url = _getTemplateUrl(pkg, file).substr(1);
  if(url in overrides) {
    return overrides[url];
  }
  return false;
}

function _getTemplateUrl(pkg, file) {
  // URL is only used as an ID in the template cache
  // we use a simplified path here that only includes the package name so
  // modules can define relative template URLs based on their package name only
  return path.join(
    bedrock.config.views.system.config.baseURL, pkg.manifest.name,
    path.relative(pkg.path, file));
}
