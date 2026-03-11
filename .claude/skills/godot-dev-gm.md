---
name: godot-dev-gm
description: Godot 4.x development with gm state machine - immutable work coordination + godot-dev CLI
triggers: [godot, gd, gdscript, ".gd", scene tree, game debug, repl_bridge, godot-dev, gm agent]
tools: [Bash, Read, Write, Edit]
agent: false
---

# godot-dev + GM INTEGRATED WORKFLOW

This skill combines **GM state machine (immutable work coordination)** with **godot-dev CLI (Godot 4.x game engine control)**. Use together for coordinated, witnessed game development.

---

## GM STATE MACHINE PROTOCOL (Work Coordination)

**CRITICAL**: GM is about execution certainty. Never assume. Only witnessed execution counts.

### Quick Reference

**Mutable Discipline** (3-phase validation):
- **PHASE 1 (PLAN)**: Enumerate unknowns in `.prd` - `fileExists=UNKNOWN`, `gameRuns=UNKNOWN`, etc.
- **PHASE 2 (EXECUTE)**: Test hypotheses. Update `.prd`: `fileExists=UNKNOWN → true (witnessed)`
- **PHASE 3 (VALIDATE)**: Re-test on actual modified disk code. Confirm all mutables still hold.

**Transition Rules**:
- `PLAN → EXECUTE → PRE-EMIT-TEST → EMIT → POST-EMIT-VALIDATION → VERIFY → GIT-PUSH → COMPLETE`
- Blocking gates: PRE-EMIT-TEST blocks EMIT. POST-EMIT-VALIDATION blocks VERIFY. QUALITY-AUDIT blocks GIT-PUSH.

### .prd Structure

```
## ITEMS (tasks - remove when complete)
- [ ] Implement player movement
  - Mutable: characterCanMove=UNKNOWN (expect: true)
  - Mutable: velocityApplied=UNKNOWN (expect: true)

## MUTABLES TRACKING (Phase 1: PLAN)
- characterCanMove: UNKNOWN | expected=true
- velocityApplied: UNKNOWN | expected=true

## MUTABLES VALIDATION (Phase 2: EXECUTE/PRE-EMIT-TEST)
- characterCanMove: UNKNOWN → true (witnessed: godot-dev game eval showed movement)
- velocityApplied: UNKNOWN → true (witnessed: velocity changed from 0 to 150)

## MUTABLES VERIFICATION (Phase 3: POST-EMIT-VALIDATION/VERIFY)
- characterCanMove: true (witnessed again: modified disk code, player moved correctly)
- velocityApplied: true (witnessed again: velocity applied on modified code)
```

### Execution Pattern

```bash
# PLAN: Create .prd with all unknowns
cat > .prd << 'EOF'
## ITEMS
- [ ] Add jump mechanic to player

## MUTABLES TRACKING (Phase 1)
- playerCanJump: UNKNOWN | expected=true
- jumpVelocityCorrect: UNKNOWN | expected=true
- animationPlays: UNKNOWN | expected=true
EOF

# EXECUTE: Test hypotheses via godot-dev
godot-dev launch &
sleep 2
godot-dev game eval "get_tree().root.get_child(0).position.y"  # witness current position
godot-dev game call /root/Main jump  # test jump
sleep 1
godot-dev game eval "get_tree().root.get_child(0).position.y"  # witness new position

# Update .prd PHASE 2 with witnessed values

# PRE-EMIT-TEST: More thorough testing before file changes

# EMIT: Write jump implementation to scripts/main.gd

# POST-EMIT-VALIDATION: Test modified code from disk
godot-dev launch &
sleep 2
godot-dev game call /root/Main jump
godot-dev game eval "Engine.get_frames_per_second()"  # confirm it runs

# Update .prd PHASE 3 with re-confirmed values
```

### Gate Rules

| State | Block | Unblock |
|-------|-------|---------|
| EXECUTE | UNKNOWN mutables in PHASE 2 | All mutables witnessed |
| PRE-EMIT-TEST | Hypothesis failure | All pass, zero failures |
| POST-EMIT-VALIDATION | Modified code failure | Real execution success |
| VERIFY | PHASE 3 contradicts PHASE 2 | All mutables consistent |
| QUALITY-AUDIT | Policy violations, surprises | All files audited, zero issues |

---

## godot-dev CLI Reference

### Setup

```bash
npx godot-kit <project-dir>        # scaffold new project
godot-dev download-engine          # download Godot 4.6-stable
godot-dev setup                    # install gdtoolkit + skills
```

### Launch & Debug

```bash
godot-dev launch [scene]           # launch game with remote debugger on :6007
godot-dev repl                     # interactive REPL via debugger
godot-dev inspect                  # dump scene tree (one-shot)
godot-dev logs                     # stream Godot output
```

### Editor HTTP API (port 6008, requires godot_kit_bridge plugin)

