# Design Spec — Docker Launcher UX Defaults

Status: Ready for Architecture Review (Round 2)
Owner: solution_designer
Date: 2026-06-23

## Scope
Implement focused UX improvements for the public Bash `autobyteus-docker` launcher:

1. Safer/clearer PATH setup after `install`.
2. Sequential friendly host-port preferences for indexed Docker nodes.
3. All-node default output for read-only discovery commands (`urls`/`ports`, `workspace paths`, `storage`).
4. Durable tests for the above while preserving safety on mutating commands.

Primary files expected to change:
- `scripts/public/docker/autobyteus-docker.sh`
- `scripts/public/docker/autobyteus-docker.d/bash/core.sh`
- `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`
- `scripts/public/docker/autobyteus-docker.d/bash/commands.sh`
- `scripts/tests/test_public_docker_launcher_shared_workspace.py`
- README/docs only if implementation determines public command docs need sync.

PowerShell parity is not required for Linux PATH profile behavior, but command help/docs should not become misleading across platforms.

## Task Design Health Assessment

### Change posture
This is a **launcher UX behavior change with targeted local refactors**, not a broad subsystem redesign. The affected behavior is confined to the public Docker launcher scripts and their script-level tests:

- installer entrypoint behavior in `scripts/public/docker/autobyteus-docker.sh`;
- runtime port allocation behavior in `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh`;
- read-only command display/dispatch behavior in `scripts/public/docker/autobyteus-docker.d/bash/commands.sh`;
- usage text in `scripts/public/docker/autobyteus-docker.d/bash/core.sh`;
- fake-Docker and profile-isolated contract tests in `scripts/tests/test_public_docker_launcher_shared_workspace.py`.

No broad refactor is needed because the existing file ownership boundaries are already correct: install concerns live at the entry script boundary, runtime/container concerns live in `docker-runtime.sh`, command dispatch/output concerns live in `commands.sh`, and user-facing help text lives in `core.sh`. The design therefore makes targeted helper extractions only where they preserve or clarify those existing boundaries.

### Evidence-backed root-cause classification

| Behavior | Root-cause classification | Current-code evidence | Design response |
| --- | --- | --- | --- |
| Install succeeds but `autobyteus-docker` is not runnable in the current Linux shell | Missing installer PATH-state invariant and misleading output ordering | `install_launcher` writes `$HOME/.local/bin/autobyteus-docker`, prints bare “Next commands”, then only later prints manual PATH guidance if `entry_path_has_dir` fails | Add install-scoped PATH update/guidance helpers, reorder output, make persistent profile update idempotent/opt-out, and always print current-shell truth |
| `autobyteus-server-1+` gets random ports even when friendly sequential ports are free | Local allocation-policy defect caused by `prefer_defaults` being boolean and tied only to `DEFAULT_NODE_NAME` | `create_new_container` sets `prefer_defaults=1` only for `autobyteus-server-0`; `choose_ports 0` calls `pick_port` without preferred values | Replace the first-attempt preference source with node-index-derived friendly ports while preserving random fallback |
| Port retry after Docker bind failure must avoid reusing failed preferred ports | Retry-invariant coupling hidden inside the old `prefer_defaults` flag | Current `start_node` clears ports after bind failure and, because `prefer_defaults` was set to `0` after the first allocation, retries choose random ports | Preserve this invariant explicitly with an `allow_friendly_preferences` retry flag or failed-candidate exclusion owned by `start_node`/runtime allocator |
| `urls`, `workspace paths`, and `storage` default to one node while `status` defaults to all | Inconsistent read-only targeting policy across command dispatch | `urls|ports` call `show_urls(node_name)` after absent name resolves to `autobyteus-server-0`; `workspace paths` and `storage` can use `--all` but default to the resolved default node | Make read-only discovery commands default to all managed nodes while keeping explicit single-node forms |
| Mutating commands must not broaden by default | Safety-sensitive command posture is already correct | `upgrade`/`destroy` require `--all`; `workspace apply` and `stop` have explicit targeting behavior | Preserve existing mutating/stream command posture; only read-only display defaults change |

### Refactor/no-refactor decision
- **Refactor now, but only locally:**
  - add small installer helper functions for profile selection, managed PATH-block detection/write, and install-output composition in `autobyteus-docker.sh`;
  - add runtime helper functions for node-index parsing and friendly-port preference computation in `docker-runtime.sh`;
  - split `show_urls_for_node` from all-node `show_urls` in `commands.sh` so read-only iteration is owned by command display logic.
