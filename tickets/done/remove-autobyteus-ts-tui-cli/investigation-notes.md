# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirements approved; producing design/spec and architecture handoff.
- Investigation Goal: Determine the exact unused TUI/CLI surface in `autobyteus-ts`, confirm dependency edges, and define a safe clean-cut removal scope.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Source deletion is concentrated, but cleanup spans package root exports, tests, examples, docs, package dependencies, and two lockfiles.
- Scope Summary: Remove unused `autobyteus-ts` CLI/TUI code while preserving supported library/runtime APIs and active workspace consumers.
- Primary Questions To Resolve: Which files are CLI/TUI-only? Which package scripts/bin/export/dependency entries exist solely for them? Do any runtime modules import them? Which tests/docs/build references must change?

## Request Context

User request on 2026-06-06: "in the autobyteus-ts, we have TUI and CLI code which are completely unused i want to remove them to simplify our codebase, please analyse"

Follow-up on 2026-06-06: user offered a screenshot by typing `codex` in the AutoByteus workspace terminal. Screenshot showed OpenAI Codex running in an AutoByteus browser/workspace terminal; this was not needed for repository cleanup analysis.

Approval/clarification on 2026-06-06: user confirmed terminal code should be kept because terminal code has nothing to do with the TUI and CLI. This confirms the scope boundary: delete obsolete `src/cli/**` UI surface while preserving `src/tools/terminal/**`, `node-pty`, and terminal runtime tooling.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/tickets/done/remove-autobyteus-ts-tui-cli`
- Current Branch: `codex/remove-autobyteus-ts-tui-cli`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-06; `origin/personal` resolved to `4a3bf83b`.
- Task Branch: `codex/remove-autobyteus-ts-tui-cli`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Authoritative task worktree is the dedicated worktree above, not `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-06 | Command | `pwd && ls -la && find . -maxdepth 2 -type d -name '.git' -print && git rev-parse --show-toplevel && git status --short --branch` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap workspace and repo mode | Current user checkout is the monorepo root on `personal`, tracking `origin/personal`. `autobyteus-ts` is a folder in this monorepo, not a nested git repo. | No |
| 2026-06-06 | Command | `cd autobyteus-ts && git rev-parse --show-toplevel && git status --short --branch && git remote -v` | Confirm whether `autobyteus-ts` is nested repo | Git root remains `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; remote is `git@github.com-ryan:AutoByteus/autobyteus-workspace.git`. | No |
| 2026-06-06 | Command | `git symbolic-ref --short refs/remotes/origin/HEAD; git rev-parse --abbrev-ref --symbolic-full-name @{u}; git branch --show-current; git rev-parse --short HEAD; git rev-parse --short origin/personal; git status --short --branch` | Resolve base branch | Remote default/upstream is `origin/personal`; current branch `personal` matched `origin/personal` at `4a3bf83b`; working tree was clean. | No |
| 2026-06-06 | Command | `git fetch origin --prune` | Refresh remote refs before task branch/worktree creation | Fetch succeeded; `origin/personal` resolved to `4a3bf83b`. | No |
| 2026-06-06 | Command | `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli -b codex/remove-autobyteus-ts-tui-cli origin/personal` | Create mandatory dedicated task worktree/branch | Dedicated worktree and branch created successfully; branch tracks `origin/personal`. | No |
| 2026-06-06 | Code | `autobyteus-ts/package.json` | Identify package entrypoints, scripts, dependencies | No `bin` entry. Root package exposes `dist/index.js`. Direct CLI/TUI deps: `ink`, `react`; dev dep: `@types/react`. Optional `node-pty` supports terminal tooling and should remain. | Yes: remove CLI/TUI deps and update lockfiles during implementation. |
| 2026-06-06 | Code | `autobyteus-ts/tsconfig.json`, `tsconfig.build.json`, `tsconfig.examples.json`, `vitest.config.ts` | Determine build/test inclusion | Build includes `src/**/*`; examples build includes `src/**/*` and `examples/**/*`; tests include `tests/**/*`. `tsconfig.json` has `jsx: react-jsx`, needed only for `src/cli/**` TSX files. | Yes: remove JSX config after TSX deletion; ensure examples compile or remove broken examples. |
| 2026-06-06 | Code | `autobyteus-ts/src/index.ts` | Check public root exports | Root package exports CLI/TUI through `export * from './cli/index.js';` and `export * from './cli/agent-team/widgets/index.js';`. | Yes: remove both exports. |
| 2026-06-06 | Code | `autobyteus-ts/src/cli/**` | Inventory CLI/TUI implementation | 13 files / 1,832 lines. Single-agent CLI in `src/cli/agent/*`; team Ink TUI in `src/cli/agent-team/*`; public CLI barrel in `src/cli/index.ts`. | Yes: delete full subtree. |
| 2026-06-06 | Code | `autobyteus-ts/tests/unit/cli/**` | Inventory CLI/TUI tests | 4 files / 401 lines only testing CLI/TUI display/store/renderables. | Yes: delete full subtree. |
| 2026-06-06 | Command | `rg -n --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!autobyteus-ts/tickets/**' --glob '!autobyteus-ts/docs/**' --glob '!autobyteus-ts/pnpm-lock.yaml' "(runAgentCli|runAgentTeamCli|InteractiveCliDisplay|TuiStateStore|buildHistoryLines|renderAssistantCompleteResponse|renderToolApprovalRequest|from ['\"][^'\"]*(src/cli|cli/agent|cli/index|agent-team/widgets)|src/cli/)" autobyteus-ts .` | Find active references outside docs/tickets/locks | Active references are root exports, CLI/TUI source internals, tests/unit/cli, and 12 examples. No active workspace app imports CLI/TUI APIs. | Yes: remove/update those references. |
| 2026-06-06 | Command | `rg -n --glob '!**/node_modules/**' --glob '!autobyteus-ts/src/cli/**' --glob '!autobyteus-ts/pnpm-lock.yaml' --glob '!autobyteus-ts/tickets/**' "from ['\"](ink|react|react/|react/jsx-runtime)|import\(['\"](ink|react|react/|react/jsx-runtime)['\"]\)" autobyteus-ts` | Check whether Ink/React are used outside CLI/TUI | No non-CLI/TUI source imports Ink or React. | No |
| 2026-06-06 | Command | `find autobyteus-ts/src autobyteus-ts/tests -type f \( -name '*.tsx' -o -name '*.jsx' \) ! -path 'autobyteus-ts/src/cli/*'` | Check JSX/TSX use outside CLI/TUI | No TSX/JSX files outside `src/cli/**`. | No |
| 2026-06-06 | Command | `rg -n --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!autobyteus-ts/**' --glob '!tickets/**' --glob '!**/tickets/**' --glob '!**/docs/**' "(autobyteus-ts/cli|autobyteus-ts/.*/cli|runAgentCli|runAgentTeamCli|InteractiveCliDisplay|TuiStateStore)" .` | Check other workspace packages for CLI/TUI imports | No active non-`autobyteus-ts` package references to the CLI/TUI APIs. | No |
| 2026-06-06 | Command | `rg -n '"(ink|react|@types/react)"' --glob 'package.json' .` | Check direct dependency declarations across workspace | Only `autobyteus-ts/package.json` directly declares `ink`, `react`, and `@types/react`. | Yes: remove package entries and update lockfiles. |
| 2026-06-06 | Code | `autobyteus-ts/examples/*.ts`, `autobyteus-ts/examples/agent-team/manual-notification/*.ts`, `autobyteus-ts/examples/shared/*.ts` | Classify example references | 12 example scripts import `runAgentCli` or `runAgentTeamCli`; `examples/discover-status-transitions.ts` does not. Shared `llm-helpers.ts` and `example-paths.ts` are used by CLI-dependent examples; `shared/logging.ts` is still used by `discover-status-transitions.ts`. | Yes: delete or rewrite CLI-dependent examples; keep or update non-CLI example. |
| 2026-06-06 | Doc | `autobyteus-ts/docs/nodejs_architecture.md` | Find active architecture docs for CLI/TUI | Section "CLI / TUI (Ink)" describes the exact source tree to remove. | Yes: update/remove section. |
| 2026-06-06 | Doc | `autobyteus-ts/examples/README.md`, `autobyteus-ts/examples/agent-team/README.md` | Find active example docs | Main examples README documents CLI/TUI exit commands and CLI-dependent runner scripts. Agent-team README is generic but points to agent-team examples. | Yes: update docs after example cleanup. |
| 2026-06-06 | Command | `rg -n --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/tickets/**' --glob '!**/pnpm-lock.yaml' "from ['\"]autobyteus-ts|import\(['\"]autobyteus-ts|require\(['\"]autobyteus-ts" .` | Identify active workspace consumers of `autobyteus-ts` | Server, gateway, scripts, and tests use root exports and deep non-CLI subpaths such as `llm`, `tools`, `external-channel`, `agent-team/utils`, `multimedia`. No CLI/TUI deep import found. | Yes: validate these still work after root export removal. |
| 2026-06-06 | Command | `python3` line-count/reference inventory script over `src/cli`, `tests/unit/cli`, and `examples` | Quantify removal surface | Confirmed 13 source files / 1,832 lines; 4 test files / 401 lines; 12 CLI-dependent examples. | No |
| 2026-06-06 | Trace | `screencapture -x /tmp/autobyteus-screens/current-screen.png` and `view_image` | User-requested screenshot inspection | Screenshot showed AutoByteus Browser workspace terminal with OpenAI Codex v0.137.0 running and some terminal mojibake. It did not change repository cleanup scope. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Public package root `autobyteus-ts/src/index.ts` re-exports CLI/TUI helpers.
  - Example scripts call `runAgentCli(agent, ...)` or `runAgentTeamCli(team)`.
  - No `package.json` `bin` executable exists.
