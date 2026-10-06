# Implementation Handoff

Package: `remove-built-in-project-task-manager`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager`
Branch: `codex/remove-built-in-project-task-manager` (base `origin/personal` @ `1aa91829811866d391bb61d011109aa1a4ea7683`)
Development commit: `62af418df` — `feat(built-in-agents): remove built-in Project Task Manager`

## Upstream Artifact Package

All in `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/`.

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Medium/High) and passed (ARCH-REV-001). Source review is required next.
- Requirements doc: `requirements-doc.md` (Approved, SR-001)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-002)
- Supplemental task artifacts: None. Product Design: N/A.
- Design review report: `design-review-report.md` (Pass)
- Architecture review revision record: `architecture-review-revision-record.md` (ARCH-REV-001)
- History: `approval-request.sr001.md`, `architecture-review-handoff.sr002.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

## Current Implementation Summary

- Built-in retired: removed `PROJECT_TASK_MANAGER_AGENT_DEFINITION_ID` and its registry row, and deleted `src/built-in-agents/templates/project-task-manager/`. The registry now lists only Retrospective Skill Improver and Daily Assistant. The bootstrapper code is unchanged.
- New migration `20261006_remove_built_in_project_task_manager` (`RemoveBuiltInProjectTaskManagerMigration`):
  - Registered last in `app-data-migration-registry.ts`, with the exact path `path.join(getAgentsDir(), "autobyteus-project-task-manager")`.
  - Single item `installedAgentDir`: `lstat` ENOENT ⇒ SKIPPED "Not present."; `rm({recursive, force})` ⇒ MIGRATED "Removed."; an inspect or remove error ⇒ FAILED with the reason. It never throws. The aggregate status is FAILED if and only if the item failed.
  - `requiredOnStartup: true`, no prerequisites.
  - **`executionPolicy = "STARTUP_ONLY"`**. This is REC-001 option 1: retry means restart, as REQ-003 is worded, so a manual mid-session Retry can't leave a stale catalog entry (PREM-002). The README states this.
