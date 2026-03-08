'use strict';

const { editorGet, editorPost } = require('./http-client');
const { readFileSync, existsSync } = require('fs');

function printJSON(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function run(fn) {
  try { await fn(); }
  catch (e) { fail(e.message); }
}

function registerEditorCommands(program) {
  const ed = program.command('editor').description('Editor HTTP API commands (requires godot_kit_bridge on port 6008)');

  ed.command('tree').description('Dump editor scene tree as JSON')
    .action(() => run(async () => printJSON(await editorGet('/scene-tree'))));

  ed.command('select <node-path>').description('Select a node in the editor by path')
    .action((np) => run(async () => printJSON(await editorPost('/set-property', { node: np, property: '_name', value: np }))));

  ed.command('run-script <file>').description('Run a GDScript file in editor context')
    .action((file) => run(async () => {
      if (!existsSync(file)) fail(`File not found: ${file}`);
      const script = readFileSync(file, 'utf8');
      printJSON(await editorPost('/run-script', { script }));
    }));

  ed.command('open <scene-path>').description('Open a scene in the editor (res:// path)')
    .action((p) => run(async () => printJSON(await editorPost('/open-scene', { path: p }))));

  ed.command('save').description('Save the current scene')
    .action(() => run(async () => printJSON(await editorPost('/save-scene', {}))));

  ed.command('files').description('List all project files')
    .action(() => run(async () => {
      const r = await editorGet('/project-files');
      (r.files || []).forEach(f => console.log(f));
    }));

  ed.command('property <node> <prop> <val>').description('Set a node property in the editor')
    .action((node, prop, val) => run(async () => {
      let parsed = val;
      try { parsed = JSON.parse(val); } catch {}
      printJSON(await editorPost('/set-property', { node, property: prop, value: parsed }));
    }));

  ed.command('create <type> <parent> <name>').description('Create a new node in the editor')
    .action((type, parent, name) => run(async () => printJSON(await editorPost('/create-node', { type, parent, name }))));

  ed.command('delete <node-path>').description('Delete a node from the scene')
    .action((np) => run(async () => printJSON(await editorPost('/node/' + np, { _method: 'DELETE' }))));

  ed.command('signals').description('List all signals in the current scene')
    .action(() => run(async () => printJSON(await editorGet('/signals'))));

  ed.command('screenshot').description('Get screenshot path (open editor window to capture)')
    .action(() => run(async () => printJSON(await editorGet('/selected-node'))));

  ed.command('autoloads').description('List all project autoloads')
    .action(() => run(async () => printJSON(await editorGet('/autoloads'))));
}

module.exports = { registerEditorCommands };
