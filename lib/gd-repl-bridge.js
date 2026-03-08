'use strict';

const REPL_BRIDGE_WITH_HTTP = `extends Node

const VERSION := "2.0.0"
const HTTP_PORT := 6009
var _log_buffer: Array[String] = []
var _err_buffer: Array[String] = []
var _watches: Dictionary = {}
var _watch_id: int = 0
var _tcp: TCPServer = TCPServer.new()
var _peers: Array = []

func _ready() -> void:
\tprint("[ReplBridge] v", VERSION, " initialized")
\tvar err := _tcp.listen(HTTP_PORT)
\tif err == OK:
\t\tprint("[ReplBridge] HTTP server on port ", HTTP_PORT)
\telse:
\t\tpush_warning("[ReplBridge] HTTP port %d busy" % HTTP_PORT)

func _process(_delta: float) -> void:
\tif _tcp.is_connection_available():
\t\tvar conn := _tcp.take_connection()
\t\tif conn:
\t\t\t_peers.append(conn)
\tfor i in range(_peers.size() - 1, -1, -1):
\t\tvar p: StreamPeerTCP = _peers[i]
\t\tif p.get_status() != StreamPeerTCP.STATUS_CONNECTED:
\t\t\t_peers.remove_at(i)
\t\t\tcontinue
\t\tvar avail := p.get_available_bytes()
\t\tif avail > 0:
\t\t\tvar raw := p.get_utf8_string(avail)
\t\t\t_handle_http(p, raw)
\t\t\t_peers.remove_at(i)

func _handle_http(peer: StreamPeerTCP, raw: String) -> void:
\tvar lines := raw.split("\\r\\n")
\tif lines.size() == 0:
\t\treturn
\tvar parts := lines[0].split(" ")
\tif parts.size() < 2:
\t\treturn
\tvar method := parts[0]
\tvar url_path := parts[1]
\tvar body := ""
\tvar in_body := false
\tfor line in lines:
\t\tif in_body:
\t\t\tbody += line
\t\telif line == "":
\t\t\tin_body = true
\tvar result := _route(method, url_path, body)
\tvar json_str := JSON.stringify(result)
\tvar response := "HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\nAccess-Control-Allow-Origin: *\\r\\nContent-Length: %d\\r\\nConnection: close\\r\\n\\r\\n%s" % [json_str.length(), json_str]
\tpeer.put_data(response.to_utf8_buffer())

func _route(method: String, url_path: String, body: String) -> Dictionary:
\tvar data: Dictionary = {}
\tif body.length() > 0:
\t\tvar parsed := JSON.parse_string(body)
\t\tif parsed is Dictionary:
\t\t\tdata = parsed
\tif url_path == "/tree":
\t\treturn {"tree": _dump_node(get_tree().root)}
\tif url_path == "/globals":
\t\treturn _get_globals()
\tif url_path == "/perf":
\t\treturn _get_perf()
\tif url_path == "/input":
\t\treturn _get_input()
\tif url_path == "/groups":
\t\treturn _get_groups()
\tif url_path == "/resources":
\t\treturn {"resources": []}
\tif url_path == "/physics":
\t\treturn _get_physics()
\tif url_path == "/logs":
\t\treturn {"logs": _log_buffer.duplicate()}
\tif url_path == "/errors":
\t\treturn {"errors": _err_buffer.duplicate()}
\tif url_path == "/watches":
\t\treturn _eval_watches()
\tif url_path == "/eval" and method == "POST":
\t\treturn _eval(data.get("expr", ""))
\tif url_path == "/set" and method == "POST":
\t\treturn _set_prop(data.get("path", ""), data.get("prop", ""), data.get("value", null))
\tif url_path == "/call" and method == "POST":
\t\treturn _call_node(data.get("path", ""), data.get("method", ""), data.get("args", []))
\tif url_path == "/signal" and method == "POST":
\t\treturn _emit_sig(data.get("path", ""), data.get("signal", ""), data.get("args", []))
\tif url_path == "/pause" and method == "POST":
\t\tget_tree().paused = not get_tree().paused
\t\treturn {"paused": get_tree().paused}
\tif url_path == "/reload" and method == "POST":
\t\tget_tree().reload_current_scene()
\t\treturn {"ok": true}
\tif url_path == "/watch" and method == "POST":
\t\t_watch_id += 1
\t\t_watches[str(_watch_id)] = data.get("expr", "")
\t\treturn {"id": _watch_id, "expr": data.get("expr", "")}
\tif url_path.begins_with("/watch/") and method == "DELETE":
\t\tvar wid := url_path.substr(7)
\t\t_watches.erase(wid)
\t\treturn {"ok": true}
\tif url_path.begins_with("/node/"):
\t\tvar np := "/" + url_path.substr(6)
\t\treturn _get_node_props(np)
\treturn {"error": "not found", "path": url_path}

func _dump_node(node: Node) -> Dictionary:
\tvar children := []
\tfor c in node.get_children():
\t\tchildren.append(_dump_node(c))
\treturn {"name": node.name, "class": node.get_class(), "path": str(node.get_path()), "groups": node.get_groups(), "children": children}

func _get_node_props(np: String) -> Dictionary:
\tvar node := get_node_or_null(np)
\tif not node:
\t\treturn {"error": "not found: " + np}
\tvar props := {}
\tfor p in node.get_property_list():
\t\tif p.usage & PROPERTY_USAGE_EDITOR:
\t\t\tvar val = node.get(p.name)
\t\t\tprops[p.name] = str(val)
\treturn {"path": np, "class": node.get_class(), "groups": node.get_groups(), "properties": props}

func _eval(expr_str: String) -> Dictionary:
\tvar expr := Expression.new()
\tvar err := expr.parse(expr_str)
\tif err != OK:
\t\treturn {"error": expr.get_error_text()}
\tvar result = expr.execute([], self)
\tif expr.has_execute_failed():
\t\treturn {"error": expr.get_error_text()}
\treturn {"result": str(result)}

func _get_globals() -> Dictionary:
\tvar out := []
\tfor child in get_tree().root.get_children():
\t\tout.append({"name": child.name, "class": child.get_class(), "path": str(child.get_path())})
\treturn {"globals": out}

func _get_perf() -> Dictionary:
\treturn {"fps": Performance.get_monitor(Performance.TIME_FPS), "process_ms": Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, "physics_ms": Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0, "memory_static": Performance.get_monitor(Performance.MEMORY_STATIC), "memory_dynamic": Performance.get_monitor(Performance.MEMORY_MESSAGE_BUFFER_MAX), "objects": Performance.get_monitor(Performance.OBJECT_COUNT), "nodes": Performance.get_monitor(Performance.OBJECT_NODE_COUNT), "resources": Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT), "draw_calls": Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), "video_mem": Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED), "physics3d_objects": Performance.get_monitor(Performance.PHYSICS_3D_ACTIVE_OBJECTS), "physics2d_objects": Performance.get_monitor(Performance.PHYSICS_2D_ACTIVE_OBJECTS)}

func _get_input() -> Dictionary:
\treturn {"paused": get_tree().paused, "joypads": Input.get_connected_joypads()}

func _get_groups() -> Dictionary:
\tvar groups: Dictionary = {}
\t_collect_groups(get_tree().root, groups)
\treturn {"groups": groups}

func _collect_groups(node: Node, groups: Dictionary) -> void:
\tfor g in node.get_groups():
\t\tif not groups.has(g):
\t\t\tgroups[g] = []
\t\tgroups[g].append(str(node.get_path()))
\tfor c in node.get_children():
\t\t_collect_groups(c, groups)

func _get_physics() -> Dictionary:
\treturn {"active_objects_3d": PhysicsServer3D.get_process_info(PhysicsServer3D.INFO_ACTIVE_OBJECTS), "collision_pairs_3d": PhysicsServer3D.get_process_info(PhysicsServer3D.INFO_COLLISION_PAIRS), "island_count_3d": PhysicsServer3D.get_process_info(PhysicsServer3D.INFO_ISLAND_COUNT), "active_objects_2d": PhysicsServer2D.get_process_info(PhysicsServer2D.INFO_ACTIVE_OBJECTS), "collision_pairs_2d": PhysicsServer2D.get_process_info(PhysicsServer2D.INFO_COLLISION_PAIRS)}

func _set_prop(np: String, prop: String, value: Variant) -> Dictionary:
\tvar node := get_node_or_null(np)
\tif not node:
\t\treturn {"error": "not found: " + np}
\tnode.set(prop, value)
\treturn {"ok": true}

func _call_node(np: String, method_name: String, args: Array) -> Dictionary:
\tvar node := get_node_or_null(np)
\tif not node:
\t\treturn {"error": "not found: " + np}
\tvar result = node.callv(method_name, args)
\treturn {"result": str(result)}

func _emit_sig(np: String, sig: String, args: Array) -> Dictionary:
\tvar node := get_node_or_null(np)
\tif not node:
\t\treturn {"error": "not found: " + np}
\tnode.emit_signal(sig, args)
\treturn {"ok": true}

func _eval_watches() -> Dictionary:
\tvar out := {}
\tfor wid in _watches:
\t\tout[wid] = _eval(_watches[wid])
\treturn {"watches": out}

func log_info(msg: String) -> void:
\t_log_buffer.append("[INFO] " + msg)
\tif _log_buffer.size() > 500:
\t\t_log_buffer.pop_front()
\tprint(msg)

func log_error(msg: String) -> void:
\t_err_buffer.append("[ERROR] " + msg)
\tif _err_buffer.size() > 500:
\t\t_err_buffer.pop_front()
\tpush_error(msg)
`;

module.exports = { REPL_BRIDGE_WITH_HTTP };
