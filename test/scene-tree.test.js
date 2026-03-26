'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseSceneNode, formatSceneTree } = require('../lib/scene-tree');

describe('parseSceneNode', () => {
  it('parses leaf node', () => {
    const params = [0, 'Root', 'Node2D', 1, '', 0];
    const node = parseSceneNode(params);
    assert.equal(node.name, 'Root');
    assert.equal(node.className, 'Node2D');
    assert.equal(node.id, 1);
    assert.equal(node.children.length, 0);
  });

  it('parses node with one child', () => {
    const params = [1, 'Root', 'Node2D', 1, 'res://level.tscn', 0, 0, 'Player', 'CharacterBody2D', 2, 'res://player.tscn', 0];
    const node = parseSceneNode(params);
    assert.equal(node.children.length, 1);
    assert.equal(node.children[0].name, 'Player');
    assert.equal(node.children[0].className, 'CharacterBody2D');
  });

  it('parses deep nesting', () => {
    const params = [1, 'Root', 'Node', 1, '', 0, 1, 'A', 'Node2D', 2, '', 0, 0, 'B', 'Sprite2D', 3, '', 0];
    const node = parseSceneNode(params);
    assert.equal(node.children[0].children[0].name, 'B');
  });

  it('parses multiple siblings', () => {
    const params = [2, 'Root', 'Node', 1, '', 0, 0, 'A', 'Node2D', 2, '', 0, 0, 'B', 'Sprite2D', 3, '', 0];
    const node = parseSceneNode(params);
    assert.equal(node.children.length, 2);
    assert.equal(node.children[0].name, 'A');
    assert.equal(node.children[1].name, 'B');
  });

  it('preserves sceneFilePath', () => {
    const params = [0, 'Root', 'Node2D', 1, 'res://scene.tscn', 0];
    assert.equal(parseSceneNode(params).sceneFilePath, 'res://scene.tscn');
  });
});

describe('formatSceneTree', () => {
  it('formats leaf node', () => {
    const node = { name: 'Root', className: 'Node2D', id: 1, sceneFilePath: '', viewFlags: 0, children: [] };
    const lines = formatSceneTree(node);
    assert.equal(lines.length, 1);
    assert.ok(lines[0].includes('[Node2D] Root'));
    assert.ok(lines[0].includes('(id:1)'));
  });

  it('formats with scene file path', () => {
    const node = { name: 'Root', className: 'Node', id: 1, sceneFilePath: 'res://level.tscn', viewFlags: 0, children: [] };
    assert.ok(formatSceneTree(node)[0].includes('<res://level.tscn>'));
  });

  it('indents children', () => {
    const node = {
      name: 'Root', className: 'Node', id: 1, sceneFilePath: '', viewFlags: 0,
      children: [{ name: 'Child', className: 'Sprite2D', id: 2, sceneFilePath: '', viewFlags: 0, children: [] }]
    };
    const lines = formatSceneTree(node);
    assert.equal(lines.length, 2);
    assert.ok(lines[1].startsWith('  '));
  });

  it('formats groups', () => {
    const node = { name: 'Enemy', className: 'Node', id: 1, sceneFilePath: '', viewFlags: 0, children: [], groups: ['enemies', 'damageable'] };
    assert.ok(formatSceneTree(node)[0].includes('[enemies,damageable]'));
  });

  it('omits groups section when no groups', () => {
    const node = { name: 'X', className: 'Node', id: 1, sceneFilePath: '', viewFlags: 0, children: [] };
    const line = formatSceneTree(node)[0];
    assert.ok(!line.includes('] ['));
  });
});
