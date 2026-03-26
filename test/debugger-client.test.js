'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { GodotDebuggerClient } = require('../lib/debugger-client');

describe('GodotDebuggerClient', () => {
  const methods = ['connect', 'send', 'eval', 'tree', 'node', 'perf', 'set', 'call', 'globals', 'groups', 'logs', 'pause', 'reload', 'requestSceneTree', 'requestInspectObject', 'requestStackDump', 'requestStackFrameVars', 'sendBreak', 'sendContinue', 'sendNext', 'sendStep', 'setBreakpoint', 'disconnect'];

  for (const m of methods) {
    it(`has method ${m}`, () => assert.equal(typeof GodotDebuggerClient.prototype[m], 'function'));
  }

  it('defaults host to 127.0.0.1', () => {
    assert.equal(new GodotDebuggerClient().host, '127.0.0.1');
  });

  it('defaults port to 6007', () => {
    assert.equal(new GodotDebuggerClient().port, 6007);
  });

  it('starts disconnected', () => {
    assert.equal(new GodotDebuggerClient().connected, false);
  });

  it('buffer is a Buffer', () => {
    assert.ok(Buffer.isBuffer(new GodotDebuggerClient().buffer));
  });

  it('rejects eval when not connected', async () => {
    await assert.rejects(() => new GodotDebuggerClient().eval('test'), { message: 'not connected' });
  });

  it('_rejectPending clears all pending', () => {
    const c = new GodotDebuggerClient();
    let rejected = false;
    c._pending.set('1', { resolve: () => {}, reject: () => { rejected = true; } });
    c._rejectPending(new Error('test'));
    assert.equal(c._pending.size, 0);
    assert.ok(rejected);
  });

  describe('message routing', () => {
    it('routes debug_enter to break event', () => {
      const c = new GodotDebuggerClient();
      let fired = false;
      c.on('break', () => { fired = true; });
      c._handleMessage({ command: 'debug_enter', params: [] });
      assert.ok(fired);
    });

    it('routes debug_exit to continue event', () => {
      const c = new GodotDebuggerClient();
      let fired = false;
      c.on('continue', () => { fired = true; });
      c._handleMessage({ command: 'debug_exit', params: [] });
      assert.ok(fired);
    });

    it('routes output to output event', () => {
      const c = new GodotDebuggerClient();
      let fired = false;
      c.on('output', () => { fired = true; });
      c._handleMessage({ command: 'output', params: ['hello'] });
      assert.ok(fired);
    });

    it('routes error to godot_error event', () => {
      const c = new GodotDebuggerClient();
      let fired = false;
      c.on('godot_error', () => { fired = true; });
      c._handleMessage({ command: 'error', params: ['err'] });
      assert.ok(fired);
    });

    it('routes unknown to unknown event', () => {
      const c = new GodotDebuggerClient();
      let fired = false;
      c.on('unknown', () => { fired = true; });
      c._handleMessage({ command: 'something_else', params: [] });
      assert.ok(fired);
    });
  });
});
