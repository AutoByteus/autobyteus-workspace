# Implementation Handoff — Append-Only Message Logs

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High). ARCH-REV-003 passed SR-004; DI-001 raised during implementation produced SR-005, which ARCH-REV-004 passed. Handoff rule applied: "implementation is complete and the carried classification is task_size=Large or architectural_risk=High" → `/software_engineering_team/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/requirements-doc.md` (Approved, SR-004)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/solution-revision-record.md` (SR-005)
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/design-spec.md` (SR-005)
- Supplemental task artifacts: `probes/cost.mjs`, `probes/profile.py`, `probes/validate-cost.mts`, `probes/inventory.py` (evidence only)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/design-review-report.md` (ARCH-REV-004)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation). Implementation-raised design impact: `implementation-design-impact-di-001.md` (resolved by SR-005 / ARCH-REV-004).

## Current Implementation Summary

Every run's message log is now append-only JSON Lines behind one owner, `MessageLog` (`src/run-history/store/message-log.ts`): `<base>_active.jsonl` plus sealed `<base>_<6 digits>.jsonl`. An append writes one line and syncs it, with outcomes mapped to the existing `RunPackageFileWriteResult` (new stages `prepare_append`, `append_line`, `restore_size`, `sync_file`). Rotation is one rename at 4 MiB. An unfinished last line is ignored on read and cut off by the next append. `writeInitial` replaces the active file (as before) and refuses only when sealed files exist. The three family stores and `TaskAgentMessageLogs` use it, with the per-log id check removed (DEC-005). The commit path validates only the new message (the engine). The adapters and the team append plan form the next list without validating the history again. Readiness requires "the log exists" and retires JSON log names. A new task agent team gets an empty append-only log.

Released migrations import a frozen copy of the JSON log code (`legacy/released-run-package-shapes/released-message-logs-before-append-only.ts`). Same-ID repairs R-A..R-D let the migrations that may run after the conversion read the append-only layout through a frozen reader (`released-message-log-files-from-append-only.ts`). Startup migration `20261018_append_only_message_logs_v1` (registered last) converts every JSON log behind the gate. With SR-005, an org log also waits while its folder holds flat-families' retired team files. The conversion then reads back, removes the JSON, and stays non-terminal while a log-writing predecessor is pending.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`, `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-003`, `ARCH-REV-004`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Worktree / branch / commit: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs`, `codex/append-only-message-logs`, source at `201a4933c6` (checks at `265ad100ce`; `201a4933c6` changes one integration test only, IMP-03b) (base `origin/personal` @ `65cf41c6b4`; the branch is one commit behind `origin/personal`, which is a release bump; not merged here). Ticket documents and evidence are committed on top; see Checks Run for the commit each check ran on.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change spans the persistence boundary of all three families and task agents, the commit path, readiness, a one-way startup migration and four released-migration repairs. DI-001 showed the migration interplay is as risky as the design said: one more released-migration path needed a gate condition.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: None open. DI-001 (flat-families partial-target orgs) was raised, decided as option (a) in SR-005, re-reviewed (ARCH-REV-004 Pass) and implemented.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | One validated line appended and synced per owner log, receiver's first, once per log; fail-stop after a partial durable write | `RootCommunicationEngine.deliver` (validates the new message) → adapters (`standalone-root-communication-adapter.ts`, `agent-org-communication-adapter.ts`) / `team-communication-message-append-plan.ts` (next = current + message; known id → `*_MESSAGE_COMMIT_CONFLICT`) → coordinators (unchanged) → `*.appendMessage` → `appendMessageToOwnerLogs` (unchanged order, now non-null results) → `MessageLog.append` | Implemented. AC-001 measured: 123,099 bytes written for a 123,099-byte line on the 22.2 MiB / 6-file profile, 1 byte read (IMP-07) |
| BEH-002 | Same composed list over all files of each log | `MessageLog.read` (sealed by index, then active; first occurrence; `createdAt` sort) → stores' `readLog` / `read` / `readMessages` → `composeMessageLogs` (unchanged) | Composed views equal before (frozen JSON + `composeMessageLogs`) and after conversion for hub, team, org, empty and unordered runs (IMP-05) |
| BEH-003 | References resolve by `messageId` + `referenceId` as before | Unchanged code over the same list | Not exercised end-to-end here (AC-008 is API/E2E) |
| BEH-004 | Readiness admits runs in the new layout; invalid runs still reported | `root-run-package-current-validator.ts`: required tree + `store.hasLog` (MessageLog.exists); JSON log names retired | Readiness tests: admits active-only and sealed-only logs; missing log and JSON residue → MANIFEST_INVALID; invalid line → CURRENT_VALIDATION_FAILED (IMP-04) |
| BEH-005 | Interrupted append leaves earlier messages; unfinished last line ignored and repaired | `MessageLog.append` (tail repair, truncate-back, outcome mapping) and `read` | Injected failures map to `prepare_append` / `append_line` → not committed; `restore_size` / `sync_file` / `sync_directory` → indeterminate (IMP-04) |
| BEH-006 | Released migrations complete; conversion after them; per-run gate | `migrations/append-only-message-logs-v1/*` + registry; frozen JSON module + repoints; R-A (`released-run-package-file-readers.ts`), R-B (`released-root-packages-before-task-agent-own-run.ts`), R-C (`context-file-record-locators.ts`), R-D (own-run `coordinating-run-migration.ts`); SR-005 org partial-target gate | Every fixture in the design's table, F-GATE-FLAT-PARTIAL-TARGET included, plus a skip-version run of the production registry (IMP-05, IMP-06) |
| BEH-007 | New task agent team gets an empty log in the new layout | `TaskAgentOwnFiles.writeTeam` → `TaskAgentMessageLogs.createTeamLogIfMissing` → `MessageLog.exists` / `writeInitial([])` | `task-agent-own-run-stores.test.ts` asserts an empty `team_communication_messages_active.jsonl` (IMP-04) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Wire DTOs, tool contracts, in-memory message and envelope types, the per-run log model and the coordinators are unchanged (AC-010).

## Key Files Or Areas

- New: `src/run-history/store/message-log.ts`; `src/app-data-migrations/migrations/append-only-message-logs-v1/{append-only-message-logs-v1-app-data-migration.ts,message-log-conversion.ts}`; `src/app-data-migrations/legacy/released-run-package-shapes/{released-message-logs-before-append-only.ts,released-message-log-files-from-append-only.ts}`.
- Modified current runtime: the three stores, `task-agent-message-logs.ts`, `task-agent-own-files.ts`, `atomic-run-package-file-commit-writer.ts` (stage unions), `collaboration-communication-message-schema.ts` (tolerant), `root-communication-engine.ts`, the two adapters, `team-communication-message-append-plan.ts`, `agent-org-run-manager.ts` (empty envelope without the removed validator), `root-run-package-current-validator.ts`, `standalone-root-tree-path.ts` / `standalone-root-tree-schema.ts` (JSON name and envelope validator removed).
- Removed: `team-communication-messages-schema.ts`, `agent-org-communication-messages-schema.ts`, the JSON file-name constants and path helpers, `TaskAgentMessageLogs.merge` (moved to the frozen module), the per-log id checks.
- Released migrations repointed (imports only, behavior unchanged): flat-families (migration + locator transition), summary-v1 evidence reader, own-run, tree-v1 (converters, state validator, promoter), the classifier, legacy validators/readers.
- Docs: `run_history.md` (new "Message logs" section), `standalone_agent_run_root.md`, `agent_memory.md`, `agent_team_execution.md`, `agent_orgs.md`, `agent_artifacts.md`, `collaboration_model.md` (CM-9 status), `artifact_file_serving_design.md`, web `agent_artifacts.md`, legacy README.

### Test impact inventory (design sequence step 0)

- New: `tests/unit/run-history/store/message-log.test.ts`, `message-log-append-cost.test.ts` (AC-001), `tests/unit/agent-collaboration/communication-commit-path.test.ts`, `tests/unit/app-data-migrations/append-only-message-logs-v1/append-only-message-logs-v1-app-data-migration.test.ts`, `released-message-log-repairs.test.ts`; helpers `tests/helpers/migration-start-harness.ts` (real runner order, in-memory ledger, stubs), `tests/helpers/append-only-message-log-startup.ts`, `tests/fixtures/message-log-fixtures.ts`.
- Current-package fixtures switched from JSON logs to `*_active.jsonl` (no assertion change): context-file unit and integration tests, provider-input normalizer, org location service, attachment fixtures (`writeAttachmentSidecars` lost its unused id parameter; its callers updated), memory-sync and context-file-startup E2E fixtures.
- Tests of removed modules rewritten to build envelopes directly: agent-streaming projector / stream handler, org member scope / scope builder, team-run current-package schema.
- Behavior-level updates: task-agent log tests observe `MessageLog.append` order (the store-level duplicate check was removed, DEC-005); readiness tests (append-only admission, missing log, JSON residue, invalid line); org inspection (a complete malformed line is still rejected; an unfinished last line is ignored by design); own-run stores (empty JSONL log for a new task agent team); team-communication API integration (JSON ignored).
- Released-migration tests: imports repointed to the frozen module (flat-families, promoter); tests that assert current admission after a released migration run the conversion first (locators-v1, flat-families locator transition, token attribution, tree-v1/v2 now expect MANIFEST_INVALID for runs the conversion keeps on JSON); own-run F-RERUN-MSG ends after the conversion; registry order (collaborators test); skip-version run gives the conversion its ledger; summary-v1 fixture writes the released JSON shape instead of using the current store; E2E `team-run-v1-production-upgrade` reads the JSONL logs after startup.

## Important Assumptions

- ASM-001 confirmed: every runtime append goes through a coordinator's lock (`commitCommunication`); `writeInitial` runs inside the coordinators' package-creation paths or `TaskAgentOwnFiles.writeTeam` (inside the tree split). The migration runs before serving.
- Stored-view reads of a run happen only when the run is not live (live runs answer from in-memory snapshots), so `MessageLog.read` needs no concurrency handling.

## Known Risks

- R-2 (accepted): a permanently failed log-writing predecessor keeps the conversion non-terminal; each start lists folders and reads trees only for logs still in JSON.
- R-3: a run left on JSON (waiting or preserved) is not admitted (team/org) or shows no messages (hub) until converted; data kept, warning logged.
- DEC-008: on installs where locators-v1 is pending, a sealed file may be rewritten once by R-C (F-LOCATORS-AFTER-OURS shows only the locator bytes change).
- Released-migration tests that assert current admission after a released migration now run the conversion first (helper `tests/helpers/append-only-message-log-startup.ts`), as a real start does. Their own migration outcomes are unchanged.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Performance (with a persisted-format change)
- Reviewed root-cause classification: Duplicated Policy Or Coordination (physical log IO in four places) on top of whole-file JSON
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes` (one `MessageLog` owner; stores keep only location and envelope)
- If challenged, routed as `Design Impact`: `Yes` for DI-001 (inventory gap, not the health assessment); resolved by SR-005
- Evidence / notes: no `fs` access to `*_active.jsonl` / sealed files outside `MessageLog` in current runtime; the frozen reader and R-C live under migrations.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the current runtime reads only JSONL; JSON lives only in the frozen module and the migration)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the envelope validators, JSON names and path helpers, per-log id checks, `merge`, the `null` result of `appendMessageToOwnerLogs`' callback, the legacy `emptyStandaloneRootMessages` / standalone message parts of the frozen tree copies)
- Dead code found elsewhere, listed as follow-up: `src/app-data-migrations/migrations/team-communication-projection-address-migration.ts:5` imports `buildTeamCommunicationMessageId` and never uses it (`tsc --noUnusedLocals`); the file is not touched by this change.
- Shared structures remain tight: `Yes` (a line is exactly the seven message fields; no header or version)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes` (DI-001)
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (largest changed file `agent-org-run-manager.ts` 466 effective lines, shrunk; new files ≤ 246)
- Notes: `context-file-record-locators.ts` (migration-only, in `src/context-files/`, FU-3) imports the frozen pattern from `legacy/`, as the design's R-C places it.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required`
- Design-spec decision reference: design-spec → "Persisted Data / State Transition Decision", "Migration Plan" (SR-005 gate bullet)
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks: `20261018_append_only_message_logs_v1`; dispositions MIGRATED / WAITING_FOR_PREDECESSOR (FAILED, non-terminal) / PRESERVED_UNSUPPORTED / PRESERVED_UNREADABLE (SKIPPED, warning) / FAILED; aggregate non-terminal while an item failed or a log-writing predecessor is pending. Fixtures: F-HUB, F-TA-AGENT, F-TA-TEAM(-EMPTY), F-TEAM(-EMPTY), F-ORG(-EMPTY, -UNORDERED), F-DETACHED, F-HUB/TEAM/ORG-LARGE, F-OLD-ADDRESS, F-UNREADABLE, F-PARTIAL (torn batch, after step 3, after step 4, unequal read-back), F-REAPPEARED, second start, F-CLASSIFIER-SAME, F-PENDING-OWN-RUN, F-OWN-RUN-UNMATERIALIZED-TEAM, F-GATE-TREE-V1, F-GATE-FLAT, F-GATE-FLAT-PARTIAL-TARGET, F-LOCATORS-AFTER-OURS, F-SUMMARY-AFTER-OURS (two variants), skip-version production registry run.
- Deviation from the reviewed transition decision: `None` after SR-005 (DI-001 was routed and decided before implementing the gate condition).

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` in the worktree; no dependency changes.
- Other worktrees were running vitest at the same time; the full unit suite takes ~17 minutes on this machine under that load.
- The released migration runner's default ledger is the process database: a test that builds the production registry with its own repository has to give the conversion that repository (done in `released-run-tree-skip-version-upgrade.test.ts`; own-run has the same latent dependency).

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `265ad100ce` | macOS (Darwin 25.5.0), node v22.23.1 | all of `src` | AC-010 | Pass | `IMP-01-typecheck.log` | `exit=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `265ad100ce` | same; machine load average ~147 (other worktrees' suites) | whole server unit suite | all | Pass except one load timeout (see IMP-02b) | `IMP-02-unit-summary.log` (excerpt), `IMP-02-unit-full.log` | `Tests  1 failed \| 5895 passed \| 7 skipped (5903)`; the one failure is `Test timed out in 5000ms` in `memory-layout-cleanup-regression.test.ts` |
| IMP-02b | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/memory-layout-cleanup-regression.test.ts --no-watch` | `265ad100ce` | same | that test alone (scans every source and test file; unchanged by this ticket) | — | Pass | `IMP-02b-timeout-rerun.log` | `✓ keeps removed run-specific layout symbols out of source and tests  1578ms`. Cause of the IMP-02 failure: its 5 s timeout under load average ~147; it passed in the baseline and in an earlier full run of this branch (5862 passed) |
| IMP-03 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` | `265ad100ce` | same | server integration suite | BEH-002, BEH-004 | Pass except one test fixed in `201a4933c6` (see IMP-03b) | `IMP-03-integration-summary.log` (excerpt), `IMP-03-integration-full.log` | `Tests  1 failed \| 396 passed \| 65 skipped (462)`; the failure `expected [] to be null` in `team-communication-api.integration.test.ts` |
| IMP-03b | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/team-communication-api.integration.test.ts --no-watch --hookTimeout=120000` | `201a4933c6` (the test change) | same | team communication API over a folder holding only an old flat JSON projection | BEH-002, R-3 | Pass | `IMP-03b-team-communication-api.log` | `Tests  3 passed (3)`. Cause of the IMP-03 failure: the test expected the strict JSON reader's error; the current runtime no longer reads JSON logs (design R-3, no dual read), so the run has no log and returns `[]`. The test now asserts that. The longer hook timeout is only for the server boot under load |
| IMP-04 | (in IMP-02) `message-log.test.ts`, `task-agent-message-logs.test.ts`, `task-agent-own-run-stores.test.ts`, `root-run-package-readiness-index.test.ts`, `team-run-package-catalog.test.ts` | `265ad100ce` | same | `MessageLog`, stores, `TaskAgentOwnFiles`, readiness | BEH-001, BEH-004, BEH-005, BEH-007; AC-003, AC-005 | Pass | `IMP-04-store-and-readiness.log` | `✓ tests/unit/run-history/store/message-log.test.ts (19 tests)` and the four other `✓` lines |
| IMP-05 | (in IMP-02) `append-only-message-logs-v1-app-data-migration.test.ts`, `released-message-log-repairs.test.ts` | `265ad100ce` | same | the migration, frozen reader, R-A, R-C | BEH-002, BEH-006; AC-004, AC-006, AC-007 | Pass | `IMP-05-migration.log` | `(13 tests)` and `(5 tests)` with `✓` |
| IMP-06 | (in IMP-02) `team-context-file-execution-locators-v1.test.ts` (F-LOCATORS-AFTER-OURS), `agent-org-history-first-message-summary-v1-app-data-migration.test.ts` (F-SUMMARY-AFTER-OURS), `agent-org-context-file-locator-transition.test.ts` (F-GATE-FLAT, F-GATE-FLAT-PARTIAL-TARGET), `task-agent-own-run-v1-app-data-migration.test.ts`, `released-run-tree-skip-version-upgrade.test.ts` | `265ad100ce` | same | released migrations + conversion in runner order | BEH-006; AC-007 | Pass | `IMP-06-released-migrations.log` | five `✓` lines (25, 14, 13, 8, 1 tests) |
| IMP-07 | (in IMP-02) `message-log-append-cost.test.ts` | `265ad100ce` | same | org store append on a synthesized 22 MB log | BEH-001; AC-001, QR-001 | Pass | `IMP-07-ac001-measurement.log` | `[AC-001] log 22.2 MiB in 6 files; append of 123099 bytes: written 123099 bytes, read 1 byte(s), 10.8 ms` (12.5 ms in a run with less load) |
| IMP-08 | (in IMP-02) `communication-commit-path.test.ts` | `265ad100ce` | same | engine, adapters, append plan, coordinator retry | BEH-001; AC-002; ARCH-F-002, ARCH-F-004 | Pass | `IMP-08-commit-path.log` | `✓ tests/unit/agent-collaboration/communication-commit-path.test.ts (10 tests)` |
| IMP-10 | `node tickets/in-progress/append-only-message-logs/probes/cost.mjs <temp dir>` | `725fe7ed20` (probe independent of the source) | same | the design's probe of today's whole-file rewrite vs a line append | AC-001 (before) | Pass | `IMP-10-ac001-cost-probe.log` | `rewrite ms/bytes [ 145, 22282247 ]` … `[ 192, 22282247 ]` |

- Not run, and why:
  - Server E2E (`tests/e2e/`), including the changed `app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (now reads the JSONL logs after startup), `memory-sync/memory-sync-multiprocess.e2e.test.ts` and `runtime/context-file-startup-recovery.e2e.test.ts` (fixtures switched to the JSONL layout), plus `collaborators-to-delegated-runs-startup.e2e.test.ts` (released JSON fixtures that startup now converts): left to API/E2E.
  - AC-008 (references and attachments resolve for migrated and new messages, all families) and AC-009 (isolated desktop instance with a synthesized released-format data package): left to API/E2E (TESTING.md: isolated instance; never the user's data).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: backend persistence only; wire DTOs and views are unchanged.

## Downstream Coverage Hints / Suggested Scenarios

- AC-009 data package: start from `tests/fixtures/app-data-migrations/released-task-agent-layout-fixtures.ts` (`writeReleasedDataRoot`) for released hub / team / org runs with task agents. Add a > 4 MiB org log, an empty team, a tree-less old-address team folder and an unreadable JSON log. Expect: the large log rotates into sealed files plus the active file, the empty team gets an empty active file, and the old-address and unreadable logs stay JSON with a warning while the app starts.
- After conversion: open each old run (complete history in `createdAt` order), send messages in each family (hub ↔ task agent, team ↔ task agent team, org ↔ task agent) and check both logs grow by one line, restart and re-open, open a referenced file of a migrated and of a new message (AC-008).
- Rotation in a live app is hard to reach with real messages (4 MiB); the unit tests cover it with a small limit.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-008 and AC-009 as above; server E2E suites, especially `tests/e2e/app-data-migrations/*` (the production registry now ends with the conversion).
