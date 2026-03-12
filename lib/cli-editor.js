'use strict';

const { editorGet, editorPost } = require('./http-client');
const fs = require('fs');
const path = require('path');

function pj(obj) { console.log(JSON.stringify(obj, null, 2)); }
function fail(msg) { console.error('\x1b[31m' + msg + '\x1b[0m'); process.exit(1); }
async function run(fn) { try { await fn(); } catch (e) { fail(e.message); } }

function printTree(node, depth, maxDepth) {
  if (maxDepth && depth > maxDepth) return;
  const groups = node.groups && node.groups.length ? ` [${node.groups.join(',')}]` : '';
  console.log('  '.repeat(depth) + `[${node.class}] ${node.name}${groups}`);
  (node.children || []).forEach(c => printTree(c, depth + 1, maxDepth));
}

async function editorRepl() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '\x1b[36meditor> \x1b[0m' });
  const SPECIAL = {
    '.tree': async () => { try { const r = await editorGet('/scene-tree'); if (r.tree) printTree(r.tree, 0); else pj(r); } catch(e) { console.error(e.message); } },
    '.selected': async () => { try { pj(await editorGet('/selected')); } catch(e) { console.error(e.message); } },
    '.plugins': async () => { try { pj(await editorGet('/plugins')); } catch(e) { console.error(e.message); } },
    '.help': () => console.log('Commands: .tree .selected .plugins .help or any GDScript expression'),
  };
  rl.prompt();
  rl.on('line', async (line) => {
    const l = line.trim();
    if (!l) { rl.prompt(); return; }
    if (SPECIAL[l]) { await SPECIAL[l](); rl.prompt(); return; }
    try { const r = await editorPost('/run-gdscript', { code: l }); console.log(r.error ? '\x1b[31m' + r.error + '\x1b[0m' : r.result); }
    catch (e) { console.error('\x1b[31m' + e.message + '\x1b[0m'); }
    rl.prompt();
  });
  rl.on('close', () => process.exit(0));
}

function registerEditorCommands(program) {
  const ed = program.command('editor').description('Editor HTTP API (EditorPlugin on port 6008)');

  ed.command('tree').description('Dump editor scene tree')
    .option('--depth <n>', 'Max depth', '')
    .action((opts) => run(async () => {
      const r = await editorGet('/scene-tree');
      if (!r.tree) return pj(r);
      printTree(r.tree, 0, opts.depth ? parseInt(opts.depth) : null);
    }));

  ed.command('selected').description('Currently selected nodes')
    .action(() => run(async () => pj(await editorGet('/selected'))));

  ed.command('select <path>').description('Select a node in the editor')
    .action((p) => run(async () => pj(await editorPost('/select', { path: p }))));

  ed.command('files').description('Project file tree')
    .action(() => run(async () => { const r = await editorGet('/files'); (r.files || []).forEach(f => console.log(f)); }));

  ed.command('settings').description('Editor settings info')
    .action(() => run(async () => pj(await editorGet('/settings'))));

  ed.command('set-setting <key> <value>').description('Set an editor setting')
    .action((key, value) => run(async () => {
      let v = value; try { v = JSON.parse(value); } catch {}
      pj(await editorPost('/setting', { key, value: v }));
    }));

  ed.command('open <scene>').description('Open a scene (res:// path)')
    .action((p) => run(async () => pj(await editorPost('/open-scene', { path: p }))));

  ed.command('save').description('Save current scene')
    .action(() => run(async () => pj(await editorPost('/save-scene', {}))));

  ed.command('play').description('Start playing the main scene')
    .action(() => run(async () => pj(await editorPost('/play', {}))));

  ed.command('stop').description('Stop playing')
    .action(() => run(async () => pj(await editorPost('/stop', {}))));

  ed.command('inspector').description('Show inspector target and properties')
    .action(() => run(async () => pj(await editorGet('/inspector'))));

  ed.command('property <path> <prop> <value>').description('Set property via UndoRedo')
    .action((path, prop, value) => run(async () => {
      let v = value; try { v = JSON.parse(value); } catch {}
      pj(await editorPost('/property', { path, prop, value: v }));
    }));

  ed.command('create <parent> <type> <name>').description('Create a new node')
    .action((parent, type, name) => run(async () => pj(await editorPost('/create-node', { parent, type, name }))));

  ed.command('delete <path>').description('Delete a node')
    .action((p) => run(async () => pj(await editorPost('/delete-node', { path: p }))));

  ed.command('run <code>').description('Run GDScript in editor context')
    .action((code) => run(async () => pj(await editorPost('/run-gdscript', { code }))));

  ed.command('plugins').description('List active editor plugins')
    .action(() => run(async () => pj(await editorGet('/plugins'))));

  ed.command('import-status').description('Check if filesystem is scanning')
    .action(() => run(async () => pj(await editorGet('/import-status'))));

  ed.command('autoloads').description('List project autoloads')
    .action(() => run(async () => pj(await editorGet('/autoloads'))));

  ed.command('signals <path>').description('List signals on a node')
    .action((p) => run(async () => pj(await editorPost('/signals', { path: p }))));

  ed.command('screenshot').description('Capture editor screen as PNG')
    .option('--output <file>', 'Output file path', '')
    .action((opts) => run(async () => {
      const r = await editorGet('/screenshot');
      if (r.error) { fail(r.error); return; }
      const outFile = opts.output || `editor-${Date.now()}.png`;
      fs.writeFileSync(outFile, Buffer.from(r.base64, 'base64'));
      console.log(path.resolve(outFile));
    }));

  ed.command('repl').description('Interactive GDScript REPL (editor context)')
    .action(() => run(async () => await editorRepl()));
}

module.exports = { registerEditorCommands };
