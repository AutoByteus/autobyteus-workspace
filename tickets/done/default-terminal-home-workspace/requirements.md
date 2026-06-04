# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready`

## Goal / Problem Statement

When the workspace page is opened with no selected agent run, no selected team run, and no selected workspace/run configuration, the right-side Terminal currently shows a red error banner: `No workspace root path is selected for the terminal.` This creates an unnecessary first-use failure state. The interactive terminal should be usable independently of agent/team workspace context by starting in the backend/server user's home directory when no explicit workspace root is available, while preserving workspace-root behavior whenever a workspace/run context is selected.

## Investigation Findings

- The red banner is produced in `autobyteus-web/components/workspace/tools/Terminal.vue`: `connectTerminal()` refuses to call `session.connect()` when `effectiveTerminalTarget.value?.rootPath` is absent and displays the localized `no_terminal_root_path` message.
- `Terminal.vue` resolves its target from either an explicit `target` prop or `terminalTargetFromWorkspaceMetadata(workspaceStore.activeWorkspaceMetadata)`. It does not create or select workspaces itself.
- `workspaceStore.activeWorkspaceMetadata` derives workspace context from active agent runs, active team runs/focused team members, or draft run config stores. With no selected run/config, it returns `null`.
- `useTerminalSession.ts` requires a `TerminalTarget` with `rootPath` and builds `/ws/terminal/{sessionId}?cwd={rootPath}`. It errors locally when no root path is provided.
- Backend `autobyteus-server-ts/src/api/websocket/terminal.ts` also treats missing `cwd`/`rootPath` as invalid because `resolveTerminalCwd()` passes an empty string to `canonicalizeWorkspaceRootPath()`. Invalid or unavailable paths close with `4004` / `Terminal cwd unavailable` before PTY creation.
- Backend terminal docs already establish that terminal sessions are root-path scoped, independent of file-explorer materialization, and do not acquire file-explorer watchers. This makes an independent default cwd behavior compatible with the current subsystem if cwd resolution is made explicit.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed`
- Evidence basis: Terminal cwd availability is currently enforced both by frontend target guards and backend route validation. The frontend couples empty-context terminal usability to active workspace metadata, while the backend is the authoritative place that can know and validate the server home directory.
- Requirement or scope impact: The fix should move default cwd policy to the backend WebSocket route and let the frontend request the default terminal mode without inventing a fake workspace or materializing file-explorer state.

## Recommendations

- Implement a server-home fallback only when the terminal WebSocket request omits both `cwd` and `rootPath`.
- Keep explicit `cwd`/`rootPath` validation strict. If an explicit workspace root is missing, nonexistent, or not a directory, continue rejecting the connection; do not silently fall back to home for broken explicit workspace context.
- Update the frontend Terminal surface so the no-active-workspace case connects through the default terminal path instead of showing a local red banner.
- Do not register the home directory as a workspace, do not mutate workspace selection state, and do not acquire file-explorer watchers for this fallback.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

Rationale: The code changes are limited, but the behavior crosses frontend terminal target resolution, frontend WebSocket URL construction, backend cwd resolution/validation, terminal docs, and targeted frontend/backend validation.

## In-Scope Use Cases

- `UC-DTH-001`: Empty-context terminal open starts in server home.
  - Expected outcome: With no active workspace/run/config, opening or mounting the Terminal connects without a red no-workspace banner and starts a shell whose cwd is the backend/server user's home directory.
- `UC-DTH-002`: Workspace-context terminal still starts in the active workspace root.
  - Expected outcome: When an active agent/team/run-config workspace root exists, Terminal sends that root to the backend and starts there.
- `UC-DTH-003`: Explicit invalid workspace roots remain errors.
  - Expected outcome: If a terminal request includes an explicit nonexistent or non-directory cwd/rootPath, the backend rejects it instead of masking the problem with home fallback.
- `UC-DTH-004`: Terminal context changes reconnect cleanly.
  - Expected outcome: Moving between no workspace and a selected workspace disconnects the old session and connects a new one for the resolved cwd.
- `UC-DTH-005`: File Explorer and workspace stores stay independent.
  - Expected outcome: The home fallback does not create workspace metadata, does not select a workspace, and does not start File Explorer watchers.

## Out of Scope

- Changing agent/team run workspace selection or run launch behavior.
- Making File Explorer default to server home.
- Adding a UI picker for terminal start directory.
- Creating a persistent “home workspace” record.
- Sandboxing terminal commands beyond existing terminal access controls.
- Mobile Phone Access terminal behavior; mobile terminal remains out of scope per existing docs.

## Functional Requirements

- `REQ-DTH-001`: The workspace Terminal must connect successfully when no active workspace/run/config terminal target exists.
  - Expected outcome: No local `No workspace root path is selected for the terminal` banner appears in the empty-context Terminal surface.
- `REQ-DTH-002`: The backend terminal WebSocket route must resolve omitted `cwd`/`rootPath` to the backend process user's home directory and validate it as an existing directory before PTY creation.
  - Expected outcome: Server home is the authoritative default cwd for no-context terminal requests.
- `REQ-DTH-003`: Explicit terminal cwd/rootPath requests must continue to use the provided path and must continue to reject unavailable/non-directory paths before PTY creation.
  - Expected outcome: Broken explicit workspace targets do not silently fall back to home.
- `REQ-DTH-004`: Frontend terminal session URL construction must be able to request backend default cwd without sending a fake path such as `~`, empty string, or a frontend/electron home directory.
  - Expected outcome: Remote clients use the remote/backend server home, not the browser host home.
- `REQ-DTH-005`: The terminal fallback must not mutate workspace selection or workspace metadata stores and must not acquire File Explorer live sessions/watchers.
  - Expected outcome: Terminal remains independent from workspace materialization in the empty-context case.
- `REQ-DTH-006`: Terminal copy and labeling should avoid implying a workspace when the terminal may be server-home rooted.
  - Expected outcome: The startup/welcome text is generic or accurately indicates the default/home context.
- `REQ-DTH-007`: Targeted automated tests must cover empty-context default-home connection, retained explicit workspace connection, invalid explicit cwd rejection, and no-local-banner behavior.
  - Expected outcome: Regressions in the empty-context terminal experience are caught without requiring a packaged-app manual repro.

## Acceptance Criteria

- `AC-DTH-001`: A frontend component test mounts `Terminal.vue` with `workspaceStore.activeWorkspaceMetadata = null` and verifies it calls `session.connect()` without rendering the no-workspace-root red banner.
- `AC-DTH-002`: A frontend session test verifies no-target/default-enabled terminal connection opens `/ws/terminal/{sessionId}` without `cwd` or `rootPath` query parameters.
- `AC-DTH-003`: Existing frontend tests still verify active workspace metadata produces a `cwd` query with that workspace root.
- `AC-DTH-004`: A backend terminal WebSocket integration test opens a socket without `cwd`/`rootPath` and verifies the created session cwd equals `canonicalizeWorkspaceRootPath(os.homedir())`.
- `AC-DTH-005`: Existing backend invalid-cwd tests still pass and confirm explicit invalid cwd closes with `4004` / `Terminal cwd unavailable` and creates no session.
- `AC-DTH-006`: Documentation states that omitted terminal cwd starts in server home and that Terminal fallback does not create workspace/file-explorer state.

## Constraints / Dependencies

- The backend must remain the authority for filesystem path validation because frontend clients may be remote and cannot know server home reliably.
- Existing remote-access WebSocket authorization must remain in front of terminal session creation.
- PTY lifecycle cleanup and close-before-connect behavior must remain unchanged.
- Terminal sessions must remain independent from File Explorer watchers.
- No backward-compatibility dual path should preserve the old missing-cwd error for the workspace Terminal surface.

## Assumptions

- `os.homedir()` / the backend process home directory is the desired default for the product and matches the user's “server home” request.
- The backend process home exists and is usable as a shell cwd in normal supported deployments; if it is unavailable, existing backend connection-error behavior is acceptable.
- Terminal access is already a privileged capability; starting in home changes the initial cwd but does not materially add command capability beyond what an authenticated terminal user already has.

## Risks / Open Questions

- In Docker/all-in-one deployments, `os.homedir()` may be `/root` because the server supervisor sets `HOME=/root`; this appears aligned with “whatever home it is from the server,” but validation should confirm product expectations.
- If future product direction wants a safer default such as a managed shared workspace instead of home, this design should be adjusted at the backend default-cwd resolver only.
- The right-side tabs currently default to Terminal. Therefore, a first open with the right panel visible may create a home PTY immediately. This is consistent with the current Terminal-mounted behavior but should be noted as an intentional UX/resource tradeoff.

## Requirement-To-Use-Case Coverage

- `REQ-DTH-001` -> `UC-DTH-001`
- `REQ-DTH-002` -> `UC-DTH-001`
- `REQ-DTH-003` -> `UC-DTH-002`, `UC-DTH-003`
- `REQ-DTH-004` -> `UC-DTH-001`
- `REQ-DTH-005` -> `UC-DTH-005`
- `REQ-DTH-006` -> `UC-DTH-001`, `UC-DTH-002`
- `REQ-DTH-007` -> `UC-DTH-001`, `UC-DTH-002`, `UC-DTH-003`, `UC-DTH-004`, `UC-DTH-005`

## Acceptance-Criteria-To-Scenario Intent

- `AC-DTH-001` -> Empty-context UI scenario: Terminal mounts with no active workspace and no local red banner.
- `AC-DTH-002` -> Empty-context session URL scenario: no fake cwd is sent; backend owns default.
- `AC-DTH-003` -> Workspace-context regression scenario: active workspace still wins.
- `AC-DTH-004` -> Backend default cwd scenario: omitted query resolves to server home.
- `AC-DTH-005` -> Broken explicit cwd scenario: explicit invalid path remains an error.
- `AC-DTH-006` -> Durable documentation scenario: future maintainers know terminal fallback is not workspace materialization.

## Approval Status

`Design-ready from explicit user-requested behavior analysis; awaiting architecture review before implementation.`
