@tool
extends Node

var editor_interface: EditorInterface
var _tcp: TCPServer = TCPServer.new()
var _peers: Array = []
const PORT := 6008

func start() -> void:
	var err := _tcp.listen(PORT)
	if err != OK:
		push_warning("[GodotKitBridge] Port %d busy: %s" % [PORT, error_string(err)])
		return
	set_process(true)

func stop() -> void:
	_tcp.stop()
	set_process(false)

func _process(_delta: float) -> void:
	if _tcp.is_connection_available():
		var conn := _tcp.take_connection()
		if conn:
			_peers.append(conn)
	for i in range(_peers.size() - 1, -1, -1):
		var p: StreamPeerTCP = _peers[i]
		if p.get_status() != StreamPeerTCP.STATUS_CONNECTED:
			_peers.remove_at(i)
			continue
		var avail := p.get_available_bytes()
		if avail > 0:
			var raw := p.get_utf8_string(avail)
			_handle_request(p, raw)
			_peers.remove_at(i)

func _handle_request(peer: StreamPeerTCP, raw: String) -> void:
	var lines := raw.split("\r\n")
	if lines.size() == 0:
		return
	var parts := lines[0].split(" ")
	if parts.size() < 2:
		return
	var method := parts[0]
	var url_path := parts[1]
	var body := ""
	var in_body := false
	for line in lines:
		if in_body:
			body += line
		elif line == "":
			in_body = true
	var result := _route(method, url_path, body)
	var json_str := JSON.stringify(result)
	var json_bytes := json_str.to_utf8_buffer()
	var response := "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: %d\r\nConnection: close\r\n\r\n" % [json_bytes.size()]
	peer.put_data(response.to_utf8_buffer() + json_bytes)

func _route(method: String, url_path: String, body: String) -> Dictionary:
	var data: Dictionary = {}
	if body.length() > 0:
		var parsed := JSON.parse_string(body)
		if parsed is Dictionary:
			data = parsed
	if url_path == "/scene-tree":
		return _get_scene_tree()
	if url_path == "/selected":
		return _get_selected()
	if url_path == "/files":
		return _get_project_files()
	if url_path == "/autoloads":
		return _get_autoloads()
	if url_path == "/plugins":
		return _get_plugins()
	if url_path == "/import-status":
		return {"scanning": editor_interface.get_resource_filesystem().is_scanning()}
	if url_path == "/settings":
		return {"note": "use POST /setting to set, GET /settings lists keys"}
	if url_path == "/inspector":
		return _get_inspector()
	if url_path == "/save-scene" and method == "POST":
		editor_interface.save_scene()
		return {"ok": true}
	if url_path == "/play" and method == "POST":
		editor_interface.play_main_scene()
		return {"ok": true}
	if url_path == "/stop" and method == "POST":
		editor_interface.stop_playing_scene()
		return {"ok": true}
	if url_path == "/select" and method == "POST":
		return _select_node(data.get("path", ""))
	if url_path == "/open-scene" and method == "POST":
		editor_interface.open_scene_from_path(data.get("path", ""))
		return {"ok": true}
	if url_path == "/setting" and method == "POST":
		return _set_setting(data.get("key", ""), data.get("value", null))
	if url_path == "/property" and method == "POST":
		return _set_property(data.get("path", ""), data.get("prop", ""), data.get("value", null))
	if url_path == "/create-node" and method == "POST":
		return _create_node(data.get("parent", "/root"), data.get("type", "Node"), data.get("name", "NewNode"))
	if url_path == "/delete-node" and method == "POST":
		return _delete_node(data.get("path", ""))
	if url_path == "/run-gdscript" and method == "POST":
		return _run_gdscript(data.get("code", ""))
	if url_path == "/signals" and method == "POST":
		return _get_signals(data.get("path", ""))
	if url_path == "/signal" and method == "POST":
		return _emit_signal(data.get("path", ""), data.get("signal", ""), data.get("args", []))
	if url_path == "/screenshot":
		return _get_screenshot()
	return {"error": "not found", "path": url_path}

func _get_scene_tree() -> Dictionary:
	var root := editor_interface.get_edited_scene_root()
	if not root:
		return {"tree": null}
	return {"tree": _dump_node(root)}

func _dump_node(node: Node) -> Dictionary:
	var children := []
	for c in node.get_children():
		children.append(_dump_node(c))
	return {"name": node.name, "class": node.get_class(), "path": str(node.get_path()), "groups": node.get_groups(), "children": children}

func _get_selected() -> Dictionary:
	var sel := editor_interface.get_selection().get_selected_nodes()
	var out := []
	for n in sel:
		out.append({"name": n.name, "class": n.get_class(), "path": str(n.get_path())})
	return {"selected": out}

func _select_node(np: String) -> Dictionary:
	var root := editor_interface.get_edited_scene_root()
	if not root:
		return {"error": "no scene open"}
	var node := root.get_node_or_null(np)
	if not node:
		return {"error": "not found: " + np}
	editor_interface.get_selection().clear()
	editor_interface.get_selection().add_node(node)
	return {"ok": true, "path": np}

