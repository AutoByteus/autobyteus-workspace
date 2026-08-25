# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` CRR-002; API/E2E round 1; user packaged-Electron/private-Team extension | SR-007, ARCH-REV-001, IR-002, CRR-002 | N/A | Pass / 98% |
| API-REV-002 | User explicit heterogeneous nested-Team provider/browser/lifecycle extension; API/E2E round 2 | SR-007, ARCH-REV-001, IR-002, CRR-002, API-REV-001 | Pass / 98% | Pass / 99% |
| API-REV-003 | `code_reviewer` CRR-003/TR-001/TR-002 Local Fix; API/E2E round 3 | SR-007, ARCH-REV-001, IR-002, CRR-002, CRR-003, API-REV-001, API-REV-002 | Pass / 99% | Fail / 89% |
| API-REV-004 | `code_reviewer` CRR-005 after IR-003 resolved CR-005/API-E2E-F-001; API/E2E round 4 | SR-007, ARCH-REV-001, IR-003, CRR-004, CRR-005, API-REV-003 | Fail / 89% | Pass / 99% |
| API-REV-005 | `code_reviewer` CRR-008 integrated source Pass plus user real-browser/provider extension; API/E2E round 5 | DR-001, IR-004, IR-005, CRR-008, API-REV-004 | Pass / 99% | Fail / 89% |
| API-REV-006 | `code_reviewer` CRR-012 complete IR-008 source Pass; API/E2E round 6 | SR-008, ARCH-REV-002, IR-006–IR-008, CRR-009–CRR-012, API-REV-005 | Fail / 89% | Pass / 98% |
| API-REV-007 | `code_reviewer` CRR-013/TR-003 API/E2E-owned Local Fix; API/E2E round 7 | SR-008, ARCH-REV-002, IR-008, CRR-012, CRR-013, API-REV-006 | Pass / 98% (proportional review Fail) | Pass / 98% |
| API-REV-008 | `code_reviewer` CRR-015 complete IR-009 source Pass; API/E2E round 8 | SR-011, ARCH-REV-003, IR-009, CRR-015, API-REV-007, CRR-014, DR-003 | Pass / 98% | Pass / 98% |
| API-REV-009 | `code_reviewer` CRR-019 complete IR-012 source/architecture Pass; API/E2E round 9 | SR-013, ARCH-REV-005, IR-012, CRR-019, API-REV-008, CRR-016, DR-004 | Pass / 98% | Fail / 89% |
| API-REV-010 | User explicit real-user reachability correction; API/E2E round 10 | API-REV-009, SR-013, ARCH-REV-005, IR-012, CRR-019 | Fail / 89% under synthetic premise | Pass / 98% |
| API-REV-011 | `code_reviewer` CRR-023 complete IR-014 source Pass; API/E2E round 11 | SR-015, ARCH-REV-007, IR-013–IR-014, CRR-021–CRR-023, API-REV-010 | Pass / 98% | Pass / 98% |

## Revision Entries

### API-REV-001 — Current V2 coverage baseline and real nested Codex validation

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md`; round 1. The user then explicitly extended the same unfinished round to actual packaged Electron, private-package import, `open_tab`, and Codex `gpt-5.6-luna`.
- Triggering finding or scenario IDs: CRR-002 closure of CR-001 through CR-004; API-E2E-003, API-E2E-004, API-E2E-005, API-E2E-006, API-E2E-008, API-E2E-010, API-E2E-012.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: SR-007, ARCH-REV-001, IR-002, CRR-002; no delivery revision.
- Why this baseline or coverage/execution revision was recorded: No authoritative prior API/E2E result existed. Current repository inventory found stale V1/current coverage and missing direct nested GraphQL/lifecycle proof; the completed round establishes the first current baseline.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts`.
  - Updated `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`.
  - Updated `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts`.
  - Updated `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts`.
  - Updated `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`.
  - Updated `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts`.
  - Updated `autobyteus-server-ts/tests/unit/run-history/services/team-run-history-service.test.ts`.
- Scenarios added, changed, removed, or rechecked: Added direct full nested GraphQL/V2/restart/restore and strict runtime negatives; updated V1 -> final V2 production upgrade and current integration/provider payloads; independently executed integrated browser hierarchy/recovery; added the temporary user-requested actual Electron/private nested classroom/real Codex task journey. No useful scenario was removed.
- Commands, environment, fixture, or broader-validation delta: 81 affected server units; 17 focused and 37 full affected Team integrations; 7-test hierarchy lifecycle E2E; 4-test production-upgrade E2E; 101 focused and 2297 full web tests; 34 package contract tests; server/web builds; Chrome probe; macOS Electron package build; official isolated Electron profile; complete private package; `open_tab`; real `codex_app_server` / `gpt-5.6-luna`; exact accepted nested task marker.

#### Prior Failure Resolution

