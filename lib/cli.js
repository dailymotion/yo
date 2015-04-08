#!/usr/bin/env node
'use strict';
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var updateNotifier = require('update-notifier');
var yosay = require('yosay');
var stringLength = require('string-length');
var meow = require('meow');
var pkg = require('../package.json');
var Router = require('./router');
var utils = require('./utils');

var cli = meow({
  help: false,
  pkg: pkg
});

var opts = cli.flags;
var args = cli.input;
var cmd = args[0];

// add un-camelized options too, for legacy
// TODO: remove some time in the future when generators have upgraded
Object.keys(opts).forEach(function (key) {
  var legacyKey = key.replace(/[A-Z]/g, function (m) {
    return '-' + m.toLowerCase();
  });

  opts[legacyKey] = opts[key];
});

function pre() {
  // debugging helper
  if (cmd === 'doctor') {
    require('yeoman-doctor')();
    return;
  }

  // easteregg
  if (cmd === 'yeoman' || cmd === 'yo') {
    console.log(require('yeoman-character'));
    return;
  }

  init();
}

function init() {
  var env = require('yeoman-environment').createEnv();

  env.on('error', function (err) {
    console.error('Error', process.argv.slice(2).join(' '), '\n');
    console.error(opts.debug ? err.stack : err.message);
    process.exit(err.code || 1);
  });

  // lookup for every namespaces, within the environments.paths and lookups
  env.lookup(function () {
    // list generators
    if (opts.generators) {
      return console.log(utils.generatorsFromEnv(env).join('\n'));
    }

    // If no generator is passed, then start the Yo UI
    if (!cmd) {
      if (opts.help) {
        var genList = Object.keys(env.getGeneratorsMeta()).map(function (el) {
          var parts = el.split(':');
          return '  ' + (parts[1] === 'app' ? parts[0] : '  ' + parts[1]);
        }).join('\n');

        console.log(fs.readFileSync(path.join(__dirname, 'usage.txt'), 'utf8') + '\nAvailable Generators:\n' + genList);
        return;
      }

      runYo(env);
      return;
    }

    // Note: at some point, nopt needs to know about the generator options, the
    // one that will be triggered by the below args. Maybe the nopt parsing
    // should be done internally, from the args.
    env.run(args, opts);
  });
}

function runYo(env) {
  var router = new Router(env, {track: function() {}});
  router.insight.track('yoyo', 'init');
  router.registerRoute('help', require('./routes/help'));
  router.registerRoute('update', require('./routes/update'));
  router.registerRoute('run', require('./routes/run'));
  router.registerRoute('install', require('./routes/install'));
  router.registerRoute('exit', require('./routes/exit'));
  router.registerRoute('clearConfig', require('./routes/clear-config'));
  router.registerRoute('home', require('./routes/home'));

  process.once('exit', router.navigate.bind(router, 'exit'));

  router.updateAvailableGenerators();
  router.navigate('home');
}

if (opts['update-notifier'] !== false) {
  var notifier = updateNotifier({pkg: pkg});
  var message = [];

  if (notifier.update) {
    message.push('Update available: ' + chalk.green.bold(notifier.update.latest) + chalk.gray(' (current: ' + notifier.update.current + ')'));
    message.push('Run ' + chalk.magenta('npm install -g ' + pkg.name) + ' to update.');
    console.log(yosay(message.join(' '), {maxLength: stringLength(message[0])}));
  }
}

pre();
