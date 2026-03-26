'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const getTemplates = require('../lib/templates');

describe('getTemplates', () => {
  const t = getTemplates('test-project');
  const keys = Object.keys(t);

  it('generates 25 files', () => assert.equal(keys.length, 25));

  it('includes project.godot', () => assert.ok(keys.includes('project.godot')));
  it('includes CLAUDE.md', () => assert.ok(keys.includes('CLAUDE.md')));
  it('includes level.tscn', () => assert.ok(keys.includes('scenes/level.tscn')));
  it('includes player.tscn', () => assert.ok(keys.includes('scenes/player.tscn')));
  it('includes game.gd', () => assert.ok(keys.includes('scripts/game.gd')));
  it('includes player.gd', () => assert.ok(keys.includes('scripts/player.gd')));
  it('includes icon.svg', () => assert.ok(keys.includes('icon.svg')));
  it('includes .gitignore', () => assert.ok(keys.includes('.gitignore')));
  it('includes Makefile', () => assert.ok(keys.includes('Makefile')));

  it('includes repl_bridge addon', () => {
    assert.ok(keys.some(k => k.includes('repl_bridge')));
  });

  it('includes godot_kit_bridge addon', () => {
    assert.ok(keys.some(k => k.includes('godot_kit_bridge')));
  });

  it('project.godot contains project name', () => {
    assert.ok(t['project.godot'].includes('test-project'));
  });

  it('project.godot enables ReplBridge autoload', () => {
    assert.ok(t['project.godot'].includes('ReplBridge'));
  });

  it('GDScript files have extends', () => {
    for (const k of keys.filter(k => k.endsWith('.gd'))) {
      assert.ok(t[k].includes('extends'), k + ' missing extends');
    }
  });

  it('plugin.cfg files have [plugin] section', () => {
    for (const k of keys.filter(k => k.endsWith('plugin.cfg'))) {
      assert.ok(t[k].includes('[plugin]'), k + ' missing [plugin]');
    }
  });

  it('vscode settings include gdscript', () => {
    assert.ok(t['.vscode/settings.json'].includes('gdscript'));
  });
});
