# API/E2E Coverage Investigation

## Latest complete state and authority

- Current complete round **2 / API-REV-002 / Fail /82.9%**; prior **API-REV-001 Fail /73.6%** is preserved, not inferred.
- Trigger: Code Reviewer **CRR-003**, confirmed API-F001 Local Fix to API/E2E. C01 rechecked first after correction.
- `task_size=Large`, `architectural_risk=High`, Reviewed route unchanged. Successful output would require proportional durable-test review; this is **failure-origin review**, not successful-test review or Delivery approval.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branch `codex/context-compaction-simplification-analysis`; HEAD `c948605e2aa5e9dac77b69819eb8f366226c4112`; reviewed IR-002 source `7886aeb78449fa54a09ce715fc6e0d74134b386f`; base `046279298f53fb98d7688ee9dc2b2ba0fa827685`. No production source edits, commit, push, merge or release. Delivery target remains origin/personal.
- Active authority: requirements-doc.md **SR-012 approval**, investigation-notes.md, solution-revision-record.md/solution-progress-result.md **SR-013 approval capture/design**, design-spec.md; proposed-compaction-prompt.md exact prompt-v5 and output-format-and-coverage.md. **ARCH-REV-001** design-review-report.md + architecture-review-revision-record.md. implementation-handoff.md + implementation-revision-record.md **IR-001→002**. code-review-report.md + code-review-revision-record.md **CRR-001 Fail→CRR-002 source Pass9.40→CRR-003 API-owned origin**. CR-001/002 remain resolved; no source-review score change inferred.
- Relevant supplements remain active: compaction-prompt-proposal.md, prompt-refinement-notes.md, simplification-design-direction.md, analysis-report.md, upstream-compaction-research.md; history, upstream-prompts/README.md (source/license), upstream-experiments/README.md, design-investigation-probes/README.md, architecture-review-evidence/README.md, implementation-evidence/README.md + ir-002, code-review-evidence/README.md + crr-002/crr-003. Re-entry authority hashes checked; only reviewer report/history changed.
- Product supplements **N/A—not requested**. Delivery revision/DR **N/A**. Independent architecture/source reviews occurred and are not N/A. Canonical investigation, execution report, ledger and revision record are the four api-e2e-*.md files at this ticket root. Evidence below is relative to this ticket unless stated otherwise.

## Approved behavior and boundary mapping

One fresh direct no-tools summary of prior summary plus eligible settled history; exact prompt-v5 and one accepted tagged six-heading Markdown body. Preserve system/recent/tool-safe context, budgets and raw evidence. Explicit invalid/incomplete failure and distinct-user retry, no corrective generation/child/category fallback. Archive copy before atomic snapshot commit; postcommit prune/report cannot roll back. Current-parent/explicit model tuple and native-vs-summarizer provider remain distinct. Strict-v5 direct use without migration/categories, historical readers preserved. Only bounded startup model-setting migration; no perfect recall or power-loss guarantee.

| Changed surface | Requirements / acceptance | Required direct evidence |
| --- | --- | --- |
| Summary/executor/domain | REQ-001–006/009; AC-001–007/011 | First/repeated mechanics **and separate actual semantic review**, one call/framing/incomplete/unknown, explicit retry |
| Files/lifecycle | REQ-003/004/007; AC-004/005/008 | Strict-v5 resume, raw/archive/commit fault paths, old/new visibility |
| Provider/config/startup | REQ-005/008; AC-005/006/010 | Controlled options/completion, current tuple inheritance/unavailable selection, startup migration |
| API/status/renderer | REQ-008; AC-010 | Current nullable direct fields, native discriminator, real settings/browser/history; stream mock gap explicit |
| Preserved readers/removals | REQ-002/005/007; AC-003/006/008/009 | Historical categories/raw independent of new generation; no retired runtime API restored |

Affected: backend, external provider, API/transport, browser/web-equivalent desktop renderer, persisted-data and process startup/recovery. Auth/session and desktop shell/native IPC/packaging not changed. Mixed-version writers/distributed coordination out of scope. Browser preferred over desktop; user's running packaged app untouched.

## Project instructions / environment decisions

