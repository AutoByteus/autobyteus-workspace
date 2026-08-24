# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` CRR-002; API/E2E round 1; user packaged-Electron/private-Team extension | SR-007, ARCH-REV-001, IR-002, CRR-002 | N/A | Pass / 98% |
| API-REV-002 | User explicit heterogeneous nested-Team provider/browser/lifecycle extension; API/E2E round 2 | SR-007, ARCH-REV-001, IR-002, CRR-002, API-REV-001 | Pass / 98% | Pass / 99% |
| API-REV-003 | `code_reviewer` CRR-003/TR-001/TR-002 Local Fix; API/E2E round 3 | SR-007, ARCH-REV-001, IR-002, CRR-002, CRR-003, API-REV-001, API-REV-002 | Pass / 99% | Fail / 89% |
| API-REV-004 | `code_reviewer` CRR-005 after IR-003 resolved CR-005/API-E2E-F-001; API/E2E round 4 | SR-007, ARCH-REV-001, IR-003, CRR-004, CRR-005, API-REV-003 | Fail / 89% | Pass / 99% |
| API-REV-005 | `code_reviewer` CRR-008 integrated source Pass plus user real-browser/provider extension; API/E2E round 5 | DR-001, IR-004, IR-005, CRR-008, API-REV-004 | Pass / 99% | Fail / 89% |

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
