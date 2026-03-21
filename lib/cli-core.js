'use strict';

const path = require('path');
const { execSync, spawn, spawnSync } = require('child_process');

function godotNotFoundError(CFG_DIR) {
  console.error('\x1b[31mGodot executable not found.\x1b[0m');
  console.error(`Checked: ${CFG_DIR}, system PATH (godot, godot4)`);
  console.error('Download Godot automatically:  godot-dev download-engine');
  console.error('Or set a custom path:           godot-dev config set godotPath /path/to/godot');
  process.exit(1);
}

function isToolNotFound(e) {
  return e.code === 'ENOENT' || (e.stderr && (e.stderr.includes('not found') || e.stderr.includes('not recognized')));
}

async function waitForDebugger(proc, port, timeout) {
  const { GodotDebuggerClient } = require('./debugger-client');
  const { startRepl } = require('./repl-commands');
  let procExited = false; let exitCode = null;
  proc.on('exit', (code) => { procExited = true; exitCode = code; });
  const deadline = Date.now() + timeout;
  process.stdout.write(`Waiting for Godot debugger on port ${port}`);
  while (Date.now() < deadline) {
    if (procExited) { console.error(`\n\x1b[31mGodot process exited (code ${exitCode}) before debugger connected.\x1b[0m`); console.error('Check Godot logs above for startup errors.'); process.exit(1); }
    try { const c = new GodotDebuggerClient('127.0.0.1', port); await c.connect(); console.log('\n\x1b[32mConnected to Godot via TCP debugger\x1b[0m'); proc.on('exit', () => process.exit(0)); startRepl(c); return; }
    catch { process.stdout.write('.'); await new Promise(r => setTimeout(r, 500)); }
  }
  console.error(`\n\x1b[31mTimed out after ${timeout}ms waiting for Godot debugger on port ${port}.\x1b[0m`);
  console.error(`Ensure Godot launched with: --remote-debug tcp://127.0.0.1:${port}`);
  console.error('Increase timeout with: --timeout 30000');
  proc.kill(); process.exit(1);
}

