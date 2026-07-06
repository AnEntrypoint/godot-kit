'use strict';
// Real end-to-end witness: install into a fresh dir, wire project.godot, run real GDScript
// through the real Godot binary. No mocks. Requires GODOT_BIN or `godot`/`godot.exe` on PATH.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const GODOT_BIN = process.env.GODOT_BIN || (process.platform === 'win32' ? 'godot.exe' : 'godot');

function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; }
  else console.log('ok:', msg);
}

function findGodot() {
  try {
    execFileSync(GODOT_BIN, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32', stdio: 'pipe' });
    return true;
  } catch (_) {
    return false;
  }
}

async function main() {
  const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), 'godot-kit-test-'));
  fs.writeFileSync(path.join(tmpProject, 'project.godot'), '; test project\nconfig_version=5\n\n[application]\n\nconfig/name="test"\nconfig/features=PackedStringArray("4.6")\n');

  execFileSync(process.execPath, [path.join(__dirname, 'bin', 'install.js'), tmpProject], { encoding: 'utf8' });

  assert(fs.existsSync(path.join(tmpProject, '.claude', 'skills', 'godot-dev', 'SKILL.md')), 'SKILL.md installed');
  assert(fs.existsSync(path.join(tmpProject, 'addons', 'repl_bridge', 'repl_bridge.gd')), 'repl_bridge.gd installed');
  assert(fs.existsSync(path.join(tmpProject, 'addons', 'godot_kit_bridge', 'plugin.cfg')), 'plugin.cfg installed');

  const godotIni = fs.readFileSync(path.join(tmpProject, 'project.godot'), 'utf8');
  assert(godotIni.includes('ReplBridge="*res://addons/repl_bridge/repl_bridge.gd"'), 'autoload wired into project.godot');
  assert(godotIni.includes('godot_kit_bridge'), 'editor plugin wired into project.godot');

  assert(fs.existsSync(path.join(__dirname, 'skills', 'godot-dev', 'references', 'game-api.md')), 'game-api reference present');
  assert(fs.existsSync(path.join(__dirname, 'skills', 'godot-dev', 'references', 'editor-api.md')), 'editor-api reference present');
  assert(fs.existsSync(path.join(__dirname, 'skills', 'godot-dev', 'references', 'gdscript-4.6.md')), 'gdscript reference present');
  assert(fs.existsSync(path.join(__dirname, 'skills', 'godot-dev', 'references', 'migration-4x.md')), 'migration reference present');

  const langPlugin = require(path.join(__dirname, 'lang', 'gdscript.js'));
  assert(langPlugin.exec.match.test('exec:gdscript'), 'lang plugin matches exec:gdscript');

  if (findGodot()) {
    const out = await langPlugin.exec.run('var a = 6\nvar b = 7\nprint(a * b)', tmpProject);
    assert(out.includes('42'), `real godot headless exec produced 42, got: ${out.split('\n').pop()}`);
  } else {
    console.log('skip: no godot binary on PATH / GODOT_BIN — headless exec witness skipped');
  }

  fs.rmSync(tmpProject, { recursive: true, force: true });
}

main().catch(e => { console.error('FATAL:', e); process.exitCode = 1; });
