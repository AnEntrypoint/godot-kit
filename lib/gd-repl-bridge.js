'use strict';

const REPL_BRIDGE_WITH_HTTP = `extends Node

const VERSION := "4.0.0"
const HTTP_PORT := 6009
var _log_buffer: Array[String] = []
var _err_buffer: Array[String] = []
var _watches: Dictionary = {}
var _watch_id: int = 0
var _tcp: TCPServer = TCPServer.new()
var _peers: Array = []

func _ready() -> void:
\tprint("[ReplBridge] v", VERSION, " initialized")
\tif _tcp.listen(HTTP_PORT) == OK:
\t\tprint("[ReplBridge] HTTP server on port ", HTTP_PORT)
\telse:
\t\tpush_warning("[ReplBridge] HTTP port %d busy" % HTTP_PORT)
\tif EngineDebugger.is_active():
\t\tEngineDebugger.register_message_capture("repl", _on_repl_message)
\t\tprint("[ReplBridge] TCP debugger capture registered")

func _on_repl_message(message: String, data: Array) -> bool:
\tvar id: String = str(data[0]) if data.size() > 0 else ""
\tmatch message:
\t\t"eval":
\t\t\tEngineDebugger.send_message("repl:result", [id, _eval(data[1] if data.size() > 1 else "")])
\t\t\treturn true
\t\t"tree":
\t\t\tEngineDebugger.send_message("repl:result", [id, {"tree": _dump_node(get_tree().root)}])
\t\t\treturn true
\t\t"node":
\t\t\tEngineDebugger.send_message("repl:result", [id, _get_node_props(data[1] if data.size() > 1 else "/")])
\t\t\treturn true
\t\t"perf":
\t\t\tEngineDebugger.send_message("repl:result", [id, _get_perf()])
\t\t\treturn true
\t\t"set":
\t\t\tEngineDebugger.send_message("repl:result", [id, _set_prop(str(data[1]), str(data[2]), data[3] if data.size() > 3 else null)])
\t\t\treturn true
\t\t"call":
\t\t\tvar args: Array = data[3] if data.size() > 3 else []
\t\t\tEngineDebugger.send_message("repl:result", [id, _call_node(str(data[1]), str(data[2]), args)])
\t\t\treturn true
\t\t"watch":
\t\t\t_watch_id += 1
\t\t\t_watches[str(_watch_id)] = str(data[1]) if data.size() > 1 else ""
\t\t\tEngineDebugger.send_message("repl:result", [id, {"id": _watch_id}])
\t\t\treturn true
\t\t"globals":
\t\t\tEngineDebugger.send_message("repl:result", [id, _get_globals()])
\t\t\treturn true
\t\t"groups":
\t\t\tEngineDebugger.send_message("repl:result", [id, _get_groups()])
\t\t\treturn true
\t\t"logs":
\t\t\tEngineDebugger.send_message("repl:result", [id, {"logs": _log_buffer.duplicate()}])
\t\t\treturn true
\t\t"pause":
\t\t\tget_tree().paused = not get_tree().paused
\t\t\tEngineDebugger.send_message("repl:result", [id, {"paused": get_tree().paused}])
\t\t\treturn true
\t\t"reload":
\t\t\tEngineDebugger.send_message("repl:result", [id, {"ok": true}])
\t\t\tget_tree().reload_current_scene()
\t\t\treturn true
\treturn false

func _process(_delta: float) -> void:
\tif _tcp.is_connection_available():
\t\tvar conn := _tcp.take_connection()
\t\tif conn: _peers.append(conn)
\tfor i in range(_peers.size() - 1, -1, -1):
\t\tvar p: StreamPeerTCP = _peers[i]
\t\tif p.get_status() != StreamPeerTCP.STATUS_CONNECTED:
\t\t\t_peers.remove_at(i); continue
\t\tvar avail := p.get_available_bytes()
\t\tif avail > 0:
\t\t\t_handle_http(p, p.get_utf8_string(avail))
\t\t\t_peers.remove_at(i)

func _handle_http(peer: StreamPeerTCP, raw: String) -> void:
\tvar lines := raw.split("\\r\\n")
\tif lines.size() == 0: return
\tvar parts := lines[0].split(" ")
\tif parts.size() < 2: return
\tvar method := parts[0]; var url_path := parts[1]; var body := ""; var in_body := false
\tfor line in lines:
\t\tif in_body: body += line
\t\telif line == "": in_body = true
\tvar result := _route(method, url_path, body)
\tvar json_str := JSON.stringify(result)
\tvar json_bytes := json_str.to_utf8_buffer()
\tvar response := "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\nAccess-Control-Allow-Origin: *\\r\\nContent-Length: %d\\r\\nConnection: close\\r\\n\\r\\n" % [json_bytes.size()]
\tpeer.put_data(response.to_utf8_buffer() + json_bytes)

func _route(method: String, url_path: String, body: String) -> Dictionary:
\tvar data: Dictionary = {}
\tif body.length() > 0:
\t\tvar parsed := JSON.parse_string(body)
\t\tif parsed is Dictionary: data = parsed
\tif url_path == "/tree": return {"tree": _dump_node(get_tree().root)}
\tif url_path == "/globals": return _get_globals()
\tif url_path == "/perf": return _get_perf()
\tif url_path == "/input": return {"paused": get_tree().paused, "joypads": Input.get_connected_joypads()}
\tif url_path == "/input-action" and method == "POST":
\t\tvar action := data.get("action", "")
\t\tif data.get("pressed", true): Input.action_press(action)
\t\telse: Input.action_release(action)
\t\treturn {"ok": true, "action": action, "pressed": data.get("pressed", true)}
\tif url_path == "/input-action" and method == "POST":
\t\tvar action := data.get("action", "")
\t\tif data.get("pressed", true): Input.action_press(action)
\t\telse: Input.action_release(action)
\t\treturn {"ok": true, "action": action, "pressed": data.get("pressed", true)}
\tif url_path == "/groups": return _get_groups()
\tif url_path == "/resources":
\t\tvar res := []
\t\tfor r in ResourceCache.get_cached_resources():
\t\t\tif r.resource_path != "": res.append(r.resource_path)
\t\treturn {"resources": res}
\tif url_path == "/physics": return _get_physics()
\tif url_path == "/logs": return {"logs": _log_buffer.duplicate()}
\tif url_path == "/errors": return {"errors": _err_buffer.duplicate()}
\tif url_path == "/watches": return _eval_watches()
\tif url_path == "/eval" and method == "POST": return _eval(data.get("expr", ""))
\tif url_path == "/set" and method == "POST": return _set_prop(data.get("path", ""), data.get("prop", ""), data.get("value", null))
\tif url_path == "/call" and method == "POST": return _call_node(data.get("path", ""), data.get("method", ""), data.get("args", []))
\tif url_path == "/signal" and method == "POST":
\t\tvar node := get_node_or_null(data.get("path", ""))
\t\tif not node: return {"error": "not found"}
\t\tnode.callv("emit_signal", [data.get("signal", "")] + data.get("args", [])); return {"ok": true}
\tif url_path == "/pause" and method == "POST":
\t\tget_tree().paused = not get_tree().paused; return {"paused": get_tree().paused}
\tif url_path == "/reload" and method == "POST":
\t\tget_tree().reload_current_scene(); return {"ok": true}
\tif url_path == "/create-node" and method == "POST":
\t\tvar node := ClassDB.instantiate(data.get("type", "Node"))
\t\tif not node: return {"error": "unknown type: " + data.get("type", "Node")}
\t\tvar parent := get_node_or_null(data.get("parent", "/root"))
\t\tif not parent: parent = get_tree().root
\t\tnode.name = data.get("name", "NewNode")
\t\tparent.add_child(node); return {"ok": true, "path": str(node.get_path())}
\tif url_path == "/delete-node" and method == "POST":
\t\tvar node := get_node_or_null(data.get("path", ""))
\t\tif not node: return {"error": "not found"}
\t\tnode.queue_free(); return {"ok": true}
\tif url_path == "/screenshot":
\t\tvar img := get_viewport().get_texture().get_image()
\t\tif not img: return {"error": "no viewport image"}
\t\tvar b64 := Marshalls.raw_to_base64(img.save_png_to_buffer())
\t\treturn {"format": "png", "base64": b64, "width": img.get_width(), "height": img.get_height()}
\tif url_path == "/watch" and method == "POST":
\t\t_watch_id += 1; _watches[str(_watch_id)] = data.get("expr", ""); return {"id": _watch_id, "expr": data.get("expr", "")}
\tif url_path.begins_with("/watch/") and method == "DELETE":
\t\t_watches.erase(url_path.substr(7)); return {"ok": true}
\tif url_path.begins_with("/node/"): return _get_node_props("/" + url_path.substr(6))
\treturn {"error": "not found", "path": url_path}

func _dump_node(node: Node) -> Dictionary:
\tvar children := []
\tfor c in node.get_children(): children.append(_dump_node(c))
\treturn {"name": node.name, "class": node.get_class(), "path": str(node.get_path()), "groups": node.get_groups(), "children": children}

func _get_node_props(np: String) -> Dictionary:
\tvar node := get_node_or_null(np)
\tif not node: return {"error": "not found: " + np}
\tvar props := {}
\tfor p in node.get_property_list():
\t\tif p.usage & PROPERTY_USAGE_EDITOR: props[p.name] = str(node.get(p.name))
\treturn {"path": np, "class": node.get_class(), "groups": node.get_groups(), "properties": props}

func _eval(expr_str: String) -> Dictionary:
\tvar expr := Expression.new()
\tif expr.parse(expr_str) != OK: return {"error": expr.get_error_text()}
\tvar result = expr.execute([], self)
\tif expr.has_execute_failed(): return {"error": expr.get_error_text()}
\treturn {"result": str(result)}

func _get_globals() -> Dictionary:
\tvar out := []
\tfor child in get_tree().root.get_children(): out.append({"name": child.name, "class": child.get_class(), "path": str(child.get_path())})
\treturn {"globals": out}

func _get_perf() -> Dictionary:
\treturn {"fps": Performance.get_monitor(Performance.TIME_FPS), "process_ms": Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, "physics_ms": Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0, "memory_static": Performance.get_monitor(Performance.MEMORY_STATIC), "memory_dynamic": Performance.get_monitor(Performance.MEMORY_MESSAGE_BUFFER_MAX), "objects": Performance.get_monitor(Performance.OBJECT_COUNT), "nodes": Performance.get_monitor(Performance.OBJECT_NODE_COUNT), "resources": Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT), "draw_calls": Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), "video_mem": Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED), "physics3d_objects": Performance.get_monitor(Performance.PHYSICS_3D_ACTIVE_OBJECTS), "physics2d_objects": Performance.get_monitor(Performance.PHYSICS_2D_ACTIVE_OBJECTS)}

func _get_groups() -> Dictionary:
\tvar groups: Dictionary = {}
\t_collect_groups(get_tree().root, groups); return {"groups": groups}

func _collect_groups(node: Node, groups: Dictionary) -> void:
\tfor g in node.get_groups():
\t\tif not groups.has(g): groups[g] = []
\t\tgroups[g].append(str(node.get_path()))
\tfor c in node.get_children(): _collect_groups(c, groups)

func _get_physics() -> Dictionary:
\treturn {"active_objects_3d": PhysicsServer3D.get_process_info(PhysicsServer3D.INFO_ACTIVE_OBJECTS), "collision_pairs_3d": PhysicsServer3D.get_process_info(PhysicsServer3D.INFO_COLLISION_PAIRS), "island_count_3d": PhysicsServer3D.get_process_info(PhysicsServer3D.INFO_ISLAND_COUNT), "active_objects_2d": PhysicsServer2D.get_process_info(PhysicsServer2D.INFO_ACTIVE_OBJECTS), "collision_pairs_2d": PhysicsServer2D.get_process_info(PhysicsServer2D.INFO_COLLISION_PAIRS)}

func _set_prop(np: String, prop: String, value: Variant) -> Dictionary:
\tvar node := get_node_or_null(np)
\tif not node: return {"error": "not found: " + np}
\tnode.set(prop, value); return {"ok": true}

func _call_node(np: String, method_name: String, args: Array) -> Dictionary:
\tvar node := get_node_or_null(np)
\tif not node: return {"error": "not found: " + np}
\treturn {"result": str(node.callv(method_name, args))}

func _eval_watches() -> Dictionary:
\tvar out := {}
\tfor wid in _watches: out[wid] = _eval(_watches[wid])
\treturn {"watches": out}

func log_info(msg: String) -> void:
\t_log_buffer.append("[INFO] " + msg)
\tif _log_buffer.size() > 500: _log_buffer.pop_front()
\tprint(msg)

func log_error(msg: String) -> void:
\t_err_buffer.append("[ERROR] " + msg)
\tif _err_buffer.size() > 500: _err_buffer.pop_front()
\tpush_error(msg)
`;

module.exports = { REPL_BRIDGE_WITH_HTTP };
