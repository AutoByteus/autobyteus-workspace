# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Remove the unused native CLI/TUI surface from `autobyteus-ts` so the package remains a programmatic TypeScript runtime/library package without carrying interactive console UI code, React/Ink dependencies, CLI-only tests, or CLI/TUI examples/docs.

## Investigation Findings

- `autobyteus-ts` is a package folder inside the workspace monorepo, not a nested git repository. Work is isolated in branch `codex/remove-autobyteus-ts-tui-cli` under `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli`.
- The CLI/TUI source is concentrated under `autobyteus-ts/src/cli/**`: 13 files / 1,832 lines.
  - Single-agent CLI: `src/cli/agent/agent-cli.ts`, `src/cli/agent/cli-display.ts`.
  - Agent-team Ink TUI: `src/cli/agent-team/app.tsx`, `state-store.ts`, `widgets/**`.
  - Public CLI re-export: `src/cli/index.ts`.
- The package root currently exports this surface through `autobyteus-ts/src/index.ts`:
  - `export * from './cli/index.js';`
  - `export * from './cli/agent-team/widgets/index.js';`
- CLI/TUI-only tests are concentrated under `autobyteus-ts/tests/unit/cli/**`: 4 files / 401 lines.
- All package-local references outside CLI/TUI source are examples, docs, tests, or root exports. No active workspace application code imports `autobyteus-ts/cli`, `runAgentCli`, `runAgentTeamCli`, `InteractiveCliDisplay`, or `TuiStateStore` outside `autobyteus-ts` examples/tests/docs.
- 12 example scripts import `runAgentCli` or `runAgentTeamCli`; keeping them after source removal would break `tsconfig.examples.json` builds. `examples/discover-status-transitions.ts` is not CLI/TUI-dependent.
- `ink`, `react`, and `@types/react` appear as direct dependencies only in `autobyteus-ts/package.json`; no non-CLI/TUI `src` files import `ink` or `react`, and no `src`/`tests` `.tsx` files exist outside `src/cli/**`.
- Both the workspace root `pnpm-lock.yaml` and `autobyteus-ts/pnpm-lock.yaml` include the CLI/TUI dependency graph and must be updated if dependency entries are removed.
- Current durable docs mentioning this surface include `autobyteus-ts/docs/nodejs_architecture.md` and `autobyteus-ts/examples/README.md`; other historical ticket/progress docs mention past CLI work and should not drive the active target shape.
- The package manifest has no `bin` entry; the removed surface is a library-exported interactive helper/API, not a published executable command.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The package root exports unused CLI/TUI helpers, the source carries an Ink/React TUI subtree, tests only exercise the unused UI renderer/state, examples depend on the unused helpers, and CLI/TUI dependencies are only present to satisfy that obsolete surface.
- Requirement or scope impact: The target should be a clean-cut removal. No compatibility re-export, placeholder CLI module, or wrapper should remain for `runAgentCli`, `runAgentTeamCli`, `InteractiveCliDisplay`, `TuiStateStore`, or `autobyteus-ts/cli/**`.

## Recommendations

1. Remove the complete `autobyteus-ts/src/cli/**` subtree and delete the two root `src/index.ts` exports that expose it.
2. Remove CLI/TUI unit tests under `autobyteus-ts/tests/unit/cli/**`.
3. Remove or rewrite CLI/TUI-dependent examples. For minimal cleanup, delete the 12 interactive runner scripts and update `examples/README.md` to only describe still-supported non-interactive examples such as `discover-status-transitions.ts`. Do not add a new interactive replacement in this change.
4. Remove `ink`, `react`, and `@types/react` from `autobyteus-ts/package.json`; regenerate/update both lockfiles that record the `autobyteus-ts` dependency graph.
5. Remove `jsx` from `autobyteus-ts/tsconfig.json` after all TSX files are gone.
6. Update current docs to state the native CLI/TUI surface has been removed and runtime interaction should happen through the programmatic agent/team APIs or server/web surfaces.
7. Validate with at least `pnpm -C autobyteus-ts build`, relevant `autobyteus-ts` unit tests excluding the deleted CLI suite, and a workspace-level type/build check or targeted downstream import check for `autobyteus-server-ts` and `autobyteus-message-gateway` consumers of `autobyteus-ts`.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: As a package maintainer, remove the obsolete single-agent CLI helper API from `autobyteus-ts`.
- UC-002: As a package maintainer, remove the obsolete agent-team Ink TUI implementation from `autobyteus-ts`.
- UC-003: As a workspace developer, keep non-CLI/TUI programmatic imports from `autobyteus-ts` working for server, gateway, tests, and runtime code.
- UC-004: As a package maintainer, remove dependencies and build configuration that exist only for CLI/TUI rendering.
- UC-005: As a repository reader, avoid stale examples/docs that advertise removed CLI/TUI capabilities.