| Instruction/configuration | Learned commands/constraints |
| --- | --- |
| root README.md and package.json | pnpm test:e2e; test:e2e:real:preflight; test:e2e:real; pnpm dev starts real backend 8000/frontend 3000 with dedicated development data, not test DB |
| autobyteus-server-ts/AGENTS.md, README.md, package.json, vitest.config.ts | vitest run --no-watch; tests use sequential files/forks and Prisma setup; build prepares shared SDKs/Prisma/assets/sanitized builtin smoke |
| autobyteus-server-ts/tests/setup/prisma-{env,global-setup,test-config}.ts | Test database is this assigned worktree's tests/.tmp/autobyteus-server-test.db; migrate reset is expected test-owned setup, not db/test.db or user's app data |
| autobyteus-ts/package.json, vitest.config.ts, tests/setup.ts | Core npm test placeholder is not usable; use pnpm exec vitest run. Existing direct runtime harness owns/cleans mkdtemp state |
| autobyteus-web/AGENTS.md, README.md, ARCHITECTURE.md, package.json | Colocated Nuxt tests, always --run; browser first for web-equivalent UI; never git add . or -A |
| test-support/live-e2e/test-runtime-bootstrap.mjs, run-live-e2e.mjs, live-e2e-scenarios.mjs | Credential-free fixed template; explicit scenarios only; sanitizer; persistent test vault under db/test.db, not ambient provider keys; preflight only reports readiness. Do not run all paid capabilities by default |


Darwin25.5.0 arm64, Node22.23.1, pnpm10.28.2; core/server Vitest4.0.18, web Vitest3.2.4. Existing dependencies used. Repository tests inherit an allow-list only, no ambient provider/database secrets. Prisma global setup resets only assigned tests/.tmp/autobyteus-server-test.db. Actual broader server uses unique tests/.tmp/api-rev-002-owned and db/api-rev-002-owned.db via repository bootstrap overrides; actual build precedes startup. Nuxt dev uses BACKEND_NODE_BASE_URL and owned loopback port; same renderer, no mocked backend. Chrome available, IAB unavailable; actual desktop not needed. Local LMStudio already running, Qwen disk model READY and auto-loaded on calls; DeepSeek test credential absent. No private vault/history copy or paid cloud calls.

## Durable coverage inventory and current validity decisions

- **Still Valid / explicitly carried**: core memory parser/planner/committer/raw-store/snapshot tests, AgentFactory compaction/runtime retry and strict-v5 restore; seven provider/API/streaming families with SDK mocks; server factory/settings/startup migration/history; Nuxt settings/status/store/contract. C02/03/04/06/07 are unchanged and retain their round1 evidence, not rerun counts.
- **Needs Update → Updated / C01 Pass**: shared facade omitted current normalizer (CRR-003). Valid original dispatch/event/termination expectation preserved; real owned-file normalization added. Setup-only compaction tests still stop before generation and are not counted as full-facade or semantic proof.
- **Needs Update → Updated**: active live flow lacked worker core tool registration and local fixture pressure crossed before Unicode ingestion. Register canonical tools, move only local pressure placement, retain all original expected outputs/counts. Later full-flow Pass closes these test-owned defects, not the subsequent continuation variation.
- **Add Durable Coverage → Added**: current tuple schema→durable initialized AppConfig reload and invalid-baseline-preservation; optional first/repeated actual semantic fixture registered in real runner; narrow no-invented-plan alarm with negative regressions. No generic eval framework.
- **Temporary Executable Probe Only**: actual browser settings/history because broad browser harness conventions were not added during a failed semantic gate; current source already has durable component and API checks. Snapshot SIGKILL primitive probe complements durable deterministic fault tests; not a production lifecycle architecture change.
- **Not Tested after Fail gate**: live status→WebSocket→browser/retry and full saved-run UI resume; complete archive-crash/startup-migration campaign. No external blocker claimed for these; future work remains.
- **Stale/Remove**: none removed this round. No compatibility-only tests added, no old compactor/category/strategy API restored. Historical readers are approved preservation, not obsolete runtime behavior.

## Pre-edit investigation and revised decisions

Investigation and ledger existed before every edit/execution. CRR-003 read with prior API-REV-001 evidence and full authority pins; F001 rechecked first. Initial C01 getter assertion and C05 uninitialized fixture failures were test-author errors, corrected through current public contracts. Live API-F002 registration and API-F003 pressure-timing defects were discovered only after executing real boundaries; investigation updated before fixes. Semantic synonyms were corrected without weakening pending approval; actual invented completion then became API-F005. Chronological decisions preserved in api-e2e-evidence/api-rev-002/investigation-decision-log.md; authoritative final outcome is below, not earlier hypotheses.

## Durable paths / execution

