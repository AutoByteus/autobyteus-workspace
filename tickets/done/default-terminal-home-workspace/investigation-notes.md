# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design produced.
- Investigation Goal: Determine why the workspace terminal requires an explicit workspace root and design the safest default-home behavior when no workspace/run context exists.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The behavior crosses frontend terminal UI, selected-workspace state, frontend terminal WebSocket URL construction, backend terminal cwd validation, docs, and tests.
- Scope Summary: Replace the no-workspace terminal error with an independent default terminal session rooted at the backend/server user's home directory when no explicit workspace context is available.
- Primary Questions To Resolve:
  - Where is the no-workspace error produced? Answer: frontend `Terminal.vue` local guard; backend also rejects omitted cwd.
  - What currently defines the terminal root path and session identity? Answer: frontend `TerminalTarget.rootPath` becomes `cwd`; backend canonicalized cwd is both target key and PTY cwd.
  - Is the terminal truly workspace-owned? Answer: no. Current docs and backend route describe terminal as root-path scoped and independent from File Explorer/workspace materialization, but frontend default target is derived from active workspace metadata.
  - What validation/security constraints apply to using server home? Answer: remote-access authorization remains unchanged; backend should own `os.homedir()` resolution and directory validation.

## Request Context

User observed from screenshot that clicking/opening Terminal before selecting/running an agent/team shows a red error: `No workspace root path is selected for the terminal.` User asks why the terminal cannot be independent of active agent workspace and default to the server home folder like VS Code, to improve first-open UX.

