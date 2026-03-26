'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const httpClient = require('../lib/http-client');

describe('http-client exports', () => {
  const expected = ['editorGet', 'editorPost', 'gameGet', 'gamePost', 'gameDelete', 'pingEditor', 'pingGame', 'EDITOR_PORT', 'GAME_PORT'];

  it('exports all 9 members', () => {
    assert.equal(Object.keys(httpClient).length, 9);
  });

  for (const name of expected) {
    it(`exports ${name}`, () => assert.ok(name in httpClient));
  }

  it('functions are functions', () => {
    for (const name of expected.filter(n => !n.includes('PORT'))) {
      assert.equal(typeof httpClient[name], 'function');
    }
  });

  it('EDITOR_PORT is 6008', () => assert.equal(httpClient.EDITOR_PORT, 6008));
  it('GAME_PORT is 6009', () => assert.equal(httpClient.GAME_PORT, 6009));
});
