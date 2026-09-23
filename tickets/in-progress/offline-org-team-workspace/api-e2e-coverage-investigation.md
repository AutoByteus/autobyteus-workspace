# Round 2 revalidation completed — API-REV-002

CRR-003 / IR-003 / SR-005 / ARCH-REV-003 received. Approved SR-002 unchanged. Latest completed API result remains API-REV-001 Fail/75.0% until this revalidation completes. Historical round1 investigation follows the current plan.

## Round 2 investigation and validity decisions (before execution)
- Head66213bd539ed422d39d101bdd218d73760a4100f; source correction cb139904c68b65e3af9f6b07de0e8e5275ed8169. Independently diffed prior API baseline: only FileExplorer.vue plus two focused web tests change in source/test projects. No backend/provider/config/state-publication/schema changes. Scope evidence api-r2-source-scope.json; CRR-003 fingerprint evidence carries unchanged32 production owners and protected files.
- C09-R1 original regression is Still Valid, retained in14-test suite. Both composed variants are Still Valid and strengthened to real metadata/ensure registration with deferred transport, no pre-register B. Expanded scalar readiness, error/Retry, stale/inactive/unmount, stable lease tests reflect SR-005 rather than inventing new scope. No removal, replacement or new durable edits needed initially.
- Execute C09-R1 FIRST; then real-browser C09 first read-only recovery, two variants, before accepting unaffected positives. Use own new bootstrap runtime/DB and public fixtures, no old deleted runtime resurrection; own proxy fails only selected metadata requests. Original logs remain immutable; new evidence api-r2-* names. No live store mutation or substituted renderer.
- Additional regression scope: focused6 Files/layout tests then broader28 configuration/publication/Files sets. Independent HTTP/restart test rerun for new stack smoke. Prior native/Codex/Claude same-identity actual-B, core browser Send, fresh-task/history evidence remains carried from API-REV-001, not repeated or called current reruns; no runtime owners changed and no provider reset justified. One fresh fixture conversation may establish browser retained state, not substitute for carried provider coverage.
- Browser required: files metadata registration, first completion, both unopened and dirty-prior targets, no tab-toggle workaround/pre-registration/Save replay; retained launch A/composer/history, keyboard/tab safety while unavailable, explicit destination open/save. Repository fake transport cannot alone close real C09. Responsive/browser shared shell evidence carries; native picker unchanged bridge tests, actual shell not necessary. Full vue-tsc baseline-parser limitation remains and is not a Pass.
- Setup instructions rechecked: web/server AGENTS.md, web README endpoint proxy/run commands, manifests, existing project bootstrap and prior API local-checks. Use pnpm test:nuxt --run; prepare:shared for owned backend build; BACKEND_NODE_BASE_URL for Nuxt. Do not touch user app/database/auth. No commit/push/merge/release authorization.
- Post-repository confidence will be reassessed before browser: current failure is unresolved until directly rerun. Clean target>=95%, each applicable category>=90%, critical AC005 first recovery proven. No upstream source score substitutes for this gate.

---
# Historical round1 investigation

# API/E2E Coverage Investigation

## Meta and authority
- Package OFFLINE-ORG-TEAM-WORKSPACE-20260922; initial round 1, 2026-09-22. Prior API/E2E result/confidence: **N/A**; no record exists.
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace; branch codex/offline-org-team-workspace; reviewed HEAD 3a52e67ba72ee53497f5d9492f406289f23f28f3; base da86efe07f7f71e7455db6a866286af0bf0debd7.
- Trigger: Code Reviewer CRR-001 Implementation Review Pass. task_size **Medium**, architectural_risk **High**, **Reviewed** route. Successful result requires Code Reviewer proportional durable-test review, not direct Delivery.
- Authority read: sibling requirements-doc.md (approved SR-002), investigation-notes.md, design-spec.md (SR-004), solution-revision-record.md, solution-handoff.md, design-review-report.md and architecture-review-revision-record.md (ARCH-REV-002 Pass; ARCH-REV-001 retained), implementation-handoff.md and implementation-revision-record.md (IR-001), code-review-report.md and code-review-revision-record.md (CRR-001).
- Supplements: analysis-result.md (historical only), evidence/current-owner-probe.json (synthetic only), evidence/user-subteam-workspace-control.png (control location), implementation/reviewer local checks and referenced logs/source inventories/preview. No Product supplement, successful post-API test review or Delivery revision: N/A — not applicable.
- Initial investigation persisted before suite changes/execution. Canonical ledger: api-e2e-test-case-ledger.md; report: api-e2e-execution-coverage-report.md; revision record will be created on completion as API-REV-001.

