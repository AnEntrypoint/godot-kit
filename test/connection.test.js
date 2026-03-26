'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { Connection } = require('../lib/connection');

describe('Connection class', () => {
  const methods = ['eval', 'tree', 'node', 'perf', 'set', 'call', 'globals', 'groups', 'logs', 'pause', 'reload', 'physics', 'resources', 'screenshot', 'watch', 'signal', 'input', 'watchDelete'];

  for (const m of methods) {
    it(`has method ${m}`, () => assert.equal(typeof Connection.prototype[m], 'function'));
  }

  it('has static auto method', () => assert.equal(typeof Connection.auto, 'function'));

  describe('HTTP-only methods reject on TCP transport', () => {
    const httpOnly = ['physics', 'resources', 'screenshot', 'watch', 'signal', 'input', 'watchDelete'];
    const fakeImpl = { on: () => {} };
    const conn = new Connection('tcp', fakeImpl, '127.0.0.1');

    for (const m of httpOnly) {
      it(`${m} rejects with HTTP transport error`, async () => {
        await assert.rejects(() => conn[m]('test'), { message: /requires HTTP/ });
      });
    }
  });
});
