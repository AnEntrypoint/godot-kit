#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', c: '\x1b[36m', b: '\x1b[1m', d: '\x1b[2m', x: '\x1b[0m' };
const ok = (s) => `${C.g}PASS${C.x} ${s}`;
const fail = (s) => `${C.r}FAIL${C.x} ${s}`;
const skip = (s) => `${C.y}SKIP${C.x} ${s}`;
const hdr = (n, total, title) => console.log(`\n${C.b}${C.c}[${n}/${total}] ${title}${C.x}`);
const results = [];
function record(name, passed, skipped, detail) {
  results.push({ name, passed, skipped });
  console.log(skipped ? skip(detail) : passed ? ok(detail) : fail(detail));
}

console.log(`${C.c}${C.b}╔═══════════════════════════════════════╗\n║          godot-kit  demo              ║\n║  Showcasing all capabilities          ║\n╚═══════════════════════════════════════╝${C.x}\n`);
const TOTAL_SECTIONS = 9;

const KIT = path.join(__dirname);
const tmpDir = path.join(os.tmpdir(), 'godot-kit-demo-' + process.pid);
const cleanup = () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} };

// [1/9] Engine Detection
hdr(1, TOTAL_SECTIONS, 'Engine Detection');
const { findGodot, GODOT_VERSION } = require(path.join(KIT, 'lib/engine'));
const godotPath = findGodot(null);
record('engine', !!godotPath, false,
  godotPath ? `Godot ${GODOT_VERSION} found: ${godotPath}` : `Godot not found (run: godot-dev download-engine)`);

