# Implementation Handoff

Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split`, branch `codex/project-tool-split`, base `origin/personal` @ `8a970f214c`. Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/`. Commit: see the routing message.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium/High); `ARCH-REV-001` Pass, no findings, R-1..R-4 non-blocking.
- Requirements doc: `requirements-doc.md` (`Approved`, SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-002, `Ready`)
- Supplemental task artifacts: precedent `tickets/done/task-tool-split/` on `origin/personal` (read-only)
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial)

## Current Implementation Summary

`create_project` and `update_project` are new Project/Task tools on both transports (native AutoByteus classes and Agent Tools MCP adapters), each with its own description, schema and parser. The two parsers share private validators (`projectInput`, `addProjectFields`, `projectNameRequired`) that keep today's validation order and messages. `parseProjectMutation` is gone. `create_or_update_project` stays registered with a byte-identical name, description and schema; `effectiveProjectTaskToolName` (contract) maps it once to `update_project` when `project_id` is present, otherwise to `create_project`, and both parsing and execution then run under that effective name — one validation path and one service path. Execution calls the same `ProjectService.createProjectRecord` / `patchProjectRecord` with today's `{project}` result and `{error}` / `PROJECT_OPERATION_UNCONFIRMED` projection. Exposure, the AutoByteus resolver and the MCP catalog are unchanged; the new names become protected first-party names by joining the manifest.

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

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` §Task Size And Architectural Risk; confirmed in `design-review-report.md` §Routing Classification Review.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: production change is confined to the three `src/agent-tools/project-tasks/*` files (+102/−39 lines); no service, exposure, persistence or UI change. Two new public tool contracts on two transports, two newly protected first-party names and a cross-version transition contract remain → High. Escalation triggers did not fire: no consumer outside the contract/manifest uses the old parser (git grep), and the release skips unknown names (AC-005 probe).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High route goes through Code Reviewer)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | `create_project` creates from `{name, description?, workspaces?}`; `project_id` rejected as unsupported; today's results/errors | native `CreateProjectTool` / MCP manifest entry → `parseProjectTaskToolInput` → `parseCreateProjectInput` → `executeProjectTaskTool` (`tool === "create_project"`) → `ProjectService.createProjectRecord` → `{project}` | Implemented. Unit: results, errors pinned by code+message, native/MCP parity, unconfirmed write |
| BEH-002 | `update_project` patches from `{project_id, name?, description?, workspaces?}`; at least one change; missing `project_id` invalid | `UpdateProjectTool` / MCP → `parseUpdateProjectInput` → `executeProjectTaskTool` (`tool === "update_project"`) → `patchProjectRecord` → `{project}` | Implemented. Unit + boundaries E2E: replacement, `[]`, retained descriptions, unknown ID, service errors |
| BEH-003 | No automatic exposure; new names selectable; protected against configured MCP collision | unchanged `runtime-agent-tool-exposure.ts` (`isProjectTaskToolName` via `PROJECT_TASK_TOOL_NAMES`); `protect_static_adapter` via manifest | Unit `project-tool-runtime-parity.test.ts` (AutoByteus, Codex, Claude), collision test per name (unit + E2E) |
| BEH-004 | Old tool unchanged (name, description, schema, results, errors); unknown names skipped; transition list works in both versions | `effectiveProjectTaskToolName` → new parsers/execution; `CreateOrUpdateProjectTool` kept | Description/schema byte-identical (pinned literals); both modes' results and every error equal to the effective tool's; AC-005 probe of release and new build in `evidence/` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Production (`autobyteus-server-ts/src/agent-tools/project-tasks/`):
- `project-task-tool-contract.ts` — names, descriptions, schemas (`workspacesDefinition`), `parseCreateProjectInput`, `parseUpdateProjectInput`, `effectiveProjectTaskToolName`, `EffectiveProjectTaskToolName`; `parseProjectMutation` removed; `rejectUnsupported` moved up to be shared.
- `project-task-tool-manifest.ts` — `executeProjectTaskTool` runs under the effective name.
- `project-task-native-tools.ts` — `CreateProjectTool`, `UpdateProjectTool`; registration.

Tests / fixtures / probes:
- `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` (restructured Project sections)
- `tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts` (new, R-3)
- `tests/e2e/projects/project-task-boundaries.e2e.test.ts` (new names; old-name calls per mode; old-tool error parity; collision for new names)
- `tests/e2e/projects/{project-mutation-node-locality,project-change-feed,project-task-context-files-delegation,task-closure-root-visibility,task-existing-copy-assignment,task-reactivation-root-visibility}.e2e.test.ts`
- `tests/fixtures/{codex-native-multi-agent-system,project-mutation-http-node}.mjs`
- `autobyteus-web/tests/e2e/{project-manager-ux-probe,task-closure-tree-probe}.mjs`

Docs: `autobyteus-server-ts/docs/modules/projects.md` (section "Project And Task Agent Tools", anchor `#project-and-task-agent-tools`; links updated), `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-web/docs/projects.md`.

Ticket: `release-notes.md`; `evidence/ac-005-tool-resolution-probe.mjs`, `evidence/release-v1.5.5-beta.1-installed-probe.txt`, `evidence/new-build-probe.txt`.

## Important Assumptions

- The installed app (1.5.5-beta.1) is a valid stand-in for v1.5.5-beta.2 release code in the AC-005 probe: `git diff v1.5.5-beta.1 v1.5.5-beta.2` and `v1.5.5-beta.2..HEAD` are empty on the project-tasks, exposure, AutoByteus resolver, Claude tooling options and agent-tools/mcp paths. The probe imported that build's modules read-only in a separate process with a throwaway `HOME`; no app data or running instance was touched.
- `MANAGER_TOOLS` / `PROJECT_TOOLS` lists in E2E and probes list only the new names (design: agents use the new tools); REQ-004 is proven by the old-name calls in unit and `project-task-boundaries`.

## Known Risks

- Recorded design risks stand: configured third-party MCP tools named `create_project`/`update_project` are shadowed (release note); agents listing all three see two ways to do the same thing until FU-1.
- `update_project` descriptions/schema texts other than the design's description examples (parameter texts) are implementation wording; reviewed against AC-007 (one meaning, no other tool named).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change` (tool contract)
- Reviewed root-cause classification: `Boundary Or Ownership Issue` (one interface, two operations)
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: interface split into two parsers; the old interface is a thin dispatcher (one mapping function), no second validation or service path.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `create_or_update_project` retained by approved requirement REQ-004 / DEC-002 (not designer- or implementer-introduced); implemented as the design's thin dispatcher; removal FU-2.
- Legacy old-behavior retained in scope: only that approved retention.
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (`parseProjectMutation`, the `project_id`-presence branch in the manifest)
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes` (`EffectiveProjectTaskToolName` is a narrowing of the existing union, not a new parallel shape)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (contract 208, manifest 98, native 60 effective lines; largest delta +79/−31)
- Notes: R-4 (doc comment in `runtime-agent-tool-exposure.ts`) not applied; the file is outside the Change Scope and the comment is non-normative.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: §Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A; same service calls write Project data; agent configurations are not rewritten.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-server-ts build` (for the node-locality E2E and the new-build probe).

## Local Implementation Checks Run

Commands from the repository root, per `TESTING.md` and `autobyteus-server-ts/AGENTS.md`. These are local implementation checks, not API/E2E sign-off.

| Check | Command | Result |
| --- | --- | --- |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | Pass |
| Server unit suite (full) | `pnpm -C autobyteus-server-ts test:unit` | Pass: 709 files / 5744 tests passed, 4 files / 7 tests skipped (pre-existing gates) |
| Changed unit files | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/project-tasks/project-task-tools.test.ts tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts --no-watch` | Pass: 98 + 9 tests |
| Mutation check of R-2 pinning (throwaway, reverted) | swapped `rejectUnsupported`/`project_id` order in `parseUpdateProjectInput`; moved the name-required check before field validation in `parseCreateProjectInput` | Each mutation failed 2 pinned cases; contract restored |
| Old-tool byte identity (throwaway, deleted) | vitest comparison of `JSON.stringify` schema + description against `origin/personal`'s contract for `create_or_update_project`, `list_projects`, `list_project_tasks`, `create_task`, `update_task` | Identical; old literals now pinned in the unit test |
| Server build | `pnpm -C autobyteus-server-ts build` | Pass |
| Narrow server E2E around the changed boundary (clean env: `env -i PATH HOME=<temp> TMPDIR`) | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts tests/e2e/projects/project-mutation-node-locality.e2e.test.ts --no-watch` | Pass: 14 tests |
| AC-005 probe, release code (read-only, throwaway HOME) | `node evidence/ac-005-tool-resolution-probe.mjs /Applications/AutoByteus.app/Contents/Resources/server` → `evidence/release-v1.5.5-beta.1-installed-probe.txt` | Transition list: AutoByteus and MCP get `create_or_update_project` only; `create_project`/`update_project` skipped with "not found in registry. Skipping." warnings; 0 errors |
| AC-005 probe, new build | same script on the worktree `autobyteus-server-ts` → `evidence/new-build-probe.txt` | Transition list: all three on AutoByteus and MCP; old-only: old tool; new-only: both new; 0 warnings/errors |
| Syntax of edited `.mjs` fixtures/probes | `node --check` on the 4 edited files + probe script | Pass |

Not run (owned downstream): AGY-gated E2E files (`project-change-feed`, `project-task-context-files-delegation`, `task-closure-root-visibility`, `task-existing-copy-assignment`, `task-reactivation-root-visibility`), the Codex native fixture run, web browser probes, isolated real-app check (AC-006).

Discrepancy: none. Note: `pnpm install` leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` (build outputs; not staged, per TESTING.md).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — no rendered frontend change; the agent configuration tool picker lists registered tool names as today (requirements: UI not applicable). The two web probe files only change the manager agent's configured tool list.

## Downstream Coverage Hints / Suggested Scenarios

- AC-006: isolated desktop instance of the worktree build (`pnpm --silent isolated-app start --build`) with a test data package defining one agent with `create_project`/`update_project` and one with only `create_or_update_project`; each creates and updates a Project (scripted AGY runtime `tests/fixtures/agy-failure-cli.mjs` with `CALL_TOOL:{…}` avoids provider calls).
- AC-005 real-app side: the same package agent listing all three names, launched in the new build, has all three; the probe outputs in `evidence/` cover the release-code side.
- The AGY-gated E2E files whose manager agents now use the new names (`project-change-feed` issues a `create_project` call; the four Task visibility files only change the configured list) and the two web probes were not run by implementation.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-006 real-app check (isolated instance, evidence).
- Gated runtime E2E files listed above and the web probes `project-manager-ux-probe`, `task-closure-tree-probe` with the renamed tool lists.
- Independent confirmation of AC-003 across runtimes beyond unit level, at the validation owner's discretion.