function registerCoreCommands(program) {
  const { findGodot, downloadEngine, downloadExportTemplates, GODOT_VERSION, CFG_DIR } = require('./engine');

  program.command('lint [files...]').description('Lint GDScript files using gdtoolkit')
    .action((files) => {
      const targets = files.length ? files : ['.'];
      try {
        const r = execSync(['gdlint', ...targets].join(' '), { stdio: 'pipe', encoding: 'utf8' });
        if (r) console.log(r);
        console.log('\x1b[32mLint passed.\x1b[0m');
      } catch (e) {
        if (isToolNotFound(e)) { console.log('gdlint not found. Run: godot-dev setup'); return; }
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
        if (isToolNotFound(e)) { console.log('gdformat not found. Run: godot-dev setup'); return; }
        if (e.stdout) process.stdout.write(e.stdout);
        if (e.stderr) process.stderr.write(e.stderr);
        process.exit(e.status || 1);
      }
    });

  program.command('validate').description('Lint all .gd files with gdlint and check for Godot 3.x deprecated APIs')
    .option('--dir <path>', 'Project directory to scan', '.')
    .action((opts) => {
      const { checkDir, formatWarnings } = require('./compat-checker');
      let lintFailed = false;
      console.log('Running gdlint...');
      try {
        const absDir = path.resolve(opts.dir);
        const r = execSync(`gdlint ${absDir}`, { stdio: 'pipe', encoding: 'utf8', cwd: absDir });
        if (r) console.log(r);
        console.log('\x1b[32mgdlint passed.\x1b[0m');
      } catch (e) {
        if (isToolNotFound(e)) { console.warn('gdlint not found — run: godot-dev setup'); }
        else { if (e.stdout) process.stdout.write(e.stdout); if (e.stderr) process.stderr.write(e.stderr); lintFailed = true; }
      }
      console.log('\nChecking for Godot 3.x deprecated APIs...');
      const warnings = checkDir(opts.dir);
      if (warnings.length) { console.warn('\x1b[33mMigration warnings:\x1b[0m'); console.warn(formatWarnings(warnings)); }
      else { console.log('\x1b[32mNo deprecated APIs found.\x1b[0m'); }
      if (lintFailed || warnings.length) process.exit(1);
    });

  program.command('launch [scene]').description('Launch Godot with remote debugger enabled')
    .option('--godot <path>', 'Path to Godot executable', 'godot')
    .option('--project <path>', 'Godot project path', '.')
    .option('-p, --port <port>', 'Debugger port', '6007')
    .option('--profiling', 'Enable profiling')
    .option('--repl', 'Wait for debugger connection and start interactive REPL')
    .option('--timeout <ms>', 'Max wait for debugger connection (ms)', '15000')
    .action(async (scene, opts) => {
      const godot = findGodot(opts.godot);
      if (!godot) { godotNotFoundError(CFG_DIR); }
      const args = ['--path', opts.project, '--remote-debug', `tcp://127.0.0.1:${opts.port}`, '--verbose'];
      if (opts.profiling) args.push('--profiling');
      if (scene) args.push(scene);
      console.log(`Launching: ${godot} ${args.join(' ')}`);
      const proc = spawn(godot, args, { stdio: opts.repl ? 'pipe' : 'inherit' });
      if (!opts.repl) { proc.on('exit', (code) => process.exit(code || 0)); return; }
      if (proc.stdout) proc.stdout.pipe(process.stdout);
      if (proc.stderr) proc.stderr.pipe(process.stderr);
      waitForDebugger(proc, parseInt(opts.port), parseInt(opts.timeout));
    });

  program.command('test <script>').description('Run a GDScript file headlessly and report pass/fail')
    .option('--godot <path>', 'Path to Godot executable')
    .option('--project <path>', 'Godot project path', '.')
    .option('--timeout <ms>', 'Timeout in milliseconds', '30000')
    .action((script, opts) => {
      const godot = findGodot(opts.godot);
      if (!godot) { godotNotFoundError(CFG_DIR); }
      const args = ['--path', opts.project, '--headless', '--script', script, '--quit'];
      console.log(`Running test: ${script}`);
      const r = spawnSync(godot, args, { encoding: 'utf8', timeout: parseInt(opts.timeout) });
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.stderr) process.stderr.write(r.stderr);
      const passed = r.status === 0 && !(r.stdout || '').includes('FAILED');
      console.log(passed ? '\x1b[32mTest PASSED\x1b[0m' : '\x1b[31mTest FAILED\x1b[0m');
      process.exit(passed ? 0 : (r.status || 1));
    });

  program.command('export <preset>').description('Export project using a named export preset')
    .option('--godot <path>', 'Path to Godot executable')
    .option('--project <path>', 'Godot project path', '.')
    .option('--output <path>', 'Output path', './build/export')
    .action((preset, opts) => {
      const godot = findGodot(opts.godot);
      if (!godot) { godotNotFoundError(CFG_DIR); }
      const args = ['--path', opts.project, '--headless', '--export-release', preset, opts.output];
      console.log(`Exporting preset: ${preset}`);
      const proc = spawn(godot, args, { stdio: 'inherit' });
      proc.on('exit', (code) => process.exit(code || 0));
    });

  program.command('watch').description('Watch .gd files and hot-reload running game on change')
    .option('--port <port>', 'Game bridge port', '6009')
    .option('--lint', 'Run gdlint on changed file before reloading')
    .action(async (opts) => {
      const chokidar = require('chokidar');
      const { gamePost, pingGame } = require('./http-client');
      const probe = await pingGame();
      if (probe.ok) { console.log(`\x1b[32mGame bridge reachable on port ${opts.port} (${probe.latencyMs}ms)\x1b[0m`); }
      else { console.warn(`\x1b[33mGame bridge not reachable on port ${opts.port} — watching anyway, reloads will retry when game starts\x1b[0m`); }
      console.log('Watching .gd files for changes... (Ctrl+C to stop)');
      const watcher = chokidar.watch('**/*.gd', { ignored: /node_modules/, ignoreInitial: true });
      const doReload = async (file, verb) => {
        if (opts.lint && file.endsWith('.gd')) {
          try {
            execSync(`gdlint ${file}`, { stdio: 'pipe', encoding: 'utf8' });
          } catch (e) {
            if (isToolNotFound(e)) {
              if (!opts._lintWarnedOnce) { opts._lintWarnedOnce = true; console.warn('\x1b[33mgdlint not found — skipping lint\x1b[0m'); }
            } else {
              process.stderr.write('\x1b[33m[lint] ' + (e.stdout || e.stderr || '') + '\x1b[0m');
            }
          }
        }
        process.stdout.write(`\x1b[36m${file}\x1b[0m ${verb} — reloading... `);
        try { await gamePost('/reload', {}); console.log('\x1b[32mOK\x1b[0m'); }
        catch (e) { console.log(`\x1b[33mfailed\x1b[0m (${e.message.split('.')[0]})`); }
      };
      watcher.on('change', (file) => doReload(file, 'changed'));
      watcher.on('add', (file) => doReload(file, 'added'));
      watcher.on('unlink', (file) => doReload(file, 'deleted'));
      process.on('SIGINT', () => { watcher.close(); process.exit(0); });
    });

  program.command('setup').description('Install gdtoolkit for GDScript linting/formatting and register agent skills')
    .action(() => {
      console.log('Installing gdtoolkit for Godot 4.x...');
      let installed = false;
      for (const cmd of ['pip3 install --upgrade "gdtoolkit==4.*"', 'pip install --upgrade "gdtoolkit==4.*"']) {
        try { execSync(cmd, { stdio: 'inherit' }); console.log('\x1b[32mgdtoolkit installed.\x1b[0m'); installed = true; break; }
        catch { continue; }
      }
      if (!installed) console.warn('  gdtoolkit install failed — install Python and retry.');
      try { const { installSkills } = require('./skills'); installSkills(process.cwd()); }
      catch (e) { console.warn('Skills install warning:', e.message); }
      console.log('\nSetup complete. Run godot-dev download-export-templates to install export templates.');
    });

  program.command('download-engine').description(`Download Godot ${GODOT_VERSION} for current platform`)
    .action(async () => { await downloadEngine(); });

  program.command('download-export-templates').description(`Download Godot ${GODOT_VERSION} export templates`)
    .action(async () => { await downloadExportTemplates(); });

  program.command('wait-import').description('Wait for Godot editor to finish importing files')
    .option('--timeout <ms>', 'Max wait time in ms', '30000')
    .action(async (opts) => {
      const { editorGet } = require('./http-client');
      const timeout = parseInt(opts.timeout);
      const start = Date.now();
      process.stdout.write('Waiting for import...');
      while (Date.now() - start < timeout) {
        try { const r = await editorGet('/import-status'); if (!r.scanning) { console.log(' done.'); process.exit(0); } } catch {}
        await new Promise(r => setTimeout(r, 500));
        process.stdout.write('.');
      }
      console.log(' timed out.'); process.exit(1);
    });

  const sceneCmd = program.command('scene').description('Manage scene files');
  sceneCmd.command('new <respath> [rootType]').description('Create a new empty .tscn scene file (res:// path)')
    .action((respath, rootType) => {
      const fs = require('fs');
      const type = rootType || 'Node2D';
      const name = path.basename(respath, '.tscn');
      const fullPath = path.join(process.cwd(), respath.replace('res://', ''));
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, `[gd_scene format=3]\n\n[node name="${name}" type="${type}"]\n`, 'utf8');
      console.log(`Created: ${fullPath}`);
    });

  const inputMapCmd = program.command('input-map').description('Manage project input map');
  inputMapCmd.command('list').description('List all input actions from project.godot')
    .action(() => {
      const fs = require('fs');
      const raw = fs.readFileSync(path.join(process.cwd(), 'project.godot'), 'utf8');
      let inInput = false;
      raw.split('\n').forEach(l => {
        if (l.trim() === '[input]') { inInput = true; return; }
        if (inInput && l.startsWith('[')) { inInput = false; return; }
        if (inInput && l.includes('=')) console.log(l.trim());
      });
    });

  program.command('dashboard').description('Live terminal dashboard: scene tree, perf, logs (requires game on port 6009)')
    .action(async () => { const { runDashboard } = require('./dashboard'); await runDashboard(); });
}

module.exports = { registerCoreCommands };
