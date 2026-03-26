'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PLUGIN_CFG, PLUGIN_GD } = require('../lib/gd-plugin');

describe('PLUGIN_CFG', () => {
  it('has [plugin] section', () => assert.ok(PLUGIN_CFG.includes('[plugin]')));
  it('has name', () => assert.ok(PLUGIN_CFG.includes('name=')));
  it('has version', () => assert.ok(PLUGIN_CFG.includes('version=')));
  it('has script="plugin.gd"', () => assert.ok(PLUGIN_CFG.includes('script="plugin.gd"')));
});

describe('PLUGIN_GD', () => {
  it('has @tool annotation', () => assert.ok(PLUGIN_GD.includes('@tool')));
  it('extends EditorPlugin', () => assert.ok(PLUGIN_GD.includes('extends EditorPlugin')));
  it('has _enter_tree', () => assert.ok(PLUGIN_GD.includes('_enter_tree')));
  it('has _exit_tree', () => assert.ok(PLUGIN_GD.includes('_exit_tree')));
  it('references port 6008', () => assert.ok(PLUGIN_GD.includes('6008')));
});