- **Do not refactor broadly:** do not reorganize the launcher modules, change state-file schema, move Docker runtime concerns into command dispatch, or introduce a new test harness. The current module split is adequate and the requested changes are bounded.
- **Do not preserve legacy default-node-only discovery for changed read-only commands:** this is the behavior being corrected. Explicit single-node syntax remains the supported precise form.
- **Do not bump `CONFIG_HASH_VERSION` solely for this change:** the desired container configuration is not materially changed by the preference algorithm. Saved state remains authoritative for existing nodes.

### Residual-risk rationale
- Shell profile writes remain best-effort and opt-out because profile ownership varies by user environment; current-shell guidance remains authoritative.
- Sequential friendly ports still use existing availability checks and random fallback, so unrelated local port users do not block node creation.
- Retry behavior is now specified as a runtime invariant: after a bind/run failure, retries must not keep selecting the same friendly preferred candidate.
- All-node output can be longer, but only read-only commands change; explicit `--name`/positional forms remain available for focused output.

## Current Runtime Spine

### Install spine
`entry_main install` -> `install_launcher` -> `entry_install_dir` -> write launcher/modules -> `entry_path_has_dir` -> print either PATH-ok message or manual PATH guidance.

Current gap: no profile update and the “Next commands” block can appear before the warning that those commands may not work in the current shell.

### New container spine
`main new-container` -> `create_new_container` -> `next_node_name` -> `start_node(node_name, image_ref, prefer_defaults)` -> `choose_ports(prefer_defaults)` -> `pick_port(preferred?)` -> `run_container`.

Current gap: `prefer_defaults=1` only for `autobyteus-server-0`; all later indexed nodes call `choose_ports 0` and receive random ports.

### Discovery spine
`main` parses `--all`, `--name`, and positional names -> command dispatch:
- `urls|ports` -> `show_urls(node_name)` where absent name resolves to `autobyteus-server-0`.
- `workspace paths` -> `show_workspace_paths(node_name, stop_all)` where absent name resolves to `autobyteus-server-0`; `--all` works.
- `storage` -> `show_storage(node_name, stop_all)` where absent name resolves to `autobyteus-server-0`; `--all` works.
- `status|ps` already defaults to all when no node name is supplied.

Current gap: read-only discovery commands do not consistently match user expectation after multiple nodes exist.

## Proposed Design

### 1. Install PATH UX

#### 1.1 Add explicit install option parsing
Extend `entry_main` handling for the `install` command to parse only install-scoped flags before calling `install_launcher`.

Proposed flags:
- `--no-update-path`: do not attempt persistent shell-profile update; only print guidance.
- Optional alias: `--skip-path-update` if implementation wants a more descriptive name.

Proposed environment override:
- `AUTOBYTEUS_DOCKER_INSTALL_SKIP_PATH_UPDATE=1` disables persistent profile update.

Keep unknown install options rejected with a clear error.

#### 1.2 Add idempotent persistent shell-profile update by default
When the install directory is missing from current `PATH`, `install_launcher` should attempt a best-effort persistent shell profile update unless disabled.

Profile selection:
- If `${SHELL##*/}` is `bash`, prefer `$HOME/.bashrc`.
- If `${SHELL##*/}` is `zsh`, prefer `$HOME/.zshrc`.
- Otherwise prefer `$HOME/.profile` for POSIX-like shells.
- If the chosen file does not exist, create it if `$HOME` is writable and the shell is supported/fallback POSIX. If creation/write fails, do not fail install; print manual instructions.

Profile block shape:
```sh
# >>> autobyteus-docker PATH >>>
if [ -d "$HOME/.local/bin" ]; then
  case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) export PATH="$HOME/.local/bin:$PATH" ;;
  esac
fi
# <<< autobyteus-docker PATH <<<
```

For non-default `AUTOBYTEUS_DOCKER_INSTALL_DIR`, write the absolute install directory instead of `$HOME/.local/bin`.

Idempotency rules:
- If the managed marker block already exists, do not append another block.
- If the selected profile already contains an equivalent PATH entry for the install dir, do not append another block; print that persistent PATH already appears configured.
- Re-running install must leave only one AutoByteus-managed block.

Current-shell truthfulness and copy-paste commands:
- Even after writing a profile block, print that the current shell cannot be changed by the installer process and needs:
  `export PATH="<install-dir>:$PATH"`
- Print direct immediate command:
  `"<install-path>" new-container`
- Print nvm/Anaconda-style persistent setup commands when automatic profile update is skipped, unsupported, or fails. For bash default install this should be copy-pasteable, e.g.:
  ```bash
  mkdir -p "$HOME/.local/bin"
  grep -qxF 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc"     || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  source "$HOME/.bashrc"
  ```
