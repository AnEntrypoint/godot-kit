'use strict';

const net = require('net');

function tcpPing(port, timeout) {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = new net.Socket();
    const timer = setTimeout(() => { sock.destroy(); resolve({ ok: false, error: 'timeout' }); }, timeout);
    sock.connect(port, '127.0.0.1', () => { clearTimeout(timer); sock.destroy(); resolve({ ok: true, latencyMs: Date.now() - start }); });
    sock.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: e.code || e.message }); });
  });
}

function registerStatusCommands(program) {
  const { pingEditor, pingGame, EDITOR_PORT, GAME_PORT } = require('./http-client');
  const { findGodot, CFG_PATH, GODOT_VERSION } = require('./engine');
  const tick = '\x1b[32m✓\x1b[0m';
  const cross = '\x1b[31m✗\x1b[0m';

  program.command('status').description('Show connection status for all Godot services')
    .action(async () => {
      const [dbg, editor, game] = await Promise.all([tcpPing(6007, 1500), pingEditor(), pingGame()]);
      const godotBin = findGodot(null);

      console.log('\nGodot Services Status\n' + '-'.repeat(40));
      console.log(`  Debugger   TCP  :6007   ${dbg.ok ? tick + ' connected (' + dbg.latencyMs + 'ms)' : cross + ' offline'}`);

      let editorDetail = '';
      if (editor.ok) { try { const d = JSON.parse(editor.raw); editorDetail = d.scanning ? ' (importing...)' : ' (idle)'; } catch {} }
      console.log(`  Editor     HTTP :${EDITOR_PORT}   ${editor.ok ? tick + ' connected (' + editor.latencyMs + 'ms)' + editorDetail : cross + ' offline'}`);

      let gameDetail = '';
      if (game.ok) { try { const d = JSON.parse(game.raw); if (d.fps) gameDetail = ` (${d.fps.toFixed(1)} FPS)`; } catch {} }
      console.log(`  Game       HTTP :${GAME_PORT}   ${game.ok ? tick + ' connected (' + game.latencyMs + 'ms)' + gameDetail : cross + ' offline'}`);

      console.log('\n' + '-'.repeat(40));
      console.log(`  Engine     ${godotBin ? tick + ' ' + godotBin : cross + ' not found — run: godot-dev download-engine'}`);
      console.log(`  Config     ${CFG_PATH}`);
      console.log(`  Version    Godot ${GODOT_VERSION}\n`);
    });

  const cfgCmd = program.command('config').description('Manage godot-kit configuration (~/.godot-kit/config.json)');
  cfgCmd.command('show').description('Print current configuration')
    .action(() => { const { readConfig } = require('./engine'); console.log(`# ${CFG_PATH}`); console.log(JSON.stringify(readConfig(), null, 2)); });
  cfgCmd.command('path').description('Print path to config file')
    .action(() => { console.log(CFG_PATH); });
  cfgCmd.command('get <key>').description('Get a config value')
    .action((key) => {
      const { readConfig } = require('./engine');
      const cfg = readConfig();
      const v = cfg[key];
      console.log(v !== undefined ? JSON.stringify(v) : 'null');
    });
  cfgCmd.command('set <key> <value>').description('Set a config value')
    .action((key, value) => {
      const { readConfig, writeConfig } = require('./engine');
      let v = value; try { v = JSON.parse(value); } catch {}
      const cfg = readConfig(); cfg[key] = v; writeConfig(cfg);
      console.log(`Set ${key} = ${JSON.stringify(v)} in ${CFG_PATH}`);
    });
}

module.exports = { registerStatusCommands };