func _get_project_files() -> Dictionary:
	var files := []
	_scan_dir("res://", files)
	return {"files": files}

func _scan_dir(dir_path: String, out: Array) -> void:
	var dir := DirAccess.open(dir_path)
	if not dir:
		return
	dir.list_dir_begin()
	var f := dir.get_next()
	while f != "":
		if not f.begins_with("."):
			if dir.current_is_dir():
				_scan_dir(dir_path + f + "/", out)
			else:
				out.append(dir_path + f)
		f = dir.get_next()

func _get_autoloads() -> Dictionary:
	var cfg := ConfigFile.new()
	cfg.load("res://project.godot")
	var autoloads := []
	if cfg.has_section("autoload"):
		for key in cfg.get_section_keys("autoload"):
			autoloads.append({"name": key, "path": cfg.get_value("autoload", key)})
	return {"autoloads": autoloads}

func _get_plugins() -> Dictionary:
	var cfg := ConfigFile.new()
	cfg.load("res://project.godot")
	var plugins := []
	if cfg.has_section("editor_plugins"):
		for key in cfg.get_section_keys("editor_plugins"):
			plugins.append({"name": key, "enabled": cfg.get_value("editor_plugins", key)})
	return {"plugins": plugins}

func _get_inspector() -> Dictionary:
	var sel := editor_interface.get_selection().get_selected_nodes()
	if sel.is_empty():
		return {"target": null}
	var node := sel[0]
	var props := {}
	for p in node.get_property_list():
		if p.usage & PROPERTY_USAGE_EDITOR:
			props[p.name] = str(node.get(p.name))
	return {"target": str(node.get_path()), "class": node.get_class(), "properties": props}

func _set_setting(key: String, value: Variant) -> Dictionary:
	var settings := editor_interface.get_editor_settings()
	if not settings.has_setting(key):
		return {"error": "unknown setting: " + key}
	settings.set_setting(key, value)
	return {"ok": true}

func _set_property(node_path: String, prop: String, value: Variant) -> Dictionary:
	var root := editor_interface.get_edited_scene_root()
	if not root:
		return {"error": "no scene open"}
	var node := root.get_node_or_null(node_path)
	if not node:
		return {"error": "not found: " + node_path}
	var ur := editor_interface.get_editor_undo_redo_manager()
	ur.create_action("Set " + prop)
	ur.add_do_property(node, prop, value)
	ur.add_undo_property(node, prop, node.get(prop))
	ur.commit_action()
	return {"ok": true}

func _create_node(parent_path: String, type_name: String, node_name: String) -> Dictionary:
	var root := editor_interface.get_edited_scene_root()
	if not root:
		return {"error": "no scene open"}
	var parent := root.get_node_or_null(parent_path)
	if not parent:
		parent = root
	var node := ClassDB.instantiate(type_name)
	if not node:
		return {"error": "unknown type: " + type_name}
	node.name = node_name
	parent.add_child(node, true)
	node.owner = root
	return {"ok": true, "path": str(node.get_path())}

func _delete_node(node_path: String) -> Dictionary:
	var root := editor_interface.get_edited_scene_root()
	if not root:
		return {"error": "no scene open"}
	var node := root.get_node_or_null(node_path)
	if not node:
		return {"error": "not found: " + node_path}
	node.queue_free()
	return {"ok": true}

func _run_gdscript(code: String) -> Dictionary:
	var expr := Expression.new()
	var err := expr.parse(code)
	if err != OK:
		return {"error": expr.get_error_text()}
	var result = expr.execute([], self)
	if expr.has_execute_failed():
		return {"error": expr.get_error_text()}
	return {"result": str(result)}

func _get_screenshot() -> Dictionary:
	var img := DisplayServer.screen_get_image()
	if not img: return {"error": "no screen image"}
	var b64 := Marshalls.raw_to_base64(img.save_png_to_buffer())
	return {"format": "png", "base64": b64, "width": img.get_width(), "height": img.get_height()}

func _get_signals(node_path: String) -> Dictionary:
	var root := editor_interface.get_edited_scene_root()
	if not root:
		return {"error": "no scene open"}
	var node := root.get_node_or_null(node_path)
	if not node:
		return {"error": "not found: " + node_path}
	var sigs := []
	for s in node.get_signal_list():
		sigs.append({"name": s.name, "args": s.args.map(func(a): return a.name)})
	return {"signals": sigs}

func _emit_signal(node_path: String, sig: String, args: Array) -> Dictionary:
	var root := editor_interface.get_edited_scene_root()
	if not root:
		return {"error": "no scene open"}
	var node := root.get_node_or_null(node_path)
	if not node:
		return {"error": "not found: " + node_path}
	node.callv("emit_signal", [sig] + args)
	return {"ok": true}