- Current execution flow:
  - Single-agent CLI: example/manual caller -> `runAgentCli` -> `src/cli/agent/agent-cli.ts` -> `AgentEventStream` + `InteractiveCliDisplay` -> readline input and stdout rendering -> `Agent.postUserMessage(...)` / `postToolExecutionApproval(...)`.
  - Team TUI: example/manual caller -> `runAgentTeamCli` -> `src/cli/agent-team/app.tsx` Ink root -> `AgentTeamEventStream` -> `TuiStateStore` -> sidebar/focus/status widgets -> `AgentTeam.postMessage(...)` / `postToolExecutionApproval(...)`.
  - Package build: `tsc -p tsconfig.build.json` includes `src/cli/**`, then `verify-runtime-dependencies.mjs` requires `ink`/`react` to be present because built JS imports them.
- Ownership or boundary observations:
  - CLI/TUI code is a presentation/control layer sitting above agent/team runtimes. It does not own core agent/team runtime invariants.
  - Root package exports make the interactive UI surface part of the public API even though current workspace product surfaces use programmatic runtime/server/web paths.
  - `node-pty` and terminal tools are separate runtime tool capabilities and should not be removed with UI code.
- Current behavior summary:
  - The obsolete CLI/TUI surface is still built, exported, tested, documented, and kept alive through dependencies/examples despite no active workspace consumer.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure
