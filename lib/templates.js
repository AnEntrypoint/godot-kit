'use strict';

const { PLUGIN_CFG, PLUGIN_GD, EDITOR_HTTP_GD, REPL_BRIDGE_WITH_HTTP } = require('./templates-addon');

module.exports = function getTemplates(projectName) {
  return {
    'project.godot': `; Engine configuration file.
config_version=5

[application]

config/name="${projectName}"
config/features=PackedStringArray("4.3")
config/icon="res://icon.svg"
run/main_scene="res://scenes/main.tscn"

[autoload]

ReplBridge="res://addons/repl_bridge/repl_bridge.gd"

[debug]

settings/stdout/print_fps=true
settings/stdout/verbose_stdout=true

[editor_plugins]

enabled=PackedStringArray("res://addons/godot_kit_bridge/plugin.cfg")
`,

    'scenes/main.tscn': `[gd_scene load_steps=2 format=3 uid="uid://main"]

[ext_resource type="Script" path="res://scripts/main.gd" id="1_main"]

[node name="Main" type="Node"]
script = ExtResource("1_main")
`,

    'scripts/main.gd': `extends Node

func _ready() -> void:
\tprint("[%s] Ready" % name)
\tvar bridge = get_node_or_null("/root/ReplBridge")
\tif bridge:
\t\tbridge.log_info("Game started: " + name)

func _process(_delta: float) -> void:
\tpass
`,

    'addons/repl_bridge/repl_bridge.gd': REPL_BRIDGE_WITH_HTTP,

    'addons/repl_bridge/plugin.cfg': `[plugin]
name="ReplBridge"
description="Remote REPL bridge for godot-kit CLI debugging"
author="AnEntrypoint"
version="1.1.0"
script="repl_bridge.gd"
`,

    'addons/godot_kit_bridge/plugin.cfg': PLUGIN_CFG,
    'addons/godot_kit_bridge/plugin.gd': PLUGIN_GD,
    'addons/godot_kit_bridge/editor_http.gd': EDITOR_HTTP_GD,

    '.gdlintrc': `# gdtoolkit linter config (Godot 4.x)
max-line-length = 120
`,

    '.gdformatrc': `line_length = 120
`,

    '.vscode/settings.json': `{
  "godot_tools.editor_path": "",
  "godot_tools.gdscript_lsp_server_port": 6005,
  "[gdscript]": { "editor.defaultFormatter": "geequlim.godot-tools" }
}
`,

    '.vscode/launch.json': `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Godot Game",
      "type": "godot",
      "request": "launch",
      "project": "\${workspaceFolder}",
      "address": "tcp://127.0.0.1",
      "port": 6007,
      "profiling": false
    },
    {
      "name": "Attach to Godot",
      "type": "godot",
      "request": "attach",
      "project": "\${workspaceFolder}",
      "address": "tcp://127.0.0.1",
      "port": 6007
    }
  ]
}
`,

    '.vscode/extensions.json': `{ "recommendations": ["geequlim.godot-tools"] }
`,

    'icon.svg': `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#478cbf"/>
  <text x="64" y="80" font-size="56" text-anchor="middle" fill="white" font-family="sans-serif">G</text>
</svg>
`,

    '.gitignore': `.godot/\n*.import\nexport_presets.cfg\n*.translation\nnode_modules/\n`,

    'Makefile': `setup:\n\tgodot-dev setup\nrun:\n\tgodot-dev launch\nrepl:\n\tgodot-dev repl\ninspect:\n\tgodot-dev inspect\nlogs:\n\tgodot-dev logs\nlint:\n\tgodot-dev lint\nformat:\n\tgodot-dev format\nwatch:\n\tgodot-dev watch\n.PHONY: setup run repl inspect logs lint format watch\n`,
  };
};