None. Pre-edit failures in this same first round were stale-coverage discovery evidence, not a prior completed API/E2E result.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
- Prior result and confidence: N/A.
- Current result and confidence: `Pass` / `98%`.
- New or remaining failure IDs: None.
- Recommended recipient: `/code_reviewer` for proportional review of the seven changed durable test paths.
- Remaining risks, blocked evidence, or untested scope: exhaustive provider permutations stayed capability-gated, but the exact requested real Codex/Luna path passed. The generic Electron auto-build path has an unrelated Darwin/all-platform mismatch with a successful host-native build workaround. Dynamic Team mutation and unchanged native IPC are out of scope.

### API-REV-002 — Explicit AutoByteus/DeepSeek nested-Team browser and lifecycle validation

- Triggering role, report path, and round: User extension after API-REV-001; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-execution-coverage-report.md`; round 2. The user required a real `open_tab` run with a nested Team configured differently from the root, real provider credentials, exact on-disk hierarchy, ordinary Team messaging, formal Team delegation/acceptance, and execution by both inherited nested Agents.
- Triggering finding or scenario IDs: API-E2E-013. This was a bounded evidence-gap closure, not a product failure: API-E2E-012 had proven the private nested classroom only with inherited Codex/Luna at both Team scopes.
- Related solution, architecture-review, implementation, code-review, or prior API/E2E revision IDs: SR-007, ARCH-REV-001, IR-002, CRR-002, API-REV-001; no delivery revision.
- Why this coverage/execution revision was recorded: API-REV-001 was authoritative at `Pass` / `98%`, but it did not directly prove a real heterogeneous root/nested provider configuration. The fresh reinvestigation recorded that precise gap before execution and selected a private-fixture/local-secret temporary probe rather than inappropriate public durable coverage.
- Coverage decisions or durable test paths changed: None in API-REV-002. The seven repository-resident durable test paths added or updated in API-REV-001 remain unchanged and remain the cumulative proportional-review set.
- Scenarios added, changed, removed, or rechecked: Added temporary API-E2E-013. Rechecked API-E2E-012 as still valid for package import/inherited Codex behavior and API-E2E-006 as still valid provider-gated durable mixed-runtime coverage. No scenario was removed.
- Commands, environment, fixture, or broader-validation delta:
  - Reused the current macOS arm64 package with the official `test:e2e:electron --skip-build --adapter playwright` isolated launcher; backend port 54334 and owned data root `autobyteus-e2e-Ymjjtk`.
  - Ran documented `pnpm secrets:import` dry-run and confirmed import from `/Users/normy/.autobyteus/server-data/.env` into only the isolated database; 9 configured, 0 skipped/replaced, no secret values recorded.
  - Started an owned Nuxt renderer on 54427 proxying the packaged backend and used AutoByteus `open_tab` tab `edcf5a` for real browser form/lifecycle interaction.
  - Configured root `/` as `codex_app_server` / `gpt-5.6-luna`, explicit Team override `/StudentStudyGroup` as `autobyteus` / `deepseek-v4-flash`, and no Agent overrides; all nested Agent controls remained `Global default`.
  - Launched run `nested_classroom_test_team_ed6f465924784489a6e7d69f511578b2`; GraphQL and the exact `schemaVersion: 2` file stored root/Teacher Codex/Luna and nested Team/both nested Agents AutoByteus/DeepSeek Flash.
  - Verified actual provider use through packaged `DeepSeekLLM` logs and non-zero token records for configured Student One, formal-task Student One, and configured Student Two.
  - Teacher sent an ordinary Team message and received exact `SUBTEAM_DEEPSEEK_MESSAGE_OK`; delegated task `task_86a98cacede2468484e56e77f82e82c2` to `/StudentStudyGroup`, received exact `SUBTEAM_DEEPSEEK_TASK_OK`, and accepted it; a direct Student Two check returned exact `SUBTEAM_SECOND_MEMBER_OK`.
  - Terminated the run and proved the accepted task, messages, and mixed V2 hierarchy persisted; closed the tab, stopped owned listeners/processes, removed only the owned root/imported credentials, and verified the user-owned app and source `.env` remained unchanged.

#### Prior Failure Resolution

None. API-REV-001 had no unresolved failure. API-REV-002 closes only its recorded live heterogeneous-provider evidence gap.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence/electron-open-tab-deepseek-subteam-evidence.md`
- Prior result and confidence: `Pass` / `98%` (API-REV-001).
- Current result and confidence: `Pass` / `99%`.
- New or remaining failure IDs: None.
- Recommended recipient: `/code_reviewer` to incorporate the successful runtime-only API-REV-002 evidence and complete the proportional review of API-REV-001's seven cumulative durable test paths.
- Remaining risks, blocked evidence, or untested scope: exhaustive unrelated provider permutations remain capability-gated; the generic Electron auto-build host mismatch remains a setup/documentation residual with a successful host-native workaround; dynamic post-launch Team mutation and unchanged native IPC/window-only behavior remain out of scope. No material risk remains for the user-requested explicit Codex-root/AutoByteus-DeepSeek-subteam path.

