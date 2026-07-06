#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function out(msg) { process.stdout.write(msg + '\n'); }
function err(msg) { process.stderr.write(msg + '\n'); }

function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function ensureAutoload(projectGodotPath) {
  let content = fs.existsSync(projectGodotPath) ? fs.readFileSync(projectGodotPath, 'utf8') : '';
  if (content.includes('ReplBridge=')) return false;
  const line = 'ReplBridge="*res://addons/repl_bridge/repl_bridge.gd"';
  if (content.includes('[autoload]')) {
    content = content.replace('[autoload]', '[autoload]\n\n' + line);
  } else {
    content += (content.endsWith('\n') || content === '' ? '' : '\n') + '\n[autoload]\n\n' + line + '\n';
  }
  fs.writeFileSync(projectGodotPath, content, 'utf8');
  return true;
}

function ensureEditorPlugin(projectGodotPath) {
  let content = fs.existsSync(projectGodotPath) ? fs.readFileSync(projectGodotPath, 'utf8') : '';
  if (content.includes('godot_kit_bridge')) return false;
  const pluginPath = '"res://addons/godot_kit_bridge/plugin.cfg"';
  const section = /\[editor_plugins\]\s*\n\s*enabled=PackedStringArray\(([^)]*)\)/;
  const m = content.match(section);
  if (m) {
    const existing = m[1].trim();
    const merged = existing ? existing + ', ' + pluginPath : pluginPath;
    content = content.replace(section, `[editor_plugins]\n\nenabled=PackedStringArray(${merged})`);
  } else {
    content += (content.endsWith('\n') || content === '' ? '' : '\n') + `\n[editor_plugins]\n\nenabled=PackedStringArray(${pluginPath})\n`;
  }
  fs.writeFileSync(projectGodotPath, content, 'utf8');
  return true;
}

function main() {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : (process.env.INIT_CWD || process.cwd());
  const projectGodot = path.join(targetDir, 'project.godot');
  const isGodotProject = fs.existsSync(projectGodot);

  out('');
  out('  godot-dev skill installer');
  out(`  Target: ${targetDir}`);
  if (!isGodotProject) {
    out('  Warning: no project.godot found here -- installing anyway, wire it up once one exists.');
  }
  out('');

  const pkgRoot = path.join(__dirname, '..');

  copyTree(path.join(pkgRoot, 'skills', 'godot-dev'), path.join(targetDir, '.claude', 'skills', 'godot-dev'));
  out('  + .claude/skills/godot-dev/ (SKILL.md + references/ + assets/)');

  const bridgeDir = path.join(targetDir, 'addons', 'repl_bridge');
  fs.mkdirSync(bridgeDir, { recursive: true });
  fs.copyFileSync(path.join(pkgRoot, 'skills', 'godot-dev', 'assets', 'repl_bridge.gd'), path.join(bridgeDir, 'repl_bridge.gd'));
  out('  + addons/repl_bridge/repl_bridge.gd');

  const editorDir = path.join(targetDir, 'addons', 'godot_kit_bridge');
  fs.mkdirSync(editorDir, { recursive: true });
  for (const f of ['editor_http.gd', 'plugin.gd', 'plugin.cfg']) {
    fs.copyFileSync(path.join(pkgRoot, 'skills', 'godot-dev', 'assets', f), path.join(editorDir, f));
  }
  out('  + addons/godot_kit_bridge/ (editor_http.gd, plugin.gd, plugin.cfg)');

  if (isGodotProject) {
    if (ensureAutoload(projectGodot)) out('  + wired ReplBridge autoload into project.godot');
    if (ensureEditorPlugin(projectGodot)) out('  + wired godot_kit_bridge into project.godot [editor_plugins]');
  } else {
    out('  Skipped project.godot wiring (none found) -- add manually, see .claude/skills/godot-dev/SKILL.md Setup section.');
  }

  out('');
  out('  Done. Re-open the project in Godot so the autoload/plugin activate.');
  out('  Agent instructions installed at .claude/skills/godot-dev/SKILL.md.');
}

main();
