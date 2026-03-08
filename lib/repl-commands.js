'use strict';

const readline = require('readline');
const { parseSceneNode, formatSceneTree } = require('./scene-tree');

function startRepl(client) {
  client.on('output', (params) => {
    for (const p of params) {
      if (typeof p === 'string') process.stdout.write('\x1b[90m[godot] ' + p + '\x1b[0m\n');
    }
  });
  client.on('break', (params) => {
    console.log(`\x1b[33m[BREAK] ${params[1] || '?'}:${params[2] || 0}\x1b[0m`);
    console.log('Commands: continue|c, next|n, step|s, stack, vars <frame>, tree, inspect <id>, bp <file> <line>');
  });
  client.on('stack_dump', (params) => {
    console.log('\x1b[36m--- Stack Dump ---\x1b[0m');
    for (let i = 0; i < params.length; i += 3) {
      console.log(`  Frame ${i / 3}: ${params[i + 1]}:${params[i + 2]} in ${params[i]}`);
    }
  });
  client.on('godot_error', (params) => {
    console.error('\x1b[31m[ERROR]', params.join(' '), '\x1b[0m');
  });
  client.on('disconnected', () => { console.log('\x1b[31mGodot disconnected.\x1b[0m'); process.exit(0); });
  client.on('message', (msg) => handleMessage(msg, client));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '\x1b[32mgodot> \x1b[0m' });
  rl.prompt();
  rl.on('line', (line) => { dispatch(line.trim(), client, rl); rl.prompt(); });
  rl.on('close', () => { client.disconnect(); process.exit(0); });
}

function handleMessage(msg, client) {
  const cmd = String(msg.command);
  if (cmd === 'scene:scene_tree_parse_end') {
    try {
      formatSceneTree(parseSceneNode(msg.params)).forEach(l => console.log(l));
    } catch (e) {
      console.log('[scene]', JSON.stringify(msg.params, null, 2));
    }
  }
  if (cmd === 'scene:inspect_object') {
    console.log('\x1b[36m--- Object Properties ---\x1b[0m');
    const props = msg.params[2];
    if (Array.isArray(props)) {
      for (let i = 0; i < props.length; i += 5) {
        console.log(`  ${props[i]}: ${JSON.stringify(props[i + 4])}`);
      }
    }
  }
  if (cmd === 'stack_frame_vars') {
    const count = msg.params[0];
    console.log('\x1b[36m--- Variables ---\x1b[0m');
    for (let i = 0; i < count; i++) {
      console.log(`  ${msg.params[1 + i * 3]} = ${JSON.stringify(msg.params[1 + i * 3 + 2])}`);
    }
  }
}

function dispatch(line, client, rl) {
  const parts = line.split(/\s+/);
  const cmd = parts[0];
  if (!cmd) return;
  const MAP = {
    quit: () => { client.disconnect(); process.exit(0); },
    exit: () => { client.disconnect(); process.exit(0); },
    c: () => client.sendContinue(),
    continue: () => client.sendContinue(),
    n: () => client.sendNext(),
    next: () => client.sendNext(),
    s: () => client.sendStep(),
    step: () => client.sendStep(),
    b: () => client.sendBreak(),
    break: () => client.sendBreak(),
    stack: () => client.requestStackDump(),
    vars: () => client.requestStackFrameVars(parseInt(parts[1] || '0')),
    tree: () => client.requestSceneTree(),
    inspect: () => client.requestInspectObject(parts[1] || '0'),
    bp: () => client.setBreakpoint(parts[1], parseInt(parts[2]), parts[3] !== 'false'),
  };
  if (MAP[cmd]) MAP[cmd]();
  else console.log('Unknown: continue|c, next|n, step|s, break|b, stack, vars, tree, inspect, bp');
}

module.exports = { startRepl };
