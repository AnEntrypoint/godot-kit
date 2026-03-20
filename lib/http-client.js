'use strict';

const http = require('http');

const EDITOR_PORT = 6008;
const GAME_PORT = 6009;

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ raw }); }
      });
    });
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        const hint = port === EDITOR_PORT
          ? `Editor bridge not running on port ${port}. Enable the GodotDevPlugin EditorPlugin in Godot (Project > Project Settings > Plugins).`
          : `Game bridge not running on port ${port}. Add the ReplBridge autoload to your scene (run: godot-dev setup).`;
        reject(new Error(hint));
      } else if (e.code === 'ETIMEDOUT' || e.message === 'Request timed out') {
        reject(new Error(`Request to port ${port} timed out. Godot may be busy or unresponsive.`));
      } else {
        reject(new Error(e.message));
      }
    });
    if (data) req.write(data);
    req.end();
  });
}

const editorGet = (path) => request(EDITOR_PORT, 'GET', path, null);
const editorPost = (path, body) => request(EDITOR_PORT, 'POST', path, body);
const gameGet = (path) => request(GAME_PORT, 'GET', path, null);
const gamePost = (path, body) => request(GAME_PORT, 'POST', path, body);
const gameDelete = (path) => request(GAME_PORT, 'DELETE', path, null);

function ping(port, probePath) {
  return new Promise((resolve) => {
    const start = Date.now();
    const opts = { hostname: '127.0.0.1', port, path: probePath, method: 'GET' };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => { resolve({ ok: true, latencyMs: Date.now() - start, raw }); });
    });
    req.setTimeout(1500, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.on('error', (e) => resolve({ ok: false, error: e.code || e.message }));
    req.end();
  });
}

const pingEditor = () => ping(EDITOR_PORT, '/import-status');
const pingGame = () => ping(GAME_PORT, '/perf');

module.exports = { editorGet, editorPost, gameGet, gamePost, gameDelete, pingEditor, pingGame, EDITOR_PORT, GAME_PORT };