### API-REV-003 — CRR-003 durable-coverage correction and migration-binding failure

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-test-review-report.md` (`CRR-003`); round 3.
- Triggering finding or scenario IDs: `TR-001` / API-E2E-003 and `TR-002` / API-E2E-004.
- Related solution, architecture-review, implementation, code-review, or prior API/E2E revision IDs: SR-007, ARCH-REV-001, IR-002, CRR-002, CRR-003, API-REV-001, API-REV-002; no delivery revision.
- Why this coverage/execution revision was recorded: CRR-003 correctly determined that two successful API-REV-001 durable scenarios did not fully establish the complete lifecycle and preservation claims recorded for them. API-REV-003 re-investigated both findings before edits, strengthened only those two paths, and ran the direct built-server boundaries.
- Coverage decisions or durable test paths changed:
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` with deliberately distinct valid Agent launch configurations and one reusable exact configuration-tree assertion applied to disk, active API, restart, and restore.
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` with distinct root/nested direct coordinators, non-null root and nullable nested `llmConfig`, non-empty binding/handoff/accepted task, and complete Team/Agent/task/preservation assertions.
  - Added or removed durable test files: None.
- Scenarios added, changed, removed, or rechecked: API-E2E-003 was strengthened and passed 7/7. API-E2E-004 was strengthened and failed 2/4 because both representative successful-migration cohorts lost application binding. API-E2E-012/013 were rechecked as still-valid historical browser/provider evidence and were not rerun because they cannot prove predecessor migration.
- Commands, environment, fixture, or broader-validation delta:
  - `pnpm run build:full` — Pass.
  - `pnpm exec vitest run tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts --no-watch` — Pass, 7/7.
  - `pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` — Fail, 2/4; expected non-null binding, observed null in clean and warning cohorts.
  - `git diff --check` and owned-resource audit — Pass.
  - Broader validation — `Not Required`; the direct built-server migration boundary failed.

#### Prior Failure Resolution

- `TR-001`: resolved at the API/E2E durable-test level; current execution passed.
- `TR-002`: coverage fixture/assertions are corrected, but the scenario cannot pass because they exposed current implementation failure `API-E2E-F-001`.
- API-REV-002 prior result: the real heterogeneous browser/provider journey remains passed and is not invalidated.

- New failure ID: `API-E2E-F-001`.
- Expected behavior: AC-030 requires the representative predecessor `{applicationId, bindingId}` to remain the same non-null V2 `applicationBinding` while direct coordinators, task, handoff, and Agent snapshots are preserved.
- Observed behavior: both the clean and mixed-warning startup cohorts wrote `applicationBinding: null`; surrounding handoff comparison matched.
- Preliminary classification: implementation-source defect. `applicationBindingFromMetadata` in `predecessor-team-run-planner.ts` returns on arrays and therefore does not traverse released `memberTree` arrays that contain Agent `applicationExecutionContext` values. API/E2E did not change implementation source.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence/api-rev-003-migration-binding-failure.md`
- Prior result and confidence: `Pass` / `99%` (API-REV-002).
- Current result and confidence: `Fail` / `89%`.
- Remaining failure IDs: `API-E2E-F-001`.
- Recommended recipient: `/code_reviewer` for focused failure-origin review and implementation-owner routing; do not proceed to delivery.
- Remaining risks, blocked evidence, or untested scope: TR-002's later enriched task/Agent assertions cannot become successful evidence until the binding defect is corrected. Exhaustive unrelated provider permutations, dynamic post-launch Team mutation, and unchanged native IPC remain bounded/out of scope as previously recorded.

### API-REV-004 — IR-003 migration-binding correction passes unchanged strengthened coverage

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md` (`CRR-005`); round 4.
- Triggering finding or scenario IDs: resolved `CR-005` / `API-E2E-F-001`; `TR-001` / API-E2E-003 and `TR-002` / API-E2E-004 pending formal proportional closure.
- Related solution, architecture-review, implementation, code-review, or prior API/E2E revision IDs: SR-007, ARCH-REV-001, IR-003, CRR-004, CRR-005, API-REV-003; no delivery revision.
- Why this coverage/execution revision was recorded: CRR-004 confirmed that API-REV-003's exact binding failure was an implementation defect, IR-003 corrected binding extraction from the validated recursive hierarchy, and CRR-005 passed the source. API-REV-004 re-investigated the current state before execution and reran the unchanged strengthened regression boundaries required for a completed successful result.
- Coverage decisions or durable test paths changed: None in API-REV-004. The two API-REV-003 corrections remained byte-for-byte unchanged:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` — SHA-256 `bc4fda79a1de7551793c8c6ca3edc952799004f00cd6556ec34f4da2475b2712`.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` — SHA-256 `3413ed1fd7f44526c9c29cd87a492b6283700bfb6af73b2281e943096f1f968f`.
- Scenarios added, changed, removed, or rechecked: API-E2E-003 rechecked and passed 7/7. API-E2E-004 rechecked and passed 4/4, including the exact non-null binding in both formerly failing cohorts and all preserved direct-coordinator, configuration, Agent, task, handoff, warning/retry, restart/idempotence, and collision assertions. No scenario was added or removed.
- Commands, environment, fixture, or broader-validation delta:
  - `pnpm run build:full` — Pass.
  - `pnpm exec vitest run tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts --no-watch` — Pass, 7/7.
  - `pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` — Pass, 4/4.
  - Durable hash checks, `git diff --check`, named owned-artifact scan, and live built-server process scan — Pass.
  - Broader validation — `Not Required`; the correction is migration-only and the built-server production-upgrade boundary is direct. Historical packaged Electron/`open_tab` API-E2E-012/013 evidence remains passed and valid.

#### Prior Failure Resolution

- `API-E2E-F-001` / CR-005: resolved. Expected and observed V2 `applicationBinding` now match the representative predecessor `{applicationId, bindingId}` in both previously failing supported cohorts without changing the test.
- `TR-001`: corrected test passes 7/7 and remains pending only the formal successful proportional-review result.
- `TR-002`: corrected fixture/assertions pass 4/4 and remain pending only the formal successful proportional-review result.
- API-REV-002 prior browser/provider result remains passed and is not invalidated.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence/api-rev-004-migration-binding-resolution.md`
- Prior result and confidence: `Fail` / `89%` (API-REV-003).
- Current result and confidence: `Pass` / `99%`.
- New or remaining failure IDs: None. API-E2E-F-001 is resolved.
- Recommended recipient: `/code_reviewer` for formal proportional test-code review of the two strengthened durable paths. Do not proceed to delivery until it passes.
- Remaining risks, blocked evidence, or untested scope: formal TR-001/TR-002 proportional closure is pending. Exhaustive unrelated provider permutations, dynamic post-launch Team mutation, and unchanged native IPC remain bounded/out of scope as previously recorded; the historical generic Electron build-host mismatch remains a setup/documentation residual with a passed host-native path.

