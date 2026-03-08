'use strict';

const net = require('net');
const { EventEmitter } = require('events');
const { buildPacket, parsePacket, splitPackets } = require('./protocol');

class GodotDebuggerClient extends EventEmitter {
  constructor(host = '127.0.0.1', port = 6007) {
    super();
    this.host = host;
    this.port = port;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.connect(this.port, this.host, () => {
        this.connected = true;
        this.emit('connected');
        resolve();
      });
      this.socket.on('data', (chunk) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this._processBuffer();
      });
      this.socket.on('close', () => {
        this.connected = false;
        this.emit('disconnected');
      });
      this.socket.on('error', (err) => {
        this.connected = false;
        if (!this.connected) reject(err);
        else this.emit('error', err);
      });
    });
  }

  _processBuffer() {
    const packets = splitPackets(this.buffer);
    let consumed = 0;
    for (const pkt of packets) {
      const msg = parsePacket(pkt);
      if (msg) {
        this.emit('message', msg);
        this._handleMessage(msg);
        consumed += pkt.length;
      }
    }
    if (consumed > 0) this.buffer = this.buffer.subarray(consumed);
  }

  _handleMessage(msg) {
    const cmd = String(msg.command);
    if (cmd === 'debug_enter') this.emit('break', msg.params);
    else if (cmd === 'debug_exit') this.emit('continue', msg.params);
    else if (cmd === 'stack_dump') this.emit('stack_dump', msg.params);
    else if (cmd === 'stack_frame_vars') this.emit('stack_frame_vars', msg.params);
    else if (cmd === 'scene:scene_tree_parse_begin') this.emit('scene_tree_begin', msg.params);
    else if (cmd === 'scene:scene_tree_parse_end') this.emit('scene_tree_end', msg.params);
    else if (cmd === 'scene:inspect_object') this.emit('inspect_object', msg.params);
    else if (cmd === 'output') this.emit('output', msg.params);
    else if (cmd === 'performance:profile_frame') this.emit('profile_frame', msg.params);
    else if (cmd === 'error') this.emit('godot_error', msg.params);
    else this.emit('unknown', msg);
  }

  send(cmd, params = []) {
    if (!this.connected || !this.socket) return false;
    const buf = buildPacket(cmd, params);
    this.socket.write(buf);
    return true;
  }

  requestSceneTree() { return this.send('scene:request_scene_tree'); }
  requestInspectObject(objectId) { return this.send('scene:inspect_object', [BigInt(objectId)]); }
  requestStackDump() { return this.send('get_stack_dump'); }
  requestStackFrameVars(frameId) { return this.send('get_stack_frame_vars', [frameId]); }
  sendBreak() { return this.send('break'); }
  sendContinue() { return this.send('continue'); }
  sendNext() { return this.send('next'); }
  sendStep() { return this.send('step'); }

  setBreakpoint(filePath, line, enabled = true) {
    return this.send('breakpoint', [filePath, line, enabled]);
  }

  disconnect() {
    if (this.socket) { this.socket.destroy(); this.socket = null; }
    this.connected = false;
  }
}

module.exports = { GodotDebuggerClient };