- For zsh, use `$HOME/.zshrc`; for fallback POSIX profile, use `$HOME/.profile`. For custom install dirs, substitute the concrete install dir and quote safely.
- Only print bare `autobyteus-docker new-container` as immediately runnable when `entry_path_has_dir` is true in the current process.

#### 1.3 Output ordering
Recommended output when PATH is missing:
1. Installed path.
2. Current shell status: install dir is not currently on PATH.
3. Persistent profile status: updated / already configured / skipped / failed with manual instruction.
4. “Run now” commands using direct path and/or export.
5. Copy-paste persistent setup commands for the detected shell profile when the installer did not write an equivalent profile block.
6. “New terminals” command using bare `autobyteus-docker` if profile update is configured.

### 2. Sequential friendly port preferences

#### 2.1 Replace boolean default preference with node-index-derived first-attempt preferences
Add helpers in `docker-runtime.sh` near port helpers:

```bash
node_index_for_friendly_ports() {
  local node_name="$1" suffix
  case "$node_name" in
    ${NODE_NAME_PREFIX}-*)
      suffix="${node_name#${NODE_NAME_PREFIX}-}"
      [[ "$suffix" =~ ^[0-9]+$ ]] || return 1
      printf '%s\n' "$suffix"
      return 0
      ;;
  esac
  return 1
}

preferred_port_for_node() {
  local node_name="$1" base="$2" index
  if index="$(node_index_for_friendly_ports "$node_name")"; then
    printf '%s\n' $((base + index))
    return 0
  fi
  return 1
}
```

Add constants or local bases:
- backend base `8001`
- VNC base `5908`
- noVNC base `6080`
- debug base `9228`

Replace `choose_ports(prefer_defaults)` with a runtime-owned allocator that accepts the node identity and whether friendly preferences are allowed for this allocation attempt:

```bash
choose_ports_for_node() {
  local node_name="$1" allow_friendly_preferences="$2"
  local preferred_backend="" preferred_vnc="" preferred_novnc="" preferred_debug=""

  collect_used_ports

  if [[ "$allow_friendly_preferences" == "1" ]]; then
    preferred_backend="$(preferred_port_for_node "$node_name" 8001 || true)"
    preferred_vnc="$(preferred_port_for_node "$node_name" 5908 || true)"
    preferred_novnc="$(preferred_port_for_node "$node_name" 6080 || true)"
    preferred_debug="$(preferred_port_for_node "$node_name" 9228 || true)"
  fi

  BACKEND_PORT="$(pick_port "$preferred_backend")"
  VNC_PORT="$(pick_port "$preferred_vnc")"
  NOVNC_PORT="$(pick_port "$preferred_novnc")"
  DEBUG_PORT="$(pick_port "$preferred_debug")"
}
```

Implementation detail: compute preferred variables before `pick_port` so `set -e` does not turn a missing non-index preference into a command-substitution hazard. Empty preferred variables intentionally mean “choose random available port.”

#### 2.2 Preserve saved ports and fallback behavior
- Keep `start_node` using existing `BACKEND_PORT`, `VNC_PORT`, `NOVNC_PORT`, `DEBUG_PORT` loaded from state whenever they are present.
- Only allocate ports when one or more saved ports are missing or a bind/start failure requires fresh ports.
- Keep `pick_port` random fallback when preferred is already reserved/unavailable.
- Do not bump `CONFIG_HASH_VERSION` for this allocation preference change alone.

#### 2.3 Explicit bind/run retry contract
The old `prefer_defaults` boolean had two responsibilities: prefer nice ports for `autobyteus-server-0` on first allocation, and suppress preferred-port reuse after the first Docker bind failure. The new design must preserve the second invariant explicitly.

Required `start_node` retry contract:
1. Initialize `allow_friendly_preferences=1` for a fresh allocation attempt.
2. When ports are missing and no prior bind/run failure has happened in this `start_node` invocation, call `choose_ports_for_node "$node_name" "1"`.
3. After a Docker bind/run/start failure classified by `is_bind_failure`, remove the failed container, clear all four selected port variables, and set `allow_friendly_preferences=0` before retrying.
4. Every retry after that bind failure must call `choose_ports_for_node "$node_name" "0"`, which passes empty preferred values into `pick_port`; this guarantees the retry does not repeatedly select the same node-index preferred ports.
5. If implementation instead tracks failed candidates, the failed preferred ports must be reserved/excluded before retry. Do not combine failed-candidate tracking with friendly preferences unless the exclusion is proven by tests.

Illustrative control shape:

