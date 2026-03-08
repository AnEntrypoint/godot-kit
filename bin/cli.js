#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const { GodotDebuggerClient } = require('../lib/debugger-client');
const { parseSceneNode, formatSceneTree } = require('../lib/scene-tree');
const { startRepl } = require('../lib/repl-commands');
const { execSync, spawn, spawnSync } = require('child_process');
const { findGodot, downloadEngine, GODOT_VERSION } = require('../lib/engine');
const { registerEditorCommands } = require('../lib/cli-editor');
const { registerGameCommands } = require('../lib/cli-game');

const program = new Command();
program.name('godot-dev').description('Agentic Godot 4.x CLI - REPL, debugger, inspector, editor bridge, game runtime').version('1.0.0');

function makeClient(opts) {
  return new GodotDebuggerClient(opts.host || '127.0.0.1', parseInt(opts.port || '6007'));
}

async function connectOrDie(client) {
  try {
    await client.connect();
    console.log(`Connected to Godot debugger at ${client.host}:${client.port}`);
  } catch (e) {
    console.error(`Cannot connect to Godot at ${client.host}:${client.port}`);
    console.error('Launch Godot with: godot-dev launch');
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
      if (e.code === 'ENOENT' || (e.stderr && (e.stderr.includes('not found') || e.stderr.includes('not recognized')))) {
        console.log('gdformat not found. Run: godot-dev setup'); return;
      }
      if (e.stdout) process.stdout.write(e.stdout);
      if (e.stderr) process.stderr.write(e.stderr);
      process.exit(e.status || 1);
    }
  });

program.command('validate').description('Lint all .gd files with gdlint and check for Godot 3.x deprecated APIs')
  .option('--dir <path>', 'Project directory to scan', '.')
  .action((opts) => {
    const { checkDir, formatWarnings } = require('../lib/compat-checker');
    let lintFailed = false;
    console.log('Running gdlint...');
    try {
      const r = execSync(`gdlint ${opts.dir}`, { stdio: 'pipe', encoding: 'utf8' });
      if (r) console.log(r);
      console.log('\x1b[32mgdlint passed.\x1b[0m');
    } catch (e) {
      if (e.code === 'ENOENT' || (e.stderr && (e.stderr.includes('not found') || e.stderr.includes('not recognized')))) {
        console.warn('gdlint not found — run: godot-dev setup');
      } else {
        if (e.stdout) process.stdout.write(e.stdout);
        if (e.stderr) process.stderr.write(e.stderr);
        lintFailed = true;
      }
    }
    console.log('\nChecking for Godot 3.x deprecated APIs...');
    const warnings = checkDir(opts.dir);
    if (warnings.length) {
      console.warn('\x1b[33mMigration warnings:\x1b[0m');
      console.warn(formatWarnings(warnings));
    } else {
      console.log('\x1b[32mNo deprecated APIs found.\x1b[0m');
    }
    if (lintFailed || warnings.length) process.exit(1);
  });

program.command('launch [scene]').description('Launch Godot with remote debugger enabled')
  .option('--godot <path>', 'Path to Godot executable', 'godot')
  .option('--project <path>', 'Godot project path', '.')
  .option('-p, --port <port>', 'Debugger port', '6007')
  .option('--profiling', 'Enable profiling')
  .action((scene, opts) => {
    const godot = findGodot(opts.godot);
    if (!godot) { console.error('Godot not found. Run: godot-dev download-engine'); process.exit(1); }
    const args = ['--path', opts.project, '--remote-debug', `tcp://127.0.0.1:${opts.port}`, '--verbose'];
    if (opts.profiling) args.push('--profiling');
    if (scene) args.push(scene);
    console.log(`Launching: ${godot} ${args.join(' ')}`);
    const proc = spawn(godot, args, { stdio: 'inherit' });
    proc.on('exit', (code) => process.exit(code || 0));
  });

program.command('test <script>').description('Run a GDScript file headlessly and report pass/fail')
  .option('--godot <path>', 'Path to Godot executable')
  .option('--project <path>', 'Godot project path', '.')
  .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
  .action((script, opts) => {
    const godot = findGodot(opts.godot);
    if (!godot) { console.error('Godot not found. Run: godot-dev download-engine'); process.exit(1); }
    const args = ['--path', opts.project, '--headless', '--script', script, '--quit'];
    console.log(`Running test: ${script}`);
    const r = spawnSync(godot, args, { encoding: 'utf8', timeout: parseInt(opts.timeout) });
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
    const passed = r.status === 0 && !(r.stdout || '').includes('FAILED');
    console.log(passed ? '\x1b[32mTest PASSED\x1b[0m' : '\x1b[31mTest FAILED\x1b[0m');
    process.exit(r.status || 0);
  });

program.command('export <preset>').description('Export project using a named export preset')
  .option('--godot <path>', 'Path to Godot executable')
  .option('--project <path>', 'Godot project path', '.')
  .option('--output <path>', 'Output path', './build/export')
  .action((preset, opts) => {
    const godot = findGodot(opts.godot);
    if (!godot) { console.error('Godot not found. Run: godot-dev download-engine'); process.exit(1); }
    const args = ['--path', opts.project, '--headless', '--export-release', preset, opts.output];
    console.log(`Exporting preset: ${preset}`);
    const proc = spawn(godot, args, { stdio: 'inherit' });
    proc.on('exit', (code) => process.exit(code || 0));
  });

program.command('watch').description('Watch .gd files and hot-reload running game on change')
  .action(() => {
    const chokidar = require('chokidar');
    const { gamePost } = require('../lib/http-client');
    console.log('Watching .gd files for changes... (Ctrl+C to stop)');
    const watcher = chokidar.watch('**/*.gd', { ignored: /node_modules/, ignoreInitial: true });
    watcher.on('change', async (file) => {
      console.log(`Changed: ${file} - sending reload...`);
      try { await gamePost('/reload-scene', {}); console.log('Reloaded.'); }
      catch (e) { console.warn(`Reload failed: ${e.message}`); }
    });
    process.on('SIGINT', () => { watcher.close(); process.exit(0); });
  });

program.command('setup').description('Install gdtoolkit for GDScript linting/formatting and register agent skills')
  .action(() => {
    console.log('Installing gdtoolkit for Godot 4.x...');
    for (const cmd of ['pip install --upgrade "gdtoolkit==4.*"', 'pip3 install --upgrade "gdtoolkit==4.*"']) {
      try { execSync(cmd, { stdio: 'inherit' }); console.log('\x1b[32mgdtoolkit installed.\x1b[0m'); break; }
      catch (e) { continue; }
    }
    try {
      const { installSkills } = require('../lib/skills');
      installSkills(process.cwd());
    } catch (e) {
      console.warn('Skills install warning:', e.message);
    }
  });

program.command('download-engine').description(`Download Godot ${GODOT_VERSION} for current platform`)
  .action(async () => { await downloadEngine(); });

program.command('demo').description('Run the godot-kit capability demo')
  .action(() => { require('../demo'); });

registerEditorCommands(program);
registerGameCommands(program);

program.parse(process.argv);