- Web mirror, spec and probe drop the ID. Bootstrapper and templates tests assert retirement. The smoke script asserts `dist/.../templates/project-task-manager` is absent and that bootstrap doesn't create the folder. The node-locality E2E no longer looks up a shipped manager or logs `managerToolNames`; the rest of E-008 is unchanged.
- Docs:
  - Server and web `projects.md` now say any agent that selects the Project tools can manage Projects, e.g. the agent repository's `project-task-manager`.
  - The server README has a paragraph for the new migration.
  - TESTING.md "Manager bootstrap" now reads "direct MCP Project tool calls".

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `CRR-001` (Pass, no findings; `code-review-report.md`) — informational, no implementation action
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (non-blocking REC-001 applied as option 1)

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` → Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 18 files, all inside existing owners. The only new production code is the 82-line migration. It still makes an irreversible app-data deletion, so the risk stays High.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High route)
- New design impact or escalation trigger: `None`
  - The git grep sweep found no other reader of the built-in ID.
  - The migration touches only the one exact folder.
  - Startup order is unchanged: the runner runs before the bootstrap in both entrypoints, and no startup code was touched.
  - AC-008 continue behavior is untouched code and is left to API/E2E.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Startup never writes the built-in; other built-ins still sync | `built-in-agent-registry.ts` (row and constant removed); template folder deleted | Bootstrap reports exactly 2 built-ins (unit test, integration test, dist smoke) |
| BEH-002 | Catalog lists only the repository PTM | DS-001 → DS-002 | Integration test: the precondition lists 2 PTMs, after startup exactly `["project-task-manager"]`, and the same after restart |
| BEH-003 | Installed copy removed once; failure retried on next start; nothing else touched | `migrations/remove-built-in-project-task-manager-migration.ts`, registered last in `app-data-migration-registry.ts` | Unit and integration tests: removed, then not re-executed on restart (`execute` called once, attempts 1). FAILED ⇒ startup continues and `RESTART_TO_RETRY` ⇒ next start SUCCEEDED (attempts 2). Preserved files are byte-identical |
| BEH-004 | Old conversations readable; continue fails like any deleted agent | No code change | Left to API/E2E (AC-008) |
| BEH-005 | Project tools unchanged | No code change | `tests/e2e/projects` 21/21 pass |
| BEH-006 | ID no longer a built-in anywhere; mirror equals registry | `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts`; server `@` policy follows the registry | Web contract spec passes |
| BEH-007 | No doc claims a shipped manager | `docs/modules/projects.md`, `autobyteus-web/docs/projects.md`, `README.md`, `TESTING.md` | Grep sweep clean |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/app-data-migrations/migrations/remove-built-in-project-task-manager-migration.ts` (new)
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`
- `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`; deleted `src/built-in-agents/templates/project-task-manager/`
- `autobyteus-server-ts/tests/unit/app-data-migrations/remove-built-in-project-task-manager-migration.test.ts` (new, 8 tests): ID/policy, delete, missing, siblings, rm failure, lstat failure, symlink, retry
- `autobyteus-server-ts/tests/integration/app-data-migrations/remove-built-in-project-task-manager-startup.integration.test.ts` (new, 3 tests)
  - Setup: owned temp app data and package root. The migration instance is taken from the real default registry (asserted last). The real `AppDataMigrationRunner` runs over the real `AppDataMigrationRecordRepository` on an isolated SQLite file, followed by the real `bootstrapBuiltInAgents` and `AgentDefinitionService.getVisibleAgentDefinitions()`.
  - Proves AC-002/003/006 (restart included), AC-005 and AC-004.
- `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`, `built-in-agent-templates.test.ts`
- `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs`
- `autobyteus-server-ts/tests/e2e/projects/project-mutation-node-locality.e2e.test.ts`
- `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts`, `autobyteus-web/utils/collaborators/__tests__/draftMentionEligibility.spec.ts`, `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs`
- Docs: `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md`, `TESTING.md`

## Important Assumptions

- ASM-001 (the user configures the agent repository as a package root) is unchanged. The removal doesn't depend on it.
- The integration test runs only this migration, as taken from the production registry, rather than running every registered migration on the seeded data. Running the others would exercise unrelated migrations without strengthening the proof. The registration and the exact folder are still proven, because the test asserts the instance is last in the default registry and deletes `<configured agentsDir>/autobyteus-project-task-manager`.

## Known Risks

- PREM-001 (contrived): a user agent named exactly "AutoByteus Project Task Manager", on an install that never had the built-in, would be deleted. No guard was added, per the design.
- SCN-007 downgrade/re-upgrade brings the duplicate back. This is unsupported.
- With STARTUP_ONLY, the Server Migrations UI shows `RESTART_TO_RETRY` (no Retry button) for a FAILED record. That is intended (REC-001).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (feature removal)
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: The registry-driven bootstrapper and `@` policy absorbed the removal with no code change. The migration follows the predecessor's shape.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` (constant, row, template, PTM prompt/tools test, smoke assertions, E2E manager lookup, web mirror entry)
- Shared structures remain tight: `Yes` (no new shared types; there is no shared remove-root helper, so released migrations stay self-contained)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (migration 73 effective lines; registry 128)
- Notes: The old literal `autobyteus-project-task-manager` appears outside tests only in the migration registration and the README.
  - The README paragraph is expected.
  - `docs/modules/projects.md` mentions the retirement only by migration ID.
  - The historical web fixture `linked-org-history-public.json` is intentionally unchanged (AF-007).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required`
- Design-spec decision reference: `design-spec.md` → Persisted Data / State Transition Decision, Migration Plan, Data Migration Guideline §2 checklist
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks:
  - The migration file is shown above.
  - The unit tests cover every disposition, including symlink and retry.
  - The integration test proves the one-time effect and the exact catalog result through the real runner, record store and bootstrap, plus the failure-then-restart retry.
- Deviation from the reviewed transition decision: `None` beyond the review-sanctioned REC-001 choice, `executionPolicy = "STARTUP_ONLY"`. The design text says "default ANYTIME"; the reviewer explicitly allowed either option without design rework.

## Environment Or Dependency Notes

- The fresh worktree needed `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` (shared packages and Prisma client) and `pnpm -C autobyteus-web exec nuxt prepare` before tests could run.
- `prebuild` leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. They are not committed.
- `pnpm -C autobyteus-server-ts typecheck` fails on base with TS6059 (`rootDir` vs the `tests` include). This is a pre-existing tsconfig issue unrelated to this change. Filtering that code out leaves 0 type errors.

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/built-in-agents tests/unit/app-data-migrations tests/unit/agent-collaboration tests/integration/app-data-migrations/remove-built-in-project-task-manager-startup.integration.test.ts --no-watch` → 70 files, 581 tests passed
- `pnpm -C autobyteus-server-ts build` (`build:full`: clean, tsc, copy assets, sanitized built-in smoke) → passed; `dist/built-in-agents/templates` contains only `daily-assistant` and `retrospective-skill-improver`
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit` → 0 errors other than the pre-existing TS6059
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects --no-watch` (on the fresh dist) → 4 files, 21 tests passed, including E-008 node-locality with cleanup receipts
- `pnpm -C autobyteus-web test:nuxt utils/agents utils/collaborators stores/__tests__/runHistoryStore.spec.ts --run` → 4 files, 57 tests passed (including the DI-002 mirror contract)
- `node --check` on the edited probe and smoke scripts → OK
- `git grep -n "autobyteus-project-task-manager\|PROJECT_TASK_MANAGER"` outside `tickets/` → only expected hits:
  - the migration registration, the README and the smoke-absence assertion;
  - the retirement tests (bootstrapper, templates);
  - the historical web fixture;
  - plus the new migration file and its tests.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. No rendered UI changed: the web delta is one ID removed from a non-rendered mirror set, plus a test, a probe constant and docs. The catalog simply lists one fewer agent.

## Downstream Coverage Hints / Suggested Scenarios

- AC-008 (UNK-001): on an owned server with history containing a run of `autobyteus-project-task-manager` and the folder removed, the run still lists and its messages read back. Continuing it gives the existing "not found"-type failure, and other runs and the app keep working.
- AC-001 on a built server (fresh owned app data): no `agents/autobyteus-project-task-manager/` is created, and GraphQL `agentDefinitions` has no such ID.
- AC-002/003 through the real server entrypoint (Studio and/or standalone host): seed the folder plus a package root with `project-task-manager`, start, check that the Server Migrations status for `20261006_remove_built_in_project_task_manager` is SUCCEEDED and the catalog has one PTM, then restart and check that attempts stay at 1.
- AC-004 via the server: make removal fail (e.g. an immutable folder). The server still starts and serves, the status is FAILED with `RESTART_TO_RETRY` and no manual Retry, and the next start succeeds.
- AC-009: `@` candidates still exclude Daily Assistant and Retrospective Skill Improver; the repository `project-task-manager` is now an eligible collaborator like any shared agent.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-008 outward behavior (not covered by implementation checks).
- Entry-point-level confirmation of AC-001..AC-005 through a real server start (the implementation checks cover these at the runner, bootstrap and catalog layer only).
- Broader regression at API/E2E's discretion (Projects tools AC-007 already pass in `tests/e2e/projects`).
