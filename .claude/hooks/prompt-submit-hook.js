#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || process.env.GEMINI_PROJECT_DIR || process.env.OC_PLUGIN_ROOT || process.env.KILO_PLUGIN_ROOT || path.join(__dirname, '..');
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.env.GEMINI_PROJECT_DIR || process.env.OC_PROJECT_DIR || process.env.KILO_PROJECT_DIR;
const COMPACT_CONTEXT = 'use gm agent | ref: TOOL_INVARIANTS | codesearch for exploration | Bash for execution';
const PLAN_MODE_BLOCK = 'DO NOT use EnterPlanMode or any plan mode tool. Use GM agent planning (PLAN→EXECUTE→EMIT→VERIFY→COMPLETE state machine) instead. Plan mode is blocked.';

const ensureGitignore = () => {
  if (!projectDir) return;
  const p = path.join(projectDir, '.gitignore');
  const entry = '.gm-stop-verified';
  try {
    let c = fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
    if (!c.split('\n').some(l => l.trim() === entry))
      fs.writeFileSync(p, (c.endsWith('\n') || !c ? c : c + '\n') + entry + '\n');
  } catch (_) {}
};

const readStdinPrompt = () => {
  try { return JSON.parse(fs.readFileSync(0, 'utf-8')).prompt || ''; } catch (_) { return ''; }
};

const readGmAgent = () => {
  if (!pluginRoot) return '';
  try { return fs.readFileSync(path.join(pluginRoot, 'agents/gm.md'), 'utf-8'); } catch (_) { return ''; }
};

const runExec = (cmd, opts) => execSync(cmd, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'], timeout: 180000, killSignal: 'SIGTERM', ...opts });

const runMcpThorns = () => {
  if (!projectDir || !fs.existsSync(projectDir)) return '';
  try {
    let out;
    try { out = runExec('bun x mcp-thorns', { cwd: projectDir }); }
    catch (e1) {
      if (e1.killed && e1.signal === 'SIGTERM') return '=== mcp-thorns ===\nSkipped (3min timeout)';
      try { out = runExec('npx -y mcp-thorns', { cwd: projectDir }); }
      catch (e2) {
        return e2.killed && e2.signal === 'SIGTERM'
          ? '=== mcp-thorns ===\nSkipped (3min timeout)'
          : `=== mcp-thorns ===\nSkipped (error: ${e1.message.split('\n')[0]})`;
      }
    }
    return `=== Repository analysis ===\n${out}`;
  } catch (e) { return `=== mcp-thorns ===\nSkipped (error: ${e.message.split('\n')[0]})`; }
};

const runCodeSearch = (query, cwd) => {
  if (!query || !cwd || !fs.existsSync(cwd)) return '';
  const q = `"${query.replace(/"/g, '\\"').substring(0, 200)}"`;
  try {
    let out;
    try { out = runExec(`bun x codebasesearch ${q}`, { cwd, timeout: 55000 }); }
    catch (e) { if (e.killed) return ''; out = runExec(`npx -y codebasesearch ${q}`, { cwd, timeout: 55000 }); }
    const lines = out.split('\n'), i = lines.findIndex(l => l.includes('Searching for:'));
    return (i >= 0 ? lines.slice(i).join('\n') : out).trim();
  } catch (_) { return ''; }
};

const walkFiles = (dir, exts, depth = 0) => {
  if (depth > 4) return [];
  let r = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('.') || f === 'node_modules') continue;
      const full = path.join(dir, f);
      try {
        const s = fs.statSync(full);
        if (s.isDirectory()) r = r.concat(walkFiles(full, exts, depth + 1));
        else if (exts.some(e => f.endsWith(e))) r.push({ file: full, mtime: s.mtimeMs });
      } catch (_) {}
    }
  } catch (_) {}
  return r;
};

const injectLangPlugins = async (parts, dir) => {
  if (!dir) return;
  let plugins = [];
  try { ({ loadLangPlugins: (fn => { plugins = fn(dir); })(require(path.join(dir, 'lang/loader.js')).loadLangPlugins) }); } catch (_) { return; }
  for (const p of plugins) {
    if (p.context === undefined) continue;
    try {
      const c = typeof p.context === 'function' ? p.context(dir) : p.context;
      if (c && typeof c === 'string') parts.push(c.substring(0, 2000));
    } catch (_) {}
  }
  for (const p of plugins) {
    if (!p.lsp || !(p.extensions || []).length) continue;
    try {
      const files = walkFiles(dir, p.extensions).sort((a, b) => b.mtime - a.mtime).slice(0, 3);
      const lines = [];
      for (const { file } of files) {
        try {
          const diags = await p.lsp.check(fs.readFileSync(file, 'utf-8'), dir);
          for (const d of (diags || []))
            lines.push(`${path.relative(dir, file)}:${d.line}:${d.col}: ${d.severity}: ${d.message}`);
        } catch (_) {}
      }
      if (lines.length) parts.push((`=== LSP: ${p.id} ===\n${lines.join('\n')}`).substring(0, 3000));
    } catch (_) {}
  }
};

const emit = (ctx) => {
  const o = process.env.OC_PROJECT_DIR !== undefined || process.env.KILO_PROJECT_DIR !== undefined;
  const g = process.env.GEMINI_PROJECT_DIR !== undefined;
  if (g) console.log(JSON.stringify({ systemMessage: ctx }, null, 2));
  else if (o) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'message.updated', additionalContext: ctx } }, null, 2));
  else console.log(JSON.stringify({ additionalContext: ctx }, null, 2));
};

(async () => {
  try {
    ensureGitignore();
    const prompt = readStdinPrompt();
    const parts = [];
    const gm = readGmAgent();
    if (gm) parts.push(gm);
    parts.push(runMcpThorns());
    parts.push('use gm agent | ' + COMPACT_CONTEXT + ' | ' + PLAN_MODE_BLOCK);
    if (prompt && projectDir) {
      const sr = runCodeSearch(prompt, projectDir);
      if (sr) parts.push(`=== Semantic code search results ===\n${sr}`);
    }
    await injectLangPlugins(parts, projectDir);
    emit(parts.join('\n\n'));
  } catch (e) {
    emit('use gm agent - hook error: ' + e.message + ' | ' + COMPACT_CONTEXT);
    process.exit(0);
  }
})();
