# Implementation Handoff

Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/` (abbreviated `<T>` below).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Medium + High) and passed (`ARCH-REV-001`). The `get_handoff_rules` result for a completed Large-or-High implementation is `/code_reviewer`.
- Requirements doc: `<T>/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `<T>/investigation-notes.md`
- Solution revision record: `<T>/solution-revision-record.md`
- Design spec (required on every route): `<T>/design-spec.md`
- Solution handoff: `<T>/solution-handoff.md`
- Supplemental task artifacts: None
- Design review report: `<T>/design-review-report.md` (Pass, advisory REC-001 and REC-002)
- Architecture review revision record: `<T>/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial implementation)

## Current Implementation Summary

The process now has one `RunFileChangeService`. `GeneralProcessRunSupervisor` builds it, wires it into `AgentRunResourceManager` (which attaches it to every activated run), and binds it as the process authority. GraphQL `getRunFileChanges` and REST `/runs/:runId/file-change-content` resolve that authority on every request through `getRunFileChangeService()`. That getter now throws when nothing is bound; the lazy module singleton is gone.

Inside `RunFileChangeService`, live projections exist only for attached runs. `attachToRun` adds the run ID to the attached set and detach removes it. For any unattached run, `load()` returns a fresh normalized `file_changes.json` read and caches nothing. Both cache writes are guarded by attachment, so a read or `handle()` still pending at detach cannot re-cache the run (REC-001). `RunFileChangeProjectionService` resolves both the file-change authority and `AgentRunManager` per call (REC-002, done for symmetry); the injectable options remain for tests.

- Implementation cycle: `Initial`
- Implementation revision record: `<T>/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (advisory REC-001 and REC-002 adopted)

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: three production files changed (+77/−18 lines), plus tests and two docs. There is no API or persistence change. The ownership-boundary and cache-lifecycle changes the design flagged as High are exactly what was implemented. No escalation trigger was found: the only other `RunFileChangeService` instance is the application-scope kernel's scope-local one, which is never bound. Both hosts that construct the supervisor (`build-studio-server.ts`, `start-standalone-application-host.ts`) get the binding automatically.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Every recorded artifact of an active run previews; 409/404 kept | REST route → `RunFileChangeProjectionService.resolveEntry` → `changes()` = bound process authority → attached live projection (`run-file-change-service.ts` `load`) | Integration regression: A read, then B, C recorded → A, B, C all 200 with bytes. Streaming D without file → 409. Unknown path → 404 "File change not found". Route code unchanged. |
| BEH-002 | Active-run list contains every recorded entry | GraphQL resolver → module projection service → per-call `changes()` → live projection | Integration (GraphQL) plus unit: second list contains A, B, C for a standalone run and a Team member. |
| BEH-003 | Inactive runs unchanged | `readProjectionContext` inactive branches untouched (store reads) | Existing historical/legacy/404 cases pass. The historical team-member case fails identically on base (see Known Risks). |
| BEH-004 | Writer persists every `FILE_CHANGE` unchanged | `attachToRun` → `enqueue` → `handle` → `projectionStore.writeProjection` (still writes after detach) | Existing writer tests pass; file format untouched. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`: attached set, `readStored`, attachment-guarded caching in `load()` and `handle()`, `clear()` drops the attachment, bind/release/get trio replacing the lazy singleton.
- `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts`: builds the instance once, binds it right after collaborator admission (with a bound flag), passes the same instance to `AgentRunResourceManager`, and releases it in the rollback path and `closeInternal()`.
- `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts`: per-call `changes()` and `agentRuns()` resolvers; no captured process instances.
- Tests:
  - `tests/unit/services/run-file-changes/run-file-change-service.test.ts`: unattached fresh reads; detach drops the cache; late `handle()` after detach does not re-cache (checked by re-attaching); binding semantics.
  - `tests/unit/run-history/services/run-file-change-projection-service.test.ts`: AC-001 (active Team member) and AC-002/AC-003 (active standalone, authority bound after the reader was built), both against a real bound `RunFileChangeService`.
  - `tests/integration/api/run-file-changes-api.integration.test.ts`: binds a process authority for the suite, plus the REST and GraphQL regression for AC-002/AC-003/AC-005.
  - `tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts`: the bound authority is the instance wired into `AgentRunResourceManager`; it is released on close and on rollback; a conflicting authority is refused and earlier bindings are unwound.
- Docs: `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md`.

## Important Assumptions

- Application-scope runs are not resolvable as active by the process reader (design statement). Even if they were, the new invariant reads them fresh from disk rather than serving stale state.
- ASM-001 (frontend needs no change) remains open until the AC-006 live check.

## Known Risks

- Pre-existing failures, unrelated to this change, are present on base `5c74fed71` and are identical with this change. 24 FAIL lines (23 tests plus one suite line) across `tests/unit/{services/run-file-changes,run-history,api/rest,agent-execution,standalone-application-host,application-platform}`, `tests/architecture` and the run-file-changes integration suite. The diff of the sorted failure lists is empty. Examples:
  - `AgentRunManager requires all execution-family dependencies` in the application-scope kernel-builder tests
  - status projector shape assertions
  - integration "hydrates historical AutoByteus team-member file changes": GraphQL returns `[]` on base too. This is the inactive path, which this change does not touch.
- RSK-001 (frontend "deleted or moved" wording for every 404) remains out of scope.
- Any future code that calls `getRunFileChangeService()` before the supervisor is built will throw. Today the only caller is the per-request reader.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Boundary Or Ownership Issue plus Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the regression tests fail on the original wiring. To show this, the new tests were run against base source with no-op bind stubs added, which keeps the orphan lazy singleton. Six new tests failed (including the integration and both reader regressions) and passed with the fix.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The lazy singleton (`cachedRunFileChangeService ??= new RunFileChangeService()`) and cache-any-run behavior were removed, and there is no unbound fallback.
- Dead/obsolete code removed in scope: `Yes`
- Shared structures remain tight: `Yes` (no type changes)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Effective non-empty lines: supervisor 464 (it was 451), service 149, projection service 127. The largest per-file delta is +44/−7.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`. `file_changes.json` reader, writer and shape are unchanged.
- Deviation: `None`

