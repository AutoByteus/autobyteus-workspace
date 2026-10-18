# Implementation Handoff

Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project`, branch `codex/remove-create-or-update-project`, base `origin/personal` @ `2f211340ee`. Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/`. Commit: see the routing message.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Small/High); `ARCH-REV-001` Pass, no findings, R-1..R-3 non-blocking.
- Requirements doc: `requirements-doc.md` (`Approved`, SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-002, `Ready`)
- Supplemental task artifacts: `tickets/done/project-tool-split/` (read-only)
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial)

## Current Implementation Summary

`create_or_update_project` no longer exists: it is gone from the contract's name set and type, descriptions and schemas, from the native registration and therefore from the MCP manifest and first-party protection (both derive from `PROJECT_TASK_TOOL_NAMES`). The transition dispatcher `effectiveProjectTaskToolName` and its type became dead and are removed; `parseProjectTaskToolInput` and `executeProjectTaskTool` dispatch on `name` again. `create_project`, `update_project` and the other four tools are byte-identical to base. A definition that still lists the old name is handled by the existing unknown-name skip (no code for it).

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` §Task Size And Architectural Risk; `design-review-report.md` §Routing Classification Review.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: production change is deletion only inside the three `src/agent-tools/project-tasks/*` files (+17/−46); it removes a public tool contract on two transports and its protected name → High. Escalation trigger did not fire: `git grep` finds no consumer of the old name or the helper outside these files.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High risk goes through Code Reviewer)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | old tool gone from native, MCP, picker, protection; new tools unchanged | contract name set/type/descriptions/schemas; native registration; manifest derives from the set | Exact-set unit test (contract, MCP adapters, native registry = six names); throwaway byte comparison of all six tools' schemas/descriptions against base: identical |
| BEH-002 | old name skipped at launch, other tools given, no error | unchanged: `buildRuntimeAgentToolExposure` (`isProjectTaskToolName` drops it), AutoByteus resolver warns "not found in registry. Skipping.", MCP filter | Unit skip tests: runtime parity (AutoByteus/Codex/Claude, both contexts) and resolver |
| BEH-003 | docs no longer mention it; release note announces removal | three docs (whole passages); ticket `release-notes.md`; web probe list | `git grep create_or_update_project -- ':!tickets'` → only skip tests, migration fixture (DEC-002), `.github` notes (DEC-004) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Production (`autobyteus-server-ts/src/agent-tools/project-tasks/`): `project-task-tool-contract.ts`, `project-task-tool-manifest.ts`, `project-task-native-tools.ts`.

Tests:
- `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` — old-tool tests removed; exact-set test added; malformed-input table now runs on the tool the args belong to.
- `tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts` — transition cases replaced by the skip test; the mutation-tool filter is `/_project$/` so a returning old tool would still show up.
- `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` — skip test (warning names it, other tools kept, no error).
- `tests/e2e/projects/project-task-boundaries.e2e.test.ts` — old-tool calls, error parity and collision case removed.

Docs: server `docs/modules/projects.md`, `docs/modules/agent_tools_mcp_server.md`, web `docs/projects.md`. Probe: `autobyteus-web/tests/e2e/team-status-live-probe.mjs:141`. Ticket: `release-notes.md`, `evidence/new-build-probe.txt`.

## Important Assumptions

- R-1: old-name references in tests are only in the skip tests (runtime parity, resolver) and the exact-set test's `isProjectTaskToolName(...)` check, which the design names; absence is proven by exact-set equality.
- R-2: the probe's manager now lists `create_project`, `update_project`, `create_task`, `update_task` (design choice; the probe never calls them).

## Known Risks

- Accepted design risk: a definition relying only on the old tool can't change Projects until it selects the new tools (release note).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup` (planned removal)
- Reviewed root-cause classification: `Legacy Or Compatibility Pressure`
- Reviewed refactor decision: `Refactor Needed Now` (clean-cut removal)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: every tool runs under its own name; no alias, rewrite or fallback added.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (`effectiveProjectTaskToolName`, `EffectiveProjectTaskToolName`)
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (contract 206, manifest 110, native 54 effective lines)
- Notes: `projectInput` and `workspacesDefinition` kept (both project parsers/schemas use them).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: §Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: definitions are not rewritten; the old name is skipped at launch (skip tests).
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-server-ts build`. `pnpm install` leaves untracked SDK `dist/` folders (build output, not staged).

## Local Implementation Checks Run

Commands from the repository root, per `TESTING.md` and `autobyteus-server-ts/AGENTS.md`. Local implementation checks only, not API/E2E sign-off.

| Check | Command | Result |
| --- | --- | --- |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | Pass |
| Server unit suite (full) | `pnpm -C autobyteus-server-ts test:unit` | Pass: 720 files / 5841 tests passed; 4 files / 7 tests skipped (pre-existing gates) |
| Changed unit files | `vitest run` on `project-task-tools.test.ts`, `project-tool-runtime-parity.test.ts`, `autobyteus-agent-tool-resolver.test.ts` | Pass: 96, 9, 8 tests |
| Remaining tools byte-identical (AC-003; throwaway, deleted) | vitest comparing `JSON.stringify` schemas and descriptions of all six tools against `origin/personal`'s contract | Identical; name set equals base minus the old name |
| Server build | `pnpm -C autobyteus-server-ts build` | Pass |
| Narrow server E2E (clean env: `env -i PATH HOME=<temp> TMPDIR`) | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts tests/e2e/projects/project-mutation-node-locality.e2e.test.ts --no-watch` | Pass: 14 tests |
| Tool resolution of the new build (read-only, throwaway HOME) | `node tickets/done/project-tool-split/evidence/ac-005-tool-resolution-probe.mjs <worktree>/autobyteus-server-ts` → `evidence/new-build-probe.txt` | Native and MCP serve only `create_project`, `update_project`; a list with the old name skips it with the "not found in registry. Skipping." warning, 0 errors, and keeps the new tools |
| Web probe syntax | `node --check autobyteus-web/tests/e2e/team-status-live-probe.mjs` | Pass |
| REQ-004 reference check | `git grep create_or_update_project -- ':!tickets'` | Only the skip/exact-set tests, the migration fixture (DEC-002) and `.github/release-notes/release-notes.md` (DEC-004) |

Not run (owned downstream): the web probe run, gated runtime suites, the AC-006 isolated real-app check.

Discrepancy: none.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — no rendered frontend change; the picker lists registered tools and simply no longer shows the old one. The web probe change is a configured tool list.

## Downstream Coverage Hints / Suggested Scenarios

- AC-006: isolated instance of the worktree build (`pnpm --silent isolated-app start --build`) with a test data package: one agent listing `create_or_update_project` plus another tool (launches, has the other tool, no old tool), one agent listing `create_project`/`update_project` (creates and updates a Project). The scripted AGY runtime (`tests/fixtures/agy-failure-cli.mjs`, `CALL_TOOL:{…}`) avoids provider calls. Picker names (AC-001) can be checked in the agent definition form.
- `team-status-live-probe` with the changed manager list.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-006 real-app check with evidence.
- The web probe `team-status-live-probe` and any gated runtime suites the validation owner selects.