### API-REV-005 — Integrated controlled-workspace coverage and one-activation Team launch failure

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md` / `code-review-revision-record.md` (`CRR-008`); round 5. The user extended the same round to require current packaged Electron, actual `open_tab`, complete private package, root Codex Luna, nested AutoByteus DeepSeek, disk V2, ordinary message, and formal delegation/acceptance.
- Triggering scenario IDs: API-E2E-003, API-E2E-004, API-E2E-014, API-E2E-015, API-E2E-016, API-E2E-017; new failure `API-E2E-F-002`.
- Related upstream revisions: DR-001, IR-004, IR-005, CRR-008, API-REV-004; current integrated merge `bd4e2403...`, current artifact HEAD `5dc5105...`.
- Why recorded: API-REV-004/CRR-006 certified only the protected parent. The latest-base controlled-workspace behavior and IR-005 exact-address readiness required a fresh integrated investigation, durable coverage restoration, repository execution, and realistic browser/package validation.
- Durable coverage changed:
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts`.
  - Expanded from 24 to 35 cases covering standalone Agent edge/identity behavior; six same-draft configuration edit types; exact root/nested registration and launch; root/nested failures and inactive buffers; and Team draft identity reset.
  - No durable file was added or removed; implementation source was not changed.
- Scenarios rechecked:
  - API-E2E-003 passed 7/7 and retained hash `bc4fda79...`.
  - API-E2E-004 passed 4/4 and retained hash `3413ed1f...`.
  - API-E2E-017 passed 9 files / 134 tests; focused changed file passed 35/35; Nuxt and server builds passed.
  - API-E2E-015 standalone Agent active New behavior and real DeepSeek message passed with exact persisted metadata.
  - API-E2E-016 real heterogeneous nested Team passed after correcting the owned local-cwd prerequisite: root Codex/Luna, nested AutoByteus/DeepSeek, exact ordinary reply, exact formal task submission, accepted review, exact V2 disk.
  - API-E2E-014 failed: first accepted Team activation registered/canonicalized both New paths but created no TeamRun; a second activation launched.
- Environment/broader-validation delta: built the current macOS arm64 package after generic Darwin/all-platform mismatch; launched isolated packaged backend 58449; current Nuxt 58524; documented isolated secret import; private package already auto-registered; actual `open_tab`; provider retry with absolute Codex executable and owned existing directories; UI termination and complete owned cleanup.

#### Prior Failure Resolution

- `API-E2E-F-001` remains resolved: fresh production-upgrade 4/4 passed.
- API-REV-004's prior result remains valid only for its protected-parent state and does not resolve the integrated API-E2E-F-002 failure.