## Approved basis and changed boundaries
| Boundary / behavior | Required proof | Existing gap / selected surface |
| --- | --- | --- |
| Backend/config + GraphQL DS-001/004; BEH-001,002,004,006; AC-001,002,004 | Team-only intent, all configured children including independent overrides/C; root/direct/siblings/models/tasks protected; one stopped-root commit/readback | Unit tree store real but catalog/workspace/lifecycle collaborators mocked, GraphQL service mocked. Add real-process HTTP API persistence/restart coverage. |
| Frontend draft/store/form DS-001; AC-001,002,005 | Existing/New, workspace-only and composed Save/reopen, dirty/revert, lifecycle lock; standalone unchanged | Composed unit coverage plus implementation-only render fixture. Execute full browser against isolated backend. |
| Canonical adoption/Files DS-002; AC-004,005; AR-P001 | Preserve contexts/composer/attachments; explicit null unmounts tree and editor, not retained draft A; C cleanup, keyboard suppression, tabs, retry B | Real components/stores with mocked I/O. Keep regression and select rendered browser fault/recovery journey. |
| Process/identity/external integration DS-003; AC-003 | Same established native/Codex/Claude conversation, actual cwd/file B, context recall; never-started child; no startup on inspect/Save | Bootstrap mocks do not prove providers. Probe capabilities through isolated backend; run providers that are actually available. Name blockers individually. |
| Task lifecycle DS-005; AC-006 | Fresh delegation reads current B; historical execution snapshots/A files untouched | Source projection and mock tests only. Add/execute composed lifecycle proof; full live task remains required if provider available. |
| Persistence | Directly Usable — No Migration, exact schema v1 reader/write/restart | Use existing fixtures/current reader and normal API-created data, no migration/dual reader/reset. |
| Desktop shell | Shared unchanged picker integration only | Browser is preferred for renderer; focused picker repository tests first. No user's desktop process touched. Actual shell only if material unproven change remains. |
| Workers/distributed | No new worker/queue/distributed topology | N/A; ordinary Org/Agent lifecycle and provider subprocesses above cover relevant boundary. |

No new behavior ambiguity or source defect established. Legacy/compatibility and transition sections of implementation handoff checked: no aliases, migration, file/history copy, reset or unsupported workspace-edit subjects intended. Registry metadata side effects are not partial configured-tree success. Do not invent filesystem existence restrictions.

