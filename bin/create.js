#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const getTemplates = require('../lib/templates');
const { findGodot, GODOT_VERSION } = require('../lib/engine');

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
godot-dev launch                          # Launch with debugger
godot-dev repl                            # Interactive REPL
godot-dev inspect                         # Dump scene tree
godot-dev logs                            # Stream logs
godot-dev lint                            # GDScript lint
godot-dev format                          # GDScript format
godot-dev download-engine                 # Download Godot ${GODOT_VERSION}
\`\`\`

## REPL Commands
\`continue|c\`, \`next|n\`, \`step|s\`, \`break|b\`, \`stack\`, \`vars <frame>\`, \`tree\`, \`inspect <id>\`, \`bp <file> <line>\`

## Debug Ports
| Service | Port |
|---------|------|
| Remote Debugger | 6007 |
| LSP | 6005 |
| DAP | 6006 |
`;

fs.writeFileSync(path.join(targetDir, 'README.md'), readme, 'utf8');
console.log(`  + README.md`);

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