```bash
godot-dev editor tree                           # scene tree JSON
godot-dev editor select <node-path>             # select node in editor
godot-dev editor run <code>                     # run GDScript in editor context
godot-dev editor open <res://scene.tscn>        # open scene
godot-dev editor save                           # save current scene
godot-dev editor files                          # list project files
godot-dev editor property <node> <prop> <val>   # set node property
godot-dev editor create <parent> <type> <name>  # create node
godot-dev editor delete <node-path>             # delete node
godot-dev editor autoloads                      # list autoloads
```

### Game Runtime HTTP API (port 6009, injected via ReplBridge autoload)

```bash
godot-dev game tree                             # runtime scene tree
godot-dev game eval "<GDScript expression>"     # evaluate expression
godot-dev game globals                          # list autoloads + properties
godot-dev game perf                             # FPS + perf metrics
godot-dev game set <node-path> <prop> <val>     # set node property
godot-dev game call <node-path> <method> [arg]  # call node method
godot-dev game pause                            # toggle pause
godot-dev game reload                           # reload current scene
godot-dev game logs                             # buffered game logs
```

### Code Quality

```bash
godot-dev lint [files...]                      # GDScript lint via gdtoolkit
godot-dev format [files...]                    # GDScript format
godot-dev validate                             # lint all .gd files + check for Godot 3.x deprecated APIs
```

### Watch / Test / Export

```bash
godot-dev watch                                # watch .gd files, hot-reload on change
godot-dev test <script.gd>                     # run GDScript headlessly, report pass/fail
godot-dev export <preset>                      # export project by preset name
```

### Ports

| Service | Port |
|---------|------|
| Remote Debugger | 6007 |
| Editor HTTP API | 6008 |
| Game Runtime HTTP | 6009 |
| LSP | 6005 |
| DAP | 6006 |

---

## Combined Workflow Example: Platformer Level Design

### PLAN Phase

```bash
# Create .prd defining all work + unknowns
cat > .prd << 'EOF'
## ITEMS
- [ ] Create player character with movement controls
- [ ] Design first level platform layout
- [ ] Implement jump mechanic with animation

## MUTABLES TRACKING (Phase 1: PLAN)
- playerScriptExists: UNKNOWN | expected=true
- movementInputWorks: UNKNOWN | expected=true
- animationPlays: UNKNOWN | expected=true
- platformsCollide: UNKNOWN | expected=true
- jumpsCorrectly: UNKNOWN | expected=true
- levelLoads: UNKNOWN | expected=true
EOF
```

### EXECUTE Phase (Witness Everything)

```bash
# Start game with debugger
godot-dev launch &
GODOT_PID=$!
sleep 3

# Witness: Can we move the character?
godot-dev game eval "Input.is_action_pressed('ui_right')"
godot-dev game call /root/Main move_right
godot-dev game eval "get_tree().root.get_child(0).position.x"  # Check X changed

# Witness: Does jump work?
godot-dev game call /root/Main jump
godot-dev game eval "get_tree().root.get_child(0).position.y"  # Check Y changed

# Witness: Is animation playing?
godot-dev game eval "get_tree().root.get_child(0)/AnimatedSprite.is_playing()"

# Update .prd PHASE 2 with all witnessed values
# Example:
# - playerScriptExists: UNKNOWN → true (witnessed: /root/Main returned valid node)
# - movementInputWorks: UNKNOWN → true (witnessed: X position changed to 150)
# - jumpsCorrectly: UNKNOWN → true (witnessed: Y position changed to -50)

kill $GODOT_PID
```

### PRE-EMIT-TEST Phase (Comprehensive Testing Before Changes)

```bash
# Test all possible scenarios before touching code
godot-dev launch &
sleep 2

# Test movement + jump combo
godot-dev game call /root/Main move_right
godot-dev game call /root/Main jump
godot-dev game eval "get_tree().root.get_child(0).position"  # Witness combo works

# Test collision
godot-dev game eval "get_tree().root.get_child(0).is_on_floor()"  # Witness floor state

# Update .prd - all hypotheses pass before editing files
```

### EMIT Phase (Write Files)

```bash
# Implement new jump animation in scripts/main.gd
# Implement new level layout in scenes/level1.tscn
```

### POST-EMIT-VALIDATION Phase (Test on Modified Disk Code)

```bash
# Launch game with ACTUAL modified code
godot-dev launch &
sleep 2

# Re-test everything on modified code
godot-dev game call /root/Main jump
godot-dev game eval "Engine.get_frames_per_second()"
godot-dev game eval "get_tree().root.get_child(0).position"  # Witness movement still works

# Update .prd PHASE 3: Re-confirm all mutables on modified disk code
```

### VERIFY Phase (E2E System Test)