```bash
local allow_friendly_preferences=1
for attempt in $(seq 1 "$MAX_RUN_ATTEMPTS"); do
  if [[ "$attempt" -gt 1 || -z "${BACKEND_PORT:-}" || -z "${VNC_PORT:-}" || -z "${NOVNC_PORT:-}" || -z "${DEBUG_PORT:-}" ]]; then
    choose_ports_for_node "$node_name" "$allow_friendly_preferences"
  fi

  if output="$(run_container ... 2>&1)" && verify_container_started ...; then
    write_state ...
    return
  fi

  docker rm -f "$container_name" >/dev/null 2>&1 || true
  if is_bind_failure "$output" && [[ "$attempt" -lt "$MAX_RUN_ATTEMPTS" ]]; then
    log "Port bind failed; retrying with fresh ports (attempt $((attempt + 1))/${MAX_RUN_ATTEMPTS})."
    BACKEND_PORT="" VNC_PORT="" NOVNC_PORT="" DEBUG_PORT=""
    allow_friendly_preferences=0
    continue
  fi
  fail "docker run failed: ${output}"
done
```

Saved-port start failure follows the same invariant: if an existing managed container cannot start because saved ports are unavailable, clear saved runtime variables and recreate with `allow_friendly_preferences=0` for the immediate retry, because the failure is evidence that the current preferred/saved set is not usable in this invocation.

#### 2.4 Expected new allocation
- `autobyteus-server-0`: `8001`, `5908`, `6080`, `9228`
- `autobyteus-server-1`: `8002`, `5909`, `6081`, `9229`
- `autobyteus-server-2`: `8003`, `5910`, `6082`, `9230`

### 3. Read-only discovery defaults

#### 3.1 `urls` / `ports`
Refactor `show_urls` into a single/all capable function:

```bash
show_urls() {
  local filter_name="$1" show_all="$2" node any=0
  if [[ "$show_all" == "1" || -z "$filter_name" ]]; then
    while IFS= read -r node; do
      [[ -n "$node" ]] || continue
      [[ "$any" == "0" ]] || printf '\n'
      show_urls_for_node "$node"
      any=1
    done < <(managed_node_names)
    [[ "$any" == "1" ]] || log "No managed Docker nodes found."
    return
  fi
  show_urls_for_node "$filter_name"
}
```

Keep single-node behavior in `show_urls_for_node` with the current missing-state failure.

Dispatch rule:
- if `urls|ports` and no `name_arg`: show all.
- if `urls|ports --all`: show all.
- if `urls|ports <node>` or `--name <node>`: show one.
- reject ambiguous `--all` plus explicit name.

#### 3.2 `workspace paths`
Keep `workspace apply` safety unchanged. Only change the `paths` subcommand default.

Dispatch rule:
- `workspace paths` with no `--name` and no `--all`: show all.
- `workspace paths --all`: show all.
- `workspace paths --name <node>`: show one.
- `workspace apply` with no name: keep existing default-node behavior or make target requirement explicit; do not default to all.
- reject ambiguous `workspace paths --all --name <node>`.

`show_workspace_paths` already supports all via `show_all=1`; the main parser/dispatch mostly needs to pass `show_all=1` when action is `paths` and `name_arg` is empty.

#### 3.3 `storage`
`storage` is read-only and should align with `urls` and `workspace paths`.

Dispatch rule:
- `storage` with no `--name` and no `--all`: show all.
- `storage --all`: show all.
- `storage --name <node>`: show one.
- reject ambiguous `storage --all --name <node>`.

`show_storage` already supports all via `show_all=1`; dispatch change is sufficient.

#### 3.4 Preserve current mutating/stream commands
No all-by-default changes to:
- `workspace apply`
- `stop`
- `logs`
- `upgrade`
- `destroy`
- `reset`

### 4. Help text updates
Update `core.sh` usage text:
- `urls | ports       Show Backend, GraphQL, noVNC, VNC, and debug URLs for all nodes by default`
- `workspace paths    Show host/container paths for all nodes by default`
- `storage            Show named volumes and host bind mounts for all nodes by default`
- Clarify `--name <name>`: “Select one node for single-node commands/output.”
- Clarify `--all`: “Required for upgrade/destroy; optional for all-node read-only output; applies stop/workspace apply/storage/status as documented.” Keep wording concise.

### 5. Test Design

Update `scripts/tests/test_public_docker_launcher_shared_workspace.py`.

#### 5.1 Fake Docker support
Improve `write_fake_docker` enough for multi-node tests:
- Honor `docker ps --filter label=com.autobyteus.nodeName=<node>` by returning only matching containers.
- Honor `docker ps --filter label=com.autobyteus.launcher=server-docker` by returning managed containers.
- Continue returning names for existing single-node tests.

