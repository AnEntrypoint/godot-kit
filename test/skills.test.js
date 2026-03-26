'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { installSkills, MIGRATION_GUIDE, GDLINTRC_CONTENT } = require('../lib/skills');

describe('skills exports', () => {
  it('MIGRATION_GUIDE is non-empty string', () => {
    assert.equal(typeof MIGRATION_GUIDE, 'string');
    assert.ok(MIGRATION_GUIDE.length > 100);
  });

  it('GDLINTRC_CONTENT is non-empty string', () => {
    assert.equal(typeof GDLINTRC_CONTENT, 'string');
    assert.ok(GDLINTRC_CONTENT.includes('max-line-length'));
  });
});

describe('installSkills', () => {
  const tmpDir = path.join(os.tmpdir(), 'gk-skills-test-' + Date.now());

  it('creates all IDE config files', () => {
    installSkills(tmpDir);
    const expected = [
      '.claude/skills/godot-dev/SKILL.md',
      '.cursor/rules/godot-dev.mdc',
      '.windsurf/rules/godot-dev.md',
      '.clinerules',
      '.github/copilot-instructions.md',
      '.zed/settings.json',
      '.gdlintrc',
      '.aider.conf.yml',
      '.continue/config.json',
    ];
    for (const f of expected) {
      const full = path.join(tmpDir, f);
      assert.ok(fs.existsSync(full), f + ' missing');
      assert.ok(fs.readFileSync(full, 'utf8').length > 0, f + ' empty');
    }
  });

  it('writes valid JSON for Zed settings', () => {
    const content = fs.readFileSync(path.join(tmpDir, '.zed/settings.json'), 'utf8');
    assert.doesNotThrow(() => JSON.parse(content));
  });

  it('writes valid JSON for Continue config', () => {
    const content = fs.readFileSync(path.join(tmpDir, '.continue/config.json'), 'utf8');
    assert.doesNotThrow(() => JSON.parse(content));
  });

  // Cleanup
  it('cleanup', () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