| Durable path (worktree-relative) | Change and proof |
| --- | --- |
| test-support/live-e2e/live-e2e-harness.ts | Updated actual normalizer composition with test-owned layout/location dependencies; both callers supply roots. Register canonical core tools in worker; local pressure A20/B170 replaces A170/B20 (same total); safe synthetic diagnostics. Original quality/count/Unicode/tool assertions retained. |
| test-support/live-e2e/run-live-e2e.mjs | Updated registered runner to include optional quality file, same scenario/provider opt-in; node syntax check Pass. Persistent-vault root runner itself not executed this round; isolated bootstrap equivalent used. |
| test-support/live-e2e/compaction-quality-checks.ts | Added fixture-specific alarm for invented plan/checkpoint completion; not a general evaluator. Positive/negative tests and observed-output replay pass. |
| autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts | Updated real context-file locator→local provider path, original recording locator/immutability, event projection and termination regression. |
| autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-boundary.test.ts | Updated canonical tool registration assertions, isolated registry snapshot/restore; added four quality-alarm regressions. C01 total24Pass. |
| autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts | Added two current tuple API cases: initialized durable save/reload, inherit/unavailable retention, invalid/credential-bearing tuple rejection, deletion/retired API checks; temp roots/environment restored. C05 total17Pass with memory files. |
| autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts | Added two real direct calls per opted-in scenario using generated prior summary plus correction, exact references/approval/unrun checks, captured inputs/outputs and manual semantic review. Latest initial automatic checks Pass but semantic adjudication Fail; new alarm added afterward, unit/replay-validated. |

| Case | Latest reconciled evidence | Status / limits |
| --- | --- | --- |
| API-C01 | round2 API-C01.log; 2files24Pass | **Pass**, API-F001 resolved; canonical normalization, events, termination, tool registration and quality alarm. Earlier authoring failures archived. |
| API-C02 | round1 40files202Pass | **Carried Pass, not rerun**; first/repeated mechanics, real core runtime, retry/faults, strict-v5 restore; scripted model bodies. Production/tests unchanged. |
| API-C03 | round1 32files243Pass | **Carried Pass, not rerun**; provider completion/options/current status, primarily mocked SDKs. |
| API-C04 | round1 29files262Pass | **Carried Pass, not rerun**; server model factory/status/history/migration. Selected migration tests mock setDurably. |
| API-C05 | round2 API-C05.log; 3files17Pass | **Pass**, actual GraphQL schema→service→initialized AppConfig/file reload and historical readers, not HTTP transport in this case. |
| API-C06 | round1 10files122Pass | **Carried Pass, not rerun**; Nuxt/happy-dom settings/status/store, not browser. |
| API-C07 | round1 2Node testsPass | **Carried Pass, not rerun**; strict presentation contract; no new contract changes. |
| API-B01 | round2 API-B01.log | **Pass**, documented shared/core/server build, Prisma generation, built-module/startup smoke. Not standalone web typecheck. |
| API-C08 | preflight, four full-flow attempts, two quality samples, semantic review/replay | **Fail — API-F005**, API-F004 also open. Latest full-flow2testsPass; latest initial quality1testPass does **not** equal semantic Pass. Details below. |
| API-C09 | browser-observations.md + API-C09-*.json | Settings/history scoped checks **Pass**; full journey **Not Tested** for live status/failure-retry/full saved-run UI resume. No blanket C09Pass. |
| API-C10 | process-snapshot-probe.mjs + API-C10.json | **Pass within snapshot primitive**: actual SIGKILL before rename→old validv5, after→new validv5. No power-loss/full archive transaction claim. |

C01/C05 final reruns total **41 selected tests Pass**; carried C02/03/04/06/07 total **831 prior Pass**, not fresh round2 tests. Live preflight2Pass, latest full flow2Pass and initial quality1Pass are separate observations with semantic Fail overriding the quality command. Do not sum intermediate attempts into a success rate or call full suite green. Other14 upstream unchanged-base failures remain disclosed/not rerun or waived.

## Confidence and broader-validation decision

