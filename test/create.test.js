'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('bin/create.js scaffold', () => {
  const tmpDir = path.join(os.tmpdir(), 'gk-create-test-' + Date.now());
  const projRoot = path.resolve(__dirname, '..');

  it('scaffolds all template files', () => {
    execSync(`node bin/create.js "${tmpDir}"`, { cwd: projRoot, encoding: 'utf8' });
    const getTemplates = require('../lib/templates');
    const keys = Object.keys(getTemplates('test'));
    for (const k of keys) {
      assert.ok(fs.existsSync(path.join(tmpDir, k)), k + ' missing');
    }
  });

  it('creates README.md', () => {
    assert.ok(fs.existsSync(path.join(tmpDir, 'README.md')));
    const readme = fs.readFileSync(path.join(tmpDir, 'README.md'), 'utf8');
    assert.ok(readme.includes(path.basename(tmpDir)));
  });

  it('installs skills configs', () => {
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude/skills/godot-dev/SKILL.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.gdlintrc')));
  });

  it('cleanup', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
