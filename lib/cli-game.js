'use strict';

const { gameGet, gamePost, gameDelete } = require('./http-client');
const fs = require('fs');
const path = require('path');

function pj(obj) { console.log(JSON.stringify(obj, null, 2)); }
function fail(msg) { console.error('\x1b[31m' + msg + '\x1b[0m'); process.exit(1); }
async function run(fn) { try { await fn(); } catch (e) { fail(e.message); } }

function printTree(node, depth, maxDepth, filterClass) {
  if (maxDepth && depth > maxDepth) return;
  if (filterClass && node.class !== filterClass) {
    (node.children || []).forEach(c => printTree(c, depth + 1, maxDepth, filterClass));
    return;
  }
  const groups = node.groups && node.groups.length ? ` [${node.groups.join(',')}]` : '';
  console.log('  '.repeat(depth) + `[${node.class}] ${node.name}${groups}`);
  (node.children || []).forEach(c => printTree(c, depth + 1, maxDepth, filterClass));
}

async function gameRepl() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '\x1b[32mgodot> \x1b[0m' });
  const SPECIAL = {
    '.tree': async () => { try { const r = await gameGet('/tree'); printTree(r.tree, 0); } catch(e) { console.error(e.message); } },
    '.globals': async () => { try { pj(await gameGet('/globals')); } catch(e) { console.error(e.message); } },
    '.perf': async () => { try { pj(await gameGet('/perf')); } catch(e) { console.error(e.message); } },
    '.errors': async () => { try { const r = await gameGet('/errors'); (r.errors || []).forEach(e => console.error('[31m' + e + '[0m')); } catch(e) { console.error(e.message); } },
    '.help': () => console.log('Commands: .tree .globals .perf .errors .help or any GDScript expression'),
  };
  rl.prompt();
  rl.on('line', async (line) => {
    const l = line.trim();
    if (!l) { rl.prompt(); return; }
    if (SPECIAL[l]) { await SPECIAL[l](); rl.prompt(); return; }
    try { const r = await gamePost('/eval', { expr: l }); console.log(r.error ? '\x1b[31m' + r.error + '\x1b[0m' : (r.result === '' ? '(null)' : r.result)); }
    catch (e) { console.error('\x1b[31m' + e.message + '\x1b[0m'); }
    rl.prompt();
  });
  rl.on('close', () => process.exit(0));
}