| Mandatory category | Post-repository | Final | Evidence and remaining uncertainty |
| --- | --- | --- | --- |
| Requirement / acceptance proof | 75% | **50%** | Actual first/repeated bodies now inspected; repeated body fabricates completed plan work (API-F005). Critical AC-002/007 fails, so low anchor applies despite broad mechanics proof. |
| Changed-boundary execution directness | 90% | 95% | Real production factory/summarizer, parent AgentRun, tools, snapshot/next request, HTTP settings/history and browser execute. Directness is not correctness; no shell claim. |
| Cross-boundary realism / mock gap | 75% | 75% | Local model calls and real product facade replace prior SDK mocks, but live continuation varies (API-F004); no integrated live-status WebSocket/browser journey. |
| Environment/configuration/identity/fixtures | 90% | 95% | Owned backend/db/ports, real startup/build, native model discovery, real initialized durable tuple and browser reload; synthetic history only. DeepSeek credential absent; no cloud call claimed. |
| Failure/edge/lifecycle/recovery | 90% | 90% | Carried direct retry/cancel/commit-fault coverage; real SIGKILL old/new snapshot primitive. Whole archive crash/restart and remote cancellation timing remain bounded uncertainties. |
| User surface/browser/desktop | 75% | 85% | Real settings/model/inherit/unavailable/validation and four history tabs verified. Between anchors because live status/failure-retry and complete saved-run UI resume remain untested; shell unchanged. |
| Durable regression quality/relevance | 90% | 90% | Facade/real normalization, registration, tuple API, opt-in first/repeated fixture and negative alarm added; generic semantic completeness still needs manual review. Updated final alarm proven by units/replay, not another live run. |

Post-repository83.6% (585/7) → final**82.9% (580/7)**, arithmetic mean, not a probability. Broader execution increased directness but exposed a critical semantic failure. Default95% gate not met; requirement50, integration75, user85 below90. Every critical AC directly proven **No**. **Broader Required — executed, Fail**; not external Blocked or Not Required. No further stochastic rerun is used to erase an observed semantic contradiction.

## Current failures and ownership

- **API-F001 Resolved** in owner execution (24/24 final C01); CRR-003 source guard unchanged.
- **API-F002/F003 Resolved test-owned setup/fixture issues** by real later full-flow proof; expected assertions intact.
- **API-F005 Open, primary / AC-002/007**: latest generated repeated summary reports requested APPROVAL-73 plan addition as already completed. Exact input/accepted output/metadata in semantic-final-observations.json; semantic-review.md; deterministic captured-output rejection API-F005-replay.json. Preliminary **Unclear origin (model/prompt quality vs config/implementation)**; do not alter approved prompt/design here.
- **API-F004 Open, secondary / AC-001/006/007**: same-behavior full-flow attempt3 ended final turn without final tool and failed generically; diagnostic attempt4 passes. Missing original low-level exception limits attribution. A later Pass is not closure; see API-F004-triage.json.

**Fail /82.9%**, route to exact rule-selected **/code_reviewer for focused failure-origin review**. Proportional successful-test review remains required on eventual success (seven durable paths), not performed now. Current source Pass/architecture authority unchanged. Owned resources cleaned, shared provider/user desktop preserved; evidence/readme and canonical report contain reproducibility/cleanup details.

## SR-014 bounded diagnostic coordination (not a new completed validation round)

Solution Designer requested fixed-input A,B,B,A, maximum four direct generations, plus at most one original-config full flow after no-provider all-exit observation proof. Current approval/prompt/defaults/support and API-REV-002 Fail82.9 remain unchanged. Manifest and temporary probes in `api-e2e-evidence/sr014-diagnostics/`; no confidence rescore or failure closure from these probes. Existing assertions Still Valid; add only test-owned sanitized observation support, preserve all original samples. Plan is evidence-only and does not introduce a runtime semantic validator or retry loop.

### SR-014 diagnostic supplement completed — no validation rescore

Fixed-input A,B,B,A max4 executed exactly: all4 accepted bodies fabricate completed APPROVAL-73 plan work, including both explicit temperature0 samples. Actual SDK request capture confirms frozen messages and identical non-temperature serialized controls, cap8192; unknown remote defaults/template/backend remain. One full-flow observation passes original assertions with parent0/1024 and null compactor tuple, but temporary Vitest config omitted normal Prisma setup and produced worker token-usage readiness warnings absent in prior positive log; full environment equivalence is not established. Large stdout observation was reporter-interleaved and deterministically reconstructed; direct wire JSONL is pristine. No additional/substitute attempts. API-F005/API-F004 remain Open; API-REV-002 Fail82.9% and sourcePass9.40 unchanged.

Diagnostic delta: shared test harness all-exit observation updated, safe-error helper and observation unit file added; nine cumulative API-owned durable paths. No-provider final2files7Pass and owner regression3files26Pass. Original6 other durable paths/approved requirements/prompt/design/frozen input unchanged. Owned server57025/runtime/db/key/full-flow directory cleaned; desktop/shared provider preserved. Details, output comparisons, deviations, authoring errors and current hashes: `api-e2e-evidence/sr014-diagnostics/README.md`. This is evidence-only ordinary coordination back to ongoing Solution Designer SR-014 investigation, not a new complete validation/acceptance result, confidence assessment, implementation assignment or Delivery request.