Reference screenshot path: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_c17e514c/solution_designer_9113f0ea8306d480/context_files/ctx_1082c42a5335__image.png`.

Screenshot observation: The workspace center says “Select or run an agent/team to begin.” The right-side Terminal tab shows the red no-workspace-root banner while also writing `➜ Connected to Workspace Terminal`, which is misleading because no session is connected.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace/tickets/in-progress/default-terminal-home-workspace`
- Current Branch: `codex/default-terminal-home-workspace`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed on 2026-06-04.
- Task Branch: `codex/default-terminal-home-workspace`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's original shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` has an unrelated untracked `test.txt`; authoritative work is isolated in the task worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-04 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD && git branch --show-current` | Bootstrap repo and branch context | Root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current shared branch is `personal`; remote default is `origin/personal`; untracked `test.txt` exists in shared checkout. | No |
| 2026-06-04 | Command | `git fetch origin --prune && git worktree list --porcelain` | Refresh base and check existing worktrees | Remote refresh succeeded; no existing dedicated worktree for this task found. | No |
| 2026-06-04 | Command | `git worktree add -b codex/default-terminal-home-workspace /Users/normy/autobyteus_org/autobyteus-worktrees/default-terminal-home-workspace origin/personal` | Create dedicated task worktree/branch | Created branch `codex/default-terminal-home-workspace` at `origin/personal` commit `d86b027e`. | No |
| 2026-06-04 | Spec | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design reference | Design must identify spine, owner, boundaries, root-cause classification, and explicit no-legacy behavior. | No |
| 2026-06-04 | Spec | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/templates/{requirements-doc-template.md,investigation-notes-template.md,design-spec-template.md}` | Required artifact structures | Artifacts created under ticket folder and refined after investigation. | No |
| 2026-06-04 | Data | `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_c17e514c/solution_designer_9113f0ea8306d480/context_files/ctx_1082c42a5335__image.png` | Verify user-visible state | Empty workspace center plus Terminal red error banner confirms the issue occurs when no workspace/run context is active. | No |
| 2026-06-04 | Command | `rg -n "No workspace root path is selected|workspaceRootPath|terminal" autobyteus-web autobyteus-server-ts ...` | Locate terminal error and terminal root flow | Found localization key, `Terminal.vue`, `useTerminalSession.ts`, backend terminal WebSocket route, backend terminal docs/tests. | No |
| 2026-06-04 | Code | `autobyteus-web/components/workspace/tools/Terminal.vue` | Find frontend error source and target resolver | `effectiveTerminalTarget` is explicit prop or active workspace metadata. `connectTerminal()` refuses missing `rootPath` and sets red localized error. It writes `Connected to Workspace Terminal` during xterm initialization regardless of actual connection. | Yes: remove local missing-target guard for default mode and adjust welcome copy. |
| 2026-06-04 | Code | `autobyteus-web/composables/useTerminalSession.ts` | Inspect WebSocket URL construction and missing target behavior | `getTarget()` returns null without `target.rootPath`; `connect()` errors locally; `buildTerminalWebSocketUrl()` always sends `cwd=target.rootPath`. | Yes: add default/server-home mode that omits cwd/rootPath. |
| 2026-06-04 | Code | `autobyteus-web/utils/terminalTarget.ts`, `autobyteus-web/types/terminal/TerminalTarget.ts` | Inspect target shape | `TerminalTarget` means explicit root path plus optional display metadata. Creating fake `~` target would blur remote/server identity. | Yes: keep explicit target shape; represent default behavior in session options, not a fake target. |
| 2026-06-04 | Code | `autobyteus-web/stores/workspace.ts` (`activeWorkspaceMetadata` getter) | Understand how active workspace is selected | Active metadata is derived from selected agent, selected team/focused member, or run config stores. With no selection/config workspace, it returns null. | No |
| 2026-06-04 | Code | `autobyteus-web/components/layout/RightSideTabs.vue`, `autobyteus-web/composables/useRightSideTabs.ts` | Understand when Terminal mounts | Right tabs render `<Terminal />` when active tab is `terminal`; `useRightSideTabs` initializes active tab to `terminal`, so first workspace open may mount Terminal immediately. | Note intentional resource/UX tradeoff. |
| 2026-06-04 | Code | `autobyteus-server-ts/src/api/websocket/terminal.ts` | Inspect backend cwd resolver and route | `resolveTerminalCwd()` uses `query.cwd ?? query.rootPath ?? ""`, canonicalizes, stats directory, and rejects missing/invalid cwd before session creation. Route passes resolved cwd as target key and session cwd. | Yes: make omitted cwd/rootPath resolve to `os.homedir()`; keep explicit invalid cwd rejection. |
| 2026-06-04 | Code | `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts`, `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | Check session ownership and cleanup | Handler/manager only require a resolved cwd and target key; no workspace metadata needed. PTY lifecycle cleanup can remain unchanged. | No |
| 2026-06-04 | Doc | `autobyteus-web/docs/terminal.md`, `autobyteus-server-ts/docs/modules/terminal.md`, `autobyteus-web/docs/file_explorer.md` | Check existing terminal/file-explorer contract | Docs already say Terminal uses explicit cwd/root path and does not materialize workspace/file-explorer state. Need update for omitted-cwd default-home behavior. | Yes: docs sync in implementation/delivery. |
| 2026-06-04 | Code | `autobyteus-web/components/workspace/tools/__tests__/Terminal.spec.ts`, `autobyteus-web/composables/__tests__/useTerminalSession.spec.ts` | Identify frontend validation anchors | Existing tests cover active workspace target, explicit target, and no-root local error. Need update/add tests for default server-home mode while preserving disabled-default no-root behavior where useful. | Yes |
| 2026-06-04 | Code | `autobyteus-server-ts/tests/integration/terminal/terminal-websocket.integration.test.ts`, `autobyteus-server-ts/tests/e2e/terminal/terminal-websocket-lifecycle.e2e.test.ts`, `autobyteus-server-ts/vitest.config.ts` | Identify backend validation anchors | Server Vitest includes only `tests/**/*.test.ts`. Integration fake PTY tests can assert omitted cwd resolves to `os.homedir()`; invalid cwd e2e already protects explicit error behavior. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `RightSideTabs.vue` renders `Terminal.vue` when the right-side active tab is `terminal`.
- Current execution flow:
  1. `Terminal.vue` computes `effectiveTerminalTarget` from `props.target` or `terminalTargetFromWorkspaceMetadata(workspaceStore.activeWorkspaceMetadata)`.
  2. If no agent/team/run config is selected, `workspaceStore.activeWorkspaceMetadata` returns `null`, so `effectiveTerminalTarget` is `null`.
  3. `connectTerminal()` sees no `.rootPath`, sets `terminalTargetError` to the localized no-workspace-root string, and does not call `session.connect()`.
  4. Independently, `initializeTerminal()` writes `➜ Connected to Workspace Terminal`, even when no backend session is connected.
  5. If a WebSocket request were made without cwd/rootPath, backend `resolveTerminalCwd()` would reject it before PTY creation.
- Ownership or boundary observations:
  - The terminal backend owns actual cwd validation and PTY lifecycle.
  - The frontend currently owns a local missing-target rejection that is inappropriate for the empty-context desired behavior.
  - Workspace metadata is only one source for terminal cwd; it should not be the only source.