function registerGameCommands(program) {
  const gm = program.command('game').description('Game runtime HTTP API (ReplBridge on port 6009)');

  gm.command('tree').description('Dump runtime scene tree')
    .option('--depth <n>', 'Max depth', '')
    .option('--filter <class>', 'Filter by class name', '')
    .action((opts) => run(async () => {
      const r = await gameGet('/tree');
      if (!r.tree) return pj(r);
      printTree(r.tree, 0, opts.depth ? parseInt(opts.depth) : null, opts.filter || null);
    }));

  gm.command('node <path>').description('Get all properties of a node')
    .action((p) => run(async () => pj(await gameGet('/node/' + p.replace(/^\//, '')))));

  gm.command('eval <expr>').description('Evaluate a GDScript expression')
    .action((expr) => run(async () => {
      const r = await gamePost('/eval', { expr });
      if (r.error) { console.error('\x1b[31m' + r.error + '\x1b[0m'); process.exit(1); }
      else console.log(r.result === '' ? '(null)' : r.result);
    }));

  gm.command('globals').description('List all autoloads / root children')
    .action(() => run(async () => pj(await gameGet('/globals'))));

  gm.command('perf').description('All Performance monitor values')
    .action(() => run(async () => {
      const r = await gameGet('/perf');
      Object.entries(r).forEach(([k, v]) => console.log(`${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`));
    }));

  gm.command('fps').description('Current FPS (alias for perf)')
    .action(() => run(async () => {
      const r = await gameGet('/perf');
      console.log('FPS:', r.fps ? r.fps.toFixed(1) : 'N/A');
    }));

  gm.command('set <path> <prop> <value>').description('Set a property on a node')
    .action((path, prop, value) => run(async () => {
      let v = value; try { v = JSON.parse(value); } catch {}
      pj(await gamePost('/set', { path, prop, value: v }));
    }));

  gm.command('call <path> <method> [args...]').description('Call a method on a node')
    .action((path, method, args) => run(async () => {
      let parsedArgs = []; if (args && args.length) { try { const p = JSON.parse(args[0]); parsedArgs = Array.isArray(p) ? p : [p]; } catch { parsedArgs = args; } }
      pj(await gamePost('/call', { path, method, args: parsedArgs }));
    }));

  gm.command('signal <path> <sig> [args...]').description('Emit a signal on a node')
    .action((path, sig, args) => run(async () => {
      let parsedArgs = []; if (args && args.length) { try { const p = JSON.parse(args[0]); parsedArgs = Array.isArray(p) ? p : [p]; } catch { parsedArgs = args; } }
      pj(await gamePost('/signal', { path, signal: sig, args: parsedArgs }));
    }));

  gm.command('groups').description('All groups and their members')
    .action(() => run(async () => pj(await gameGet('/groups'))));

  gm.command('resources').description('Loaded resources list')
    .action(() => run(async () => {
      const r = await gameGet('/resources');
      if (!r.resources || !r.resources.length) { console.log('No resources loaded.'); return; }
      r.resources.forEach(p => console.log(p));
    }));

  gm.command('physics').description('Physics server stats')
    .action(() => run(async () => pj(await gameGet('/physics'))));

  gm.command('pause').description('Toggle game pause')
    .action(() => run(async () => pj(await gamePost('/pause', {}))));

  gm.command('reload').description('Reload current scene')
    .action(() => run(async () => pj(await gamePost('/reload', {}))));

  gm.command('scene-change <path>').description('Change to a different scene (res:// path)')
    .action((p) => run(async () => pj(await gamePost('/change-scene', { path: p }))));

  gm.command('spawn <scene> [parent]').description('Instantiate a .tscn PackedScene into the running scene tree')
    .action((scene, parent) => run(async () => pj(await gamePost('/spawn-scene', { path: scene, parent: parent || '/root' }))));

  gm.command('logs').description('Show buffered game logs')
    .option('--follow', 'Poll for new logs every 500ms')
    .action((opts) => run(async () => {
      const seen = new Set();
      async function poll() {
        const r = await gameGet('/logs');
        (r.logs || []).forEach(l => { if (!seen.has(l)) { seen.add(l); console.log(l); } });
      }
      await poll();
      if (opts.follow) {
        process.on('SIGINT', () => process.exit(0));
        setInterval(poll, 500);
      }
    }));

  gm.command('errors').description('Show buffered game errors')
    .action(() => run(async () => { const r = await gameGet('/errors'); (r.errors || []).forEach(e => console.error('\x1b[31m' + e + '\x1b[0m')); }));

  gm.command('logs-clear').description('Clear the game log and error buffers')
    .action(() => run(async () => {
      await gameDelete('/logs');
      await gameDelete('/errors');
      console.log('Logs cleared.');
    }));

  gm.command('watch <expr>').description('Watch an expression (poll every 500ms)')
    .action((expr) => run(async () => {
      const r = await gamePost('/watch', { expr });
      const id = r.id;
      console.log(`Watching [${id}]: ${expr}`);
      process.on('SIGINT', async () => { try { await gameDelete('/watch/' + id); } catch {} process.exit(0); });
      setInterval(async () => {
        try { const w = await gameGet('/watches'); const v = w.watches && w.watches[String(id)]; if (v) console.log(`[${expr}] =`, v.error ? v.error : (v.result === '' ? '(null)' : v.result)); }
        catch {}
      }, 500);
    }));

  gm.command('watches').description('Show all active watches with values')
    .action(() => run(async () => pj(await gameGet('/watches'))));

  gm.command('watch-delete <id>').description('Delete an active watch by ID')
    .action((id) => run(async () => pj(await gameDelete('/watch/' + id))));

  gm.command('input').description('Show input/pause state')
    .action(() => run(async () => pj(await gameGet('/input'))));

  gm.command('input-action <action> [state]').description('Press or release an input action (state: press|release, default press)')
    .action((action, state) => run(async () => {
      const pressed = (state || 'press') !== 'release';
      pj(await gamePost('/input-action', { action, pressed }));
    }));

  gm.command('screenshot').description('Capture game viewport as PNG')
    .option('--output <file>', 'Output file path', '')
    .action((opts) => run(async () => {
      const r = await gameGet('/screenshot', 15000);
      if (r.error) { fail(r.error); return; }
      const outFile = opts.output || `screenshot-${Date.now()}.png`;
      fs.writeFileSync(outFile, Buffer.from(r.base64, 'base64'));
      console.log(path.resolve(outFile));
    }));

  gm.command('create <parent> <type> <name>').description('Create a node in the running scene tree')
    .action((parent, type, name) => run(async () => pj(await gamePost('/create-node', { parent, type, name }))));

  gm.command('delete <path>').description('Queue-free a node in the running scene tree')
    .action((p) => run(async () => pj(await gamePost('/delete-node', { path: p }))));

  gm.command('raycast2d <x1> <y1> <x2> <y2>').description('2D physics raycast between two points')
    .action((x1, y1, x2, y2) => run(async () => {
      const r = await gamePost('/raycast2d', { from: { x: parseFloat(x1), y: parseFloat(y1) }, to: { x: parseFloat(x2), y: parseFloat(y2) } });
      pj(r);
    }));

  gm.command('repl').description('Interactive GDScript REPL (game runtime)')
    .action(() => run(async () => await gameRepl()));
}

module.exports = { registerGameCommands };
