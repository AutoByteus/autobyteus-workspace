# Investigation Notes

## Investigation Meta

- Package identifier: `APP-STARTUP-LATENCY-20260918-001`
- Request / ticket: Analyze slow Electron application startup on the unreleased flat Agent Organization branch.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis` / `codex/application-startup-latency-analysis`
- Resolved base remote / branch / revision: `origin/requirements/flat-agent-organization-model` / `4e84b76a918253da22fd4a382c653cb47744dc6c`
- Finalization target remote / branch: `origin/requirements/flat-agent-organization-model`
- Bootstrap result: Completed in a dedicated isolated worktree after refreshing the requested base; local and remote base were identical.
- Bootstrap blocker: None.
- Current solution revision ID: `SR-011`
- Investigation status: `Cumulative SR-010 requirements remain approved; ARCH-REV-006 / ARCH-F-004 investigated; SR-011 typed token-data rejection design recovery complete and ready for repeated review.`

## Initial Request And Clarifications

- Original request: The latest Electron build from the Agent Organization base branch has a slow application startup; bootstrap a new ticket and analyze why because the feature branch is not yet merged to production.
- Clarification and authorization: The user shut down their Electron app and explicitly asked Solution Designer to start the exact base-worktree Electron build and investigate it.
- Constraints: Use `origin/requirements/flat-agent-organization-model`, not `personal`; preserve user data; this is investigation of an unreleased feature branch.

## Product And Domain Understanding

- Product area: Desktop application startup, embedded-server readiness, collaboration root-package admission, history availability, and historical attachment access.
- Existing user purpose: A normal launch should reach a usable workspace without startup work proportional to all retained conversation/trace bytes.
- Supported startup path: Electron creates its window, spawns the embedded server, waits for its health check, and then exposes the normal application against that server.

## Evidence Index

### E-001 — Exact base Electron launch reproduced the delay

Started the packaged app from:

`/Users/normy/autobyteus_org/autobyteus-worktrees/flat-agent-organization-model-base/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

The exact source/base revision recorded for the build was `4e84b76a918253da22fd4a382c653cb47744dc6c`. The launch used the user's normal profile after they had shut down their own Electron process. No data repair, reset, migration, or provider action was performed.

Sanitized milestones from `/Users/normy/.autobyteus/logs/app.log` are retained in `validation/electron-fresh-start-timing.json`:

| Milestone | Elapsed from app start |
| --- | ---: |
| Window created | 0.349 s |
| Embedded server process spawned | 1.061 s |
| Prisma started | 2.746 s |
| Prisma migrations completed | 3.116 s |
| Flat/Org migration warning emitted | 3.318 s |
| Server settings initialized | 30.269 s |
| Server listening | 30.760 s |
| First successful server health check | 30.928 s |

The Electron window and server spawn are fast. The dominant gap is **26.951 seconds** between the migration warning and settings initialization. After settings initialize, readiness takes only 659 ms.

### E-002 — The repeating failed migration is not the measured bottleneck

The launch logs truthfully report that `20260901_agent_org_flat_team_families_v1` remains `FAILED` with eight items requiring correction. The current migration attempt completes in a small fraction of one second on this profile before the 26.951-second gap begins. It repeats because its status is failed, but it does not account for the observed wait. This ticket must not suppress or claim to repair it.

### E-003 — Server readiness performs a full collaboration-package generation before listen

`autobyteus-server-ts/src/server-runtime.ts` runs pending app-data migrations and then awaits:

`new RootRunPackageReadinessIndex(config.getMemoryDir()).rebuild()`

before building/listening with the HTTP server. Settings initialization is the first visible log immediately after this readiness prerequisite, matching the measured gap.

`git blame` attributes the flat-branch startup readiness call to commit `37d05c7f71`. The readiness-index source does not exist on `origin/personal`; this blocking step is specific to the flat AgentOrg work rather than generic Electron startup.

### E-004 — Exact packaged read-only probe reproduces the same duration

`validation/readiness-cold-readonly-probe.mjs` imports the exact packaged server implementation from the base Electron build and invokes one fresh-process readiness rebuild against the real memory root. It requests no writes or mutations and retains only aggregate counts/timings/bytes. Output: `validation/readiness-cold-readonly-probe.json`.

Result:

- Total duration: **29,524 ms**
- Admitted Team roots: 307
- Admitted AgentOrg roots: 17
- Diagnostics: 219
- File reads: 11,739
- Total bytes read: 5,873,157,043 (5,601 MiB)
- Raw-trace reads: 5,695
- Raw-trace bytes read: **5,764,604,776 (5,497.556 MiB)**

The independent duration closely matches the ~27-second launch gap.

