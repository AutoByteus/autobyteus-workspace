# Implementation Handoff — code-quality-leftovers (autobyteus-357)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large / High); ARCH-REV-002 `Pass` of SR-002. Next: code review (handoff rules, Large / High).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/requirements-doc.md` (SR-002, Approved)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/solution-revision-record.md` (its ARCH-REV-002 receipt is an uncommitted edit by the Solution Designer)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/design-spec.md` (SR-002)
- Supplemental task artifacts: `merged-task-texts.md` (the ten Task texts), `follow-ups.md` (FU-001, item 135); root `DESIGN.md` rule 11 (written by the Solution Designer).
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/design-review-report.md` (untracked in the worktree; the reviewer's file)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/architecture-review-revision-record.md` (untracked; the reviewer's file)
- Triggering rework report: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/code-review-report.md` (CRR-001: CR-001, CR-002, both Local Fix) and `code-review-revision-record.md` (the reviewer's files, uncommitted).

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (delta from IR-001 in the revision record)
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-001, CR-002 (IR-002)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers`, `codex/code-quality-leftovers`, base `origin/personal` `efd28d5c4a` (the branch is behind `origin/personal` by 11 commits from other tickets; delivery re-integrates). Review range `ebc5277e52..HEAD` (+826 / −937 in 117 files), one commit per design step:

| Step | Commit | Items |
| --- | --- | --- |
| 1 | `ee79a2ac75` | 147 split, 178 drain removal and release tracker |
| 2 | `c83890d4e4` | 157 outcome rename |
| — | `4310db539a` | baseline test fix (native-input-history; cause below) |
| 3a | `0eda6aafe4` | 54.1 release step, 54.2 `logicalConversationId` (doubles refactored and green before the removal) |
| 3b | `7e79df3b05` | 54.3 / 54.4 source `modelKind`, regenerated GraphQL types |
| 4 | `030d945076` | 125.1, 125.2, 125.3, 125.5, 125.6 |
| 5 | `d7b11c57b6` | 159 streaming docs |
| IR-002 | `534ad1f55e` | CRR-001: CR-001 single-source provider states, CR-002 unused test reset |

Item outcomes (REQ-004; dropped and moved-out items are the Solution Designer's, with evidence in the investigation notes):

| Item | Outcome |
| --- | --- |
| 54.1 | Fixed: `BaseLLM.releaseConversation`, the summary port's bounded release step and `COMPACTION_CONVERSATION_RELEASE_TIMEOUT_MS` removed |
| 54.2 | Fixed: `logicalConversationId` removed from both request builders and the provider deny-list; test doubles recognise compaction requests from the requests |
| 54.3 | Fixed: `modelKind` removed from `DynamicSourceSpec`, `ModelSourceStatus`, `DynamicModelSourceLifecycle.status`, GraphQL `ModelSourceStatusObject` |
| 54.4 | Fixed: web source status type, query, `DISCOVERY_SETTING_MODEL_KINDS` / `affectedKinds` and the then-unused web `ModelKind` type removed; types regenerated |
| 107, 124, 125.4, 158 | Dropped (Solution Designer) |
| 125.1 | Fixed: the whole `utils/application/applicationLaunch.ts` removed (no importer at all) |
| 125.2 | Fixed: `getTeamAgentRunLocation`, the `team_agent_run` location type and `normalizeScope` removed |
| 125.3 | Fixed: unused import name removed; its frozen copy pruned by `scripts/prune-frozen-layer.mjs` |
| 125.5 | Fixed: unreachable branch, reason code, its test case and the event-name parameter only it read removed |
| 125.6 | Fixed: unread `launchConfiguration` on the located standalone execution removed |
| 135 | Moved out (FU-001, Solution Designer) |
| 147 | Fixed: `ProjectTaskContextDrafts` + `TaskContextOwnership`; `project-task-service.ts` 494 → 445 effective lines |
| 157 | Fixed: `not_committed` / `finalization_indeterminate` in current code; frozen and sealed code keep the released names |
| 159 | Fixed: the two streaming docs' Team sections, plus short mentions in five other docs; one stale design note listed below |
| 178 | Fixed: `drainRuntimeReleases`, `TaskExecutionResourceRelease.drain` and `inFlight` removed |

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design spec § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: three structural surfaces changed exactly as classified (GraphQL `ModelSourceStatus` lost `modelKind`; `BaseLLM` lost `releaseConversation`; `ProjectTaskService` was split into three owners) across autobyteus-ts, the server, the web, docs and 67 test files. No stored data, no new behavior; no escalation trigger hit (no removed name outside this repository's packages; no stored record carries an outcome name; Settings and compaction behave as before).
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (two decisions within the design's ownership are listed under Important Assumptions).

## Reviewed Behavior Implementation Trace

| Behavior | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| Compaction release step (54.1) | Removed; compaction unchanged | `autobyteus-ts/src/llm/base.ts`, `src/agent/loop/llm-phase-summary-port.ts` (`send` has no `finally` release) | Implemented; compaction suites unchanged and green (IMP-04, IMP-05) |
| Request label (54.2) | Removed; providers already never saw it | `conversation-request.ts` (`conversationRequestKwargs(tools)`), `llm-phase.ts`, `llm-phase-summary-port.ts` (transcript kwargs `{}`; the attempt id stays as metadata `invocationId` via `compactionInvocationId`), `provider-request-kwargs.ts` | Implemented; AC-006 search empty (IMP-02) |
| Provider settings sources (54.3/54.4, DS-002) | Same sources and states, no kind | Server `dynamic-model-source-lifecycle.ts`, `model-catalog-service.ts`, `llm-providers/domain/models.ts`, GraphQL `llm-provider-model-catalog.ts`; web `stores/llmProviderConfig.ts` (every source updated: they are all LLM sources), `llmProviderConfigSupport.ts`, `graphql/queries/llm_provider_queries.ts`, `generated/graphql.ts` | Implemented; browser check IMP-11: READY, STALE_ERROR after reload, ERROR, no GraphQL errors, no `modelKind` on any source |
| Persistence write results (157) | Same outcomes, new names | the writer, message logs, tree split, Org catalog, three coordinators and root managers | Implemented; persistence and migration suites green (IMP-06) |
| Task context drafts (147, DS-001) | Same, new owner | `src/projects/services/project-task-context-drafts.ts` (new, `getProjectTaskContextDrafts()`), `task-context-ownership.ts` (new: `assertOwner`, `reclaimUnpublished`, `bestEffortContextCleanup`), `api/rest/project-task-context-files.ts`, `project-task-service.ts` | Implemented; context tests unchanged in assertions (IMP-06) |
| DONE closure release (178) | Same; only the test-only drain goes | `src/projects/runtime/task-execution-resource-release.ts`, `project-task-service.ts` | Implemented; 18 test files settle through `tests/helpers/project-task-release-tracker.ts` |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- autobyteus-ts: `src/llm/base.ts`, `src/llm/api/provider-request-kwargs.ts`, `src/agent/loop/{conversation-request,llm-phase,llm-phase-summary-port}.ts`; new test helper `tests/helpers/compaction-summary-request.ts`; 16 test files; 5 docs.
- Server: `src/projects/services/{project-task-service,project-task-context-drafts,task-context-ownership}.ts`, `src/projects/runtime/task-execution-resource-release.ts`, `src/api/rest/project-task-context-files.ts`; `src/run-history/**`, `src/agent-org-execution/services/*`, `src/agent-team-execution/services/*`, `src/standalone-agent-run-root/services/*` (157); `src/llm-management/**`, `src/api/graphql/types/llm-provider-model-catalog.ts`; `src/agent-memory/**`; `src/agent-execution/backends/codex/thread/*`; `src/standalone-agent-run-root/services/standalone-root-location-service.ts`; one sealed migration import and its frozen copy; new test helpers `tests/helpers/{project-task-release-tracker,compaction-summary-request}.ts`; docs.
- Web: `stores/{llmProviderConfig,llmProviderConfigSupport}.ts`, `graphql/queries/llm_provider_queries.ts`, `generated/graphql.ts`, removed `utils/application/applicationLaunch.ts`; specs and two probe mocks.
- Workspace: `test-support/live-e2e/live-e2e-harness.ts` (uses the autobyteus-ts helper), `test-support/native-input-history/…` (baseline fix).
- Effective line counts (`grep -cv '^\s*$'`, base `efd28d5c4a` → now) of every touched source file (AC-003): all ≤ 500. Notable: `project-task-service.ts` 494 → 445 (target ≤ 470), `project-task-context-drafts.ts` new 55 (IR-002), `useProviderApiKeySectionRuntime.ts` 434 → 425 (IR-002), `task-context-ownership.ts` new 32, `llm-phase-summary-port.ts` 181 → 160, `llmProviderConfig.ts` 497 → 480, `agent-memory-location-service.ts` 143 → 127, `dynamic-model-source-lifecycle.ts` 165 → 158, `codex-thread.ts` 497 → 497 (one-token change, not grown), `agent-org-run-manager.ts` 470 → 470, `agent-team-run-manager.ts` 453 → 453, `standalone-agent-run-root-manager.ts` 425 → 425. Full table: `evidence/implementation/IMP-12-line-counts.log`.

## Important Assumptions

1. **Attempt numbering in the test doubles (54.2; review Residual Risk 1).** The design's example ("a compaction request right after another is the next attempt") is not enough: several suites fail an operation and then retry it with no agent request in between (server recovery fixture: `compress` called twice; autobyteus-ts event-sequence `compaction_blocked` snapshot: the retry must be attempt 1). The retry also runs on the held turn's abort signal, so the signal alone does not separate them either. `CompactionAttempts` therefore uses what the requests show plus the product's published attempt budget: a summary request continues the operation before it when it directly follows it, carries the same abort signal, and that operation still has an attempt of its mode left (`CACHED_SUMMARY_ATTEMPTS` cached, then `TRANSCRIPT_SUMMARY_ATTEMPTS` transcript; never transcript → cached); otherwise it is attempt 1 of a new operation. No label is reintroduced. Every refactored suite keeps its assertions, including the snapshot, except the release assertions whose behavior is gone.
2. **Custom prompts (Residual Risk 2).** No suite configures its own summary prompt (the summarizer always sends the two exported constants). The helper takes optional `prompts` for one that does.
3. **Helper placement.** The design names `tests/support/`; it says "no new folders", and the server keeps test helpers in `tests/helpers/`. The release tracker and the server compaction helper are in `autobyteus-server-ts/tests/helpers/`; autobyteus-ts has no helper folder, so its helper is `autobyteus-ts/tests/helpers/compaction-summary-request.ts` (one new folder there). The live-e2e harness imports the autobyteus-ts helper by relative path, as it already imports autobyteus-ts sources, instead of a third copy.
4. **157 migration tests.** By the review's rule "a test value follows the code it feeds", every `tests/app-data-migrations/**` stub that uses the old names feeds the frozen writer into a sealed migration, including `team-context-file-execution-locators-v1.test.ts` (its three stubs override the frozen `AtomicRunPackageFileCommitWriter`; the current `MessageLog` it imports is never given an outcome). They keep the released names. Every `tests/unit/**` file that used them drives current code and is renamed. `RunPackagePreRenameStage` keeps its name (out of 157's scope: outcome names only).
5. **Dead code beyond the named lines (Principle 7).** Removing the named items left more of the same code unused; it went in the same commit: the whole `applicationLaunch.ts` module (125.1), the `team_agent_run` location type and `normalizeScope` (125.2), the frozen `buildTeamCommunicationMessageId` (125.3, via the prune script), the admission function's event-name parameter (125.5), the web `ModelKind` type (54.4).
6. **54.4 provider section (IR-002, CR-001).** A discovered provider has one model source (the server builds at most one, `model-catalog-service.ts` 291/322), so `useProviderApiKeySectionRuntime` decides partial / stale / unavailable from that source's state: `hasPartialModelResult` = PARTIAL, `hasStaleModelResult` = STALE_ERROR with rows, `hasUnavailableModelSource` = ERROR or STALE_ERROR without rows. The terms only two or more sources could reach and their helpers (`hasCurrentModelRows`, `hasStaleModelRows`, `hasModelSourceProblem`) are gone; for zero or one source every state gives the same three flags as before (READY, PARTIAL with and without rows, STALE_ERROR with and without rows, ERROR, LOADING, REFRESHING, IDLE, none). The spec's multi-source cases and its test-only `rows` hint (IR-001) are replaced by single-source cases; the single-source assertions are kept. The store's "clears only the discovery-setting LLM source" case asserted a per-kind distinction the server never produces; it now asserts the one source of a discovered provider refreshing (media rows kept), renamed accordingly.
7. **E2E selections.** Three GraphQL E2E suites selected the removed `sources { modelKind … }` and would fail validation; I removed only that field from their selections and expectations (no coverage added). `real-e2e-provider-capabilities.e2e.test.ts` dropped the label argument; the live Anthropic integration test "should filter logicalConversationId…" was deleted (behavior gone; generic internal-kwarg filtering stays unit-tested).
8. **Generated types.** `generated/graphql.ts` was regenerated with codegen against a server built from this branch (owned temp data). It also picks up additive schema types earlier tickets did not regenerate (`projectId` inputs, `ProjectRunHistory`); every deletion in the diff is a `modelKind` line.
9. **159 scope.** The two streaming docs were brought to the contract; short mentions elsewhere were corrected. `docs/features/task_agent_identity_future_improvements.md` is built entirely on the removed `TeamExecutionAddress` / `agent_execution` identity (its "current healthy boundary" and improvements 1, 3, 6); fixing it means rethinking the note, so it is listed here (requirements: "list other stale doc mentions found") for delivery or the Solution Designer.

## Known Risks

Answers to the review's Residual Risks:

- **Retry counting (RR 1)** — see Assumption 1; the cases that would have broken (retry after a failed operation) are covered by the suites that now pass.
- **Custom summary prompts (RR 2)** — Assumption 2.
- **Drift since `efd28d5c4a` (RR 3)** — re-ran every item's search before changing it: the code at `ebc5277e52` equals `efd28d5c4a` outside the ticket folder and `DESIGN.md`; results matched the notes. Additions: `autobyteus-ts/docs/agent_memory_design.md` also described `releaseConversation` (updated); archived `autobyteus-ts/tickets/done/*` mention the label (not touched).
- **Line counts and AC-001/AC-006 searches (RR 4)** — IMP-02 and IMP-12.
- **Parallel work.** The branch is 11 commits behind `origin/personal` (other tickets); delivery re-integrates.

Other:

- **Terminal tests under full-suite load (autobyteus-ts).** In the full autobyteus-ts run, 4 terminal tests failed with `Command failed: ps -axo …`. Cause: `ProcessGroupObserver.read` runs `ps` with a timeout of at most 500 ms; under the full suite's parallel load the listing exceeded it and `execFile` killed it (idle it takes 0.04 s over ~870 processes). The same three files pass alone (27/27). Terminal code is not touched by this change. Whether that 500 ms limit should hold under heavy machine load is for the terminal owner (the reviewer recorded it as FU-003); not a defect of this change.
- **Reload toast on a failed reload (observation, outside scope; the reviewer recorded it as FU-002).** In IMP-11, "Reload Models" with the endpoint down shows the stale notice and also the toast "Models reloaded for Fake Gateway": `useProviderApiKeySectionRuntime.reloadSelectedProvider` reports success whenever the mutation returns, also when the source comes back `STALE_ERROR`. That file is unchanged by this ticket; for the Solution Designer to decide whether it becomes a follow-up.
- **Two shared-worktree documents are not mine:** the reviewer's `design-review-report.md` and `architecture-review-revision-record.md` are untracked, and `solution-revision-record.md` has the Solution Designer's uncommitted receipt. I did not stage them.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (with one Refactor, 147).
- Reviewed root-cause classification: Legacy Or Compatibility Pressure; File Placement Or Responsibility Drift (147).
- Reviewed refactor decision: `Refactor Needed Now` (147).
- Implementation matched the reviewed assessment: `Yes` — the drafts concern moved (not the runtime port), with the shared ownership checks in one owner.
- If challenged, routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no aliases for the renamed outcomes, no unused `modelKind`, no kept drain)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (Assumption 5)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`ModelSourceStatus` lost a field; `ProjectTaskService` deps unchanged; new owners have only their operations)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest touched 497, unchanged)
- Notes: frozen copies and sealed migrations keep released names by rule (not legacy retention).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`.
- Implementation follows the decision: `Yes` — no stored file, record or name changes; 157's names are in-process results (the sealed migrations keep reading through frozen writers).
- Evidence: IMP-06 (persistence and migration suites).
- Deviation: `None`.

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` in the fresh worktree; `nuxi prepare` for the web; server `prebuild` (also builds autobyteus-ts `dist`) and `build`. Untracked build outputs (`autobyteus-application-*/dist/`) not staged.
- The secret-management E2E suites run the built server CLI (`dist/secret-management/cli/test-vault-cli.js`); they failed with "Cannot find module" when run before any server build in this worktree (a prerequisite, not this change). Only their `modelKind` selections were edited; run them after a build.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/code-quality-leftovers/tickets/in-progress/code-quality-leftovers/evidence/implementation/`. Every log has a header with command, commit and date.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `d7b11c57b6` | macOS, Node 22 | server `src` | REQ-001, REQ-005 | Pass | `IMP-01-server-typecheck.log` | `exit=0`, no `error TS` |
| IMP-02 | `git grep` per removed/renamed name (list in the log) | `d7b11c57b6` | — | whole repository | AC-001, AC-005, AC-006 | Pass | `IMP-02-searches.log` | every AC-001 name `0 hits`; source `modelKind` `(end)` with nothing above; AC-006 `(end)` with nothing above; AC-005 only the two `agent_execution.md` links |
| IMP-03 | `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit`; `tsc -p tsconfig.json --noEmit` compared with the same on `ebc5277e52` | `d7b11c57b6` (comparison on `0eda6aafe4` content) | macOS, Node 22 | autobyteus-ts sources; sources + tests | REQ-005 | Pass | `IMP-03-autobyteus-ts-typecheck.log` | build config `exit=0`; `183` now and `183` at the base (the tests config carries pre-existing errors; the sets differ only by worktree path) |
| IMP-04 | `pnpm -C autobyteus-ts test`; the 3 terminal files alone; `ps` timing | full run on `0eda6aafe4` content (autobyteus-ts unchanged since but docs); reruns on `d7b11c57b6` | macOS, Node 22 | whole autobyteus-ts suite incl. compaction, loop, provider tests | REQ-005, AC-002 (compaction), AC-006 | Pass (4 terminal tests failed under full-suite load; cause in Known Risks; they pass alone) | `IMP-04-autobyteus-ts-test.full.log` | `Test Files  3 failed \| 396 passed \| 22 skipped (421)` with the 4 terminal names; then `Test Files  3 passed (3)`, `Tests  27 passed (27)`; `real 0.06` |
| IMP-05 | Server recovery-fixture suites (4 unit + 3 integration), the live-e2e harness suites (the two real-e2e files skip without `RUN_REAL_E2E`), `pnpm test:native-input-history` | `d7b11c57b6` | macOS, Node 22 | the 54.2 readers: `recovery-native-fixture.ts`, harness, native-input-history | AC-006, REQ-006 | Pass | `IMP-05-compaction-readers.log` | `Test Files  10 passed \| 2 skipped (12)`, `Tests  63 passed (63)`; native-input-history `Tests  2 passed (2)` |
| IMP-06 | `pnpm -C autobyteus-server-ts test:unit` | `d7b11c57b6` | macOS, Node 22 | whole server unit suite (projects 147/178 incl. the 18 tracker users, 157 persistence, 54.3, 125.x, architecture guards, `tests/app-data-migrations`) | REQ-001…003, REQ-005 | Pass | `IMP-06-server-test-unit.full.log` | `Test Files  902 passed \| 5 skipped (907)`, `Tests  7659 passed \| 9 skipped (7668)` |
| IMP-07 | `pnpm -C autobyteus-web typecheck` | `d7b11c57b6` | macOS, Node 22 | web app, Electron main, build scripts, regenerated types | REQ-005 | Pass | `IMP-07-web-typecheck.log` | `production errors: 0; test-file errors: 298 in 139 files (baseline 298 in 139 files)`, `[typecheck] PASS` |
| IMP-08 | `pnpm -C autobyteus-web test:nuxt --run` | `d7b11c57b6` | macOS, Node 22 | whole web suite incl. provider store, section, composable specs | REQ-002, REQ-005 | Pass | `IMP-08-web-test-nuxt.full.log` | `Test Files  678 passed (678)`, `Tests  4917 passed \| 2 skipped (4919)` |
| IMP-09 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `d7b11c57b6` | macOS | web boundaries and catalogs | REQ-005 | Pass | `IMP-09-web-guards.log` | `Passed.` ×2, `Passed with zero unresolved findings.` |
| IMP-10 | `vitest run tests/e2e/projects` + the three GraphQL E2E suites whose `modelKind` selection was removed | `d7b11c57b6`, dist from IMP-13 | macOS, test-owned server and DB | projects GraphQL/REST (incl. `project-task-boundaries` context-file routes), custom-provider catalog GraphQL | AC-004, REQ-002 | Pass (gated scripted-runtime suites skip without their gate) | `IMP-10-server-e2e.log` | `Test Files  10 passed \| 24 skipped (34)`, `Tests  64 passed \| 101 skipped (165)`; `project-task-boundaries` 18 passed, the three edited suites 3 + 5 + 6 passed |
| IMP-11 | `env -i … node <ev>/settings-sources-check.mjs --output-dir <ev>/IMP-11-settings` | `d7b11c57b6`, dist from IMP-13 | macOS, Chrome headless, script-owned stack, fake OpenAI-compatible endpoint | Settings provider section, store, query, GraphQL sources | AC-002, REQ-002 | Pass | `IMP-11-settings-check.log`, `IMP-11-settings/evidence.json`, `IMP-11-settings/*.png` | `settings sources check: Pass`; `distinctSourceKeySets` = `__typename,failedUnitCount,modelCount,safeMessage,state,successfulUnitCount`; `errors: []`; cleanup `dataRootRemoved: true` |
| IMP-12 | effective line counts, base → now | `d7b11c57b6` | — | every touched source file | AC-003, REQ-003 | Pass | `IMP-12-line-counts.log` | `494 -> 445  …/project-task-service.ts`; no value above 500 |
| IMP-13 | `pnpm -C autobyteus-server-ts prebuild && build` | `d7b11c57b6` | macOS, Node 22 | server dist for IMP-10, IMP-11, IMP-14 | — | Pass | `IMP-13-server-build.log` | `Built-in agents bootstrap smoke check passed.` |
| IMP-14 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<repo>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs vitest run task-closure-root-visibility, project-task-context-files-delegation` | `d7b11c57b6` | macOS, scripted AGY runtime (no provider) | DONE closure releasing runs on real Agent, Team and Org roots (178); Task context files through delegation (147) | REQ-002 | Pass | `IMP-14-scripted-e2e.log` | `Test Files  2 passed (2)`, `Tests  4 passed (4)` |
| IMP-15 | codegen against this branch's built server (owned temp data) | `7e79df3b05` | macOS | `generated/graphql.ts` | AC-001 (54.4) | Pass | `IMP-15-graphql-codegen.log` | deleted lines: `6` with `modelKind`, `0` without |
| IMP-16 | (IR-002) web provider/store specs; web and server typechecks; server projects + architecture tests; searches for the removed names | `534ad1f55e` content | macOS, Node 22 | `useProviderApiKeySectionRuntime` and its spec, provider store, `project-task-context-drafts.ts` | CR-001, CR-002; REQ-002, REQ-006 | Pass | `IMP-16-ir002-checks.log` | `Test Files  170 passed (170)`; `[typecheck] PASS`; server `exit=0`; `Test Files  42 passed (42)`; searches `(end)` with nothing above |
| IMP-17 | (IR-002) the IMP-11 Settings check rerun on the changed composable | web `534ad1f55e` content, server dist from IMP-13 | macOS, Chrome headless, script-owned stack | provider section notices from the single source | AC-002, CR-001 | Pass | `IMP-17-settings-check.log`, `IMP-17-settings/` | `settings sources check: Pass`; checks `ready`, `staleAfterReload`, `lmStudioUnavailable` |

- Also run per step while implementing (superseded by the full runs above): affected server tests after step 1 (43 files) and step 2 (230 files); the refactored doubles green **before** the label was removed (autobyteus-ts runtime compaction and event-sequence, the server fixture suites, native-input-history), as the design's step 3 requires.
- Still valid after IR-002 (it changed only the provider section composable and spec, and removed one export nothing called): IMP-01…IMP-06, IMP-09, IMP-10, IMP-12…IMP-15 (no code they exercise changed, apart from the uncalled export). IMP-07 and IMP-08's provider part are rerun in IMP-16; IMP-11 in IMP-17.
- Not run, and why: the other gated scripted-runtime projects E2E suites (22 files; API/E2E's); the live-e2e harness on real credentials (`pnpm test:e2e:real` with the test vault; its new order-based check at line 928 is exercised only there); the secret-management E2E suites other than the two edited ones; the desktop shell / isolated instance; Ollama and PARTIAL in a browser.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings → API keys → provider list and provider model section for dynamic sources (54.4). No visual change intended.
- References: requirements AC-002; the existing provider section (`ProviderModelBrowser.vue`, `ProviderModelSection.vue`).
- Rendered surface: script-owned stack (built server + Nuxt dev, headless Chrome 1440×900), per TESTING.md's owned-stack rule; a fake OpenAI-compatible endpoint for a custom provider; LM Studio pointed at a closed port.
- States inspected: custom provider READY with its two models; endpoint stopped then "Reload Models" → models kept with "Could not refresh models. Showing last known models." (STALE_ERROR); LM Studio → "Models unavailable" (ERROR). Screenshots inspected.
- Issues found and corrected: none.
- Remaining unverified: Ollama and PARTIAL (one host of several failing) in a browser (store/composable specs cover PARTIAL); the desktop shell.

## Downstream Coverage Hints / Suggested Scenarios

- Settings → providers with a real LM Studio or Ollama host: READY, then host down + Reload → stale notice; a discovery-host setting change converges.
- A real compaction on a live model (`pnpm test:e2e:real` with the test vault) exercises the live-e2e harness's new order-based summary check (line 928 replacement).
- Server E2E for projects and the REST context-file routes (create a Task with an uploaded context file; read it back).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Everything in "Not run" above; the live-e2e harness on real credentials (AC-006 "where credentials allow").