- Current behavior summary: Empty-context Terminal is error-first because both frontend session creation and backend route resolution assume a cwd must be supplied by active workspace state.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture evidence summary: A small refactor is needed so backend terminal route owns default cwd resolution and frontend terminal session can request “server default” without fake workspace state.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | Empty-context Terminal displays a red no-workspace-root error while center asks user to select/run an agent/team. | The current default behavior is visibly error-first instead of productive/default-first. | Implement default server-home target path. |
| `Terminal.vue` | Frontend refuses missing active workspace target before calling session. | Local UI guard bypasses backend authority for default cwd policy. | Remove/rework guard. |
| `useTerminalSession.ts` | Composable cannot represent default cwd request; it can only send explicit `cwd`. | Interface boundary too narrow; it conflates terminal connection with explicit workspace root. | Add default-cwd mode. |
| `terminal.ts` backend route | Missing cwd/rootPath currently resolves to empty string and is rejected. | Backend must own and validate omitted-cwd home fallback. | Add resolver branch. |
| Backend terminal docs | Terminal sessions are root-path scoped and independent of File Explorer watcher materialization. | Desired independent terminal does not require broader workspace subsystem changes. | Update docs. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | xterm UI, target selection from active workspace metadata/prop, connect/disconnect on target changes | Produces red local no-root banner and misleading workspace welcome text | Should delegate default cwd to session/backend and use generic copy |
| `autobyteus-web/composables/useTerminalSession.ts` | Terminal WebSocket lifecycle, URL construction, base64 input/output | Requires explicit `TerminalTarget.rootPath` and always sends `cwd` | Should support backend default cwd by omitting cwd/rootPath when configured |
| `autobyteus-web/types/terminal/TerminalTarget.ts` | Explicit terminal target shape | Root path is required, which is correct for explicit targets | Do not overload with fake server home; add session option instead |
| `autobyteus-web/utils/terminalTarget.ts` | Builds explicit terminal targets from workspace metadata | Returns null for missing metadata/root | Keep as explicit workspace-root target helper |
| `autobyteus-web/stores/workspace.ts` | Workspace metadata selection and workspace/file-explorer state | Active metadata is derived from selected agent/team/run config or null | Do not mutate for home fallback |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Terminal WebSocket route, remote auth, cwd/rootPath resolution, session attach/cleanup | Rejects omitted cwd/rootPath; validates explicit path | Own default server-home cwd resolution here |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | Connects resolved cwd to PTY session and read loop | No workspace dependency once cwd is resolved | No responsibility change needed |
| `autobyteus-server-ts/src/services/terminal-streaming/pty-session-manager.ts` | PTY session registry/lifecycle by session id and target key | Target key is cwd string; no workspace metadata needed | No responsibility change needed |
| `autobyteus-web/docs/terminal.md` | Frontend terminal docs | Describes explicit root-path target only | Update for server-home default |
| `autobyteus-server-ts/docs/modules/terminal.md` | Backend terminal docs | Explicitly says invalid or missing cwd closes without PTY | Update missing cwd behavior; keep invalid explicit cwd behavior |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-04 | Repro evidence | User-provided screenshot | Empty-context right-side Terminal shows `No workspace root path is selected for the terminal.` | Confirms user-visible failure; code trace identifies frontend guard source. |
| 2026-06-04 | Code trace | Read `Terminal.vue` -> `useTerminalSession.ts` -> backend `terminal.ts` | Both frontend and backend require explicit cwd today. | Both sides need coordinated behavior change. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is internal product behavior.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for current code investigation; implementation validation should use existing Vitest frontend/backend terminal tests.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

The current product already has a clean separation between Terminal and File Explorer after a root path is resolved: terminal route starts a PTY with a cwd and does not require workspace metadata. The bad UX is not caused by a deep PTY limitation. It is caused by a target-selection policy that equates “no active workspace metadata” with “terminal unavailable,” plus backend route behavior that has no default for omitted cwd. The right design is to add a first-class default cwd policy at the backend route and allow the frontend to request it explicitly by omitting cwd, not by creating a fake workspace or using a frontend-local home path.

## Constraints / Dependencies / Compatibility Facts

- Remote/browser clients cannot reliably know backend server home; frontend must not compute home locally.
- Existing explicit invalid cwd rejection is a good invariant and should remain.
- Existing PTY cleanup/startup abort behavior should remain unchanged.
- Existing terminal docs identify no file-explorer watcher dependency; implementation must preserve that.
- Server Vitest config only includes `tests/**/*.test.ts`; `.js` test twins are not active under current config.

## Open Unknowns / Risks

- Docker/all-in-one home may be `/root`; that appears acceptable per user wording but should be noted in docs or validation evidence if product owners expect a different managed workspace default.
- If `os.homedir()` is unavailable/non-directory in a future environment, backend should reject with the existing terminal unavailable close reason. No alternate fallback is designed in this scope.
- Because right-side terminal is the default active tab, this change can spawn a home PTY on first workspace page load when the panel is visible. Current behavior already mounts Terminal in that state, but the resource changes from xterm-only/error to a real PTY.

## Notes For Architect Reviewer

Review focus:
- Confirm backend `/ws/terminal` is the correct authoritative owner for omitted-cwd -> server-home resolution.
- Confirm frontend should request default cwd by omission/default mode rather than by fake `~`/home root strings.
- Confirm explicit invalid workspace cwd must not fall back to home.
- Confirm no workspace metadata/file-explorer materialization should be introduced for the home fallback.
