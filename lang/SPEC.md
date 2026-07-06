# lang/ Plugin Specification

## Plugin Module Shape

```js
module.exports = {
  id: 'gdscript',
  extensions: ['.gd'],
  exec: {
    match: /^exec:gdscript/,
    run(code, cwd) { /* returns Promise<string> */ }
  },
  lsp: {                                           // optional
    check(code, cwd) { /* returns Diagnostic[] */ }
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

- Plugins live at `<projectDir>/lang/*.js`. `loader.js` is excluded.
- Each plugin is loaded host-side via `gm-plugkit/lang-host-runner.js`
- Validates shape `{ id, exec: { match, run } }` — invalid plugins are silently skipped

## Spool Invocation

The live integration path is the rs-plugkit `lang` verb. Dispatch via the spool:

```
.gm/exec-spool/in/lang/<N>.txt   body: {"projectDir":"<absolute>","command":"exec:gdscript","code":"<src>","timeoutMs":35000}
.gm/exec-spool/out/lang-<N>.json
```

The verb resolves `<projectDir>/lang/*.js` (excluding `loader.js`), validates shape
`{ id, exec: { match, run } }`, first-match-wins, runs the plugin via `host_exec_js`, returns:

```json
{ "ok": true,  "plugin_id": "gdscript", "output": "...", "ms": 17 }
{ "ok": false, "error": "no-plugin-matched", "command": "...", "available": ["gdscript"] }
{ "ok": false, "error": "host_exec_js timed out" }
```

`projectDir` must be absolute (the watcher cwd is not the kit dir). Fallback only, off-spool:
`node <gm-plugkit-install>/lang-host-runner.js <projectDir> '<command>' '<code-base64>'`.

## Constraints

- `exec.run` must resolve within 30s or the runner kills the child
- Multiple plugins may match — first match wins (by `readdir` order)
- Plugins must be CommonJS (`module.exports`)
- No plugin may mutate global state or spawn persistent processes
- Plugins run in the host Node process (not wasm) and have full Node API access
- `gdscript` plugin requires either a running Godot game with HTTP bridge on port 6009, or `godot`/`godot.exe` on PATH (or `GODOT_BIN` env var) for headless eval