- New failure: `API-E2E-F-002`.
- Expected: current-base FR-003 / FR-005 / AC-001 require one accepted Run Team activation to register the visible New workspace state and then create exactly one TeamRun.
- Observed: the first activation issued both workspace registrations and canonicalized the UI but created no TeamRun; the configuration remained open. The second activation reused the registrations and created the TeamRun.
- Preliminary classification: implementation-owned `Local Fix`. The runtime ordering is consistent with `handleRun` rechecking `teamLaunchReadiness.value.canLaunch` before the computed projection reflects `setWorkspaceLoaded`; the synchronous store mock masks that boundary. `/code_reviewer` must confirm the final origin.
- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence/api-rev-005-team-registration-continuation-failure.md`
- Prior result/confidence: `Pass` / `99%` (API-REV-004 protected-parent state).
- Current result/confidence: `Fail` / `89%` (integrated state).
- New or remaining failure IDs: `API-E2E-F-002`.
- Recommended recipient: `/code_reviewer` for focused failure-origin review, with the changed durable test attached. Do not proceed to delivery.
- Remaining risks: the durable component store mock does not expose the real computed-readiness continuation timing. Exhaustive unrelated providers, multi-node remote hosting, dynamic post-launch Team mutation, and unchanged native IPC remain bounded/out of scope.

### API-REV-006 — Current one-click launch resolution, application fixture repair, and live nested-Team completion

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md` / `code-review-revision-record.md` (`CRR-012`); round 6.
- Triggering finding or scenario IDs: historical `API-E2E-F-002` / API-E2E-014; CRR-012 current stale-Team repair and application-fixture reinvestigation requirements; API-E2E-003, 004, 016–020.
- Related upstream revisions: SR-008, ARCH-REV-002, IR-006–IR-008, CRR-009–CRR-012, API-REV-005; current reviewed HEAD `426bdf81ae5efcaf7e97e041c36a94d7349e610b`.
- Why recorded: API-REV-005 directly failed the one-activation browser boundary. Later source/design corrections could not certify it. API-REV-006 freshly investigated current coverage, repaired only stale application test fixtures/doubles, reran the repository/lifecycle/migration boundaries, and repeated the exact packaged browser/provider journey.
- Coverage decisions / durable paths changed:
  - Preserved and reran `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` from API-REV-005; SHA-256 `4a52952c...`.
  - Updated `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts` from synthetic contract v5 to current v6/current supported model/root default/current TeamRun snapshot/Agent target/application binding; SHA-256 `58460952...`.
  - Updated `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` to the current supported deterministic model; SHA-256 `9cb8d7fa...`.
  - No production source or test file was added/removed.
- Scenarios rechecked/added: API-E2E-003 passed 7/7; API-E2E-004 passed 4/4; API-E2E-014 passed one-click; API-E2E-016 passed real ordinary message and formal accepted task; API-E2E-017 passed 6 files/103 tests; API-E2E-018 application integration passed 2 files/5 tests; API-E2E-019 stale repair passed with zero side effects; API-E2E-020 allocation ordering passed 4 files/41 tests.
- Commands/environment/broader delta: server/web builds passed; current Electron mac package built; owned backend 58649 and Nuxt 58724 launched; actual `open_tab` tab `2d23c2`; private `nested-classroom-test`; isolated secret import; root Codex `gpt-5.6-luna`; nested AutoByteus `deepseek-v4-flash`; exact V2/message/task/server correlation; complete owned cleanup.

#### Prior Failure Resolution

| Prior Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-E2E-F-002 / API-E2E-014 | Implementation-owned one-activation continuation defect | Resolved: one accepted activation produced two registrations and exactly one TeamRun; no second click existed or was required | `api-rev-006-browser-one-click-result.json`, workspace/history before-after, server excerpt |
| API-E2E-F-001 | Previously resolved migration-binding defect | Remains resolved at current HEAD; strengthened production-upgrade passed 4/4 | `api-rev-006-v2-production-upgrade.txt` |
| Application integration fixture drift | API/E2E-owned stale v5 fixture/test double | Corrected to current v6/model/TeamRun/target/binding contracts; full cohort passed 5/5 | `api-rev-006-application-integration-authoritative.txt` |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, and `api-e2e-evidence/api-rev-006-open-tab-integrated-browser-evidence.md` plus referenced logs/JSON/screenshots.
- Prior result/confidence: `Fail` / `89%` (API-REV-005).
- Current result/confidence: `Pass` / `98%`.
- New or remaining failure IDs: none.
- Recommended recipient: `/code_reviewer` for proportional successful test-code review of all three changed durable paths; do not proceed to delivery yet.
- Remaining risks: stale topology refresh was injected in-browser rather than through a production topology-edit endpoint; unrelated provider permutations and unchanged native IPC/window behavior remain out of scope. Three durable paths await proportional review. No material current acceptance risk remains.

### API-REV-007 — CRR-013 current-v6 service-output fixture correction

- Triggering role, report path, and round: `code_reviewer`; `api-e2e-test-review-report.md` / `code-review-revision-record.md` (`CRR-013`); round 7.
- Triggering finding or scenario IDs: `TR-003` / API-E2E-018.
- Related revisions: SR-008, ARCH-REV-002, IR-008, CRR-012, CRR-013, API-REV-006; DR-001 remains historical delivery re-entry context only.
- Why recorded: API-REV-006 passed execution, but CRR-013 found that `application-context-capabilities.integration.test.ts#createBundle()` still returned impossible v5 compatibility metadata from its fake `ApplicationBundleService`, bypassing the production parser's v6-only contract. This API/E2E-owned correction required a fresh investigation, durable edit, affected-cohort rerun, evidence/hash refresh, and repeat proportional review.
- Coverage decision and durable change:
  - Updated `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts` to import and use `APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6` and `APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6` for the synthetic `ApplicationBundle.backend.sdkCompatibility` fields.
  - No production source, assertion, test name, or other fixture behavior changed; no test file was added or removed.
  - Corrected SHA-256: `00ebf8044550437dda210de8c3e2289aea5f004a3e955f2f142f479e09a6a700`.