```bash
# Full playthrough with new code
godot-dev launch &
sleep 3
# Manually test: walk → jump → land → continue
godot-dev game reload  # Reload to test hot-reload
godot-dev game eval "get_tree().get_nodes_in_group('enemies').size()"  # Check level loaded correctly
```

### QUALITY-AUDIT Phase (Critical Inspection)

```bash
# Inspect every changed file
cat scripts/main.gd  # Review jump implementation
cat scenes/level1.tscn  # Review platform layout

# Verify: <200 lines/file, no duplication, no hardcoded values, no test files left
wc -l scripts/*.gd
find . -name "*.test.gd" -o -name "*.spec.gd"  # Should be empty

# Update .prd final section:
# "All mutables resolved. Jump mechanic verified. Level loads. No improvements possible. READY FOR GIT-PUSH."
```

### GIT-PUSH Phase

```bash
# Only after QUALITY-AUDIT passes
git add -A
git commit -m "Implement jump mechanic and level 1 layout

- Player can jump with animation
- Level platforms collide correctly
- All mutables witnessed in 3 phases
- Zero unresolved work"
git push origin claude/your-branch
```

### COMPLETE Phase

```bash
# Final .prd
cat .prd
# Output should show:
# - All ITEMS checked off
# - All MUTABLES in PHASE 1, 2, 3 witnessed
# - Final line: "COMPLETE"
```

---

## Integration: GM + godot-dev Workflow Rules

1. **Every godot-dev execution is a mutable witness**: Record output in `.prd`
2. **PRE-EMIT-TEST gates must use godot-dev**: Launch game, test all scenarios before file changes
3. **POST-EMIT-VALIDATION is mandatory**: Retest on disk with `godot-dev launch`
4. **PHASE 2 + PHASE 3 must show actual command output**: Copy exact `godot-dev` commands + results
5. **Editor + Game API are testing tools**: Use `godot-dev editor` for pre-flight checks, `godot-dev game` for runtime validation
6. **No assumptions**: If "does animation play?" is a mutable, run `godot-dev game eval` to witness it

---

## Common GM + godot-dev Patterns

### Test Script Before Integration
```bash
# EXECUTE: Test in isolation
godot-dev test scripts/player.gd
# Update .prd: scriptValid=UNKNOWN → true (witnessed: test passed)

# PRE-EMIT-TEST: Test in context
godot-dev launch &
sleep 2
godot-dev game tree  # Verify scene tree shows new script
```

### Verify Property Changes
```bash
# Before file edit
godot-dev game get /root/Main/Player health
# → health = 100

# EMIT: Change max_health in script
# VALIDATE: Verify it works
godot-dev launch &
godot-dev game set /root/Main/Player max_health 150
godot-dev game get /root/Main/Player max_health
# → health_max = 150 (witnessed)

# Update .prd PHASE 3: propertyChanges: true (witnessed: max_health = 150 on disk)
```

### Debug Scene Layout
```bash
# Inspect editor before changes
godot-dev editor tree

# PRE-EMIT-TEST: Verify node hierarchy
godot-dev editor create /root/Main Node2D platform1

# EMIT: Add platforms to scene file

# POST-EMIT-VALIDATION: Re-inspect on disk
godot-dev editor tree  # Verify platforms are there
godot-dev game tree    # Verify they loaded at runtime
```

---

## Godot 3.x → 4.6 Upgrade Patterns (GM + godot-dev)

Before migrating old code:

1. **PLAN**: List all API changes as mutables: `apiV3.instance → V4.instantiate`, etc.
2. **EXECUTE**: Test old code with godot-dev to establish baseline
3. **EMIT**: Update one section at a time
4. **POST-EMIT-VALIDATE**: Test each section with `godot-dev test` and `godot-dev launch`
5. **VERIFY**: Full game E2E with new API

Example:
```bash
# PHASE 1 (PLAN): Document API changes
# PHASE 2 (EXECUTE): Witness baseline behavior
godot-dev launch &
godot-dev game eval "Engine.get_version_info()"  # → 4.6

# PHASE 2: Update scripts/main.gd: change `.instance()` → `.instantiate()`

# PHASE 3: Re-test on modified code
godot-dev test scripts/main.gd
godot-dev launch &
# Witness: game still runs, instantiate() works
```

---

## Critical Rules

✅ **Always do this**:
- Update `.prd` PHASE 2/3 before state transition
- Run `godot-dev launch &` / `godot-dev game eval` to witness every mutable
- Test PRE-EMIT (before file changes), POST-EMIT (on disk), VERIFY (running system)
- Copy exact commands + output into `.prd`
- Block transitions if `.prd` shows UNKNOWN mutables

❌ **Never do this**:
- Skip POST-EMIT-VALIDATION (file changes aren't verified until tested on disk)
- Assume animation "probably works" (run godot-dev to witness)
- Mark mutable done without actual command output
- Edit files without PRE-EMIT-TEST passing first
- Leave `.prd` with UNKNOWN values at transition points
