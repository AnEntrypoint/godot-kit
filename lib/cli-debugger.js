'use strict';

const { GodotDebuggerClient } = require('./debugger-client');
const { Connection } = require('./connection');
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
    console.error(`\x1b[31mCannot connect to Godot TCP debugger at ${client.host}:${client.port}\x1b[0m`);
    console.error('Godot must be launched with remote debug enabled. Run:');
    console.error(`  godot-dev launch --port ${client.port}`);
    console.error('Or launch Godot manually with: --remote-debug tcp://127.0.0.1:' + client.port);
    process.exit(1);
  }
}

function registerDebuggerCommands(program) {
  program.command('repl').description('Interactive REPL connected to running Godot debugger (TCP)')
    .option('--host <host>', 'Godot host', '127.0.0.1')
    .option('-p, --port <port>', 'Debugger port', '6007')
    .action(async (opts) => { const c = makeClient(opts); await connectOrDie(c); startRepl(c); });

  program.command('attach').description('Auto-detect running Godot (TCP port 6007 or HTTP port 6009) and start REPL')
    .option('--host <host>', 'Godot host', '127.0.0.1')
    .action(async (opts) => {
      const host = opts.host || '127.0.0.1';
      let conn;
      try {
        conn = await Connection.auto(host);
        console.log(`Found Godot on port ${conn.transport === 'tcp' ? '6007 (TCP debugger)' : '6009 (HTTP bridge)'}`);
      } catch (e) {
        console.error('\x1b[31mNo running Godot found.\x1b[0m');
        console.error('Checked: TCP debugger port 6007, HTTP game bridge port 6009.');
        console.error('Start Godot with remote debug:  godot-dev launch');
        console.error('Or run the game from the editor and ensure ReplBridge autoload is active.');
        process.exit(0);
      }
      if (conn.transport === 'tcp') {
        startRepl(conn._impl);
      } else {
        console.log('Connected via HTTP. Type eval expressions at prompt (Ctrl+C to exit).');
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '\x1b[32mgodot(http)> \x1b[0m' });
        rl.prompt();
        rl.on('line', async (line) => {
          const expr = line.trim();
          if (!expr) { rl.prompt(); return; }
          if (expr === 'exit' || expr === 'quit') { process.exit(0); }
          try {
            const r = await conn.eval(expr);
            console.log(r && r.result !== undefined ? r.result : JSON.stringify(r));
          } catch (e) { console.error('Error:', e.message); }
          rl.prompt();
        });
        rl.on('close', () => process.exit(0));
        conn.on('disconnected', () => { console.log('Godot disconnected.'); });
        conn.on('reconnected', () => { console.log('Godot reconnected.'); });
      }
    });

  program.command('inspect').description('Dump scene tree from running Godot game (one-shot)')
    .option('--host <host>', 'Godot host', '127.0.0.1')
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
    .option('--host <host>', 'Godot host', '127.0.0.1')
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
