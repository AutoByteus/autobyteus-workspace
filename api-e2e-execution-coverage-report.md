# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/design-spec.md`
- Supplemental Task Artifacts: restart reproduction and three retained captures under `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/investigation-evidence/`; four user screenshots catalogued in `requirements.md` under `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_69a0c3857b704306a0b271f747d13dfc/solution_designer_da640a17b8f94512a236c6c3975039c2/context_files/`.
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/solution-revision-record.md`; `SR-004`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/architecture-review-revision-record.md`; `ARCH-REV-002`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/implementation-handoff.md`; `IR-001`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/code-review-report.md`; `CRR-001` Pass at `e6bca7a8b`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/nested-team-history-restart-hydration/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: initial API/E2E stage after `CRR-001`, including the approved third migration-ledger transition.
- Prior Round Reviewed: `N/A`; no prior result or confidence exists.
- Latest Authoritative Round: `1`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes` — deterministic repository lifecycle/sync coverage preceded realistic browser execution. At the user's request, the broader run improved fixture fidelity by using imported real agent/team packages and a real provider rather than only synthetic browser seed data.
- Existing coverage decisions revised during execution, with evidence: `Yes` — existing frontend coverage is inadequate for a settled delegated-task execution loaded from history. The mocked files pass while the normal browser navigation row is absent and exact focus rejects.
- Reroute required before or during execution: `Yes` — after completed realistic execution.
- Notes: repository evidence proves the backend storage/projection repair. Broader browser execution found a separate source-integration defect that blocks the user journey.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `NTH-E2E-001` | Current-V1 configured/deep/task Agent/task-Team move, cold projection/Event Monitor, direct-root/empty/Team Communication controls, restart; REQ-001–REQ-007; AC-001–AC-013 | filesystem -> startup migration -> index -> public GraphQL -> restart | Two actual built backend processes over isolated current-V1 data | Durable | Pass | `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts`; `api-e2e-evidence/repository-focused-e2e.log` |
| `NTH-E2E-002` | Invalid target, healthy startup, `FAILED`/`MANUAL_RETRY`/`canRetry`, prerequisites, public retry; AC-008/013/014 | required startup migration and public recovery API | Actual built backend, real file obstruction, GraphQL retry | Durable | Pass | Same lifecycle test/log |
| `NTH-E2E-003` | Registered third migration exact ledger transition; AC-005/012/013 | production upgrade ledger | Released-shape production-upgrade lifecycle E2E | Durable | Pass | `team-run-v1-production-upgrade.e2e.test.ts`; `team-run-v1-production-upgrade-focused.log` |
| `NTH-E2E-004` | MP-001 both conflict paths exported but canonical-only semantics; MP-002 old flat retained plus canonical after second sync, canonical-only semantics; AC-015/016 | Memory Sync source process -> HTTP hub process -> imported semantic reader | Two actual backend processes | Durable | Pass | `memory-sync-multiprocess.e2e.test.ts`; `memory-sync-multiprocess-focused.log` |
| `NTH-LIVE-001` | Fresh real delegated task-Team run, abrupt stop, correct cold restart, exact task API and byte recovery; AC-002/010/012 | real provider -> nested task lifecycle -> persisted raw traces -> process restart -> GraphQL | Real `deepseek-v4-flash`, private Nested Classroom, actual agent package, built backend | Live | Pass at backend/API boundary | `live-active-phase-a-result.json`; `live-active-graphql-after-restart-summary.json`; `live-active-byte-preservation-summary.txt` |
| `NTH-BR-001` | Cold historical task-Team member selection renders its conversation/activity; AC-002 and browser AC-012 | hydrated historical execution tree -> navigation -> focus -> renderer | Normal browser workspace against cold built backend/current Nuxt | Browser | **Fail** | `live-cold-ui-gap-result.json`; `live-active-cold-ui-team-control-and-missing-task-row.png`; `cold-task-browser-failure-analysis.md` |
| `NTH-BR-CTRL-001` | Direct-root and Team task-record controls; AC-003/004/011/012 | same cold workspace UI | Browser | Browser | Pass | Same screenshot/result: Teacher history non-empty; task record/description/Interrupted visible |
| `NTH-REP-001` | Changed owners and server regression surface | backend/domain/API | 23-file focused run and full server E2E | Durable | Focused Pass; broader unrelated failures | `repository-owner-focused.log`; `server-full-e2e.log`; serial isolation log |
| `NTH-REP-002` | Existing frontend hydration/query/Settings controls | frontend mocked contracts | Nuxt Vitest | Durable | Pass, but insufficient for `NTH-BR-001` | `frontend-focused.log` |

## Additional Repository Coverage Execution

The coverage investigation contains the complete planned repository command matrix. These are the completed results and failure-isolation reruns.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts build` | worktree root | production TypeScript/bootstrap artifact | Pass | `api-e2e-evidence/server-build.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/nested-team-history-restart.e2e.test.ts tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | isolated temp app-data/DB and real built processes | `NTH-E2E-001`–`004` | Pass — 3 files / 7 tests, 42.72s | `api-e2e-evidence/repository-focused-e2e.log` |
| 3 | `pnpm -C autobyteus-server-ts test --run <23 files listed in repository-owner-focused-files.txt>` | server | changed and owner-focused unit/integration coverage | Pass — 23 files / 101 tests | `repository-owner-focused.log` |
| 4 | `pnpm -C autobyteus-web test:nuxt stores/__tests__/appDataMigrationsStore.spec.ts components/settings/__tests__/ServerMigrationsManager.spec.ts graphql/queries/__tests__/runHistoryQueries.spec.ts services/runHydration/__tests__/teamRunContextHydrationService.spec.ts --run` | web; non-Electron Nuxt test mode | existing frontend contracts | Pass — 4 files / 18 tests | `frontend-focused.log` |
| 5 | `pnpm test:e2e` | worktree root | broad server API/E2E | Fail — 47 files pass / 7 fail / 14 skip; 185 tests pass / 7 fail / 51 skip | `server-full-e2e.log` |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run <seven failing files> --no-watch --maxWorkers=1` | serial isolation | broad-suite failure origin | Five unrelated failures persist; watcher and token-analytics pass serially | `server-full-e2e-failures-serial.log`; file list in `server-full-e2e-failing-files.txt` |
| 7 | `git diff --check` plus durable/protected-path audit | worktree | patch integrity and no API/E2E-owned production drift | Pass | `repository-audits.log` |

