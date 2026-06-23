# Requirements — Docker Launcher UX Defaults

Status: Design-ready
Owner: solution_designer
Date: 2026-06-23

## Problem Statement
The public `autobyteus-docker` launcher works but has confusing defaults after a user installs it and starts multiple Docker nodes. The user observed that Linux install did not make `autobyteus-docker` immediately runnable, `autobyteus-server-1` received a random backend port instead of the next friendly port, and discovery commands such as `urls` and `workspace paths` default to only `autobyteus-server-0` even after multiple nodes exist.

## Goals
1. Make the Linux/macOS shell PATH install experience clearer and more useful, while acknowledging that a child installer process cannot mutate the already-running parent shell.
2. Prefer deterministic, human-friendly sequential host ports for indexed Docker nodes when the preferred ports are available.
3. Make read-only node discovery commands show all managed nodes by default when multiple nodes may exist.
4. Preserve safety for mutating commands: no command that stops, destroys, upgrades, resets, or recreates containers should silently broaden from one node to all nodes.
5. Add durable tests for the launcher UX behavior. The implementation engineer should implement and run feasible implementation-scoped tests; if any behavior cannot be validated there, the API/E2E engineer must validate it end-to-end.

## Non-Goals
- Do not change the container-internal ports (`8000`, `5900`, `6080`, `9223`).
- Do not change Docker image defaults (`autobyteus/autobyteus-server:latest`).
- Do not remove random fallback ports; they remain necessary when preferred ports are unavailable.
- Do not change named volume semantics or delete user data.
- Do not make mutating commands apply to all nodes by default.

## Functional Requirements

### FR1 — Install PATH UX
- When `autobyteus-docker install` installs into a directory not present in the current shell `PATH`, output must not present `autobyteus-docker new-container` as immediately runnable without qualification.
- The installer must clearly print:
  - the installed executable path,
  - a direct-path command that works immediately,
  - a current-shell `export PATH="<install-dir>:$PATH"` command,
  - copy-paste persistent shell-profile commands in the style users expect from tools such as nvm/Anaconda when automatic profile update is skipped or unavailable,
  - whether a persistent shell profile update was made or exactly how to make one.
- If implementation chooses automatic persistent shell-profile update, it must be:
  - idempotent,
  - marked with recognizable AutoByteus comments or otherwise duplicate-safe,
  - scoped to the detected user shell profile (`.bashrc`, `.zshrc`, or fallback `.profile`),
  - non-fatal if profile update is unsupported or the profile is not writable,
  - opt-out capable via CLI flag or environment variable.
- If implementation keeps persistent profile update opt-in, then the default output must make the opt-in command obvious.
- In every design, the installer must explain that the current shell still needs `export PATH=...` or direct-path invocation.

### FR2 — Sequential friendly host ports for indexed nodes
- `autobyteus-server-0` continues to prefer existing defaults:
  - backend `8001`
  - VNC `5908`
  - noVNC `6080`
  - Chrome debug `9228`
- `autobyteus-server-N` for integer `N >= 1` should prefer deterministic offsets when each preferred port is available and not already reserved in launcher state:
  - backend `8001 + N` (`server-1 -> 8002`)
  - VNC `5908 + N` (`server-1 -> 5909`)
  - noVNC `6080 + N` (`server-1 -> 6081`)
  - Chrome debug `9228 + N` (`server-1 -> 9229`)
- If a preferred port is unavailable, use existing safe random fallback for that service port and continue to avoid collisions.
- Existing nodes with saved ports must continue using their saved ports during `urls`, `status`, `storage`, `workspace paths`, `logs`, and normal starts unless ports are unavailable or the user performs an operation that intentionally recreates with new allocation.
- Avoid bumping launcher config hash version solely for the allocation preference change unless implementation changes actual desired container configuration.

### FR3 — Read-only discovery commands default to all nodes
- `autobyteus-docker urls` and `autobyteus-docker ports` must show all managed nodes by default, with clear separation between node blocks.
- `autobyteus-docker urls --all` and `autobyteus-docker ports --all` must also show all managed nodes; `--all` must not be silently ignored.
- `autobyteus-docker urls <node>` and/or `autobyteus-docker urls --name <node>` must continue to show one node.
- `autobyteus-docker workspace paths` must show all managed nodes by default.
- `autobyteus-docker workspace paths --all` must continue to show all managed nodes.
- `autobyteus-docker workspace paths --name <node>` must show one node; positional single-node support may be added if it does not conflict with the `paths` subcommand grammar.
- `autobyteus-docker storage` must show all managed nodes by default.
- `autobyteus-docker storage --all` must continue to show all managed nodes.
- `autobyteus-docker storage --name <node>` must show one node; positional single-node support may be added if parser changes remain clear.

### FR4 — Mutating or stream-specific commands preserve explicit targeting
- `workspace apply` must not default to all nodes; it may keep default-node behavior or require explicit `--name`/`--all`, but it must not silently recreate every managed node.
- `stop`, `logs`, `upgrade`, `destroy`, and `reset` must preserve their current safety posture:
  - `stop --all` is explicit for all-node stop,
  - `upgrade --all` is required,
  - `destroy --all` is required,
  - `logs` stays single-node unless a deliberate future design adds aggregate logs,
  - `reset` remains explicit destructive reset behavior.

## Acceptance Criteria

### AC1 — PATH install messaging/profile behavior
- With `PATH` not containing the install directory, `install` output includes a direct executable path and current-shell export command before or alongside any `autobyteus-docker ...` next step.
- With `PATH` not containing the install directory, `install` output includes concrete copy-paste persistent setup commands for the detected shell profile, for example `grep -qxF ... ~/.bashrc || echo ... >> ~/.bashrc` plus a `source` command, unless the installer successfully writes an equivalent managed profile block itself.
- Persistent PATH handling is duplicate-safe and tested without modifying the real developer/user profile.
- Re-running install does not append duplicate PATH entries/profile blocks.

### AC2 — Port allocation
- In an isolated fake/test environment with no port collisions:
  - first `new-container` maps backend `8001`, VNC `5908`, noVNC `6080`, debug `9228`;
  - second `new-container` maps backend `8002`, VNC `5909`, noVNC `6081`, debug `9229`;
  - third `new-container` maps backend `8003`, VNC `5910`, noVNC `6082`, debug `9230`.
- When a preferred port is unavailable or already reserved, allocation falls back to a different available port and records that port in state.

### AC3 — Discovery defaults
- With two managed node state files, `urls` output includes both `autobyteus-server-0` and `autobyteus-server-1`.
- With two managed node state files, `workspace paths` output includes both node workspace host paths.
- With two managed node state files, `storage` output includes both nodes' volume/bind-mount mappings.
- Explicit single-node forms still output only the requested node.

### AC4 — Safety preservation
- `workspace apply` does not apply to all nodes unless `--all` is supplied.
- `upgrade` and `destroy` still reject calls without `--all`.
- `stop` and `logs` do not become all-node defaults.

### AC5 — Tests and validation ownership
- Implementation engineer should add/update unit or script-level tests covering AC1–AC4 and run them locally.
- If script-level tests cannot exercise Docker runtime behavior sufficiently, API/E2E engineer must run an end-to-end validation with real or suitably simulated Docker nodes and record evidence.

## Requirement Coverage Map
- FR1 -> AC1, AC5
- FR2 -> AC2, AC5
- FR3 -> AC3, AC5
- FR4 -> AC4, AC5
