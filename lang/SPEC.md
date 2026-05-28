# lang/ Plugin Specification

## Plugin Module Shape

```js
module.exports = {
  id: 'gdscript',
  exec: {
    match: /^exec:gdscript/,
    run(code, cwd) { /* returns Promise<string> */ }
  },
  lsp: {                                           // optional
    check(code, cwd) { /* returns Promise<Diagnostic[]> */ }
  },
  context: 'string or () => string'               // optional
};
```

## Types

```ts
type Diagnostic = {
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning';
};
```

## Plugin Loading

- The rs-plugkit `lang` verb scans `<projectDir>/lang/*.js` (excluding `loader.js`)
- Validates shape `{ id, exec: { match, run } }` — invalid plugins are silently skipped
- `lang/loader.js` is a convenience export for testing; the verb inlines its own loader

## Spool Invocation

The live integration path is the rs-plugkit `lang` verb. Dispatch via the spool:

```
.gm/exec-spool/in/lang/<N>.txt   body: {"projectDir":"<absolute>","command":"exec:gdscript","code":"<src>","timeoutMs":35000}
.gm/exec-spool/out/lang-<N>.json
```

1. Find first plugin where `plugin.exec.match.test(command)`
2. Call `plugin.exec.run(code, projectDir)` via `host_exec_js` (timeout = `timeoutMs`)
3. Return `{ ok: true, plugin_id, output, ms }`
4. If no plugin matches: `{ ok: false, error: "no-plugin-matched", available: [...] }`

`projectDir` must be absolute (the watcher cwd is not the kit dir). Fallback only, off-spool:
`node <gm-plugkit-install>/lang-host-runner.js <projectDir> '<command>' '<code-base64>'`.

## lsp + context

A plugin's optional `lsp.check(code, cwd)` returns `Diagnostic[]`; optional `context`
(string or function) supplies prompt-context. These surface through the harness when present.

## Constraints

- `exec.run` should resolve within the dispatch `timeoutMs` or it is killed
- Multiple plugins may match — first match wins
- Plugins must be CommonJS (`module.exports`)
- No plugin may mutate global state or spawn persistent processes
