'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');

describe('CLI --help', () => {
  const output = execSync('node bin/cli.js --help', { encoding: 'utf8', cwd: require('path').resolve(__dirname, '..') });

  it('exits successfully', () => assert.ok(output.length > 0));

  const expectedCommands = ['launch', 'game', 'editor', 'repl', 'lint', 'validate', 'watch', 'setup', 'dashboard', 'status', 'config'];
  for (const cmd of expectedCommands) {
    it(`lists ${cmd} command`, () => assert.ok(output.includes(cmd)));
  }
});
