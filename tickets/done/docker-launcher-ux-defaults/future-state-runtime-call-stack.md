# Future-State Runtime Call Stack — Docker Launcher UX Defaults

Status: Revised for Architecture Review Round 2
Owner: solution_designer
Date: 2026-06-23

## Install PATH Flow
1. User runs `curl .../autobyteus-docker.sh | bash -s -- install`.
2. `entry_main` parses install flags (`--no-update-path` optional).
3. `install_launcher` writes executable and module files.
4. Installer checks whether install dir is in current `PATH`.
5. If present: print normal next commands.
6. If missing:
   - optionally append/update one managed PATH block in detected shell profile,
   - print profile update status,
   - print current-shell export command,
   - print direct-path command that works immediately.
7. Re-running install detects existing profile block/path and does not duplicate it.

## New Container Port Flow
1. User runs `autobyteus-docker new-container`.
2. `next_node_name` returns first available `autobyteus-server-N`.
3. `start_node` loads state. If saved ports exist and the container can be reused/started, use them.
4. If ports must be allocated, `start_node` sets `allow_friendly_preferences=1` for the first allocation attempt.
5. `choose_ports_for_node(node_name, allow_friendly_preferences)` derives preferred ports from the node index only when the flag is `1`.
6. `pick_port(preferred)` reserves the preferred port if not in state and locally bindable.
7. If a preferred port is unavailable during precheck, `pick_port` falls back to a random available port for that service.
8. `run_container` maps selected host ports to unchanged container ports.
9. If Docker reports a bind/run/start failure, `start_node` removes the failed container, clears all selected port variables, sets `allow_friendly_preferences=0`, and retries.
10. Retry allocation calls `choose_ports_for_node(node_name, 0)`, passing empty preferred ports into `pick_port`, so the retry uses fresh/random ports rather than repeatedly selecting the failed friendly preferred candidates.
11. On success, `write_state` persists the selected ports.

## Read-Only Discovery Flow
1. User runs `autobyteus-docker urls`, `ports`, `workspace paths`, or `storage` without a node name.
2. Dispatch treats absent node name as all-node output for those read-only commands.
3. Command iterates `managed_node_names`.
4. For each node, existing per-node printer loads state and prints one block.
5. If no nodes exist, launcher logs `No managed Docker nodes found.`
6. If user supplies `--name <node>` or supported positional node, command prints one node.

## Mutating Flow Preservation
- `workspace apply` keeps explicit single-node/default-node or `--all` semantics and never silently broadens to all nodes.
- `stop`, `upgrade`, `destroy`, and `reset` preserve existing explicit targeting/all requirements.