## Environment Or Dependency Notes

- The fresh worktree needed setup:
  - `corepack pnpm install --frozen-lockfile --prefer-offline`
  - `pnpm prepare:shared`
  - `pnpm exec prisma generate --schema ./prisma/schema.prisma` in `autobyteus-server-ts`
- `pnpm` is not on PATH in this environment. A temporary shim (`/tmp/pnpm-shim/pnpm` → `corepack pnpm`) was used so nested scripts work.
- The build produced untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. These are not committed.

## Local Implementation Checks Run

All commands run from `autobyteus-server-ts`.

- `pnpm exec tsc -p tsconfig.build.json --noEmit`: no errors.
- `pnpm exec tsc -p tsconfig.json --noEmit`: no errors other than the config-wide TS6059 rootDir notices emitted for every test file (pre-existing).
- `vitest run` on the changed and related tests:
  - `run-file-change-service.test.ts`: 8/8 pass
  - `run-file-change-projection-service.test.ts`: 8/8 pass
  - `general-process-run-supervisor-ownership.test.ts`: 7/7 pass
  - `run-file-changes-api.integration.test.ts`: 5/6 pass. The one failure is the pre-existing historical team-member case, identical on base.
- Broader related set (`tests/unit/services/run-file-changes tests/unit/run-history tests/unit/api/rest tests/unit/agent-execution tests/unit/standalone-application-host tests/unit/application-platform tests/architecture` plus the integration suite): the failure list is identical before and after the change. No new failures.
- Mutation checks:
  - Removing the `handle()` cache guard makes the REC-001 test fail.
  - Running the new tests against the base wiring makes six of them fail.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. This is a backend-only change; the frontend contract and code are unchanged. AC-006 (a live preview of several images) is a downstream live check.

## Downstream Coverage Hints / Suggested Scenarios

- AC-006 live: an agent generates two or more images in one turn (standalone and team member). Each preview loads in the Artifacts tab immediately and after reopening the tab, without a restart.
- Restore/re-activation of a run that already has `file_changes.json`: the list includes the earlier entries plus new ones.
- An active run's streaming entry before its file exists returns 409, and returns 200 once the file is written.
- Server close followed by a new supervisor in the same process (tests or hosts): no "already initialized" error.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-006 live check with a real runtime (API/E2E owner).
- Optional: real-runtime E2E (`tests/e2e/runtime/agy-native-image-*.e2e.test.ts`) covering multi-image generation followed by content fetch.
