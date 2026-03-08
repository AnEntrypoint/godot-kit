'use strict';

const { gameGet, gamePost } = require('./http-client');

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

function registerGameCommands(program) {
  const gm = program.command('game').description('Game runtime HTTP API commands (requires ReplBridge on port 6009)');

  gm.command('tree').description('Dump runtime scene tree')
    .action(() => run(async () => printJSON(await gameGet('/scene-tree'))));

  gm.command('eval <expr>').description('Evaluate a GDScript expression in the running game')
    .action((expr) => run(async () => printJSON(await gamePost('/eval', { expr }))));

  gm.command('globals').description('List all autoloads and root children')
    .action(() => run(async () => printJSON(await gameGet('/globals'))));

  gm.command('fps').description('Show current FPS and performance metrics')
    .action(() => run(async () => {
      const r = await gameGet('/fps');
      console.log(`FPS: ${r.fps} | Target: ${r.target || 'unlimited'} | Process: ${r.process_time_ms?.toFixed(2)}ms`);
    }));

  gm.command('set <node-path> <prop> <val>').description('Set a property on a node at runtime')
    .action((nodePath, prop, val) => run(async () => {
      let parsed = val;
      try { parsed = JSON.parse(val); } catch {}
      printJSON(await gamePost('/set-var', { path: nodePath, property: prop, value: parsed }));
    }));

  gm.command('call <node-path> <method> [args]').description('Call a method on a node (args as JSON array)')
    .action((nodePath, method, args) => run(async () => {
      let parsedArgs = [];
      if (args) { try { parsedArgs = JSON.parse(args); } catch { parsedArgs = [args]; } }
      const parts = nodePath.split('/');
      const methodSegment = method;
      printJSON(await gamePost('/call/' + nodePath + '/' + methodSegment, { args: parsedArgs }));
    }));

  gm.command('node <node-path>').description('Get a node by path')
    .action((np) => run(async () => printJSON(await gameGet('/nodes/' + np))));

  gm.command('pause').description('Toggle game pause state')
    .action(() => run(async () => printJSON(await gamePost('/pause', {}))));

  gm.command('reload').description('Reload the current scene')
    .action(() => run(async () => printJSON(await gamePost('/reload-scene', {}))));

  gm.command('profiler').description('Show performance metrics snapshot')
    .action(() => run(async () => {
      const r = await gameGet('/fps');
      console.log(JSON.stringify(r, null, 2));
    }));

  gm.command('input').description('Show current input/pause state')
    .action(() => run(async () => printJSON(await gameGet('/input'))));
}

module.exports = { registerGameCommands };