## Out of Scope

- Creating a replacement CLI, terminal UI, or interactive console runner.
- Preserving backward-compatible imports for `autobyteus-ts/cli/**`, `runAgentCli`, `runAgentTeamCli`, `InteractiveCliDisplay`, `TuiStateStore`, or team widget renderables.
- Changing core agent/team runtime, streaming event semantics, event payload shapes, LLM providers, tools, memory, multimedia, external-channel, or server/web UI behavior except where needed to remove CLI/TUI references.
- Reworking historical ticket archives or old progress logs solely because they mention past CLI/TUI work.
- Removing terminal tools or `node-pty`; those serve runtime terminal tooling and are not CLI/TUI UI code.

## Functional Requirements

- R-001: Remove all source files under `autobyteus-ts/src/cli/**`, including single-agent CLI code, agent-team TUI state/store/widgets, and `src/cli/index.ts`.
- R-002: Remove all public root exports from `autobyteus-ts/src/index.ts` that expose CLI/TUI modules.
- R-003: Remove CLI/TUI-only tests under `autobyteus-ts/tests/unit/cli/**` and ensure remaining tests do not import deleted modules.
- R-004: Remove or update all active examples that import `runAgentCli`, `runAgentTeamCli`, or `src/cli/**`; remaining examples must compile under `tsconfig.examples.json` or be intentionally excluded/removed.
- R-005: Remove direct CLI/TUI-only dependencies (`ink`, `react`) and dev dependencies (`@types/react`) from `autobyteus-ts/package.json`; update root and package-local lockfiles consistently.
- R-006: Remove TypeScript JSX configuration from `autobyteus-ts/tsconfig.json` if no TSX/JSX sources remain in `autobyteus-ts`.
- R-007: Preserve all non-CLI/TUI `autobyteus-ts` programmatic exports and deep subpath imports currently used by `autobyteus-server-ts`, `autobyteus-message-gateway`, package tests, and workspace scripts.
- R-008: Update active documentation/readme content that describes the removed CLI/TUI surface so it no longer advertises unsupported commands or architecture.
- R-009: Do not add compatibility shims, stub modules, fallback exports, or deprecation wrappers for the removed CLI/TUI paths.
- R-010: Keep terminal runtime/tooling code outside `src/cli/**` intact, including `src/tools/terminal/**`, `node-pty` optional dependency, and `scripts/fix-node-pty-permissions.mjs`.

## Acceptance Criteria

