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

Godot 4.6 project. Uses [godot-kit](https://github.com/AnEntrypoint/godot-kit) for CLI-driven development.

## First-time setup
\`\`\`bash
godot-dev download-engine    # download Godot ${GODOT_VERSION}
godot-dev setup              # install gdtoolkit (needs Python)
\`\`\`

## Boilerplate
- **scenes/level.tscn** — main level with platforms, spikes, coins, goal
- **scenes/player.tscn** — CharacterBody2D with jump/dash/wall-slide
- **scripts/** — game.gd, player.gd, moving_platform.gd, spike.gd, collectible.gd, goal.gd
- **addons/repl_bridge** — HTTP API on port 6009 (runtime control)
- **addons/godot_kit_bridge** — HTTP API on port 6008 (editor control)

## Daily commands
\`\`\`bash
godot-dev launch             # launch game (debugger on :6007)
godot-dev game tree          # dump live scene tree
godot-dev game eval "expr"   # run GDScript in running game
godot-dev game set /root/Level/Player speed 500
godot-dev lint && godot-dev format
godot-dev validate           # lint + Godot 3.x compat check
\`\`\`

See CLAUDE.md for full CLI reference and real-world workflow notes.
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
  Next:
    godot-dev download-engine
    godot-dev setup
    godot-dev launch
`);