- Scenarios rechecked: API-E2E-018 passed the full two-file application cohort, 5/5. The unchanged Brief Studio path retained SHA-256 `9cb8d7fa7cd0a9bde32741da1b8ab1c31e3aebea8fc895b30e712031ea9d9df2`. RunConfigPanel remained unchanged at `4a52952caa8cf0ac3b917dc219a7a4e578f0e7cae06fd9faffd80e2a9df02dd9` and was already proportionally passed by CRR-013.
- Command/evidence delta:
  - `pnpm exec vitest run tests/integration/application-backend/application-context-capabilities.integration.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts --no-watch` — Pass, 2 files / 5 tests; `api-e2e-evidence/api-rev-007-application-integration-authoritative.txt`.
  - `git diff --check`, SHA-256, fixture-source, and modified-production-source audit — Pass; `api-e2e-evidence/api-rev-007-static-hash-audit.txt`.
  - Broader validation — `Not Required`; CRR-013 explicitly preserved API-REV-006's actual packaged/browser/provider/lifecycle evidence, and those surfaces cannot improve proof of two mocked metadata fields.

#### Prior Failure Resolution

- `TR-003`: resolved by execution. Both fake service-output compatibility fields now derive from the production contract package's current v6 constants; the affected integration cohort passes 5/5. Formal finding closure awaits repeat proportional review.
- API-REV-006's prior runtime result remains `Pass` / `98%`; CRR-013's proportional `Fail` was not an implementation or runtime regression.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, and the two API-REV-007 evidence files above.
- Prior result and confidence: `Pass` / `98%` (API-REV-006 execution; CRR-013 proportional review `Fail`).
- Current result and confidence: `Pass` / `98%`.
- New or remaining execution failure IDs: none. `TR-003` awaits reviewer closure only.
- Recommended recipient: `/code_reviewer` for repeat proportional test-code review of the corrected capability integration path. Do not proceed to delivery.
- Remaining risks: stale topology refresh setup, unrelated provider permutations, and unchanged native IPC/window behavior remain the same bounded residuals recorded in API-REV-006. No new residual was introduced.

### API-REV-008 — SR-011 / IR-009 independent presentation validation

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md` / `code-review-revision-record.md` (`CRR-015`); round 8.
- Triggering scenario: SR-011 restored the approved personal root Team launch form after DR-003 hands-on user rejection and retained nested Team presentation without changing functional owners. CRR-015 required fresh independent browser/Electron-equivalent proof before any delivery re-entry.
- Related revisions: SR-011, ARCH-REV-003, IR-009, CRR-015, API-REV-007, CRR-014, DR-003. API-REV-006 remains the retained actual provider/API/V2-disk baseline.
- Why recorded: API-REV-007 / CRR-014 certified the functional state but did not execute the later IR-009 presentation. The change is user-visible and originated from a hands-on rejection, so fresh actual-route evidence was mandatory.
- Coverage decisions / durable changes:
  - Classified the ten presentation/workspace/hierarchy test paths as `Still Valid` and the private route probe as `Use Temporary Executable Probe Only`.
  - Added, updated, or removed no repository-resident durable test and changed no production source.
  - Retained API-REV-007/CRR-014 and API-REV-006 functional evidence because CRR-015 traced no change to store/resolver/workspace/launch/backend/GraphQL/V2/migration/allocation/application/external-channel owners.
- Scenarios executed:
  - Focused frontend presentation/workspace/hierarchy cohort passed 10 files / 145 tests.
  - Actual `open_tab` tab `3efdcb` against current Nuxt / owned backend validated exact root order and rejected-chrome absence; outer/nested default collapse and ARIA; nested identity/address/indentation; actual controls; inherited/customized/reset; exact-address workspace and catalog non-happy states; disabled/read-only behavior; focus order; and narrow/sticky geometry.
  - No provider run was performed because the changed boundary is presentation-only; API-REV-006 already proves the unchanged real Codex Luna / AutoByteus DeepSeek nested lifecycle.
- Commands/environment delta:
  - Official Electron E2E launch first stopped before backend creation because compiled launch-profile output was absent. The investigation authorized and executed only `pnpm transpile-electron`; the identical launcher retry passed on owned 58849 and `/private/tmp/autobyteus-api-rev-008-owned`.
  - Current Nuxt ran on owned 58924. Repeated dev-only `#app-manifest` warnings were non-blocking.
  - Actual narrow measurement used a 1040 x 738 CSS-pixel viewport; 667px config panel and 633px nested section had no horizontal overflow or header-action overlap, and the final control retained 72.09px sticky-footer clearance.
  - Tab/process/port/root cleanup passed; user-owned AutoByteus PID 60805 / 29695 remained healthy.

#### Prior Failure And Review Resolution

