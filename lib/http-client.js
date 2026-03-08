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
    req.on('error', (e) => reject(new Error(e.code === 'ECONNREFUSED' ? `No server on port ${port}. Is Godot running?` : e.message)));
    if (data) req.write(data);
    req.end();
  });
}

const editorGet = (path) => request(EDITOR_PORT, 'GET', path, null);
const editorPost = (path, body) => request(EDITOR_PORT, 'POST', path, body);
const gameGet = (path) => request(GAME_PORT, 'GET', path, null);
const gamePost = (path, body) => request(GAME_PORT, 'POST', path, body);

module.exports = { editorGet, editorPost, gameGet, gamePost, EDITOR_PORT, GAME_PORT };
