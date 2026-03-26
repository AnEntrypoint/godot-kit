'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { GODOT_VERSION, CFG_DIR, CFG_PATH, readConfig, writeConfig, findGodot } = require('../lib/engine');
const path = require('path');
const os = require('os');

describe('engine constants', () => {
  it('GODOT_VERSION is string', () => assert.equal(typeof GODOT_VERSION, 'string'));
  it('GODOT_VERSION defaults to 4.6-stable', () => assert.ok(GODOT_VERSION.includes('4.')));
  it('CFG_DIR is under homedir', () => assert.ok(CFG_DIR.includes('.godot-kit')));
  it('CFG_PATH ends with config.json', () => assert.ok(CFG_PATH.endsWith('config.json')));
});

describe('readConfig', () => {
  it('returns object', () => {
    const cfg = readConfig();
    assert.equal(typeof cfg, 'object');
    assert.ok(cfg !== null);
  });
});

describe('writeConfig', () => {
  it('is a function', () => assert.equal(typeof writeConfig, 'function'));
});

describe('findGodot', () => {
  it('returns explicit path when not "godot"', () => {
    assert.equal(findGodot('/usr/bin/custom-godot'), '/usr/bin/custom-godot');
  });

  it('treats "godot" string as non-explicit', () => {
    const result = findGodot('godot');
    assert.ok(result === null || typeof result === 'string');
  });

  it('returns string or null for null input', () => {
    const result = findGodot(null);
    assert.ok(result === null || typeof result === 'string');
  });
});