- AC-001: `autobyteus-ts/src/cli` no longer exists, and `rg -n "runAgentCli|runAgentTeamCli|InteractiveCliDisplay|TuiStateStore|from ['\"].*src/cli|from ['\"].*cli/index" autobyteus-ts/src autobyteus-ts/tests autobyteus-ts/examples` returns no active source/test/example references.
- AC-002: `autobyteus-ts/src/index.ts` contains no CLI/TUI exports and continues to export existing non-CLI/TUI package surfaces.
- AC-003: `autobyteus-ts/package.json` contains no direct `ink`, `react`, or `@types/react` entries, while preserving non-CLI runtime dependencies and the `node-pty` optional dependency.
- AC-004: The workspace root `pnpm-lock.yaml` and `autobyteus-ts/pnpm-lock.yaml` no longer list `ink` as an `autobyteus-ts` direct dependency; any remaining React-related transitive entries must be attributable to non-`autobyteus-ts` workspace packages or lockfile transitive needs.
- AC-005: `find autobyteus-ts/src autobyteus-ts/tests -name '*.tsx' -o -name '*.jsx'` returns no active files, and `autobyteus-ts/tsconfig.json` no longer configures JSX solely for deleted files.
- AC-006: `autobyteus-ts/tests/unit/cli` no longer exists, and the remaining targeted `autobyteus-ts` unit tests selected by implementation/validation pass.
- AC-007: `pnpm -C autobyteus-ts build` passes, including `scripts/verify-runtime-dependencies.mjs`.
- AC-008: A targeted downstream import/build check confirms active workspace consumers do not rely on removed CLI/TUI exports. At minimum, check references in `autobyteus-server-ts`, `autobyteus-message-gateway`, and `scripts/verify-android-profile.sh` remain non-CLI/TUI.
- AC-009: Active docs/examples no longer instruct users to exit a single-agent CLI, press `q` in a team TUI, or run deleted CLI/TUI examples.
- AC-010: No compatibility wrapper or stub module remains at `autobyteus-ts/src/cli/**`, and no package export maps a removed CLI/TUI path to a replacement.

## Constraints / Dependencies

- Work must happen in the dedicated task worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli` on branch `codex/remove-autobyteus-ts-tui-cli`.
- Base branch is `origin/personal`; expected finalization target is `personal`.
- `autobyteus-ts` is part of a monorepo workspace; update both the root workspace lockfile and package-local lockfile when dependency graph changes.
- `autobyteus-ts` uses ESM `.js` import specifiers and TypeScript `NodeNext`; removal must leave remaining import specifiers valid.
- The package currently has permissive subpath exports (`./*`, nested wildcards). Deleting built CLI files is sufficient to make removed deep imports fail; no compatibility mapping should be added.

## Assumptions

- The user's statement that CLI/TUI code is completely unused is accepted as product direction; investigation confirms no active workspace application imports those APIs.
- A clean breaking removal of CLI/TUI library exports is acceptable.
- Non-interactive status/discovery examples may remain if they do not depend on CLI/TUI code.
- Documentation sync should prioritize active docs/readmes; historical ticket archives can remain as historical records unless an active build/test references them.

## Risks / Open Questions

- External consumers outside this monorepo could still import `runAgentCli`, `runAgentTeamCli`, or `autobyteus-ts/cli/**`; this change intentionally breaks those imports.
- If maintainers still value interactive examples, they need a separate future design for a supported programmatic example runner or server/web workflow. That is out of scope here.
- Lockfile regeneration may change unrelated transitive versions if not constrained; implementation should use package-manager commands that minimally update lockfiles.
- Current worktree does not have installed `node_modules`; implementation/validation agents may need to install dependencies before running build/tests.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| R-001 | UC-001, UC-002 |
| R-002 | UC-001, UC-002, UC-003 |
| R-003 | UC-001, UC-002 |
| R-004 | UC-005 |
| R-005 | UC-004 |
| R-006 | UC-004 |
| R-007 | UC-003 |
| R-008 | UC-005 |
| R-009 | UC-001, UC-002 |
| R-010 | UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves the obsolete source and active source/test/example references are gone. |
| AC-002 | Proves the public root surface no longer exposes CLI/TUI while preserving programmatic exports. |
| AC-003 | Proves direct CLI/TUI dependencies are removed without damaging terminal runtime dependencies. |
| AC-004 | Proves lockfiles match the dependency cleanup. |
| AC-005 | Proves JSX/TSX build support is no longer carried solely for deleted UI code. |
| AC-006 | Proves obsolete tests are deleted and remaining tests are not broken by dangling imports. |
| AC-007 | Proves the package still builds and packaged runtime dependencies remain consistent. |
| AC-008 | Proves active workspace consumers stay on supported non-CLI/TUI APIs. |
| AC-009 | Proves current docs/examples no longer advertise removed behavior. |
| AC-010 | Proves the removal is clean-cut, not a compatibility-retention design. |

## Approval Status

Approved by user on 2026-06-06. Clarification recorded: terminal runtime/tooling code is unrelated to the TUI/CLI removal and must be preserved.
