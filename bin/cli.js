#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const { GodotDebuggerClient } = require('../lib/debugger-client');
const { parseSceneNode, formatSceneTree } = require('../lib/scene-tree');
const { startRepl } = require('../lib/repl-commands');
const { execSync, spawn } = require('child_process');
const { findGodot, downloadEngine, GODOT_VERSION } = require('../lib/engine');

const program = new Command();
program.name('godot-dev').description('Agentic Godot 4.x CLI - REPL, debugger, inspector, profiler').version('1.0.0');

function makeClient(opts) {
  return new GodotDebuggerClient(opts.host || '127.0.0.1', parseInt(opts.port || '6007'));
}

async function connectOrDie(client) {
  try {
    await client.connect();
    console.log(`Connected to Godot debugger at ${client.host}:${client.port}`);
  } catch (e) {
    console.error(`Cannot connect to Godot at ${client.host}:${client.port}`);
    console.error('Launch Godot with: --remote-debug tcp://127.0.0.1:6007');
    console.error('Or run: godot-dev launch');
    process.exit(1);
  }
}

program.command('repl').description('Interactive REPL connected to running Godot debugger')
  .option('-h, --host <host>', 'Godot host', '127.0.0.1')
  .option('-p, --port <port>', 'Debugger port', '6007')
  .action(async (opts) => { const c = makeClient(opts); await connectOrDie(c); startRepl(c); });

program.command('inspect').description('Dump scene tree from running Godot game (one-shot)')
  .option('-h, --host <host>', 'Godot host', '127.0.0.1')
  .option('-p, --port <port>', 'Debugger port', '6007')
  .action(async (opts) => {
    const client = makeClient(opts);
    await connectOrDie(client);
    client.requestSceneTree();
    let done = false;
    client.on('message', (msg) => {
      if (String(msg.command) === 'scene:scene_tree_parse_end' && !done) {
        done = true;
        try { formatSceneTree(parseSceneNode(msg.params)).forEach(l => console.log(l)); }
        catch (e) { console.log(JSON.stringify(msg.params, null, 2)); }
        client.disconnect(); process.exit(0);
      }
    });
    setTimeout(() => { if (!done) { console.error('Timeout: no scene tree received.'); client.disconnect(); process.exit(1); } }, 5000);
  });

program.command('logs').description('Stream Godot output logs')
  .option('-h, --host <host>', 'Godot host', '127.0.0.1')
  .option('-p, --port <port>', 'Debugger port', '6007')
  .action(async (opts) => {
    const client = makeClient(opts);
    await connectOrDie(client);
    console.log('Streaming Godot logs (Ctrl+C to stop)...');
    client.on('output', (p) => { for (const s of p) { if (typeof s === 'string') process.stdout.write(s + '\n'); } });
    client.on('godot_error', (p) => process.stderr.write('[ERROR] ' + p.join(' ') + '\n'));
    client.on('profile_frame', (p) => console.log('[PROFILE]', JSON.stringify(p)));
    client.on('disconnected', () => { console.log('Godot disconnected.'); process.exit(0); });
    process.on('SIGINT', () => { client.disconnect(); process.exit(0); });
  });

program.command('lint [files...]').description('Lint GDScript files using gdtoolkit')
  .action((files) => {
    const targets = files.length ? files : ['.'];
    try {
      const r = execSync(['gdlint', ...targets].join(' '), { stdio: 'pipe', encoding: 'utf8' });
      if (r) console.log(r);
      console.log('\x1b[32mLint passed.\x1b[0m');
    } catch (e) {
      if (e.code === 'ENOENT' || (e.stderr && (e.stderr.includes('not found') || e.stderr.includes('not recognized')))) {
        console.log('gdlint not found. Run: godot-dev setup'); return;
      }
      if (e.stdout) process.stdout.write(e.stdout);
      if (e.stderr) process.stderr.write(e.stderr);
      process.exit(e.status || 1);
    }
  });

program.command('format [files...]').description('Format GDScript files using gdtoolkit')
  .option('--check', 'Check only, do not write')
  .action((files, opts) => {
    const targets = files.length ? files : ['.'];
    try {
      const r = execSync(['gdformat', ...(opts.check ? ['--check'] : []), ...targets].join(' '), { stdio: 'pipe', encoding: 'utf8' });
      if (r) console.log(r);
      console.log('\x1b[32mFormat complete.\x1b[0m');
    } catch (e) {
      if (e.stdout) process.stdout.write(e.stdout);
      if (e.stderr) process.stderr.write(e.stderr);
      process.exit(e.status || 1);
    }
  });

program.command('launch [scene]').description('Launch Godot with remote debugger enabled')
  .option('--godot <path>', 'Path to Godot executable', 'godot')
  .option('--project <path>', 'Godot project path', '.')
  .option('-p, --port <port>', 'Debugger port', '6007')
  .option('--profiling', 'Enable profiling')
  .option('--debug-collisions', 'Show collision shapes')
  .option('--debug-navigation', 'Show navigation')
  .action((scene, opts) => {
    const godot = findGodot(opts.godot);
    if (!godot) {
      console.error('Godot executable not found. Run: godot-dev download-engine');
      process.exit(1);
    }
    const args = ['--path', opts.project, '--remote-debug', `tcp://127.0.0.1:${opts.port}`, '--verbose'];
    if (opts.profiling) args.push('--profiling');
    if (opts.debugCollisions) args.push('--debug-collisions');
    if (opts.debugNavigation) args.push('--debug-navigation');
    if (scene) args.push(scene);
    console.log(`Launching: ${godot} ${args.join(' ')}`);
    const proc = spawn(godot, args, { stdio: 'inherit' });
    proc.on('exit', (code) => process.exit(code || 0));
  });

program.command('setup').description('Install gdtoolkit for GDScript linting/formatting')
  .action(() => {
    console.log('Installing gdtoolkit for Godot 4.x...');
    for (const cmd of ['pip install --upgrade "gdtoolkit==4.*"', 'pip3 install --upgrade "gdtoolkit==4.*"']) {
      try { execSync(cmd, { stdio: 'inherit' }); console.log('\x1b[32mgdtoolkit installed.\x1b[0m'); return; }
      catch (e) { continue; }
    }
    console.error('Failed. Install Python and pip first.'); process.exit(1);
  });

program.command('download-engine').description(`Download Godot ${GODOT_VERSION} for current platform`)
  .action(async () => { await downloadEngine(); });

program.parse(process.argv);