The five persistent broad-suite failures are outside the ticket boundary: missing automatic-compaction runner in an agent-package test, stale GLM 5.2 catalog expectation versus 5.3, incomplete media app-config mock, removed `coordinatorMemberRouteKey` GraphQL field, and incomplete workspace-removal mock/result expectation. The watcher timeout and token-analytics null response passed serially. None touch team memory scope, migration, nested projection, Memory Sync, or the frontend task-visibility call chain. They are reported as baseline observations, not used to excuse the critical `NTH-BR-001` failure.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | ---: | ---: | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 50% | -40 | Browser directly disproved AC-002 and browser AC-012. | Configured-member browser AC-001 was not separately live-proven; task-Team failure already blocks acceptance. |
| Changed-boundary execution directness | 95% | 98% | +3 | Built processes, real files, abrupt restart, public GraphQL, exact browser store action. | Negligible. |
| Cross-boundary integration realism and mock gap | 92% | 98% | +6 | Real provider/package -> task runtime -> filesystem -> cold backend -> Nuxt/Chrome exposed the mock gap. | No Electron shell execution; no shell boundary changed. |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | +3 | Isolated production-like DB/data, real package identities, real DeepSeek model, current backend/frontend. | One misconfigured restart attempt is excluded and disclosed; correct restart independently confirms the backend result. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 98% | +3 | Durable invalid-target retry/prerequisites plus real SIGKILL/cold recovery and byte proof. | Arbitrary mechanical failure matrix is excluded by requirements. |
| User-surface, browser, and desktop-shell confidence | 75% | 50% | -25 | Browser proved direct-root/task-record controls and directly exposed the critical missing-row/focus failure. | Required task cold-reopen user behavior does not work; configured-member browser path remains untested. |
| Durable regression coverage quality and relevance | 95% | 90% | -5 | Backend/API/sync regressions are strong; realistic failure shows no durable settled-task frontend navigation regression exists. | Source repair must add the missing frontend regression. |

