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

- Loader: `lang/loader.js` — exports `loadLangPlugins(projectDir): Plugin[]`
- Scans `<projectDir>/lang/*.js`, excludes `loader.js`
- Requires each file, validates shape `{ id, exec: { match, run } }`
- Load failures are silent — invalid plugins are skipped

## exec: Dispatch

Pre-tool-use hook intercepts Bash commands matching `/^exec:(S+)\n([sS]+)/`.

1. Extract `<id>` and `<code>` from command body
2. Find first plugin where `plugin.exec.match.test(command)`
3. Call `plugin.exec.run(code, cwd)` with 10s timeout (kill on exceed)
4. Return output to Claude via `allowWithNoop(output)` — replaces Bash command with tmp-file read
5. If no plugin matches, fall through to existing exec:<lang> built-ins

## LSP Context (UserPromptSubmit hook)

1. Load plugins via `loadLangPlugins(projectDir)`
2. For each plugin with `lsp`: call `plugin.lsp.check(code, cwd)` on relevant project files
3. Inject diagnostics as structured text into `additionalContext`
4. Failures are silent — skip that plugin's LSP

## context Injection (UserPromptSubmit hook)

For each plugin with `context`:
- If string: append directly to `additionalContext`
- If function: call `context()`, append result (truncate to 2000 chars)
- Failures are silent

## Constraints

- `exec.run` must resolve within 10s or be killed via `AbortController`
- Multiple plugins may match — first match wins
- Plugins must be CommonJS (`module.exports`)
- No plugin may mutate global state or spawn persistent processes
