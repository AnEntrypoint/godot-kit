'use strict';

const fs = require('fs');
const path = require('path');

const DEPRECATED_PATTERNS = [
  { pattern: /\.instance\s*\(/, message: 'instance() → instantiate()' },
  { pattern: /\byield\s*\(/, message: 'yield() removed — use await' },
  { pattern: /\.empty\s*\(/, message: '.empty() → .is_empty()' },
  { pattern: /\.invert\s*\(/, message: '.invert() → .reverse()' },
  { pattern: /\bOS\.get_ticks_msec\b/, message: 'OS.get_ticks_msec → Time.get_ticks_msec()' },
  { pattern: /\bOS\.get_datetime\b/, message: 'OS.get_datetime → Time.get_datetime_dict_from_system()' },
  { pattern: /\bOS\.get_unix_time\b/, message: 'OS.get_unix_time → Time.get_unix_time_from_system()' },
  { pattern: /\bKinematicBody2D\b/, message: 'KinematicBody2D → CharacterBody2D' },
  { pattern: /\bKinematicBody\b(?!2D)/, message: 'KinematicBody → CharacterBody3D' },
  { pattern: /\bSpatial\b/, message: 'Spatial → Node3D' },
  { pattern: /\bSpatialMaterial\b/, message: 'SpatialMaterial → StandardMaterial3D' },
  { pattern: /\bAnimatedSprite\b(?!2D)/, message: 'AnimatedSprite → AnimatedSprite2D' },
  { pattern: /\bSprite\b(?!2D|Sheet|Frames|Base|3D)/, message: 'Sprite → Sprite2D' },
  { pattern: /\bStreamTexture\b/, message: 'StreamTexture → CompressedTexture2D' },
  { pattern: /\bParticles\b(?!2D|Material|Process)/, message: 'Particles → GPUParticles3D' },
  { pattern: /\bParticles2D\b/, message: 'Particles2D → GPUParticles2D' },
  { pattern: /\bParticlesMaterial\b/, message: 'ParticlesMaterial → ParticleProcessMaterial' },
  { pattern: /\bGIProbe\b/, message: 'GIProbe → VoxelGI' },
  { pattern: /\bPosition2D\b/, message: 'Position2D → Marker2D' },
  { pattern: /\bPosition3D\b/, message: 'Position3D → Marker3D' },
  { pattern: /\bPanoramaSky\b/, message: 'PanoramaSky → Sky' },
  { pattern: /\bCubeMesh\b/, message: 'CubeMesh → BoxMesh' },
  { pattern: /\bBoxShape\b(?!3D)/, message: 'BoxShape → BoxShape3D' },
  { pattern: /\bCapsuleShape\b(?!3D)/, message: 'CapsuleShape → CapsuleShape3D' },
  { pattern: /\bPlaneShape\b/, message: 'PlaneShape → WorldBoundaryShape3D' },
  { pattern: /\bNavigationMeshInstance\b/, message: 'NavigationMeshInstance → NavigationRegion3D' },
  { pattern: /\bNavigationPolygonInstance\b/, message: 'NavigationPolygonInstance → NavigationRegion2D' },
  { pattern: /\bnew File\b/, message: 'File class → FileAccess (use FileAccess.open())' },
  { pattern: /\bnew Directory\b/, message: 'Directory class → DirAccess (use DirAccess.open())' },
  { pattern: /\.raise\s*\(/, message: '.raise() → .move_to_front()' },
  { pattern: /\bcanvas_item\.update\s*\(/, message: 'CanvasItem.update() → queue_redraw()' },
];

function checkString(src, label) {
  const warnings = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, message } of DEPRECATED_PATTERNS) {
      if (pattern.test(line)) {
        warnings.push({ file: label || '<inline>', line: i + 1, message, text: line.trim() });
      }
    }
  }
  return warnings;
}

function checkFile(filePath) {
  let src;
  try { src = fs.readFileSync(filePath, 'utf8'); } catch (e) { return []; }
  return checkString(src, filePath);
}

function collectGdFiles(dir) {
  const results = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return results; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      results.push(...collectGdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.gd')) {
      results.push(full);
    }
  }
  return results;
}

function checkDir(dir) {
  const files = collectGdFiles(dir);
  const all = [];
  for (const f of files) all.push(...checkFile(f));
  return all;
}

function formatWarnings(warnings) {
  if (!warnings.length) return '';
  return warnings.map(w => `${w.file}:${w.line}: [migration] ${w.message}\n  > ${w.text}`).join('\n');
}

module.exports = { checkFile, checkString, checkDir, formatWarnings, DEPRECATED_PATTERNS };