### E-005 — Historical raw-trace parsing, not root enumeration, dominates

The same probe instrumented current implementation stages:

| Stage | Calls | Aggregate duration |
| --- | ---: | ---: |
| List Team/Org family roots | 2 | 18.993 ms |
| Inspect Team structural package | 526 | 457.169 ms |
| Inspect Org structural package | 17 | 22.402 ms |
| Validate Team context-file records | 825 | 28,298.674 ms |
| Validate Org context-file records | 34 | 728.622 ms |

More than 95% of measured readiness time is the context-file validation stage. Directory discovery and structural Team/Org inspection together are well below one second on the representative profile.

### E-006 — Current context validation opens every member trace segment

`root-run-package-readiness-index.ts:225–241` constructs `RootPackageContextFileValidation` after structural inspection and repeatedly validates every admitted Team and Org until dependency exclusions settle.

`root-package-context-file-validation.ts:24–42` discovers all member agent directories, lists every `raw_traces_active.jsonl` and archived `raw_traces_*.jsonl` source, reads each whole file as UTF-8, parses every JSONL record and validates attachment locators. The fixed-point loop can repeat already-validated roots after any candidate exclusion. This makes server readiness proportional to retained trace bytes rather than current structural authorities.

### E-007 — Exact attachment access already resolves the current owner and file

Current production REST routes distinguish Team and AgentOrg owners:

- `/rest/team-runs/:teamRunId/members/:memberAddress/context-files/:storedFilename`
- `/rest/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename`

`ContextFileOwnerResolver` resolves the exact execution from the current stored Team/Org tree and rejects a missing or mis-correlated owner. `ContextFileLayout` constructs a safe child under the resolved execution memory directory and `assertStoredFilename` rejects unsafe names. `ContextFileReadService` checks that the resolved path is an actual file and returns no path when it is absent. The REST boundary maps shaped-but-missing Org owners/files to `404` and invalid descriptors to `400`.

### E-008 — Existing attachment tests establish the supported access path

Current integration coverage in:

- `autobyteus-server-ts/tests/integration/api/rest/agent-org-context-files.integration.test.ts`
- `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts`

exercises upload/finalize/read ownership, stored identity, unavailable owners/files, and same-owner retrieval. These tests are evidence for retaining exact on-demand validation; they are not sufficient alone for the new startup boundary.

### E-009 — Security and data-integrity boundary of the proposed behavior

Removing the global trace scan must not mean serving locators blindly. The safe product boundary is:

- current root structural authorities are validated before admission;
- history records remain available without globally opening old trace files during startup;
- when the user opens an attachment, the current REST read validates descriptor shape, exact root/member ownership, safe filename/path and file existence;
- a bad historical attachment fails at that access, not by hiding the entire otherwise-valid root.

This changes the timing and granularity of historical attachment failure, so it is explicitly presented for user approval in `BEH-002` / `DEC-001` rather than silently treated as implementation detail.

### E-010 — Earlier AgentOrg history-latency ticket was correct but intentionally retained this startup scan

The reopened `ORG-HISTORY-LATENCY-20260917-001` ticket correctly removed a *second* readiness rebuild triggered by first AgentOrg history initialization. Its investigation measured that duplicate generation at 26.657 seconds, and its design explicitly preserved `server-runtime.ts` as the owner of one readiness rebuild before HTTP listen. The current ticket addresses that remaining single global startup generation's expensive historical-payload work; it does not invalidate the prior fix.

### E-011 — The migration already owns transformation and strict postcondition validation

The user's explanation is confirmed by source. `AgentOrgContextFileLocatorTransition.prepareAndCommit()` discovers the selected roots' trace/task/message sources, reads every selected source, calculates the target locators, records source/target hashes and dependencies, then rereads the unchanged source immediately before writing. After an atomic write it rereads the exact persisted bytes and re-runs the transform to prove each locator has reached the current target (`agent-org-context-file-locator-transition.ts:40–99`).

`validateRoot()` scans the converted root again and rejects any uncommitted locator transition (`:102–118`). `validateCompleteOrgRunPackage()` invokes that locator validation and validates the execution tree, task records, communication messages and complete Org state both before and after the physical family move (`agent-org-flat-team-families-v1-app-data-migration.ts:143–180`).

Therefore the later readiness-wide locator scan is not the only correctness proof for migration. It is a duplicate, recurring audit of work that belongs to the one-time migration. The correct ownership distinction is: migration validates conversion and records its outcome; normal readiness validates current structural authorities; actual attachment access validates the requested owner/path/file.

### E-012 — Original `personal` startup already had bounded package admission, not a historical trace audit