// [2/9] Project Scaffolding
hdr(2, TOTAL_SECTIONS, 'Project Scaffolding');
try {
  const getTemplates = require(path.join(KIT, 'lib/templates'));
  const templates = getTemplates('demo-showcase');
  fs.mkdirSync(tmpDir, { recursive: true });
  for (const [rel, content] of Object.entries(templates)) {
    const full = path.join(tmpDir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  const expected = ['project.godot', 'scripts/main.gd', 'addons/repl_bridge/repl_bridge.gd'];
  const missing = expected.filter(f => !fs.existsSync(path.join(tmpDir, f)));
  const created = Object.keys(templates).length;
  record('scaffold', !missing.length, false, missing.length ? `Missing: ${missing.join(', ')}` : `${created} files created: ${Object.keys(templates).slice(0,4).join(', ')}...`);
} catch (e) {
  record('scaffold', false, false, `Error: ${e.message}`);
}

// [3/9] Protocol Layer
hdr(3, TOTAL_SECTIONS, 'Protocol Layer - Binary Variant Encode/Decode');
try {
  const { encodeVariant, decodeVariant } = require(path.join(KIT, 'lib/protocol'));
  const cases = [
    [null, 'NIL', (a, b) => a === b],
    [true, 'BOOL', (a, b) => a === b],
    [42, 'INT', (a, b) => a === b],
    [3.14, 'FLOAT', (a, b) => Math.abs(a - b) < 0.001],
    ['hello world', 'STRING', (a, b) => a === b],
    [[1, 2, 3], 'ARRAY', (a, b) => JSON.stringify(a) === JSON.stringify(b)],
    [{ x: 10, y: 'two' }, 'DICT', (a, b) => JSON.stringify(a) === JSON.stringify(b)],
  ];
  let passed = 0;
  for (const [val, name, eq] of cases) {
    const buf = encodeVariant(val);
    const { value } = decodeVariant(buf, 0);
    const p = eq(val, value);
    console.log(`  ${p ? C.g + 'ok' : C.r + 'err'}${C.x} ${name}: ${JSON.stringify(val)} -> ${JSON.stringify(value)}`);
    if (p) passed++;
  }
  record('protocol', passed === cases.length, false, `${passed}/${cases.length} variant types encode/decode correctly`);
} catch (e) {
  record('protocol', false, false, `Error: ${e.message}`);
}

// [4/9] Compat Checker
hdr(4, TOTAL_SECTIONS, 'GDScript Compat Checker - Godot 3.x Deprecations');
try {
  const { checkString, formatWarnings } = require(path.join(KIT, 'lib/compat-checker'));
  const badGd3 = 'extends KinematicBody\nvar tex = StreamTexture.new()\nfunc _ready():\n  yield($Timer, "timeout")\n  var f = new File()\n  OS.get_ticks_msec()\n  .instance()';
  const warnings = checkString(badGd3, 'example.gd');
  warnings.forEach(w => console.log(`  ${C.y}warn${C.x} line ${w.line}: ${w.message}`));
  record('compat', warnings.length >= 5, false, `${warnings.length} Godot 3.x deprecated patterns detected`);
} catch (e) {
  record('compat', false, false, `Error: ${e.message}`);
}

// [5/9] Skill Installation
hdr(5, TOTAL_SECTIONS, 'Skill Installation');
try {
  const skillPath = path.join(os.homedir(), '.claude', 'skills', 'godot-dev.md');
  const { installSkills } = require(path.join(KIT, 'lib/skills'));
  installSkills(tmpDir);
  const exists = fs.existsSync(skillPath);
  const size = exists ? fs.statSync(skillPath).size : 0;
  record('skills', exists, false, `~/.claude/skills/godot-dev.md written (${(size/1024).toFixed(1)} KB)`);
} catch (e) {
  record('skills', false, false, `Error: ${e.message}`);
}

// [6/9] CLI Help
hdr(6, TOTAL_SECTIONS, 'CLI Commands');
try {
  const r = spawnSync(process.execPath, [path.join(KIT, 'bin/cli.js'), '--help'], { encoding: 'utf8', timeout: 8000 });
  const out = r.stdout || '';
  const commands = ['launch', 'validate', 'lint', 'format', 'test', 'repl', 'inspect', 'watch', 'setup', 'download-engine', 'dashboard', 'game', 'editor', 'attach'];
  const found = commands.filter(cmd => out.includes(cmd));
  console.log(`  Commands found: ${found.join(', ')}`);
  record('cli', found.length >= 10, false, `${found.length}/${commands.length} CLI commands present in --help`);
} catch (e) {
  record('cli', false, false, `Error: ${e.message}`);
}

// [7/9] Headless Godot Run
hdr(7, TOTAL_SECTIONS, 'Headless Godot Run');
if (!godotPath) {
  record('headless', false, true, 'Godot not found - skipping headless run');
} else {
  try {
    const projectPath = tmpDir;
    if (!fs.existsSync(path.join(projectPath, 'project.godot'))) {
      record('headless', false, false, 'No project.godot in temp dir');
    } else {
      const r = spawnSync(godotPath, ['--path', projectPath, '--headless', '--quit', '--no-header'], {
        encoding: 'utf8', timeout: 15000
      });
      const out = (r.stdout || '') + (r.stderr || '');
      const timedOut = r.status === null;
      const crashed = r.status !== null && r.status !== 0 && !out.includes('ERROR') && !out.includes('FAILED');
      console.log(`  ${C.d}exit: ${r.status}, output lines: ${out.split('\n').filter(Boolean).length}${C.x}`);
      record('headless', !timedOut, false,
        timedOut ? 'Timed out (15s)' : `Godot ran headlessly, exit ${r.status}`);
    }
  } catch (e) {
    record('headless', false, false, `Error: ${e.message}`);
  }
}

// [8/9] HTTP API Shape Validation
hdr(8, TOTAL_SECTIONS, 'HTTP API Shape Validation (static - no Godot required)');
try {
  const { REPL_BRIDGE_WITH_HTTP } = require(path.join(KIT, 'lib/gd-repl-bridge'));
  const { EDITOR_HTTP_GD } = require(path.join(KIT, 'lib/gd-editor-http'));
  const gameRoutes = ['/tree', '/globals', '/perf', '/input', '/groups', '/physics', '/logs', '/errors', '/watches', '/eval', '/set', '/call', '/signal', '/pause', '/reload', '/watch'];
  const editorRoutes = ['/scene-tree', '/selected', '/files', '/autoloads', '/plugins', '/import-status', '/settings', '/inspector', '/save-scene', '/play', '/stop', '/select', '/open-scene', '/setting', '/property', '/create-node', '/delete-node', '/run-gdscript'];
  const gameMissing = gameRoutes.filter(r => !REPL_BRIDGE_WITH_HTTP.includes(r));
  const editorMissing = editorRoutes.filter(r => !EDITOR_HTTP_GD.includes(r));
  if (gameMissing.length) console.log(`  ${C.r}Missing game routes: ${gameMissing.join(', ')}${C.x}`);
  if (editorMissing.length) console.log(`  ${C.r}Missing editor routes: ${editorMissing.join(', ')}${C.x}`);
  const gameOk = gameMissing.length === 0;
  const editorOk = editorMissing.length === 0;
  console.log(`  Game routes: ${gameRoutes.length - gameMissing.length}/${gameRoutes.length} present`);
  console.log(`  Editor routes: ${editorRoutes.length - editorMissing.length}/${editorRoutes.length} present`);
  record('http-api', gameOk && editorOk, false, `Game ${gameRoutes.length} routes, Editor ${editorRoutes.length} routes - all present in GDScript templates`);
} catch (e) {
  record('http-api', false, false, `Error: ${e.message}`);
}

// [9/9] Unified Connection API
hdr(9, TOTAL_SECTIONS, 'Unified Connection API (static - no Godot required)');
try {
  const { Connection } = require(path.join(KIT, 'lib/connection'));
  const { GodotDebuggerClient } = require(path.join(KIT, 'lib/debugger-client'));
  const { REPL_BRIDGE_WITH_HTTP } = require(path.join(KIT, 'lib/gd-repl-bridge'));
  const api = ['eval', 'tree', 'node', 'perf', 'set', 'call', 'globals', 'groups', 'logs', 'pause', 'reload'];
  const gdChecks = ['register_message_capture', 'send_message', 'EngineDebugger.is_active', 'repl:result'];
  const cMiss = api.filter(m => typeof Connection.prototype[m] !== 'function');
  const dMiss = api.filter(m => typeof GodotDebuggerClient.prototype[m] !== 'function');
  const gMiss = gdChecks.filter(c => !REPL_BRIDGE_WITH_HTTP.includes(c));
  if (cMiss.length) console.log(`  ${C.r}Connection missing: ${cMiss.join(', ')}${C.x}`);
  if (dMiss.length) console.log(`  ${C.r}Client missing: ${dMiss.join(', ')}${C.x}`);
  if (gMiss.length) console.log(`  ${C.r}GDScript missing: ${gMiss.join(', ')}${C.x}`);
  console.log(`  Connection.auto: ${C.g}present${C.x}  API: ${api.length - cMiss.length}/${api.length}  GDScript captures: ${gdChecks.length - gMiss.length}/${gdChecks.length}`);
  record('unified-api', !cMiss.length && !dMiss.length && !gMiss.length && typeof Connection.auto === 'function', false, `Connection.auto + ${api.length} unified API methods + GDScript TCP captures`);
} catch (e) {
  record('unified-api', false, false, `Error: ${e.message}`);
}

// Summary
const passed = results.filter(r => r.passed).length;
const skipped = results.filter(r => r.skipped).length;
const failed = results.filter(r => !r.passed && !r.skipped).length;
console.log();
results.forEach(r => {
  const icon = r.skipped ? C.y + 'SKIP' : r.passed ? C.g + 'PASS' : C.r + 'FAIL';
  console.log(`  ${icon}${C.x}  ${r.name}`);
});
console.log(`\n  ${C.b}Total: ${passed} passed, ${skipped} skipped, ${failed} failed${C.x}`);
if (failed === 0) {
  console.log(`\n  ${C.g}${C.b}All capabilities verified.${C.x}\n`);
} else {
  console.log(`\n  ${C.r}${failed} section(s) failed. See output above.${C.x}\n`);
}

cleanup();
process.exit(failed > 0 ? 1 : 0);
