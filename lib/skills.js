'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_CONTENT = `---
name: godot-dev
description: Godot 4.x agentic development CLI - editor control, game runtime, REPL, debugger
---

# godot-dev CLI Reference

## Setup
\`\`\`bash
npx godot-kit <project-dir>   # scaffold new project
godot-dev download-engine     # download Godot 4.x
godot-dev setup               # install gdtoolkit + skills
\`\`\`

## Launch & Debug
\`\`\`bash
godot-dev launch [scene]      # launch game with remote debugger on :6007
godot-dev repl                # interactive REPL via debugger
godot-dev inspect             # dump scene tree (one-shot)
godot-dev logs                # stream Godot output
\`\`\`

## Editor HTTP API (port 6008, requires godot_kit_bridge plugin)
\`\`\`bash
godot-dev editor:tree                           # scene tree JSON
godot-dev editor:select <node-path>             # select node in editor
godot-dev editor:run-script <file.gd>           # run GDScript in editor context
godot-dev editor:open <res://scene.tscn>        # open scene
godot-dev editor:save                           # save current scene
godot-dev editor:files                          # list project files
godot-dev editor:property <node> <prop> <val>   # set node property
godot-dev editor:create <type> <parent> <name>  # create node
godot-dev editor:delete <node-path>             # delete node
godot-dev editor:signals                        # list signals in scene
godot-dev editor:screenshot                     # editor screenshot path
\`\`\`

## Game Runtime HTTP API (port 6009, injected via repl_bridge autoload)
\`\`\`bash
godot-dev game:tree                             # runtime scene tree
godot-dev game:eval "<GDScript expression>"     # evaluate expression
godot-dev game:globals                          # list autoloads + properties
godot-dev game:fps                              # FPS + perf metrics
godot-dev game:set <node-path> <prop> <val>     # set node property
godot-dev game:call <node-path> <method> [arg]  # call node method
godot-dev game:pause                            # toggle pause
godot-dev game:reload                           # reload current scene
godot-dev game:profiler                         # profiler snapshot
\`\`\`

## Code Quality
\`\`\`bash
godot-dev lint [files...]     # GDScript lint via gdtoolkit
godot-dev format [files...]   # GDScript format
godot-dev validate            # validate all .gd files syntax
\`\`\`

## Watch / Test / Export
\`\`\`bash
godot-dev watch               # watch .gd files, hot-reload on change
godot-dev test <script.gd>    # run GDScript headlessly, report pass/fail
godot-dev export <preset>     # export project by preset name
\`\`\`

## Ports
| Service | Port |
|---------|------|
| Remote Debugger | 6007 |
| Editor HTTP API | 6008 |
| Game Runtime HTTP | 6009 |
| LSP | 6005 |
| DAP | 6006 |

## Common Workflows

### Inspect running game
\`\`\`bash
godot-dev launch &
sleep 2
godot-dev game:tree
godot-dev game:eval "Engine.get_frames_per_second()"
\`\`\`

### Set property on node at runtime
\`\`\`bash
godot-dev game:set /root/Main speed 200
\`\`\`

### Create node in editor
\`\`\`bash
godot-dev editor:create Sprite2D /root/Main player_sprite
\`\`\`

### Run test script
\`\`\`bash
godot-dev test tests/test_math.gd
\`\`\`
`;

const CURSOR_CONTENT = `---
description: Godot 4.x agentic development with godot-dev CLI
globs: ["**/*.gd", "**/*.tscn", "**/*.tres", "project.godot"]
alwaysApply: false
---

# godot-dev CLI

Use \`godot-dev\` for all Godot interactions. Editor bridge runs on :6008, game runtime on :6009.

Key commands:
- \`godot-dev launch\` - start game with debugger
- \`godot-dev game:eval "<expr>"\` - evaluate GDScript at runtime
- \`godot-dev game:tree\` - dump scene tree
- \`godot-dev editor:tree\` - editor scene tree
- \`godot-dev editor:property <node> <prop> <val>\` - set property
- \`godot-dev test <script.gd>\` - headless test
- \`godot-dev watch\` - hot reload on file change
- \`godot-dev lint\` / \`godot-dev format\` - code quality
`;

const WINDSURF_CONTENT = `# godot-dev CLI

godot-dev is the CLI for Godot 4.x agentic development. Always use it instead of running Godot directly.

- Editor HTTP API: port 6008 (requires godot_kit_bridge plugin enabled in editor)
- Game HTTP API: port 6009 (injected via ReplBridge autoload)
- Debugger: port 6007

Run \`godot-dev --help\` for full command list.
`;

function tryWrite(filePath, content, label) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  [skills] Installed ${label} -> ${filePath}`);
    return true;
  } catch (e) {
    console.warn(`  [skills] Could not write ${label}: ${e.message}`);
    return false;
  }
}

function installSkills(projectDir) {
  const home = os.homedir();

  tryWrite(path.join(home, '.claude', 'skills', 'godot-dev.md'), SKILL_CONTENT, 'Claude Code skill');

  const cursorDir = path.join(projectDir, '.cursor', 'rules');
  if (fs.existsSync(path.join(projectDir, '.cursor')) || fs.existsSync(path.join(home, '.cursor'))) {
    tryWrite(path.join(cursorDir, 'godot-dev.mdc'), CURSOR_CONTENT, 'Cursor rule');
  } else {
    tryWrite(path.join(cursorDir, 'godot-dev.mdc'), CURSOR_CONTENT, 'Cursor rule');
  }

  tryWrite(path.join(projectDir, '.windsurf', 'rules', 'godot-dev.md'), WINDSURF_CONTENT, 'Windsurf rule');

  const aiderCfg = path.join(projectDir, '.aider.conf.yml');
  if (!fs.existsSync(aiderCfg)) {
    tryWrite(aiderCfg, '# aider config\n# godot-dev CLI available for Godot editor/game control\nread: [".cursor/rules/godot-dev.mdc"]\n', 'Aider config');
  }

  const continueCfg = path.join(projectDir, '.continue', 'config.json');
  if (!fs.existsSync(continueCfg)) {
    const cfg = { models: [], contextProviders: [{ name: 'file', params: { patterns: ['**/*.gd', '**/*.tscn'] } }], docs: [{ startUrl: 'https://docs.godotengine.org/en/stable/', title: 'Godot Docs' }] };
    tryWrite(continueCfg, JSON.stringify(cfg, null, 2), 'Continue config');
  }
}

module.exports = { installSkills };