The original `personal` branch is not a zero-validation comparator. Its `server-runtime.ts` awaited `TeamRunPackageCatalog.rebuild()` before building the server. That catalog enumerated current Team root directories and loaded/validated each Team execution tree, task sidecar and communication sidecar. It did not import `RootPackageContextFileValidation`, enumerate raw-trace segments, or parse attachment locators.

The flat AgentOrg branch replaced that Team-only catalog call with the shared `RootRunPackageReadinessIndex` so both Team and AgentOrg current packages can be admitted under one family-aware generation. That extension is legitimate AgentOrg-specific startup work. The regression is the additional `RootPackageContextFileValidation` fixed-point audit appended after structural Team/Org inspection. Removing that audit restores the original startup responsibility while retaining the necessary second family.

### E-013 — User-approved missing-attachment behavior

The user explicitly resolves the availability policy: startup must trust the migration and completely remove the recurring post-migration attachment audit. If a historical attachment does not exist, it is a runtime access error; that attachment cannot be accessed. It is not a reason to exclude the complete Team/AgentOrg history root or fail the application server.

### E-014 — The recurring attachment auditor has one production owner and can be removed cleanly

A repository-wide source search finds `RootPackageContextFileValidation` imported and instantiated only by `root-run-package-readiness-index.ts`. No route, migration, provider-input path, catalog facade, or other production service calls it. Removing the import and the fixed-point attachment-validation block leaves the readiness index's existing family collision checks, required/retired manifest checks, strict Team/AgentOrg tree-plus-sidecar validators, shared generation state, diagnostics, and mutation revision behavior intact. The now-unreferenced `root-package-context-file-validation.ts` should be deleted rather than retained as a dormant compatibility path. `context-file-record-locators.ts` remains owned and used by the migration and is not removed.

### E-015 — Existing access enforcement and affected tests define the bounded implementation surface

`context-files.ts` constructs one `ContextFileReadService` backed by `CollaborationExecutionLocationService`, `ContextFileOwnerResolver`, and `ContextFileLayout`. For both final Team and AgentOrg routes, the request supplies the explicit collaboration-root/member identity and stored filename; the service resolves the current physical execution, enforces safe filename/path construction, stats the exact file, and returns `404` when it is absent. This is the existing runtime boundary that implements the approved missing-attachment behavior; no new cache, alternate reader, or compatibility route is needed.

The readiness owner test currently covers structural admission but not independence from raw-trace payload. The migration locator test contains two readiness-specific assertions that encode the obsolete whole-root exclusion policy after migration: deleting an already-migrated attachment excludes the Org (`:134–139`), and a later invalid current target in a raw trace excludes the Org (`:209–212`). Those expectations must be revised so the migration continues to reject invalid transformation input during its own transaction while later structural readiness remains payload-independent. Exact valid-owner/missing-file `404` coverage should exist for both final Team and Org routes.

### E-016 — Investigation-owned Electron process was shut down cleanly

The exact base Electron main process and its embedded server started for this investigation were terminated after evidence collection. Process verification confirmed both exact PIDs exited. No unrelated application process, data, provider, migration, or repository state was changed.

### E-017 — `CRR-001` proved the Team final route misclassifies an unsafe stored filename

The first implementation correctly removed the recurring startup audit and preserved its migration and access boundaries, but Code Review strengthened the changed Team REST assertion from “not 200” to the approved exact `400`. The focused probe reproduced `500` (`validation/crr001-team-context-status-probe.log`). Source explains the result: the final Team GET in `src/api/rest/context-files.ts:210–223` does not catch `ContextFileDescriptorError`; `ContextFileLayout` calls `assertStoredFilename`, which throws that typed error for `../secret.txt`. The corresponding AgentOrg final GET already maps `ContextFileDescriptorError` to `400`. No unsafe bytes are exposed, but the Team transport reports a supported client-invalid retained locator as an internal failure.

### E-018 — Team owner absence lacks the typed `404` boundary already present for AgentOrg

`ContextFileOwnerResolver.result()` throws `OrgContextFileOwnerNotFoundError` for a shaped but absent/mis-correlated Org owner, and the Org route maps it to `404`. The Team branch instead throws a generic `Error` when the exact containing Team/member cannot be resolved. A stale retained Team locator can therefore escape as `500`, even though `AC-004` governs missing, malformed and stale attachment access. The narrow coherent target is a subject-specific `TeamContextFileOwnerNotFoundError`, a Team final-route `404` mapping, and explicit `400` mapping only for typed invalid Team request descriptors/filenames. Unexpected errors must continue to propagate; no catch-all suppression is authorized.

### E-019 — Preserved failed-migration retry necessarily writes bounded ledger metadata