- API-REV-007 had no execution failure. CRR-014 proportionally closed TR-003 and all cumulative durable findings before IR-009.
- DR-003 is not claimed closed by API/E2E alone. The implementation now matches the approved presentation under independent browser evidence, but explicit hands-on user verification of the rebuilt candidate remains required before delivery finalization.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence/api-rev-008-browser-presentation-result.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence/api-rev-008-open-tab-presentation-evidence.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence/api-rev-008-cleanup-audit.txt`
- Prior result/confidence: `Pass` / `98%` (API-REV-007; CRR-014 proportional Pass).
- Current result/confidence: `Pass` / `98%`.
- New or remaining API/E2E failure IDs: none.
- Recommended recipient: `/code_reviewer` for required cumulative result review and routing. Proportional API/E2E test-code review is `Not Applicable` because API-REV-008 changed no durable test. Do not route directly to delivery from this handoff.
- Remaining risks/gates: explicit user hands-on verification remains mandatory. Unchanged native IPC/window behavior and unrelated provider permutations remain out of scope; no material presentation acceptance risk remains from automated/executable evidence.

### API-REV-009 — IR-012 persisted multiline actual-browser validation

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md` / `code-review-revision-record.md` (`CRR-019`); round 9.
- Triggering finding or scenario IDs: CR-013 / MP-CR-010 source resolution; fresh API-E2E-021; new failure `API-E2E-F-003`.
- Related revisions: SR-013, ARCH-REV-005, IR-010–IR-012, CRR-017–CRR-019, API-REV-008, CRR-016, DR-004. API-REV-006 remains the retained unchanged functional/provider baseline.
- Why recorded: API-REV-008 predates the stored Settings work. CRR-019 required direct supported persistence/browser execution because the live user snapshot contained no current-schema multiline value and source-stage evidence used mounted consumers and an independent DOM probe.
- Coverage decisions / durable changes:
  - Reclassified the exact current 11-file stored/shared cohort as `Still Valid` and reran it unchanged: 11 files / 113 tests passed.
  - Classified the private-package/owned-profile persisted browser scenario as `Use Temporary Executable Probe Only`.
  - Added, updated, or removed no repository-resident durable test and changed no product source.
  - After execution, retained the utility/mounted tests as valid for classifier/exact-DOM responsibilities but classified them as incomplete for isolated-CR visual layout because they passed while the actual browser failed.
- Scenario and environment delta:
  - Used the official Electron E2E launcher at 59049 with `/private/tmp/autobyteus-api-rev-009-owned`, current Nuxt at 59124, and actual `open_tab` tab `4ce41d`.
  - Loaded read-only private `nested-classroom-test`; created current V2 TeamRun `nested_classroom_test_team_50b47ce67a654603be2e089b7923a556` with complete root/nested Team/exact Agent configurations under `codex_app_server` / `gpt-5.6-luna`. No provider turn was started.
  - Temporarily added two current `type: string` properties to the owned page's Codex Luna Pinia catalog because the live catalog has no free-text field. Stored V2/history remained byte-identical and no product source/server catalog changed.
  - Ordinary strings rendered once in disabled text inputs at all five scopes. LF strings rendered once as exact two-line residuals. CR strings retained exact DOM code point 13 but rendered as one visual line with no separation at `/StudentStudyGroup` and `/StudentStudyGroup/student_one`.
  - Post-browser tree SHA-256 remained `367491ac21c2cceced68921b6a764cb2475241c6fad0e91212d53f0aa688eb2d`; no Team draft/Run/Reset/network mutation appeared.

#### New Failure

- `API-E2E-F-003`: critical implementation/product presentation defect. `HistoricalModelConfigFallback.vue` relies on `whitespace-pre-wrap`; the actual browser does not make an isolated CR text node visibly distinct. Exact DOM retention passes, but user-visible truthful whitespace fails R-044 / AC-038 and the IR-012/CRR-019 claimed outcome.
- Preliminary recommended owner: `/implementation_engineer`, after `/code_reviewer` focused failure-origin review. Persistence, API, provider, environment, and fixture origin are excluded by exact pre/post evidence.
- Existing durable gap: add a structural regression for the eventual CR-visible rendering mechanism without weakening exact `textContent`, then repeat the focused cohort and exact persisted browser scenario.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, and the API-REV-009 evidence package under `api-e2e-evidence/`.
- Prior result/confidence: `Pass` / `98%` (API-REV-008; CRR-016 proportional `Not Applicable`).
- Current result/confidence: `Fail` / `89%`.
- New or remaining failure IDs: `API-E2E-F-003`.
- Cleanup: TeamRun terminated; owned tab/processes/ports/root cleaned; user-owned PID 58117 / 29695 healthy; unrelated tab `b2df06` untouched.
- Recommended recipient: `/code_reviewer` for focused failure-origin review. Do not perform successful proportional review and do not proceed to delivery.
- Remaining risks/gates: the current critical CR visual defect blocks Pass. Explicit user verification and delivery finalization remain downstream and closed.

#### Post-Result User Reachability Correction

