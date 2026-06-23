# Investigation Notes — Docker Launcher UX Defaults

Status: Complete
Owner: solution_designer
Date: 2026-06-23
Scope: Medium — public installer + multi-node Docker launcher behavior + tests/docs touchpoints.

## Evidence Collected
- Existing focused tests: `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_server_docker_cli_latest_defaults`
  - Result: `Ran 12 tests ... OK (skipped=1)`
  - Log: `tickets/done/docker-launcher-ux-defaults/logs/current-docker-launcher-tests.log`
- Source files inspected:
  - `scripts/public/docker/autobyteus-docker.sh`
  - `scripts/public/docker/autobyteus-docker.d/bash/core.sh`
  - `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`
  - `scripts/public/docker/autobyteus-docker.d/bash/commands.sh`
  - `scripts/public/docker/autobyteus-docker.ps1`
  - `scripts/tests/test_public_docker_launcher_shared_workspace.py`

## Current Behavior Summary

### 1. Install/PATH behavior
- `autobyteus-docker.sh` installs to `${AUTOBYTEUS_DOCKER_INSTALL_DIR:-$HOME/.local/bin}` via `install_launcher`.
- It writes the entrypoint and local module files, then prints “Next commands”.
- If the install directory is not in current `PATH`, it prints guidance but does not update shell profiles.
- A child process launched by `curl ... | bash` cannot mutate the parent interactive shell's live `PATH`; any design must still print a current-shell `export PATH=...` command or direct path.
- UX gap: current output lists `autobyteus-docker new-container` before emphasizing that command may not work until `PATH` is updated.

### 2. Port allocation behavior
- `create_new_container` chooses the next available indexed name using `next_node_name`.
- Only `DEFAULT_NODE_NAME` (`autobyteus-server-0`) sets `prefer_defaults=1`.
- `choose_ports 1` tries friendly defaults:
  - backend `8001`
  - VNC `5908`
  - noVNC `6080`
  - debug `9228`
- `choose_ports 0` uses `random_port` for every exposed service.
- Therefore `autobyteus-server-1` intentionally gets random ports today, e.g. backend `51043`, even when `8002` is free.
- UX gap: additional indexed nodes should prefer predictable sequential friendly ports when available.

### 3. Read-only multi-node display behavior
- `status`/`ps` already display all managed nodes by default unless a node name is supplied.
- `urls`/`ports` default to `autobyteus-server-0` through `resolve_target_name`, and `--all` is parsed but ignored by the `urls|ports` dispatch path.
- `workspace paths` supports `--all`, but its default is still the default node only.
- `storage` supports `--all`, but its default is still the default node only.
- `workspace apply` is mutating and should **not** silently switch to all nodes by default.
- `stop`, `logs`, `upgrade`, `destroy`, and `reset` are mutating or stream/log-specific commands; their current explicit target/`--all` posture is safer and should not be generalized by default.

### 4. CLI parser details relevant to implementation
- Positional node names are currently accepted only for `urls|ports|status|ps|stop|logs` through the parser branch matching `^(urls|ports|status|ps|stop|logs)$`.
- `workspace paths autobyteus-server-1` is not accepted; single-node workspace paths require `--name autobyteus-server-1` today.
- `storage autobyteus-server-1` is not accepted; single-node storage requires `--name autobyteus-server-1` today.
- If defaults change to all for read-only discovery commands, keep explicit single-node access via `--name` and existing positional aliases where supported.

### 5. Test harness observations
- `scripts/tests/test_public_docker_launcher_shared_workspace.py` has a fake Docker script, but its `docker ps --filter ...` behavior currently ignores filters. This is enough for many single-node tests but can hang or misrepresent repeated `new-container` behavior when probing multiple indexed nodes.
- Durable tests for this change should either improve fake Docker filtering or use direct state-file setup for multi-node display tests.
- Install/PATH tests must isolate `HOME`; if implementation writes shell profile files, tests must never modify the real developer/user profile.

## Command-by-Command Problem Classification

| Command | Current default | Problem? | Desired direction |
| --- | --- | --- | --- |
| `install` | Installs files, prints PATH guidance only | Yes | Safe, clearer PATH setup/guidance; optionally idempotent profile update |
| `new-container` | server-0 friendly ports; server-1+ random | Yes | server-N should prefer deterministic friendly port offsets when available |
| `urls` / `ports` | default node only; `--all` ignored | Yes | show all managed nodes by default; support explicit single node |
| `workspace paths` | default node only; `--all` available | Yes | show all managed nodes by default; keep explicit single node support |
| `storage` | default node only; `--all` available | Related | show all managed nodes by default; keep explicit single node support |
| `status` / `ps` | all by default | No | preserve |
| `logs` | default/specified single node | No | preserve; all logs by default would be noisy/unsafe |
| `stop` | default/specified single node; `--all` explicit | No | preserve safety |
| `workspace apply` | default node; `--all` explicit | No | preserve safety because it recreates containers |
| `upgrade --all` | explicit all required | No | preserve safety |
| `destroy --all` | explicit all required | No | preserve safety |
| `reset` | destructive reset to server-0 | No | preserve current explicit command semantics |

## Open Design Risks
- Automatic shell-profile editing is useful but potentially surprising. If implemented by default, it must be idempotent, clearly messaged, and opt-out capable.
- Sequential port preferences should not break existing nodes with saved random ports. Existing state should continue to be honored unless the user explicitly recreates/resets or ports are unavailable.
- Updating `CONFIG_HASH_VERSION` solely for new port preference logic may cause existing managed containers to recreate unnecessarily while retaining their saved random ports. Prefer avoiding a hash-version bump unless runtime container configuration materially changes.
