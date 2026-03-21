'use strict';

const { EventEmitter } = require('events');
const net = require('net');
const http = require('http');
const { GodotDebuggerClient } = require('./debugger-client');

const TCP_PORT = 6007;
const HTTP_PORT = 6009;
const RECONNECT_INTERVAL = 1000;
const RECONNECT_TIMEOUT = 30000;

function tryTCP(host, port, timeout) {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('tcp timeout')); }, timeout);
    sock.connect(port, host, () => { clearTimeout(timer); sock.destroy(); resolve(); });
    sock.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

function tryHTTP(host, port, timeout) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: host, port, path: '/perf', method: 'GET' }, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => { try { JSON.parse(raw); resolve(); } catch { reject(new Error('not json')); } });
    });
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('http timeout')); });
    req.on('error', reject);
    req.end();
  });
}

function httpMethod(host, port, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: host, port, path, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    }, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve({ raw }); } });
    });
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

class Connection extends EventEmitter {
  constructor(transport, impl, host) {
    super();
    this.transport = transport;
    this._impl = impl;
    this._host = host || '127.0.0.1';
    this._reconnecting = false;
    if (transport === 'tcp') {
      impl.on('disconnected', () => { this.emit('disconnected'); this._scheduleReconnect(); });
    }
  }

  _scheduleReconnect() {
    if (this._reconnecting) return;
    this._reconnecting = true;
    const start = Date.now();
    const retry = () => {
      if (Date.now() - start > RECONNECT_TIMEOUT) { this._reconnecting = false; return; }
      const c = new GodotDebuggerClient(this._host, this._impl.port || TCP_PORT);
      c.connect().then(() => {
        this._impl = c;
        c.on('disconnected', () => { this.emit('disconnected'); this._scheduleReconnect(); });
        this._reconnecting = false;
        this.emit('reconnected');
      }).catch(() => setTimeout(retry, RECONNECT_INTERVAL));
    };
    setTimeout(retry, RECONNECT_INTERVAL);
  }

  static async auto(host = '127.0.0.1') {
    try {
      await tryTCP(host, TCP_PORT, 2000);
      const client = new GodotDebuggerClient(host, TCP_PORT);
      await client.connect();
      return new Connection('tcp', client, host);
    } catch {}
    try {
      await tryHTTP(host, HTTP_PORT, 2000);
      return new Connection('http', { host, port: HTTP_PORT }, host);
    } catch {}
    throw new Error('No Godot found on port 6007 (TCP) or 6009 (HTTP)');
  }

  _tcpReq(method, args) { return this._impl[method](...args); }
  _httpGet(path) { return httpMethod(this._impl.host, this._impl.port, 'GET', path, null); }
  _httpPost(path, body) { return httpMethod(this._impl.host, this._impl.port, 'POST', path, body); }
  _httpDelete(path) { return httpMethod(this._impl.host, this._impl.port, 'DELETE', path, null); }

  eval(expr) { return this.transport === 'tcp' ? this._tcpReq('eval', [expr]) : this._httpPost('/eval', { expr }); }
  tree() { return this.transport === 'tcp' ? this._tcpReq('tree', []) : this._httpGet('/tree'); }
  node(path) { return this.transport === 'tcp' ? this._tcpReq('node', [path]) : this._httpGet('/node/' + path.replace(/^\//, '')); }
  perf() { return this.transport === 'tcp' ? this._tcpReq('perf', []) : this._httpGet('/perf'); }
  set(path, prop, value) { return this.transport === 'tcp' ? this._tcpReq('set', [path, prop, value]) : this._httpPost('/set', { path, prop, value }); }
  call(path, method, ...args) { return this.transport === 'tcp' ? this._tcpReq('call', [path, method, ...args]) : this._httpPost('/call', { path, method, args }); }
  globals() { return this.transport === 'tcp' ? this._tcpReq('globals', []) : this._httpGet('/globals'); }
  groups() { return this.transport === 'tcp' ? this._tcpReq('groups', []) : this._httpGet('/groups'); }
  logs() { return this.transport === 'tcp' ? this._tcpReq('logs', []) : this._httpGet('/logs'); }
  pause() { return this.transport === 'tcp' ? this._tcpReq('pause', []) : this._httpPost('/pause', {}); }
  reload() { return this.transport === 'tcp' ? this._tcpReq('reload', []) : this._httpPost('/reload', {}); }
  physics() { return this.transport === 'http' ? this._httpGet('/physics') : Promise.reject(new Error('physics() requires HTTP transport')); }
  resources() { return this.transport === 'http' ? this._httpGet('/resources') : Promise.reject(new Error('resources() requires HTTP transport')); }
  screenshot() { return this.transport === 'http' ? this._httpGet('/screenshot') : Promise.reject(new Error('screenshot() requires HTTP transport')); }
  watch(expr) { return this.transport === 'http' ? this._httpPost('/watch', { expr }) : Promise.reject(new Error('watch() requires HTTP transport')); }
  signal(path, sig, args = []) { return this.transport === 'http' ? this._httpPost('/signal', { path, signal: sig, args }) : Promise.reject(new Error('signal() requires HTTP transport')); }
  input() { return this.transport === 'http' ? this._httpGet('/input') : Promise.reject(new Error('input() requires HTTP transport')); }
  watchDelete(id) { return this.transport === 'http' ? this._httpDelete('/watch/' + id) : Promise.reject(new Error('watchDelete() requires HTTP transport')); }
}

module.exports = { Connection };