`CRR-003 / CR-002` traced normal startup through `startStandaloneApplicationHost -> AppDataMigrationRunner.runPending()`. Every required migration not already `SUCCEEDED` is retried. `markRunning()` increments `attempts` and timestamps; completion persists the final status/summary. Three owned fresh starts advanced the failed flat-Team/AgentOrg migration from attempt 23 to 26, and the browser backend advanced it to 27. The SQLite hash changed, while the status and summary remained `FAILED` / “Scanned 526; migrated 0; skipped 518; failed 8.”

### E-020 — Target/user data remained stable and the startup objective passed

The authoritative owned comparison found definitions, 6,577 raw traces, 1,107 context files, 5,618 history/runtime files, configuration and provider state unchanged. The migration changed zero target items. All three fresh starts completed below 10 seconds with zero readiness-owned raw-trace reads. The failure is therefore not the startup-removal implementation, the attachment mapping, or data mutation by readiness; it is the requirements contradiction between intentionally preserved migration bookkeeping and literal whole-database byte invariance.

### E-021 — The eight current items are incomplete legacy sources, not migration machinery failures

The exact latest owned migration log records `scanned=526`, `skipped=518`, `failed=8`, with one `FAILED_RUNTIME` group. All eight examples are legacy `team_classroomsimulation_*` source directories whose `team_run_execution_tree.json` is absent (`ENOENT`). The migration safely left them unchanged and performed no new target migration. This directly supports the user's distinction: source candidates that cannot be converted are item-level warnings after a completed scan, not evidence that the migration mechanism itself failed.

Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/.local/api-startup-profile/logs/app-data-migrations/20260901_agent_org_flat_team_families_v1-2026-09-18T10-02-30-048Z.log` (private validation evidence; never attach or commit its contents without redaction).

### E-022 — Terminal warning status and runner behavior already exist

`AppDataMigrationStatus` already includes `SUCCEEDED_WITH_WARNINGS`. `AppDataMigrationRunner.runPending()` treats both `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` as terminal and skips execution without calling `markRunning`, incrementing attempts, rewriting timestamps or producing a new log. Prerequisite evaluation likewise accepts both statuses. No shared status-schema or runner change is required.

The specific flat-Team/AgentOrg migration collapses every nonzero `failedCount` to overall `FAILED` in `result()`. This migration-specific classification is the incorrect boundary. Other released migrations already use `SUCCEEDED_WITH_WARNINGS` for completed scans containing isolated item failures.

### E-023 — A blanket warning remains unsafe; warning eligibility must be source-scoped

The flat-family migration reuses `FAILED_RUNTIME`, `FAILED_TOKEN` and `FAILED_HISTORY` for different scopes. A one-line `failedCount ? SUCCEEDED_WITH_WARNINGS` change would hide attempt-wide authority failures and unsupported partial-effect cases. The public result therefore needs an explicit distinction between evidence-backed isolated root limitations and attempt-wide/global failures. Existing item detail and `failedCount` remain truthful even when the top-level outcome is terminal warning.

### E-024 — Historical `ARCH-F-001` identified the cross-store partial-effect risk

`ARCH-REV-003 / ARCH-F-001` traced the existing order: locator/runtime filesystem effects can occur before token conversion. That finding correctly rejected the earlier generic “source warning” design and remains historical evidence. It does not prove that every token failure must be attempt-fatal: the current token transition already returns failures by exact root, and the repository provides a root-scoped SQL transaction. The revised boundary must explicitly accept the affected root's local unavailability instead of claiming that it stayed wholly unchanged.

### E-025 — Missing execution-tree roots are warning-safe before any candidate effect

`AgentOrgHistoryCandidatePlanner.plan()` reads each required legacy Team execution tree. For the eight observed directories the file is absent, so no `HistoryCandidatePlan` is appended. Locator/runtime/token/index/retirement stages consume only emitted plans. These eight roots therefore remain unchanged and can be reported as isolated terminal warnings without conversion reordering.

### E-026 — Flat-family `FAILED` does not itself abort the server host

`AppDataMigrationRunner.runPending()` catches a migration execution error, persists `FAILED`, and continues processing. `server-runtime.ts` and `start-standalone-application-host.ts` log required migrations that remain `FAILED`/`RUNNING` but continue toward readiness/server construction. Therefore process-listen success alone cannot classify every condition. For this migration, “normal operation” must be evaluated against whether unaffected data and required current authorities remain usable; mandatory current token schema readiness is a separate pre-migration prerequisite that can abort startup and is unchanged.

### E-027 — Approved token-data rejection is transactional and locally guarded

`AgentOrgTokenAttributionRepository.convertRoot()` performs one root's token conversion inside a database transaction. The approved data-rejection causes inside that transaction are: an unexpected claimant outside the selected Org members, malformed/unparseable `identity_summary_json`, a non-object identity summary, or a conflicting legacy attribution tuple. These represent source token-attribution data that cannot be converted. They occur before a successful commit, so the root transaction rolls back. Later, `TokenUsageRunStore.assertAgentOrgRecordsReady()` rejects restoration of that affected Org with `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY`; unrelated application/root operation can continue.

The repository also throws for materially different causes: database query/update failure, changed update precondition, strict allowed-difference reread failure and unknown errors. Those are operational/concurrency/postcondition failures and are not warning-eligible merely because they arise during one root call.

### E-028 — Attempt-wide owners remain fatal and dominate warnings

The same source exposes materially different scopes. Failure to enumerate token roots or access the token database throws from the transition rather than returning one root failure. Planner failure to read/validate the global history indexes prevents a trustworthy cohort. Global locator orchestration failure can affect every plan. `AgentOrgHistoryIndexTransition.commit()` owns paired Team/Org index publication and strict reread; failure means the attempt cannot establish coherent global history authority. These attempt-wide conditions remain `FAILED`/retryable and override any root warnings. Unsupported per-root locator/runtime/write/reread/cleanup/dependency and malformed tree/sidecar/family cases also remain fatal because their persisted-effect/usability consequence has not been separately approved.

### E-029 — `ARCH-REV-005 / ARCH-F-003` is resolved by two concrete warning categories, not a framework

The user approved failure only for conditions that prevent safe normal operation, explicitly asked whether failed token rows would stop startup, accepted the explained local-Org readiness limitation, confirmed that the migration is about 98.5% current/accepted in the observed profile rather than a pass-rate claim, and answered “yessss” to the resulting status-classification-only recovery. The approved warning set is therefore limited to the two evidence-backed categories in `E-025` and `E-027`. No generic issue model, cross-store preparation layer, conversion reorder, new migration or runner redesign follows from that approval.

### E-030 — `ARCH-F-004` proves root-keyed is not cause-typed

`ARCH-REV-006 / MP-004` independently traced `AgentOrgTokenAttributionTransition.execute()`: one broad per-root `try/catch` currently catches root-ID validation, Team/Org family collision, current Org tree read/validation and every repository exception into the same `failures` map. That map therefore mixes the approved token-data rejection with structural, SQL-operational, concurrency/precondition, reread and unknown failures. `SR-010`'s returned-map rule was technically unsafe.

The narrow correction is migration-local and design-only: introduce a typed `AgentOrgTokenAttributionDataRejection` (or equivalently explicit discriminated result) at the repository boundary for only the approved data conditions. The transition returns separate `warnings` and `failures` maps; it catches the typed rejection into `warnings` and every other root exception into `failures`. Global discovery still throws. The coordinator blocks both kinds of affected roots from completion, but only the typed warnings are excluded from `fatalFailedCount`. No generic framework or conversion reorder is needed.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding |
| --- | --- | --- | --- | --- |
| 2026-09-18 | User | Current request and launch authorization | Establish symptom, target and permission | Exact base Electron may be started after user shutdown |
| 2026-09-18 | Git | Fetch/revision comparison | Establish authoritative base | Local/remote target both `4e84b76a918253da22fd4a382c653cb47744dc6c` |
| 2026-09-18 | Runtime log | `/Users/normy/.autobyteus/logs/app.log` | Time real launch critical path | 30.928 s to ready; 26.951 s pre-settings gap |
| 2026-09-18 | Read-only packaged probe | `validation/readiness-cold-readonly-probe.mjs` / `.json` | Isolate readiness owner and I/O | 29.524 s; 5,497.556 MiB of raw traces read |
| 2026-09-18 | Source | `server-runtime.ts`; `root-run-package-readiness-index.ts`; `root-package-context-file-validation.ts`; `context-file-record-locators.ts` | Trace blocking path | Exhaustive historical payload validation is awaited before listen |
| 2026-09-18 | Source | `context-files.ts`; `context-file-owner-resolver.ts`; `context-file-read-service.ts`; `context-file-layout.ts` | Assess safe on-demand boundary | Exact owner, safe filename/path and file existence are validated on access |
| 2026-09-18 | Comparison | `origin/personal`; git blame | Determine branch specificity | Startup readiness owner introduced on flat branch; absent on personal |
| 2026-09-18 | Prior finalized package | `tickets/done/org-history-startup-latency/*` | Reconcile previous fix | Previous fix removed duplicate first-read rebuild but intentionally kept one startup rebuild |
| 2026-09-18 | Migration source | `agent-org-context-file-locator-transition.ts`; `agent-org-flat-team-families-v1-app-data-migration.ts` | Test the user's migration-ownership explanation | Migration already preflights, transforms, strict-rereads and validates the converted target |
| 2026-09-18 | Branch comparison | `origin/personal:server-runtime.ts`; `origin/personal:team-run-package-catalog.ts` | Establish intended startup parity | Personal performs bounded Team structural admission, not historical trace/attachment audit; target retains that responsibility for Team+Org |
| 2026-09-18 | User | Current thread approval statements | Resolve availability and migration ownership | Remove recurring audit completely; missing attachment is a request-scoped runtime access error |
| 2026-09-18 | Source/reference search | Production TypeScript references to `RootPackageContextFileValidation` | Prove clean-cut removal scope | Sole production consumer is the readiness index; file becomes dead after removal |
| 2026-09-18 | Tests and REST access source | Readiness/migration locator tests; `context-files.ts`; read/owner/layout services | Map changed policy to durable coverage and existing enforcement | Revise two obsolete readiness expectations; preserve migration checks; add exact missing-file access proof |
| 2026-09-18 | Process verification | Exact base Electron PID/process path | Clean up investigation runtime | Investigation-owned Electron main/server both exited |
| 2026-09-18 | Code Review | `code-review-report.md` / `CRR-001`; `validation/crr001-team-context-status-probe.log` | Validate exact Team request-local contract | Unsafe final Team filename is denied but returned as `500`, contradicting approved `400` |
| 2026-09-18 | Source | `context-files.ts`; `context-file-owner-resolver.ts`; descriptor/address types | Identify exact typed outcome boundary | Team lacks descriptor-to-400 and owner-not-found-to-404 mapping; Org already has the bounded pattern |
| 2026-09-18 | Code Review / API evidence | `CRR-003 / CR-002`; `validation/api-e2e/p01-preservation-result.json`; `three-launch-summary.json`; migration runner/repository/startup host | Resolve P01 database-hash failure origin | Failed migration retry advanced only ledger attempts/timestamps; protected target/user data remained unchanged; requirements are contradictory |
| 2026-09-18 | User | Requirement recovery clarification and approval | Resolve `DEC-003` | Unconvertible source items mean overall migration succeeded with warnings; do not mark/retry as failed |
| 2026-09-18 | Private owned migration log | `.local/api-startup-profile/logs/app-data-migrations/20260901_agent_org_flat_team_families_v1-2026-09-18T10-02-30-048Z.log` | Identify the eight item causes | All eight are missing legacy Team execution-tree files; 518 current flat Teams were skipped; no target item migrated |
| 2026-09-18 | Source/tests | migration status types, runner, flat-family migration/result method, migration unit tests, warning-status precedents | Design safe terminal classification | Shared terminal warning support exists; the candidate planner can expose the exact missing-tree no-plan result separately while all existing conversion failures remain fatal |
| 2026-09-18 | Architecture Review | `design-review-report.md` / `ARCH-REV-003`; `architecture-review-revision-record.md` | Review SR-008 cross-store safety and evidence coherence | Current token-source warning is discovered after filesystem effects; canonical supplemental inventory is incomplete |
| 2026-09-18 | User + Architecture Review follow-up | Current thread; `ARCH-F-001`; migration coordinator/planner and token regressions | Historical SR-009 narrowing | Narrow warning classification to planner-proven missing execution trees; no cross-store framework |
| 2026-09-18 | Architecture Review | `design-review-report.md` / `ARCH-REV-005`; `architecture-review-revision-record.md` | Identify missing broader safe-consistency authority | `ARCH-F-003` requires concrete warning categories, local usability consequences, fatal precedence, persistence and retry semantics |
| 2026-09-19 | Source | `app-data-migration-runner.ts`; `server-runtime.ts`; `start-standalone-application-host.ts` | Determine whether migration `FAILED` itself aborts startup | Flat-family failure is logged/persisted while host continues; mandatory current-schema checks remain separately fatal |
| 2026-09-19 | Source | `agent-org-token-attribution-transition.ts`; `agent-org-token-attribution-repository.ts`; `token-usage-run-store.ts` | Determine token-row failure scope and runtime consequence | Per-root transaction rolls back token rows, transition continues, affected Org restore is locally guarded, unrelated application remains usable |
| 2026-09-19 | User | Current thread, token-row clarification and final “yessss” | Approve concrete broader outcome policy | Missing-tree and malformed/conflicting per-root token-data rejection are terminal warnings; operational/structural and attempt-wide failures remain fatal; conversion stays unchanged |
| 2026-09-19 | Architecture Review + source | `ARCH-REV-006 / ARCH-F-004 / MP-004`; token transition/repository | Validate SR-010 token failure interface | Root-keyed map mixes approved data rejection with structural/SQL/concurrency/reread/unknown faults; typed local discriminator required |

## Relevant Existing Behavior And Supported Product Paths

- `SCN-001`: Normal cold Electron launch is a supported product path and is directly reproduced.
- `SCN-002`: Opening a Team/AgentOrg historical attachment through the REST locator is a supported product path with current exact-owner integration tests.
- `SCN-003`: The existing failed migration state is an explicit operational edge on the current user profile and must remain truthful.

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Current root execution trees, task delegation records and communication message records: remain in startup structural admission.
- Member raw trace segments: currently all read at startup; proposed to leave the global startup critical path.
- Context-file bytes: served only through exact owner/file resolution; remain unchanged.

### Structural Surfaces

- `server-runtime.ts`: current pre-listen readiness prerequisite owner.
- `RootRunPackageReadinessIndex`: shared in-process Team/Org admission generation and diagnostics.
- `RootPackageContextFileValidation`: current global historical locator scan.
- Context-file REST owner/read/layout services: existing per-request enforcement path.

### Potential Structural Impacts

- API contract: no successful locator shape or route change is intended; error timing changes from whole-root startup exclusion to per-attachment access failure.
- Persistence: no schema or writer change is required by the requirements.
- Security: owner/path/file validation must remain at actual access.
- Lifecycle: startup admission no longer performs a global historical payload audit.
- Architectural risk: the completed solution moves an integrity check across a lifecycle boundary; `SR-005` retains the `Medium / High` classification and adds the bounded Team final-access error mapping required by `CRR-001`.

## Persisted Data And State Facts

- Affected stored subjects: existing collaboration packages, migration ledger/log, history indexes and token-attribution rows. The startup/readiness and attachment corrections do not rewrite history payloads.
- Required preservation: all user definitions, histories, conversations, settings, credentials, workspaces and provider state except already-authorized valid conversion effects.
- Per-root token fact: `convertRoot()` is transactional; a malformed/conflicting root commits no token-row change. Earlier filesystem conversion effects may already exist, so the warning contract preserves the affected Org's explicit local readiness rejection rather than claiming whole-root rollback.
- Attempt-wide fact: global discovery/index/commit authority failure remains retryable and dominates warnings.
- Data transition: no new schema or migration is needed. The existing unreleased flat-family migration receives an in-place outcome-classification correction; one existing failed ledger may transition to terminal warning, after which later startups skip it.
- Acceptable regeneration: isolated fixture/test output and task-worktree dependencies only.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- | --- | --- |
| `validation/electron-fresh-start-timing.json` | Solution Designer | Sanitized exact-launch milestone evidence | Representative base Electron startup | `BEH-001`, `SCN-001`, `AC-001` | Complete | Evidence only |
| `validation/readiness-cold-readonly-probe.mjs` | Solution Designer | Reproducible read-only instrumentation of exact packaged owner | Root readiness attribution | `BEH-001`, `AC-001`, `AC-002` | Complete | Evidence only |
| `validation/readiness-cold-readonly-probe.json` | Solution Designer | Sanitized aggregate duration/read/stage results | Root readiness attribution | `BEH-001`, `AC-001`, `AC-002` | Complete | Evidence only |
| `code-review-report.md`; `validation/crr001-team-context-status-probe.log` | Code Reviewer | `CRR-001` Design Impact and focused exact-status evidence | Team final attachment return mapping | `BEH-002`, `REQ-003`, `REQ-004`, `AC-004`, `SCN-002` | Complete | Downstream evidence; no new intended behavior |
| `code-review-report.md`; `code-review-revision-record.md` | Code Reviewer | `CRR-003 / CR-002` failure-origin analysis and cumulative review history | Repeating migration-ledger write / requirement-gap recovery | `BEH-003`, `REQ-005`, `REQ-006`, `REQ-008`, `AC-003`, `AC-005`, `AC-006`, `GAP-001` | Complete; current report also preserves earlier findings | Recovery evidence; product policy superseded by approved `SR-007`, no independent approval |
| `api-e2e-execution-coverage-report.md`; `api-e2e-revision-record.md` | API/E2E Engineer | `API-REV-001` lifecycle validation, failure record and cumulative API history | Representative startup, migration attempts and protected-state evidence | `BEH-001`, `BEH-003`, `REQ-001`, `REQ-005`, `REQ-008`, `AC-001`, `AC-003`, `AC-005`, `AC-006` | Complete historical Fail; rerun pending after reviewed correction | Recovery evidence only; does not define behavior or authorize finalization |
| `validation/api-e2e/p01-preservation-result.json` | API/E2E Engineer | Exact `P01` before/after protected-state and migration-ledger comparison | Critical preservation case on owned profile clone | `REQ-005`, `REQ-008`, `AC-003`, `AC-005`, `AC-006` | Complete baseline; must rerun first | Evidence only; approved intent comes from `SR-007` |
| `validation/api-e2e/three-launch-summary.json` | API/E2E Engineer | Three-start attempt/timing/read summary | Terminal-skip and startup regression baseline | `BEH-001`, `BEH-003`, `REQ-001`, `REQ-008`, `AC-001`, `AC-006` | Complete baseline; post-fix stability rerun pending | Evidence only |
| `design-review-report.md`; `architecture-review-revision-record.md` | Architecture Reviewer | Cumulative `ARCH-REV-003`–`ARCH-REV-006` review history | Cross-store risk, historical narrow Pass, then broader-policy requirement blocker | `BEH-003`, `BEH-004`, `REQ-005`–`REQ-010`, `AC-005`–`AC-009`; `ARCH-F-001`–`ARCH-F-004` | `ARCH-REV-006` current Fail / Design Impact; `SR-011` typed-boundary correction ready for repeated review | Review evidence only; architecture approval pending |
| Private migration log identified in `E-021` | API/E2E-owned local validation evidence | Identify exact eight warning-source causes without exposing private paths/content in handoff attachments | Existing failed-record source diagnosis | `BEH-003`, `REQ-006`, `AC-006` | Retained privately; deliberately unattached and uncommitted | Evidence only; never attach/commit unredacted contents |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `RISK-001` | Security/correctness | Removing global attachment validation without exact on-access enforcement could permit unsafe access | Owner/path/file validation must remain explicit | `REQ-003`, `REQ-004` | Controlled |
| `RISK-002` | Behavior | A bad attachment no longer hides the root; it fails when opened | Must remain truthful and local | `DEC-001` | Approved |
| `RISK-003` | Performance | Moving the scan after listen would retain the cost | Requirements forbid the global scan, not only its timing | `REQ-001` | Resolved |
| `RISK-004` | Contract | Team final access previously returned `500` for supported invalid input | Exact `400`/`404` without catch-all | `SR-005`, `DS-003` | Controlled |
| `RISK-005` | Migration status | Mapping every item failure to warning could terminally strand unknown state | Only `E-025`/`E-027` categories warn; all unsupported categories stay fatal | `REQ-006`–`REQ-009` | Controlled by SR-010 |
| `RISK-006` | Affected-root usability | A token-warning Org may have earlier filesystem effects but rolled-back token rows | Preserve `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY`, expose warning, do not claim the Org usable or migrated | `REQ-007`, `AC-006` | Explicitly approved |
| `RISK-007` | Fatal precedence | Mixed warnings plus global index/discovery failure could be incorrectly terminalized | Attempt-wide failure dominates all warnings | `REQ-008`, `AC-007` | Controlled by design |
| `RISK-008` | Scope growth | Generic preparation/transaction machinery would overcomplicate an unreleased status correction | Preserve conversion and runner; use existing scope boundaries | `REQ-005`, `AC-009` | Rejected |
| `RISK-009` | Cause typing | Root-keyed token failure map contains data, structural and operational failures | Type only approved data rejection at repository origin; separate transition warnings/failures; preserve fatal default | `ARCH-F-004`; revised `DS-002` | Controlled by SR-011 |

## Requirement Implications

The original startup root cause remains proven: readiness read roughly 5.5 GiB of historical traces, causing almost all of the 31-second launch. `IR-001`/`IR-002` remain correct and must be preserved. The migration outcome recovery is now concrete: missing-tree/no-plan roots and per-root transactional token failures are isolated terminal warnings; the latter may leave that Org locally unavailable and therefore must preserve the exact token-readiness guard and diagnostics. Attempt-wide/global authority failures and all unapproved item categories remain fatal/retryable.

## Notes For Architecture Design

Preserve `IR-003`, then introduce one migration-local semantic boundary: the token repository types only approved malformed/conflicting attribution data as `AgentOrgTokenAttributionDataRejection`; the transition exposes separate warning and fatal maps; the coordinator blocks both root kinds but counts only the typed data warning beside missing-tree warnings. Global discovery still throws and every untyped/root structural/SQL/concurrency/reread/unknown error remains fatal. Do not add a new migration, shared status/runner change, conversion reorder, generic framework or repair logic. `P01` remains first downstream acceptance; add exact typed-warning and fatal-control fixtures.