- Refactor posture evidence summary: The task is a clean-cut removal of obsolete exported UI helpers, not a local implementation defect. Keeping wrappers/stubs would preserve legacy pressure and retain the public shape the user wants removed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | TUI and CLI code is reported completely unused. | Product direction favors clean removal over deprecation/compatibility. | Scope approval. |
| `src/index.ts` | Root exports CLI/TUI APIs. | Public API includes obsolete UI helpers; remove root exports. | Yes |
| `src/cli/**` | 13 files implement CLI/TUI-only presentation/control. | Dedicated obsolete subtree; remove as one unit. | Yes |
| `tests/unit/cli/**` | Tests only cover deleted UI code. | Tests become obsolete with removal. | Yes |
| Reference scans | No active non-example workspace imports of CLI/TUI APIs. | Removal should not affect current server/gateway/app consumers if root non-CLI exports stay intact. | Validate |
| `package.json` and lockfiles | `ink`, `react`, `@types/react` exist only for CLI/TUI. | Dependency graph can be simplified after source deletion. | Yes |
| Examples | 12 examples depend on CLI/TUI helpers. | Leaving them creates broken builds/docs; remove or rewrite. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/cli/agent/agent-cli.ts` | Single-agent interactive loop with readline, stream observation, user messages, approvals, shutdown | CLI-only; imports agent runtime and display | Delete; runtime remains programmatic. |
| `autobyteus-ts/src/cli/agent/cli-display.ts` | Stateful stdout renderer for stream events and approval prompts | CLI-only; tested by CLI tests | Delete with tests. |
| `autobyteus-ts/src/cli/agent-team/app.tsx` | Ink TUI composition root for team console | TUI-only; imports `ink`/`react` | Delete; enables dep removal. |
| `autobyteus-ts/src/cli/agent-team/state-store.ts` | TUI state store for team/agent status/history/approvals | TUI-only despite using runtime event types | Delete; runtime event ownership remains elsewhere. |
| `autobyteus-ts/src/cli/agent-team/widgets/**` | Ink widgets/render helpers/logo/status/focus/sidebar | TUI-only; exported from root via widgets index | Delete; remove root widget export. |
| `autobyteus-ts/src/cli/index.ts` | Barrel for CLI/TUI public helpers | Only exposes removed APIs | Delete. |
| `autobyteus-ts/src/index.ts` | Root package public facade | Re-exports CLI/TUI | Modify to remove CLI/TUI exports only. |
| `autobyteus-ts/tests/unit/cli/**` | Unit tests for CLI/TUI state/rendering | Obsolete after source deletion | Delete. |
| `autobyteus-ts/examples/run-*.ts` and `examples/agent-team/manual-notification/*.ts` | Manual interactive example runners | 12 scripts import `runAgentCli`/`runAgentTeamCli` | Delete or rewrite; recommendation is delete for clean simplification. |
| `autobyteus-ts/examples/discover-status-transitions.ts` | Non-interactive status derivation table | Does not import CLI/TUI | Keep. |
| `autobyteus-ts/examples/shared/logging.ts` | Example logging helper | Used by status transition example | Keep if example remains. |
| `autobyteus-ts/examples/shared/example-paths.ts`, `llm-helpers.ts` | Helpers for deleted interactive examples | No non-CLI example need found | Candidate delete if interactive examples are removed. |
| `autobyteus-ts/examples/prompts/**`, `examples/skills/**` | Assets for deleted interactive examples | Only tied to interactive examples | Candidate delete if examples are removed. |
| `autobyteus-ts/package.json` | Package metadata/dependency graph | Direct CLI/TUI deps exist; no `bin` entry | Remove `ink`, `react`, `@types/react`; keep `node-pty`. |
| `pnpm-lock.yaml`, `autobyteus-ts/pnpm-lock.yaml` | Workspace and package lockfiles | Record CLI/TUI dependency graph | Update consistently. |
| `autobyteus-ts/tsconfig.json` | TS compiler config | `jsx: react-jsx` only needed by deleted TSX files | Remove JSX option. |
| `autobyteus-ts/docs/nodejs_architecture.md` | Active architecture doc | Describes CLI/TUI (Ink) section | Update/remove section. |
| `autobyteus-ts/examples/README.md` | Active example doc | Documents single-agent CLI/team TUI and deleted examples | Update. |
| `autobyteus-ts/src/tools/terminal/**`, `types/node-pty`, `scripts/fix-node-pty-permissions.mjs` | Terminal tool runtime and PTY installation support | Not UI CLI/TUI code | Explicitly preserve. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-06 | Probe | `screencapture -x /tmp/autobyteus-screens/current-screen.png` then visual inspection | AutoByteus browser terminal contained OpenAI Codex v0.137.0; not part of `autobyteus-ts` cleanup evidence. | No design impact. |
| 2026-06-06 | Probe | Static `rg` scans listed above | CLI/TUI references are confined to source subtree, root exports, tests, examples, and docs. | Supports clean-cut removal. |

## External / Public Source Findings

Not used. This is an internal repository cleanup; no internet lookup was needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for analysis.
- Required config, feature flags, env vars, or accounts: None for analysis.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`; static repository scans.
- Cleanup notes for temporary investigation-only setup: Screenshot saved at `/tmp/autobyteus-screens/current-screen.png`; not part of durable artifacts.

## Findings From Code / Docs / Data / Logs

- The removal boundary is clear: `src/cli/**` plus consumers/metadata around that subtree.
- There is no active non-example workspace use of the CLI/TUI API.
- The package root currently exports the obsolete surface, making root import checks and runtime dependency verification include CLI/TUI code.
- Examples are the only active code consumers outside `src/cli`; they should not be preserved through compatibility wrappers.
- Dependency cleanup must distinguish CLI/TUI UI deps (`ink`, `react`, `@types/react`) from terminal runtime deps (`node-pty`).

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility wrappers should be designed for the removed CLI/TUI surface unless the user reverses scope.
- The root package still needs to support existing non-CLI top-level imports used by server/runtime code.
- Deep wildcard exports mean deleted CLI build artifacts become unavailable naturally; no explicit export-map denial is required unless implementation chooses to tighten exports more broadly, which is out of scope.
- Lockfiles should be updated with minimal package-manager churn.

## Open Unknowns / Risks

- External consumers outside this monorepo may still depend on CLI/TUI exports; removal is intentionally breaking.
- Implementation validation may require dependency installation in the dedicated worktree because `node_modules` is absent there.
- If maintainers want to keep interactive examples for demos, a new supported non-CLI design would be needed; not part of this cleanup.

## Notes For Architect Reviewer

Requirements are approved. Target design should be removal-first: delete the obsolete UI subtree, remove exports/deps/tests/examples/docs, preserve non-CLI runtime surfaces and terminal tooling, and reject compatibility stubs.
