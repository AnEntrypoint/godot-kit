'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const { checkString, checkFile, collectFiles, formatWarnings, DEPRECATED_PATTERNS } = require('../lib/compat-checker');

describe('DEPRECATED_PATTERNS', () => {
  it('has 38 patterns', () => assert.equal(DEPRECATED_PATTERNS.length, 38));

  const cases = [
    ['scene.instance()', 'instance() → instantiate()'],
    ['yield(signal)', 'yield() removed — use await'],
    ['arr.empty()', '.empty() → .is_empty()'],
    ['arr.invert()', '.invert() → .reverse()'],
    ['OS.get_ticks_msec', 'OS.get_ticks_msec → Time.get_ticks_msec()'],
    ['OS.get_datetime', 'OS.get_datetime → Time.get_datetime_dict_from_system()'],
    ['OS.get_unix_time', 'OS.get_unix_time → Time.get_unix_time_from_system()'],
    ['extends KinematicBody2D', 'KinematicBody2D → CharacterBody2D'],
    ['extends KinematicBody', 'KinematicBody → CharacterBody3D'],
    ['extends Spatial', 'Spatial → Node3D'],
    ['SpatialMaterial.new()', 'SpatialMaterial → StandardMaterial3D'],
    ['$AnimatedSprite.play()', 'AnimatedSprite → AnimatedSprite2D'],
    ['$Sprite.texture', 'Sprite → Sprite2D'],
    ['StreamTexture.new()', 'StreamTexture → CompressedTexture2D'],
    ['$Particles.emitting', 'Particles → GPUParticles3D'],
    ['$Particles2D.emitting', 'Particles2D → GPUParticles2D'],
    ['ParticlesMaterial.new()', 'ParticlesMaterial → ParticleProcessMaterial'],
    ['$GIProbe.bake()', 'GIProbe → VoxelGI'],
    ['$Position2D.pos', 'Position2D → Marker2D'],
    ['$Position3D.pos', 'Position3D → Marker3D'],
    ['PanoramaSky.new()', 'PanoramaSky → Sky'],
    ['CubeMesh.new()', 'CubeMesh → BoxMesh'],
    ['BoxShape.new()', 'BoxShape → BoxShape3D'],
    ['CapsuleShape.new()', 'CapsuleShape → CapsuleShape3D'],
    ['PlaneShape.new()', 'PlaneShape → WorldBoundaryShape3D'],
    ['$NavigationMeshInstance', 'NavigationMeshInstance → NavigationRegion3D'],
    ['$NavigationPolygonInstance', 'NavigationPolygonInstance → NavigationRegion2D'],
    ['File.new()', 'File.new() → FileAccess.open()'],
    ['Directory.new()', 'Directory.new() → DirAccess.open()'],
    ['tree.change_scene("res://x.tscn")', '.change_scene() → .change_scene_to_file()'],
    ['connect("pressed", self, "_on")', 'connect("signal", self, "_method") → signal.connect(_method)'],
    ['canvas_item.raise()', '.raise() → .move_to_front()'],
    ['canvas_item.update()', 'CanvasItem.update() → queue_redraw()'],
    ['emit_signal("done")', 'emit_signal() → signal_name.emit()'],
    ['onready var x = $Node', 'onready var → @onready var'],
    ['export var speed = 100', 'export var → @export var'],
    ['var x setget set_x', 'setget → use set/get property syntax (Godot 4)'],
    ['var a: PoolStringArray', 'Pool*Array → Packed*Array (e.g. PackedStringArray)'],
  ];

  for (const [code, msg] of cases) {
    it(`detects: ${msg.slice(0, 40)}`, () => {
      const w = checkString(code, 'test');
      assert.ok(w.some(x => x.message === msg), `expected "${msg}" in ${JSON.stringify(w.map(x => x.message))}`);
    });
  }
});

describe('no false positives on Godot 4 code', () => {
  const valid = [
    'scene.instantiate()', 'await signal_name', 'arr.is_empty()',
    'arr.reverse()', 'Time.get_ticks_msec()', 'extends CharacterBody2D',
    'extends Node3D', '$AnimatedSprite2D.play()', '$Sprite2D.texture',
    '@onready var x = $Node', '@export var speed = 100', 'PackedStringArray',
  ];
  for (const code of valid) {
    it(`clean: ${code.slice(0, 40)}`, () => {
      assert.equal(checkString(code, 'test').length, 0);
    });
  }
});

describe('checkString', () => {
  it('returns correct line numbers', () => {
    const w = checkString('line1\nFile.new()\nline3', 'test.gd');
    assert.equal(w[0].line, 2);
    assert.equal(w[0].file, 'test.gd');
  });

  it('skips comments', () => {
    assert.equal(checkString('# File.new()', 'test').length, 0);
  });

  it('skips indented comments', () => {
    assert.equal(checkString('  # File.new()', 'test').length, 0);
  });
});

describe('checkFile', () => {
  it('returns empty for missing file', () => {
    assert.deepEqual(checkFile('/nonexistent/path.gd'), []);
  });

  it('checks real file', () => {
    const tmp = path.join(os.tmpdir(), 'compat-test-' + Date.now() + '.gd');
    require('fs').writeFileSync(tmp, 'File.new()');
    const w = checkFile(tmp);
    assert.ok(w.length > 0);
    require('fs').unlinkSync(tmp);
  });
});

describe('collectFiles', () => {
  it('returns empty for nonexistent dir', () => {
    assert.deepEqual(collectFiles('/nonexistent'), []);
  });

  it('finds .gd files', () => {
    const tmp = path.join(os.tmpdir(), 'collect-test-' + Date.now());
    const fsMod = require('fs');
    fsMod.mkdirSync(tmp, { recursive: true });
    fsMod.writeFileSync(path.join(tmp, 'a.gd'), 'pass');
    fsMod.writeFileSync(path.join(tmp, 'b.tscn'), '[gd_scene]');
    fsMod.writeFileSync(path.join(tmp, 'c.js'), '');
    const files = collectFiles(tmp);
    assert.equal(files.length, 2);
    fsMod.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('formatWarnings', () => {
  it('empty array returns empty string', () => {
    assert.equal(formatWarnings([]), '');
  });

  it('formats warning with file:line prefix', () => {
    const out = formatWarnings([{ file: 'x.gd', line: 5, message: 'test', text: 'code' }]);
    assert.ok(out.includes('x.gd:5:'));
    assert.ok(out.includes('[migration]'));
    assert.ok(out.includes('code'));
  });
});