- Overall post-repository confidence: `90.6%`
- Overall final confidence: `82.7%`
- Calculation method: simple average of seven applicable categories, rounded to one decimal.
- Confidence change produced by broader validation: `-7.9` percentage points; the realistic run converted a material mock gap into a confirmed critical failure.
- Every critical acceptance criterion directly proven: `No`
- Any final applicable category below `90%`: `Yes` — requirement/AC proof and user-surface/browser confidence are each `50%`.
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: AC-002 and browser AC-012 fail; configured nested browser AC-001 remains separately unproven. The `82.7%` score measures confidence that the implementation satisfies the approved scope, not confidence in the failure diagnosis; the failure evidence itself is direct and high confidence.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — lifecycle + multi-process durable E2E, then browser for web-equivalent renderer behavior.
- Material deviation from the planned mode or rationale: fixture fidelity was increased per user direction to a real Nested Classroom package and real provider. No external provider was required for deterministic tests.
- Confidence gap or residual risk actually addressed: the mocked frontend tests did not prove that a cold, recovered task-Team execution remains navigable.
- Startup order, commands, and readiness results: production build; isolated DB/data/HOME; secret import dry run and guarded import flow; private/team package import; built backend on `127.0.0.1:58376`; current Nuxt browser path; backend health, frontend HTTP, and DOM readiness passed.
- Environment choices that materially affected the run: real `deepseek-v4-flash`; actual `/Users/normy/autobyteus_org/autobyteus-private-agents` Nested Classroom and `/Users/normy/autobyteus_org/autobyteus-agents` package sources; isolated runtime under server `tests/.tmp`; browser origin `127.0.0.1:3000`.
- Seed data, fixtures, identities, authentication, permissions, or session state: trusted local path; no account/auth change; root and child IDs are recorded in the matrix and failure analysis; exact prompt token `API_E2E_REAL_ACTIVE_COLD_RESTART_OK`.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Start Nested Classroom and delegate exactly one task to `/StudentStudyGroup` | A transient task-Team row and exact `student_one` child row appear; task content/activity renders. | Both rows appeared. Task input, reasoning, pending `submit_task_result`, and exact token rendered. | `live-active-phase-a-result.json`; `live-active-task-member-before-cold-restart.png` | Pass |
| Abruptly stop backend and cold restart same isolated runtime | Persisted task raw traces remain exact and backend becomes healthy. | SIGKILL recorded; correct restart healthy; task raw SHA unchanged. | `live-active-abrupt-restart.txt`; `backend-active-cold-restart.log`; `live-active-byte-preservation-summary.txt` | Pass |
| Query exact cold task projection/Event Monitor | Non-empty exact task data plus direct-root controls. | Task 4 conversation / 2 activities / 4 Event Monitor events / non-null last activity; direct root 6 / 2. | `live-active-graphql-after-restart-summary.json`; complete payload | Pass |
| Open cold workspace and expand `/StudentStudyGroup` | Historical delegated task-Team/member row remains selectable and renders recovered task. | Zero historical task rows. Only configured `student_one`/`student_two` rows remain. | `live-cold-ui-gap-result.json`; post-restart screenshot | **Fail** |
| Invoke normal history store for exact task AgentRun | Focus and hydrate exact historical task AgentRun. | Rejects: `AgentRun 'student_one_e7a87cdb646e4678ac5ffacf5a82dcbe' is not live.` | Semantic browser probe/result/log | **Fail** |
| Inspect direct-root Teacher and Team task record | Controls stay non-empty/visible. | Teacher history has prompt/delegation; task description/status `Interrupted` visible. | Same result/screenshot | Pass |

One restart attempt omitted `DATABASE_URL` and was stopped before explicit validation; it is excluded in `excluded-misconfigured-restart.txt`. Because cold package loading legitimately settles interrupted active tasks, the correctly configured restart reaches the same settled-task state and independently proves the API/browser mismatch. No conclusion relies on the excluded attempt.

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: Chrome exercised the web-equivalent Nuxt renderer against the built backend; no actual Electron execution.
- Browser-tested web-equivalent behavior and evidence: normal historical workspace tree, nested expansion, direct-root selection/render, Team task panel, normal store exact-member open; evidence listed above.
- Shell-specific or lifecycle behavior and evidence: backend process lifecycle was directly executed; preload/IPC/window behavior was not involved.
- Effect on any already-running desktop application: `None`; owned ports/tab/data only. An unrelated IPv6 port-3000 process was not touched.
- Behavior not directly proven and confidence consequence: Electron shell integration is out of scope because no shell source/contract changed. Configured nested browser AC-001 was not separately exercised and remains a bounded gap.

