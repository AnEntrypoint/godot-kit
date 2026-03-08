#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const getTemplates = require('../lib/templates');
const { findGodot, GODOT_VERSION } = require('../lib/engine');
const { installSkills } = require('../lib/skills');

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : (process.env.INIT_CWD || process.cwd());
const projectName = path.basename(targetDir);

console.log(`\n  godot-kit - Agentic Godot 4.x Boilerplate\n`);
console.log(`  Project: ${projectName}`);
console.log(`  Target:  ${targetDir}\n`);

fs.mkdirSync(targetDir, { recursive: true });

const templates = getTemplates(projectName);
for (const [relPath, content] of Object.entries(templates)) {
  const full = path.join(targetDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log(`  + ${relPath}`);
}

const readme = `# ${projectName}

Scaffolded by [godot-kit](https://github.com/AnEntrypoint/godot-kit).

## Setup
\`\`\`bash
npm install -g godot-kit
godot-dev download-engine
godot-dev setup
\`\`\`

## Commands
\`\`\`bash
godot-dev launch                            # Launch with debugger
godot-dev repl                              # Interactive REPL
godot-dev inspect                           # Dump scene tree (debugger)
godot-dev logs                              # Stream logs
godot-dev lint                              # GDScript lint
godot-dev format                            # GDScript format
godot-dev watch                             # Watch .gd files, hot-reload
godot-dev test <script.gd>                  # Run GDScript test headlessly
godot-dev validate                          # Validate all .gd syntax
godot-dev export <preset>                   # Export project
godot-dev download-engine                   # Download Godot ${GODOT_VERSION}
\`\`\`

## Editor HTTP API (port 6008, requires godot_kit_bridge plugin)
\`\`\`bash
godot-dev editor tree                       # Scene tree JSON
godot-dev editor open <res://scene.tscn>    # Open scene
godot-dev editor save                       # Save current scene
godot-dev editor files                      # List project files
godot-dev editor property <node> <p> <v>   # Set node property
godot-dev editor create <type> <parent> <n> # Create node
godot-dev editor signals                    # List signals
godot-dev editor autoloads                  # List autoloads
\`\`\`

## Game Runtime HTTP API (port 6009)
\`\`\`bash
godot-dev game tree                         # Runtime scene tree
godot-dev game eval "<GDScript expr>"       # Evaluate expression
godot-dev game globals                      # List autoloads
godot-dev game fps                          # FPS + perf metrics
godot-dev game set <path> <prop> <val>      # Set node property
godot-dev game call <path> <method> [args]  # Call node method
godot-dev game pause                        # Toggle pause
godot-dev game reload                       # Reload scene
\`\`\`

## Debug Ports
| Service | Port |
|---------|------|
| Remote Debugger | 6007 |
| Editor HTTP API | 6008 |
| Game HTTP API | 6009 |
| LSP | 6005 |
| DAP | 6006 |
`;

fs.writeFileSync(path.join(targetDir, 'README.md'), readme, 'utf8');
console.log(`  + README.md`);

try { installSkills(targetDir); } catch (e) { console.warn('  Skills install warning:', e.message); }

const godotPath = findGodot(null);
if (!godotPath) {
  console.log(`
  Godot not found. Download it with:

    godot-dev download-engine
`);
} else {
  console.log(`\n  Godot found at: ${godotPath}`);
}

console.log(`
  Done! Next steps:

  1. Download engine:       godot-dev download-engine
  2. Install gdtoolkit:     godot-dev setup
  3. Launch with debugger:  godot-dev launch
  4. Connect REPL:          godot-dev repl

  VSCode: Install "Godot Tools" extension, use F5 to debug.
  Docs:   https://github.com/AnEntrypoint/godot-kit
`);
