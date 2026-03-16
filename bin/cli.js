#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const { GODOT_VERSION } = require('../lib/engine');
const { registerCoreCommands } = require('../lib/cli-core');
const { registerEditorCommands } = require('../lib/cli-editor');
const { registerGameCommands } = require('../lib/cli-game');
const { registerDebuggerCommands } = require('../lib/cli-debugger');
const { registerStatusCommands } = require('../lib/cli-status');

const program = new Command();
program.name('godot-dev').description('Agentic Godot 4.x CLI - REPL, debugger, inspector, editor bridge, game runtime').version(GODOT_VERSION);

registerCoreCommands(program);
registerDebuggerCommands(program);
registerEditorCommands(program);
registerGameCommands(program);
registerStatusCommands(program);

program.parse(process.argv);