## Execution discovery and safe setup
| Instruction/configuration | Learned command/constraint |
| --- | --- |
| autobyteus-server-ts/AGENTS.md, README.md, package.json, vitest.config.ts, tests/setup/prisma-{env,global-setup}.ts | pnpm exec vitest run ... --no-watch; prepare:shared generates excluded declarations; pnpm build builds dependencies/Prisma/server. Unit setup owns temporary DB. |
| autobyteus-web/AGENTS.md, README.md, ARCHITECTURE.md, package.json, vitest.config.mts, nuxt.config.ts | pnpm test:nuxt ... --run; Nuxt/Pinia/happy-dom unit boundary; browser Nuxt dev with BACKEND_NODE_BASE_URL, WS endpoint from same URL. Older architecture prose says Python; current executable server README/package owns TS startup. |
| root package.json; test-support/live-e2e/test-runtime-bootstrap.mjs and run-live-e2e.mjs | Reuse startBuiltTestServer on free loopback port, isolated tests/.tmp root plus explicit unique db file under server/db; sanitized env, readiness marker, stop/removeOwnedTestRuntime. Do not run default shared persistent test runtime blindly. |
| server README credential policy; live-e2e-scenarios.mjs | Native providers need configured encrypted vault or available local provider; ambient plaintext API aliases are not runtime credentials. External CLI auth may continue via normal HOME. Never read/display credential values or copy user session data. |
| web tests/e2e/*-probe.mjs; stopped-run-model-config-graphql.e2e.test.ts | Existing browser/real-process testing conventions; synthetic fixtures must be disclosed, public definition/create/stop APIs preferred. |

Services: first repository checks/preparation, server build, isolated backend free port + own DB/runtime, Nuxt separate free port. Browser owns fresh profile/tab. Fixture: minimal definitions, root/direct/two Teams, affected lead/unused child and optional distinct child workspace; owned A/B/C files. Existing real user database/runs/processes remain untouched. Cleanup only owned resources. Logs/evidence in this ticket; no secret values. Native/CLI capability availability is unprobed at this initial checkpoint.

## Existing durable coverage validity inventory
| Paths/scenarios (relative to worktree) | Decision | Evidence/action |
| --- | --- | --- |
| server tests/unit/agent-org-execution/agent-org-run-config{,-options}.test.ts; tests/unit/api/graphql/types/agent-org-run-config.test.ts | Still Valid | AC-001/002/004; actual tree I/O, final-cwd spy, one-write/rejection/uncertainty/save-restore contract. Rerun; service/catalog/workspace mocks disclosed. |
| server tests/unit/agent-org-execution; tests/unit/agent-collaboration/configured-agent-{activation-planner,execution-handle}.test.ts; Codex/Claude bootstrap tests | Still Valid | AC-003/006 owner regressions, not actual provider proof. Broaden relevant suite. |
| web services/runConfigEditing/__tests__, stores/__tests__/existingRunConfigStore.spec.ts, agentOrgRunConfigPublication.spec.ts; services/agentOrgExecution/__tests__/agentOrgRunConfigAdoption.spec.ts | Still Valid | Independent workspace intent, composed Save, stale generations, metadata publication/identity and standalone models match approved scope. Rerun. |
| web components/layout/__tests__/RightSideTabs{,.workspaceTarget}.spec.ts; fileExplorer/__tests__/FileExplorerLayout.spec.ts | Still Valid | AR-F001 mandatory actual consumer/fallback ownership coverage; external I/O/editor mocked. Preserve and rerun. |
| web components/workspace/config/__tests__, org/__tests__/AgentOrgWorkspaceConfigBoundary.spec.ts; team/__tests__/TeamCanonicalPlus.spec.ts | Still Valid | Team-only enablement, existing launch/standalone protected. |
| server tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts | Still Valid | Real process standalone Agent/Team model editing preserved; no Org workspace case currently. Reuse safe setup pattern; do not replace. |
| server migration continuation E2E | Out Of Scope for migration assertions | Fixture mechanism illustrates real lifecycle with provider fake; schema migration not requested. Do not add migration-only coverage. |
| web existing-run-model-config/Org draft-retention browser probes | Still Valid in existing scope | Renderer fixtures are not full real-backend Org workspace proof. Do not claim their mock paths prove new API. |

No stale tests identified; no removal or compatibility-only retention planned.

## Coverage additions and temporary probes
- **Add Durable Coverage**: server tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts — real server API create/stop/read/save/reopen/restart, propagation/preservation/no activation/rejections and files untouched; AC-001/002/004/005. Critical public boundary absent from durable suite.
- **Use Temporary Executable Probe Only initially**: provider availability and owned live conversation A→B; availability is environment-specific, evidence retained. Promote reusable successful provider continuation harness to durable gated coverage if feasible.
- **Use Temporary Executable Probe Only initially**: full browser investigation/fault injection at metadata transport, actual Files recovery; existing durable composed regression already covers deterministic null semantics. If new durable browser scenario is needed, record revised decision before adding it.
- Final-cwd catalog variability and uncertain persistence remain deterministic repository faults; do not damage filesystem/shared data merely to manufacture disk failures.

## Planned case ledger
| ID | Journey | ACs | Order / command or entry |
| --- | --- | --- | --- |
| API-C01 | Focused server config/options/GraphQL contract | 001,002,004 | 1: prepare:shared then focused 3-file Vitest |
| API-C02 | Focused web composed Files/draft/publication/forms | 001,002,004,005 | 2: implementation 25-file selection via test:nuxt --run |
| API-C03 | Broader lifecycle/activation/task/bootstrap owners | 003,004,006 | 3: Org unit directory plus configured activation/handle and bootstrap tests |
| API-C04 | Build and real-process HTTP API/persistence/restart | 001,002,004,005 | 4: pnpm server build; new real-process suite |
| API-C05 | Native availability and real A→B continuation/unused child | 003,005 | 5: isolated runtime capabilities/catalog and actual normal messaging |
| API-C06 | Codex availability and real A→B continuation/unused child | 003,005 | 6: same normal lifecycle, retained provider identity |
| API-C07 | Claude availability and real A→B continuation/unused child | 003,005 | 7: same normal lifecycle, retained provider identity |
| API-C08 | Full browser Save→reopen/Send, locked scopes, responsive/picker mapping | 001–005 | 8: Nuxt + owned backend; real UI |
| API-C09 | Browser A-draft/unavailable B, C cleanup, tabs/keyboard/retry B | 004,005 | 9: controlled metadata response failure, real Files |
| API-C10 | Fresh task source B, old snapshot/A unchanged | 006 | 10: restored Org delegation lifecycle |

## Initial pre-execution confidence plan (superseded by scorecards below)
At initial investigation, post-repository scores were **pending execution**, not inferred from upstream passes. Mandatory seven-category scorecard will be filled immediately after repository checks. Critical provider/browser/task evidence is currently missing. Broader validation **Required**: live API/process + Browser + provider/lifecycle; repository mocks cannot establish identity-preserving cross-directory behavior. Clean target is >=95% overall, every category >=90%, every critical AC directly proven. A real blocker or failure prevents Pass irrespective of average.

## Investigation decision
Proceed: Yes. Durable additions: planned above, no production fixes. No pre-execution reroute. Environment/probe failures will be investigated locally; a proven source/design failure routes for focused failure-origin review; missing external dependency is reported truthfully to the user after safe alternatives.

## Post-repository evidence and mandatory confidence scorecard
Independent execution: API-C01 3 files/21 tests Pass; API-C02 25/249 Pass; API-C03 20/117 Pass; API-C04 new real-process test 1/1 Pass plus server build Pass. Exact commands in ledger and evidence logs. New suite uses public create/stop/read/options/update APIs, actual tree on disk, fresh process reopen, empty isolated credential store and protected A/B/C files. No provider turns or browser claims from this test.

| Category | Score | Support | Remaining gap / improvement |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 50% | Direct AC-001/002 configuration and AC-004 subset; real restart | Critical AC-003 and AC-006 unproven; provider/task execution |
| Changed-boundary execution directness | 75% | Real server HTTP and disk, actual composed frontend owner tests | Browser save and live runtime boundary absent |
| Cross-boundary realism/mock gap | 50% | Actual HTTP/process/persistence | External providers and browser still missing |
| Environment/configuration/identity/fixtures | 75% | Public seeded data, unique DB/home/dirs, exact whole-tree comparisons | No established real conversations yet |
| Failure/edge/lifecycle/recovery | 75% | Active root HTTP rejection; unit uncertainty/admission/stale/null guards | Real unavailable Files recovery and provider error behavior |
| User-surface/browser/desktop | 50% | 249 focused tests incl actual Files consumers; upstream renderer inspected only | Full browser not executed by API owner; unchanged native picker not proven here |
| Durable coverage quality/relevance | 90% | Existing regression + new HTTP/process/current-v1/restart suite | Add gated same-identity/provider coverage when feasible |

Overall **66.4%**, arithmetic mean 465/7. All critical criteria directly proven: **No**. Default >=95% gate: **No**. Broader validation **Required**, not optional: live provider and browser/lifecycle. Expected gain: actual preserved conversation/cwd, rendered contract integration and future task source; cannot predict clean percentage before execution. All scores are evidence estimates, not test pass percentages.

## Broader investigation update — Files recovery failure
API-C05/06/07 real provider continuity and API-C08 browser Save/reopen/Send passed; API-C10 actual fresh delegation B with historical snapshot equality passed. API-C09 unavailable target suppresses tree/editor correctly, but first metadata recovery through Settings emits Vue `Maximum recursive updates exceeded in component <FileExplorer>` and stays Loading workspace. Toggling Activity→Files then permits explicit D open/edit/save, without replaying Save. This workaround does not erase the first-recovery failure. FileExplorer.vue and workspaceMetadataActions.ts have no diff against source-review base; preliminary origin may be pre-existing consumer exposed by the new path, not new null gate. Focused failure-origin review must determine ownership.

Coverage decision revised before new test edit: **Add Durable Coverage** for metadata-only FileExplorer activation using actual reactive workspace metadata-registration action and mocked transport only. Existing composed regression pre-registers B before recovery (RightSideTabs.workspaceTarget.spec.ts register('B')) and therefore bypasses metadata-only registration and cannot detect its self-triggering watcher loop; do not weaken approved recovery to accommodate it. Also execute prior-mounted dirty editor unavailable-target subcase to finish safety evidence. No production source fix in API ownership.


## Final investigation disposition — API-REV-001
- Executed cases C01–C10; C09 failed and C09-R1 added/reproduced API-F001. No requirement ambiguity or invalid test assertion identified. Requirements/design recovery intent remains authoritative.
- Browser repeat: D first recovery fails at 09:59:30Z; E recovery fails at 10:04:41Z. D tab-toggle workaround recovers; explicit D file save succeeds. Prior dirty D editor unmounts during E unavailability and keyboard save does not write D. Canonical E recovery must not need a render-failure workaround.
- New durable FileExplorer.metadataActivation.spec.ts (43 lines) preserves actual reactive metadata registration and mocks only external transport/file stream. One test fails with the same recursion; Vitest also reports one unhandled rejection. This is a failure reproducer, not a passing suite.
- No stale test removed, no production fix. Server durable API suite remains Pass. Provider/session probes remain retained temporary evidence: reuse bootstrap/public APIs, but promotion of environment-dependent live provider orchestration is deferred until failure revalidation; do not imply long-term provider regression is already covered by the new HTTP suite.
- Final scorecard: requirements 50%, directness 95%, realism 95%, environment/identity 95%, failure/recovery 50%, user-surface 50%, durable coverage 90%; mean **75.0%**. Critical AC-005 recovery fails; no Pass regardless of scores. Broader validation Required and executed. Full source-origin determination belongs to Code Reviewer.
- Final result **Fail**. Preliminary **Local Fix — implementation owner**, potentially pre-existing consumer behavior exposed by this supported flow; exact origin to be confirmed. Not a provider/environment blocker. No provider reset or continuity weakening proposed.
- Cleanup completed: owned backend/Nuxt/proxy, tab, unique DB/key/runtime and UI directories removed; own generated SDK dist removed; production app PID19026 left running. Detailed evidence api-cleanup.json. Canonical execution report is round-level authority.

## Round2 post-repository confidence gate
Independent C09-R1 14/14, focused6/49, broader28/275 and C04 real HTTP/restart1/1 all Pass; logs api-r2-*. Expanded focused counts overlap. No production/durable-test edits by API owner this round. Existing source/protected owners independent diff confirmed.

| Category | Score | Evidence / remaining gap |
| --- | --- | --- |
| Requirements |50%|Prior critical AC005 browser failure not yet independently closed despite corrected unit proof. |
| Changed-boundary directness |95%|Actual reactive consumer/action tests + current real HTTP/process; prior real provider/browser evidence carried. |
| Cross-boundary realism |95%|Current HTTP/restart and prior real provider/task/core browser; controlled transport in expanded consumer tests disclosed. |
| Environment/identity/fixtures |95%|Owned project bootstrap/public fixtures; prior same-session samples remain valid, no changed owners. |
| Failure/lifecycle/recovery |75%|All14 lifecycle cases and both composed recoveries pass; real first recovery pending. |
| User surface/browser/shell |50%|Prior first-recovery Fail remains current; unchanged compact/core/picker test evidence carried. |
| Durable coverage |95%|Original reproducer plus13 lifecycle cases and real-store composed first-recovery cases now remove pre-registration proof gap; real HTTP suite current. Live provider probes remain justified temporary diagnostics of unchanged external owners. |

Mean555/7 = **79.3%**, not Pass. **Broader Required**: live browser C09 both first recoveries. No missing external dependency so not Blocked. Expected evidence gain is direct first completion/no error/no replay/retained state; no inferred future result.

## Round 2 broader-validation result and final investigation disposition
- API-C09 ran against a newly owned isolated backend/runtime/DB, public synthetic Org fixture, transparent HTTP/WebSocket proxy and browser renderer. The proxy faulted only the selected target's `workspaceMetadata` request. Repository C09-R1 ran first as required; browser acceptance was not inferred from that pass.
- **Initially unopened target B:** one stopped-Org Save produced the expected unavailable Files state. Tree/editor were absent and keyboard Save produced no write. After clearing only the metadata fault and opening Edit Config once, the first completion rendered `target.txt` without Loading, tab toggle, reload, pre-registration or Save replay. Browser console errors were empty. Explicit B open/edit/save wrote only B. Conversation marker, unsent composer and unrelated launch draft A remained.
- **Previously mounted dirty B to target D:** dirty unsaved B content was present before one stopped-Org Save to D. Under the D metadata fault the previous tree/editor were removed, keyboard Save was suppressed and B stayed unchanged. After clearing only the fault, one Edit Config/canonical read while Files remained selected rendered D on the first completion, with no recursion or console error. D retained its original content until the deliberate edit/save, which wrote only D. Conversation, composer and launch draft remained.
- Final audit: exactly 2 config saves, 2 controlled metadata faults, 2 post-fault workspace creates and 2 deliberate destination writes. Schema-v1 Org remained inactive; Team and every configured Team child carried the target, while root/direct/sibling scopes, models, identities, task history and A/C files remained unchanged. Evidence: `api-r2-browser-result.json`, four `api-r2-*-{unavailable,recovered}.json` audits, `api-r2-requests.jsonl`, `api-r2-backend-resumed.log`.
- An execution interruption killed the first owned service processes/tab. The same isolated DB/runtime and fixture identity were resumed; no configuration Save, provider/session reset or recovery action was replayed. The initially-unopened branch was already durably audited; the dirty branch completed in a fresh owned tab. This does not constitute a provider continuity rerun or cancel the carried API-REV-001 provider evidence.
- API-F001 is resolved at the executable boundary: original C09-R1 passes 14/14 with no reported unhandled error, and both real browser first-recovery variants pass without the former workaround. No new failure or requirement/design ambiguity was found.

| Final confidence category | Score | Direct evidence / bounded residual |
| --- | --- | --- |
| Requirements and acceptance criteria |95%|All critical ACs have direct cumulative proof; corrected AC-005 recovery now passes in both realistic branches. Finite combinations remain sampled. |
| Changed-boundary execution directness |95%|Corrected FileExplorer path ran through actual reactive suites and real renderer/API/filesystem. |
| Cross-boundary integration realism |95%|Real HTTP/restart, browser HTTP+WS, filesystem/editor and carried actual provider/task boundaries. Focused tests still substitute external transport/editor where disclosed. |
| Environment/configuration/identity/fixtures |95%|Isolated project bootstrap, public fixtures, same saved Org/member/platform identity across restart; carried native/Codex/Claude samples unchanged. |
| Failure/edge/lifecycle/recovery |95%|Initial-unopened and dirty-prior fault/recovery, null safety, keyboard suppression, stale/inactive/unmount/error/Retry and lifecycle cases all pass. |
| User surface/browser/desktop |95%|Real Files behavior and prior core/responsive browser evidence pass. Actual unchanged Electron picker was not executed; focused bridge tests carry. |
| Durable regression coverage |95%|Original reproducer, expanded 14-test lifecycle suite, composed first-recovery cases and real HTTP/restart test are directly relevant. Host-dependent provider journeys remain temporary evidence. |

Final mean **95.0%** (665/7). Every applicable category is at least90%; every critical acceptance criterion has direct cumulative proof; the default clean-confidence target is met. Broader validation was **Required and executed**. Final result **Pass**. No API-owned source or durable-test edit was needed this round. Actual Electron native picker remains unexecuted because its shell bridge and ownership are unchanged; full web `vue-tsc` remains blocked by the disclosed unchanged parser diagnostics and is not represented as a Pass. These are negligible/baseline residuals, not missing critical proof.

Cleanup: owned processes/ports and runtime/DB/key removed; generated shared SDK dist removed; production PID19026 untouched. The active validation tab closed. One pre-interruption local tab remained debugger-unattached, unmarked and inert after service shutdown for automatic browser-session cleanup; no user tab was touched. `api-r2-cleanup.json` is authoritative. Successful reviewed-route output requires Code Reviewer proportional review of the cumulative changed durable tests: the server HTTP/restart test, `FileExplorer.metadataActivation.spec.ts`, and `RightSideTabs.workspaceTarget.spec.ts`.
