@tool
extends EditorPlugin

var _server: EditorHTTP

func _enter_tree() -> void:
	_server = EditorHTTP.new()
	_server.editor_interface = get_editor_interface()
	add_child(_server)
	_server.start()
	print("[GodotKitBridge] Editor HTTP server started on port 6008")

func _exit_tree() -> void:
	if _server:
		_server.stop()
		_server.queue_free()
		_server = null
