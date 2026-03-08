'use strict';

const { GodotDebuggerClient } = require('./debugger-client');
const { parseSceneNode, formatSceneTree } = require('./scene-tree');
const { startRepl } = require('./repl-commands');

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

function registerDebuggerCommands(program) {
  program.command('repl').description('Interactive REPL connected to running Godot debugger (TCP)')
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
      setTimeout(() => { if (!done) { console.error('Timeout waiting for scene tree.'); client.disconnect(); process.exit(1); } }, 5000);
    });

  program.command('logs').description('Stream Godot output logs via debugger TCP')
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
}

module.exports = { registerDebuggerCommands };
