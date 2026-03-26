'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadLangPlugins } = require('../lang/loader');
const gd = require('../lang/gdscript');

describe('gdscript plugin shape', () => {
  it('id is gdscript', () => assert.equal(gd.id, 'gdscript'));
  it('extensions includes .gd', () => assert.deepEqual(gd.extensions, ['.gd']));
  it('exec.match is regex', () => assert.ok(gd.exec.match instanceof RegExp));
  it('exec.match matches exec:gdscript', () => assert.ok(gd.exec.match.test('exec:gdscript')));
  it('exec.run is function', () => assert.equal(typeof gd.exec.run, 'function'));
  it('lsp.check is function', () => assert.equal(typeof gd.lsp.check, 'function'));
  it('context is string', () => assert.equal(typeof gd.context, 'string'));
});

describe('loadLangPlugins', () => {
  it('returns empty for nonexistent dir', () => {
    assert.deepEqual(loadLangPlugins('/tmp/nonexistent-xyz'), []);
  });

  it('loads gdscript plugin from project root', () => {
    const plugins = loadLangPlugins(require('path').resolve(__dirname, '..'));
    assert.ok(plugins.length >= 1);
    assert.equal(plugins[0].id, 'gdscript');
  });
});

describe('isSingleExpr logic', () => {
  const isSingleExpr = (code) => {
    const t = code.trim();
    return !t.includes('\n') && !/\b(func|var|const|if|for|while|match|class|extends|return)\b/.test(t);
  };

  it('single expression', () => assert.ok(isSingleExpr('get_tree().paused')));
  it('arithmetic', () => assert.ok(isSingleExpr('1 + 2')));
  it('method call', () => assert.ok(isSingleExpr('OS.get_name()')));
  it('string literal', () => assert.ok(isSingleExpr('"hello"')));
  it('var declaration is not single', () => assert.ok(!isSingleExpr('var x = 1')));
  it('func is not single', () => assert.ok(!isSingleExpr('func foo():')));
  it('multiline is not single', () => assert.ok(!isSingleExpr('a\nb')));
  it('if is not single', () => assert.ok(!isSingleExpr('if true: pass')));
});