- The user correctly identified that `ordinary_prompt` and `multiline_prompt` are not current product settings. API/E2E invented and injected them into the owned page because the current Codex Luna catalog exposes no free-text field.
- The technical browser observation remains valid for that synthetic generic schema, but its classification as a current-user-path blocking defect is withdrawn.
- The user subsequently resolved applicability explicitly: all blocking cases must be real, normally reachable user workflows. `API-E2E-F-003` is therefore `Out Of Scope / Non-Blocking`, not a requirement gap or implementation defect.
- No solution reset or implementation correction remains requested. API-REV-010 is the current authority.
- Correction artifact: `api-e2e-evidence/api-rev-009-user-reachability-correction.md`.

### API-REV-010 — Explicit real-user reachability correction

- Triggering role and round: user; API/E2E round 10.
- Why recorded: the user explicitly rejected API/E2E-invented, non-reachable scenarios as sign-off criteria. This corrected the invalid applicability premise used by API-REV-009.
- Coverage decision: current catalog/UI/provider/TeamRun paths remain in scope and green. The arbitrary `ordinary_prompt` / `multiline_prompt` GraphQLJSON plus page-local catalog injection is `Out Of Scope` for blocking sign-off and retained only as a non-blocking robustness note.
- Execution delta: none. No rerun was required because this is a classification-only correction and no product source, durable test, catalog, retained TeamRun, environment, or evidence changed.
- Durable coverage delta: none; proportional test-code review is `Not Applicable`.
- Prior-failure resolution: `API-E2E-F-003` is closed for current sign-off by user-authoritative scope invalidation, not by an implementation fix. It must not be routed to implementation.
- Preserved real evidence: current stored Settings and emitted controls were read-only/non-mutating; API-REV-006 retains actual packaged `open_tab` proof for distinct root/nested workspaces, Codex `gpt-5.6-luna`, nested AutoByteus `deepseek-v4-flash`, exact V2 disk state, a real Team message, and a real delegated-task submission/review/acceptance lifecycle.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-evidence/api-rev-009-user-reachability-correction.md`, `api-e2e-evidence/api-rev-010-real-user-scope-resolution.md`, and `api-e2e-evidence/api-rev-010-artifact-consistency-audit.txt`.
- Prior result/confidence: API-REV-009 raw synthetic-probe classification `Fail` / `89%`.
- Current result/confidence: `Pass` / `98%` for real current-user paths.
- Blocking failure IDs: none.
- Recommended recipient: `/code_reviewer` for cumulative successful-result routing; proportional durable-test review is `Not Applicable`. Do not route directly to delivery.

### API-REV-011 — IR-014 producer-backed Agent history fixture validation

- Triggering role, report path, and round: `code_reviewer`; `code-review-report.md` / `code-review-revision-record.md` (`CRR-023`); round 11.
- Related revisions: SR-015, ARCH-REV-007, IR-013, IR-014, CRR-021–CRR-023, API-REV-010, DR-004 historical context.
- Why recorded: IR-014 changes one repository-resident durable test after API-REV-010. CRR-023 passed complete source review but explicitly required a fresh proportionate coverage investigation and independent execution before downstream routing.
- Coverage decision: validate the changed `MemberOverrideItem.spec.ts` case alone and within the 11-file stored/shared cohort; audit producer backing, exactness, order, duplication, events, mutation, scope, and rejected vocabulary. Retain unchanged product/browser/provider/lifecycle evidence. Do not execute synthetic CR/catalog-injection behavior.
- Durable coverage delta: IR-014 updated `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts`. API/E2E made no further repository-resident test change. SHA-256: `45bd06f922e3624cab000e602267872b83d52673be1cfae667329826d5c39fda`.
- Execution:
  - Changed file: Pass, 1 file / 8 tests; `api-e2e-evidence/api-rev-011-member-override-focused.txt`.
  - Stored/shared cohort: Pass, 11 files / 112 tests; `api-e2e-evidence/api-rev-011-web-stored-settings-focused.txt`.
  - Static/product-grounding audit: Pass; one test/no production delta, current producer keys, exact/stable/non-mutating assertions, rejected vocabulary absent; `api-e2e-evidence/api-rev-011-static-product-grounding-audit.txt`.
  - Canonical artifact consistency audit: Pass; `api-e2e-evidence/api-rev-011-artifact-consistency-audit.txt`.
  - CRR-022 Nuxt build retained; browser/Electron/provider rerun not required or performed.
- Prior result/confidence: API-REV-010 `Pass` / `98%`.
- Current result/confidence: `Pass` / `98%`.
- New or remaining failure IDs: none. API-E2E-F-003 remains historical `Out Of Scope / Non-Blocking` and was not executed.
- Environment/cleanup: no services, browser tabs, profiles, ports, TeamRuns, workspaces, or provider sessions were created.
- Recommended recipient: `/code_reviewer` for proportional successful review of the changed durable test. Do not route directly to delivery.
- Remaining risks: standalone `vue-tsc` remains unavailable, but no production/type source changed and CRR-022's Nuxt production build is retained. Unchanged shell/provider permutations remain outside this test-only round.