#### 5.2 Install/PATH tests
Add tests with isolated `HOME` and install dir:
- `test_bash_install_when_path_missing_updates_profile_and_prints_current_shell_guidance`
  - Set `HOME` to temp dir.
  - Set `SHELL=/bin/bash`.
  - Set `PATH` without install dir.
  - Run install.
  - Assert installed entry/modules exist.
  - Assert output includes direct path and `export PATH=` guidance.
  - Assert `.bashrc` contains one AutoByteus-managed PATH block or, if architecture chooses opt-in profile update, assert output names the opt-in command.
- `test_bash_install_path_profile_update_is_idempotent`
  - Run install twice.
  - Assert only one managed block or no duplicate path instructions in profile.
- `test_bash_install_no_update_path_skips_profile_write`
  - Run `install --no-update-path`.
  - Assert no managed block is written and output gives manual guidance.

#### 5.3 Sequential port tests
Add `test_new_containers_prefer_sequential_friendly_ports`:
- In fake Docker env, run `new-container` three times.
- Assert the recorded `docker run` args contain:
  - first: `8001:8000`, `5908:5900`, `6080:6080`, `9228:9223`
  - second: `8002:8000`, `5909:5900`, `6081:6080`, `9229:9223`
  - third: `8003:8000`, `5910:5900`, `6082:6080`, `9230:9223`

Add fallback coverage if feasible:
- Seed state or bind a port to make a preferred port unavailable.
- Assert fallback does not use the unavailable preferred port and still records a valid port mapping.

Add bind-failure retry coverage if feasible:
- Configure fake Docker so the first `docker run` fails with a bind-allocation error after preferred friendly ports were selected.
- Assert the retry does not reuse those same preferred host ports and succeeds with fresh/random ports.
- This test protects the explicit retry contract that replaces the old `prefer_defaults=0` retry behavior.

#### 5.4 Discovery default tests
Add `test_read_only_discovery_commands_default_to_all_nodes`:
- Create two managed nodes (via `new-container` twice after fake Docker filter support, or by writing state files directly).
- Assert `urls`, `ports`, `workspace paths`, and `storage` include both `autobyteus-server-0` and `autobyteus-server-1`.

Add `test_read_only_discovery_commands_keep_explicit_single_node_output`:
- Assert `urls autobyteus-server-1` or `urls --name autobyteus-server-1` shows only server-1.
- Assert `workspace paths --name autobyteus-server-1` shows only server-1.
- Assert `storage --name autobyteus-server-1` shows only server-1.

Add `test_mutating_commands_do_not_default_to_all_nodes`:
- Confirm `workspace apply` without `--all` targets only default node or requires a target, according to implementation choice.
- Confirm `upgrade`/`destroy` still require `--all`.

### 6. Validation Plan
Implementation engineer should run at minimum:
```bash
python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace scripts.tests.test_server_docker_cli_latest_defaults
```

If implementation changes docs/help only, no full Docker daemon is required for implementation-scoped tests. If fake Docker cannot confidently validate behavior, API/E2E engineer must run real or simulated Docker-node validation after code review.

Suggested manual/API-E2E validation after implementation:
```bash
autobyteus-docker destroy --all   # only in a disposable launcher environment
autobyteus-docker new-container
autobyteus-docker new-container
autobyteus-docker status
autobyteus-docker urls
autobyteus-docker workspace paths
autobyteus-docker storage
```
Expected: two nodes, second backend on `8002` if free, and discovery commands show both nodes.

## Backward Compatibility / Migration
- Existing state files remain valid.
- Existing nodes with saved random ports continue to report those saved ports.
- Users who want a pre-existing `autobyteus-server-1` to move from random ports to friendly sequential ports must recreate/reset in a controlled way; do not silently migrate running nodes just because the launcher code changed.
- Existing direct-path install usage remains valid.

## Risks and Mitigations
- **Risk:** profile update surprises users. **Mitigation:** clear output, managed idempotent block, opt-out flag/env, non-fatal profile write failure.
- **Risk:** fake Docker tests accidentally edit the real user profile. **Mitigation:** every install/PATH test must set isolated `HOME`.
- **Risk:** sequential ports collide with unrelated local processes. **Mitigation:** keep `port_is_available` and random fallback.
- **Risk:** read-only defaults changing to all creates longer output. **Mitigation:** explicit single-node syntax remains available and output blocks are separated.
- **Risk:** parser ambiguity with `--all --name`. **Mitigation:** reject ambiguous combinations for read-only commands.