## Platform / Runtime Targets

- Operating system / platform: macOS `26.5.2`, arm64
- Runtime and relevant framework versions: Node `v22.23.1`; pnpm `10.28.2`; server Vitest `4.0.18`; Nuxt `3.21.1`, Nitro `2.13.1`, Vite `7.3.1`, Vue `3.5.28`; web Vitest `3.2.4`
- Browser / engine and version, when applicable: Google Chrome `151.0.7922.170`
- Device, viewport, locale, timezone, or accessibility settings, when applicable: desktop viewport `1600x1100` from retained captures; local trusted session; Europe/Berlin host timezone. Accessibility semantics were used for task-row/store assertions; no full accessibility audit.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Migration Required`
- Representative existing data exercised: strict current V1 configured/deep/task-Agent/task-Team layout with flat defective memory, direct-root and empty controls, complete member directories/sentinels, communication; plus real current provider-created task memory.
- Direct-use, discard/rebuild, or migration result and evidence: all unambiguous flat directories moved whole and bytes/siblings preserved; canonical-only public reads passed before/after restart.
- Migration completion/recovery evidence: success/idempotent restart; invalid target truthfully `FAILED`, `MANUAL_RETRY`, `canRetry: true`; dependent definitions `NOT_RUN`; correction plus public Retry succeeds.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: no arbitrary kernel/device/power/concurrent-writer matrix per approved bounded convention. Browser failure is navigation logic, not a residual storage uncertainty.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-history/nested-team-history-restart.e2e.test.ts` / `NTH-E2E-001/002` | Added | restart projection, controls, migration failure/retry | Pass — 2 tests | Actual built processes/public GraphQL/physical bytes. |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` / `NTH-E2E-003` | Updated | exact third ledger migration | Pass — file 4 tests | Approved proportional stale expectation update. |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` / `NTH-E2E-004` | Updated | MP-001/MP-002 and imported canonical reader | Pass — 1 test | Actual source and hub processes. |

## Tests Removed As Stale Or Obsolete

None. The stale two-record ledger cardinality was updated rather than removed.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: the three paths listed immediately above.
- Paths removed: `None`
- Added or updated paths attached for proportional test-code review: `Yes` — included in the failure package; however the immediate review request is focused failure-origin review because the overall result is `Fail`.
- Diff or repository evidence supplied for removed paths: `N/A`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/real-classroom/cold-task-browser-failure-analysis.md` | focused expected/observed/source-chain analysis | Retained | Primary review entry. |
| `api-e2e-evidence/real-classroom/live-cold-ui-gap-result.json` | semantic browser assertions | Retained | Exact IDs, controls, zero row count, focus error. |
| `api-e2e-evidence/real-classroom/live-active-cold-ui-team-control-and-missing-task-row.png` | post-restart screenshot | Retained | Shows direct-root/Team controls and absent transient task row. |
| `api-e2e-evidence/real-classroom/live-active-task-member-before-cold-restart.png` | pre-restart screenshot | Retained | Shows exact transient task child and task content. |
| `api-e2e-evidence/real-classroom/live-active-graphql-after-restart-summary.json` | API cross-check | Retained | Proves exact data remains readable. |
| `api-e2e-evidence/real-classroom/live-active-byte-preservation-summary.txt` | SHA-256 evidence | Retained | Before/after identical. |
| `api-e2e-evidence/repository-*.log`, `server-*.log`, `frontend-focused.log` | repository execution | Retained | Full command outputs and isolation rerun. |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/real-classroom/live-classroom-active-phase-a.mjs` | create/focus a real live nested task-Team execution via browser | Pass before restart | Script retained as evidence; no runtime resource. |
| `api-e2e-evidence/real-classroom/live-classroom-cold-ui-gap-probe.mjs` | semantic post-restart DOM/store assertions | Exposed `NTH-BR-001` failure | Script retained; tab closed. |
| Isolated runtime/database and owned processes | preserve realistic filesystem/database/provider state across SIGKILL | Backend pass, browser fail | Fully removed/stopped; cleanup report retained. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Memory Sync remote hub network | Second real loopback backend acts as hub | Remote deployment routing is unchanged | Low; application HTTP/process boundary is real. |

