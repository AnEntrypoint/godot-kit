'use strict';

const PLUGIN_CFG = `[plugin]
name="GodotKitBridge"
description="HTTP bridge for godot-kit CLI - editor control on port 6008"
author="AnEntrypoint"
version="1.0.0"
script="plugin.gd"
`;

const PLUGIN_GD = `@tool
extends EditorPlugin

var _server: EditorHTTP

func _enter_tree() -> void:
\t_server = EditorHTTP.new()
\t_server.editor_interface = get_editor_interface()
\tadd_child(_server)
\t_server.start()
\tprint("[GodotKitBridge] Editor HTTP server started on port 6008")

func _exit_tree() -> void:
\tif _server:
\t\t_server.stop()
\t\t_server.queue_free()
\t\t_server = null
`;

module.exports = { PLUGIN_CFG, PLUGIN_GD };