The authoritative broader browser journey did not mock the model/provider, team package, agent package, backend, database, filesystem, GraphQL, or Nuxt renderer.

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | `NTH-E2E-001`–`004`, `NTH-LIVE-001`, `NTH-BR-CTRL-001`, focused repository controls | Backend canonical layout/migration/projection/retry/Memory Sync and real cold API recovery are correct. |
| **Fail** | `NTH-BR-001`; AC-002 and browser AC-012 | Settled delegated-task execution is filtered out of historical navigation and exact task-Agent focus rejects even though backend history is non-empty. |
| Non-gating baseline fail | broad `pnpm test:e2e` five persistent files plus two parallel flakes | Unrelated pre-existing/stale/global-state failures; separately isolated and documented. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated runtime root/database/vault/package import | API/E2E-owned | Recursive delete after process stop | Removed; path no longer exists. |
| Backend `127.0.0.1:58376` | API/E2E-owned | Stop recorded process | No remaining listener. |
| Frontend IPv4 listener/browser tab | API/E2E-owned | Stop owned listener; close AutoByteus tab | No owned listener/tab remains. |
| Unrelated IPv6 port-3000 server PID `37602` | Not owned | No action | Intentionally untouched. |
| Repository E2E temp resources | Test-owned | Suite hooks | Completed; no test runtime retained. |

Authoritative proof: `api-e2e-evidence/real-classroom/cleanup-report.txt`.

## Preliminary Classification

- Classification: `Local Fix`
- Recommended owner: implementation engineer after code-review confirmation.
- Basis: the approved behavior is unambiguous; backend storage/API now satisfy it. Existing frontend code filters every `task.settled_at` execution in `teamExecutionTreeSelectors.ts`, then `focusAgent()` requires a projected row and rejects the exact historical task AgentRun as not live. This is a bounded source integration defect, not a requirement/design gap, test assertion issue, environment issue, or migration failure.
- Focused failure-origin review requested because: API/E2E `Fail` routing requires `code_reviewer` to confirm the origin and owner before rework. The review should examine `teamExecutionTreeSelectors.ts`, `teamExecutionViewState.ts`, and the normal history-open path, and define proportional regression expectations for settled historical task-Agent/task-Team rows.

## Recommended Recipient

`/code_reviewer` for focused failure-origin review with the complete cumulative package and durable coverage changes.

## Evidence / Notes

- The task record's `settledAt`/`interrupted` state is normal cold-recovery behavior; hiding that record makes the history UI unable to reach data that the backend correctly retains.
- Team Communication message count was `0` both before and after in the real-provider fixture; visibility of the exact task record/description/interruption provides the browser control, while the durable current-V1 fixture proves non-empty ordered communication/reference preservation.
- The excluded restart omitted `DATABASE_URL`. It was stopped, disclosed, and not used as the authoritative backend validation. The correctly configured restart independently yields non-empty API data and the same settled-task navigation failure.
- No API/E2E-owned production source was modified.
- Post-round user directive for the next rerun: execute three independently marked Teacher flows—ordinary `send_message_to` to the `/StudentStudyGroup` team address, ordinary `send_message_to` directly to `/StudentStudyGroup/student_one`, and `delegate_task` to `/StudentStudyGroup`. For every flow, stop and cold-restart the server, prove the exact history reloads, then perform a new supported interaction proving continuation after restart. Verify Team Communication content/order/references for both message routes and independently recheck delegated-task cold navigation/lifecycle. These future scenarios are recorded as `NTH-LIVE-002A/B/C` in the coverage investigation and were not retroactively counted in `API-REV-001`.

## Latest Authoritative Result

- Result: **Fail**
- Final validation confidence: `82.7%`
- Default `95%` confidence target met: `No`
- Any final applicable confidence category below `90%`: `Yes` — requirement/AC proof and user-surface/browser confidence (`50%` each)
- Broader validation decision: `Required` and completed; it found the material failure.
- Critical acceptance criteria lacking direct proof: configured nested member browser rendering in AC-001 was not separately live-proven. AC-002 and browser AC-012 were directly tested and failed.
- Required next recipient: `/code_reviewer` for focused failure-origin review.
- Notes: passing backend/API coverage cannot override failed critical browser acceptance behavior.
