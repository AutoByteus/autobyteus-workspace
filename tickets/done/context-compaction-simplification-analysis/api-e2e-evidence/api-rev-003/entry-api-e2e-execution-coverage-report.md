# API/E2E Execution Coverage Report

## Result and authority — API-REV-002

**Fail /82.9%**. Primary API-F005: actual repeated summary invents completed plan work. Secondary API-F004: unexplained live continuation variation. A passing extraction/mechanics/keyword command is not semantic validation Pass.

- Current complete round **2 / API-REV-002 / Fail /82.9%**; prior **API-REV-001 Fail /73.6%** is preserved, not inferred.
- Trigger: Code Reviewer **CRR-003**, confirmed API-F001 Local Fix to API/E2E. C01 rechecked first after correction.
- `task_size=Large`, `architectural_risk=High`, Reviewed route unchanged. Successful output would require proportional durable-test review; this is **failure-origin review**, not successful-test review or Delivery approval.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branch `codex/context-compaction-simplification-analysis`; HEAD `c948605e2aa5e9dac77b69819eb8f366226c4112`; reviewed IR-002 source `7886aeb78449fa54a09ce715fc6e0d74134b386f`; base `046279298f53fb98d7688ee9dc2b2ba0fa827685`. No production source edits, commit, push, merge or release. Delivery target remains origin/personal.
- Active authority: requirements-doc.md **SR-012 approval**, investigation-notes.md, solution-revision-record.md/solution-progress-result.md **SR-013 approval capture/design**, design-spec.md; proposed-compaction-prompt.md exact prompt-v5 and output-format-and-coverage.md. **ARCH-REV-001** design-review-report.md + architecture-review-revision-record.md. implementation-handoff.md + implementation-revision-record.md **IR-001→002**. code-review-report.md + code-review-revision-record.md **CRR-001 Fail→CRR-002 source Pass9.40→CRR-003 API-owned origin**. CR-001/002 remain resolved; no source-review score change inferred.
- Relevant supplements remain active: compaction-prompt-proposal.md, prompt-refinement-notes.md, simplification-design-direction.md, analysis-report.md, upstream-compaction-research.md; history, upstream-prompts/README.md (source/license), upstream-experiments/README.md, design-investigation-probes/README.md, architecture-review-evidence/README.md, implementation-evidence/README.md + ir-002, code-review-evidence/README.md + crr-002/crr-003. Re-entry authority hashes checked; only reviewer report/history changed.
- Product supplements **N/A—not requested**. Delivery revision/DR **N/A**. Independent architecture/source reviews occurred and are not N/A. Canonical investigation, execution report, ledger and revision record are the four api-e2e-*.md files at this ticket root. Evidence below is relative to this ticket unless stated otherwise.

## Investigation / ledger reconciliation

Full cumulative package and CRR-003 accepted; prior unresolved C01 rechecked first. Coverage investigation and canonical api-e2e-test-case-ledger.md preceded edits, contain meaningful setup/attempt checkpoints, and are reconciled here. Prior history preserved in api-e2e-revision-record.md; no prior Pass inferred. Final event is cleaned resources/semantic Fail; no tests/services remain running. Retained per-attempt files prevent rerun overwrites. One browser seed typo rejected before snapshot write; corrected metadata argument before use. No test or implementation guard weakened.

Evidence directory **api-e2e-evidence/api-rev-002/**; exact commands/cwd/environment and timestamps in individual JSON/logs, plan.json and README.md. Prior carried cases reference api-rev-001/plan.json/results.json/logs, not newly executed counts.

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

## Exact round2 execution / material setup

1. `python3 tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-002/run-case.py API-C01` invokes `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts tests/unit/secret-management/live-e2e-compaction-boundary.test.ts --no-watch`. Final **24Pass**.
2. Same retained runner `API-C05` invokes `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/server-settings/server-settings-graphql.e2e.test.ts tests/e2e/memory/memory-view-graphql.e2e.test.ts tests/e2e/memory/memory-explorer-graphql.e2e.test.ts --no-watch`. **17Pass**.
3. `pnpm --filter autobyteus-server-ts build` **Pass** (shared/core/SDK TypeScript build, Prisma generate, server compile/assets/builtin smoke). No standalone web typecheck/full-suite claim.
4. `node .../api-rev-002/owned-server.mjs` uses documented test-runtime-bootstrap, unique db/runtime and random loopback port. Ready at55688, PID93091. No user/private test vault reused; explicit target verified by LiveE2eHarness.
5. `node .../api-rev-002/run-owned-live.mjs --preflight` runs registered provider capability file, scenario filter DeepSeek + local Qwen, preflight-only. Both readiness tests Pass; DeepSeek **missing provider.deepseek.api-key**, no cloud call; local Qwen READY. Actual generation selects only local Qwen. Runtime loaded context262144, compaction ratio0.05, parent max_tokens1024/temp0; compactor current null/null model tuple uses model defaults via production factory. Provider service already running atlocalhost1234.
6. `node .../api-rev-002/run-owned-live.mjs` invokes `pnpm exec vitest run tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts --no-watch` in server root with RUN_REAL_E2E=1, explicit owned runtime/server/database and only lmstudio.qwen36.compaction-agent-flow. Four attempts, detailed below.
7. `node .../api-rev-002/run-owned-live.mjs --quality` invokes `pnpm exec vitest run tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts --no-watch` with the same owned target/local filter. Two samples; no third live attempt after semantic failure. New alarm validated against exact observed body via Node `--experimental-strip-types` import and C01.
8. `owned-web.mjs`: normal `pnpm -C autobyteus-web exec nuxt dev --host 127.0.0.1 --port55719`, NODE_ENV=development, BACKEND_NODE_BASE_URL=owned backend, telemetry disabled. CUA Chrome actual /settings and /memory, no synthetic render page/transport mocks. Seed script writes only synthetic owned history. Browser observations and HTTP/file correlation attached.
9. `node .../api-rev-002/process-snapshot-probe.mjs`: actual child SIGKILL before/after snapshot-store rename. Strict old/new read succeeds. `git diff --check` and `node --check test-support/live-e2e/run-live-e2e.mjs` Pass.

Repository test environment allow-list excludes ambient secrets and database overrides; Prisma reset is only worktree tests/.tmp test DB. No explicit user authentication needed in owned local backend; secret vault starts empty. Build/seed methods follow project instructions with isolated ports/data override rather than shared fixed development/persistent-vault targets. Durable tests use temp directories and restore touched environment.

## API-C08 attempt history — no cherry-picking

| Attempt | Observed outcome | Resolution |
| --- | --- | --- |
| Full1 | Actual generation reached; no core file tools registered in test worker, final flow failed | API-F002 test setup fixed using canonical registerTools; no product guard edits |
| Full2 | One successful compaction occurred before Unicode read; exact final retained artifact reached but source-evidence check failed | API-F003 local fixture pressure moved A170/B20→A20/B170, same190records; Unicode/tool/count assertions retained |
| Full3 | One compaction completed on turn3 (8blocks/19raw traces, complete/stop,506summary tokens); final parent turn completed without fourth tool dispatch; generic failure | **API-F004 Open**; no original low-level exception/parent response retained before cleanup, exact cause not established |
| Full4 diagnostic | **2testsPass**; 4 successful tools, one summary, direct metadata, strict-v5 snapshot body=next parent request, latest user intact, Unicode/tool source intact, no categories/lineage | Only diagnostic logging changed from Full3, not behavior. Supports positive full-path proof but does not close earlier variation |
| Quality1 | Two actual accepted summaries; valid equivalent wording rejected by initial regex | Test assertion corrected for synonyms, not a semantic product defect; original evidence retained |
| Quality2 | Initial automated1testPass, two fresh one-call summaries complete/stop; manual comparison catches fabricated completion | **Semantic Fail / API-F005**, new narrow alarm rejects retained output; no provider rerun used to erase failure |

### API-F005 — concrete acceptance failure (primary)

- Criteria **AC-002/007**; REQ-001/006 semantic continuation; exact approved prompt instructs distinguish planned/active/completed work. Semantic evaluation is explicitly separate from marker/heading parsing.
- Synthetic repeated input: actual first summary plus user correction requesting retention30, cancelling cloud export, **asking to add APPROVAL-73** and leaving implementation approval pending. No assistant/tool action follows that request before summary.
- Expected: retain requested checkpoint as pending/next action, never claim plan modified.
- Observed accepted repeated body: Decisions says checkpoint added to the plan; Completed work says **“Updated plan with retention policy (30 days) and checkpoint `APPROVAL-73`.”** This is invented execution, not a synonym.
- Model `qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234`; invocation `compaction_8d4ac49c-a133-4c03-ab04-1acff30626fe`, complete/stop, input1203/output3227 with reasoning2667. One direct request, no tools/corrective generation, exact prompt-v5 checked. Previous summary is in second request. All six headings present and constraints/references/cancellation mostly retained—none negates the failure.
- Evidence: `semantic-review.md`, `semantic-final-observations.json`, `API-C08-quality.log/.json`, `API-F005-replay.json`. The new detector rejects this exact body; C01 has positive/negative regression examples. Initial automatic green is explicitly overridden; final live file after detector addition was not re-generated.
- Preliminary classification **Unclear origin — actual model/prompt fidelity vs configuration/implementation**. No evidence supports silently changing approved prompt, relaxing acceptance or adding repair loops. Code Reviewer determines origin/owner and whether Solution Designer recovery is needed. This is a valid executable failure, not a new requirement introduced by tests.

### API-F004 — separate continuation variability (secondary)

- Criteria AC-001/006/007 full live continuation. Expected final write_file creates exact retained JSON after source files removed.
- Full3 log has3tool-success notifications, completed compaction, then final turn ends without fourth tool; generic `LIVE_E2E_PROVIDER_OPERATION_FAILED:lmstudio.qwen36.compaction-agent-flow` at safeExternalOperation. Full4 with logging only has4 and passes.
- Underlying exception absent from Full3 due existing wrapper/cleanup; missing artifact is an inference from no final dispatch, not a quoted ENOENT. Do not assert token-limit/provider fault. `API-F004-triage.json`, Full3 log and full-flow observations bound evidence. **Open**, not waived by later Pass.

## Durable changes / proportional review

| Durable path (worktree-relative) | Change and proof |
| --- | --- |
| test-support/live-e2e/live-e2e-harness.ts | Updated actual normalizer composition with test-owned layout/location dependencies; both callers supply roots. Register canonical core tools in worker; local pressure A20/B170 replaces A170/B20 (same total); safe synthetic diagnostics. Original quality/count/Unicode/tool assertions retained. |
| test-support/live-e2e/run-live-e2e.mjs | Updated registered runner to include optional quality file, same scenario/provider opt-in; node syntax check Pass. Persistent-vault root runner itself not executed this round; isolated bootstrap equivalent used. |
| test-support/live-e2e/compaction-quality-checks.ts | Added fixture-specific alarm for invented plan/checkpoint completion; not a general evaluator. Positive/negative tests and observed-output replay pass. |
| autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts | Updated real context-file locator→local provider path, original recording locator/immutability, event projection and termination regression. |
| autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-boundary.test.ts | Updated canonical tool registration assertions, isolated registry snapshot/restore; added four quality-alarm regressions. C01 total24Pass. |
| autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts | Added two current tuple API cases: initialized durable save/reload, inherit/unavailable retention, invalid/credential-bearing tuple rejection, deletion/retired API checks; temp roots/environment restored. C05 total17Pass with memory files. |
| autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts | Added two real direct calls per opted-in scenario using generated prior summary plus correction, exact references/approval/unrun checks, captured inputs/outputs and manual semantic review. Latest initial automatic checks Pass but semantic adjudication Fail; new alarm added afterward, unit/replay-validated. |

Seven added/updated paths; **none removed**, no implementation edits. final-source-audit.json pins SHA256 and unchanged HEAD/production delta; durable-tests.patch covers tracked deltas, new files separately attached. Proportional successful-test review **Required on eventual success, not invoked for this Fail**. Current handoff requests focused failure-origin review only.

## Confidence gate

| Mandatory category | Post-repository | Final | Evidence and remaining uncertainty |
| --- | --- | --- | --- |
| Requirement / acceptance proof | 75% | **50%** | Actual first/repeated bodies now inspected; repeated body fabricates completed plan work (API-F005). Critical AC-002/007 fails, so low anchor applies despite broad mechanics proof. |
| Changed-boundary execution directness | 90% | 95% | Real production factory/summarizer, parent AgentRun, tools, snapshot/next request, HTTP settings/history and browser execute. Directness is not correctness; no shell claim. |
| Cross-boundary realism / mock gap | 75% | 75% | Local model calls and real product facade replace prior SDK mocks, but live continuation varies (API-F004); no integrated live-status WebSocket/browser journey. |
| Environment/configuration/identity/fixtures | 90% | 95% | Owned backend/db/ports, real startup/build, native model discovery, real initialized durable tuple and browser reload; synthetic history only. DeepSeek credential absent; no cloud call claimed. |
| Failure/edge/lifecycle/recovery | 90% | 90% | Carried direct retry/cancel/commit-fault coverage; real SIGKILL old/new snapshot primitive. Whole archive crash/restart and remote cancellation timing remain bounded uncertainties. |
| User surface/browser/desktop | 75% | 85% | Real settings/model/inherit/unavailable/validation and four history tabs verified. Between anchors because live status/failure-retry and complete saved-run UI resume remain untested; shell unchanged. |
| Durable regression quality/relevance | 90% | 90% | Facade/real normalization, registration, tuple API, opt-in first/repeated fixture and negative alarm added; generic semantic completeness still needs manual review. Updated final alarm proven by units/replay, not another live run. |

Post-repository **83.6% (585/7)**; final **82.9% (580/7)**; rounded arithmetic mean, not a measured probability. Change−0.7 points reflects discovered semantic failure despite improved environment/directness. Critical ACs all proven **No**; requirement50/integration75/user85 below90; default95% clean target **No**. Source score9.40 is independent and not substituted.

## Broader/browser/lifecycle and persisted-data limits

Broader decision **Required — executed and failed**, not Not Required or externally Blocked. DeepSeek unavailable in this empty test vault does not explain or waive local Qwen semantic failure. Browser settings tuple save/reload/inherit/unavailable/invalid-ratio and four historical-reader tabs pass through actual backend; exact observations and unchanged file hashes attached. CUA screenshots/AX states observed in conversation; **no screenshot file claimed**. No desktop shell claim, no effect on already-running desktop port29695.

Strict-v5 **Directly Usable—No Migration**: carried core restore/reader plus actual strict-v5 synthetic snapshot read through HTTP/browser; historical episodic/semantic/raw independent, byte hashes unchanged. New full-flow run has no category/lineage artifacts. No invalid compatibility branch/fallback introduced or protected by tests. Startup model tuple migration remains reviewed/carried tests (some persistence mocks); real current tuple writes/reloads and new server startup executed, not a comprehensive old-source migration restart campaign.

C10 proves old/new visibility at actual rename under process SIGKILL only. Archive transaction/cancellation faults are carried deterministic tests, not actual full transaction crash or power-loss/fsync assurance. Live status WebSocket/browser, browser failed compaction→retry, full saved-run UI resume, full suite, standalone web typecheck, private histories, cloud-provider live matrix and mixed old/new writers **Not Tested**. Further scenarios deferred at actual semantic failure; no missing external dependency claimed for feasible UI work.

Platform: Darwin25.5.0 arm64 / Node22.23.1 / pnpm10.28.2. Core/server Vitest4.0.18; carried Nuxt/happy-dom Vitest3.2.4. Actual Chrome via extension at default desktop viewport (observed screenshot1512×862); exact Chrome build not captured, no responsive/browser-matrix assurance. English UI, local Europe/Berlin dates. IAB unavailable; Chrome fallback worked.

## Cleanup / integrity

Owned backend PID93091 stopped normally, owned frontend process group stopped via SIGTERM, CUA tab closed; corresponding cleanup JSON confirms runtime and db removed (including key/WAL/SHM paths via repository cleanup). All scenario/seed/SIGKILL temp directories cleaned. Ports55688/55719 no longer served. Shared LMStudio remained running; requests auto-loaded Qwen and provider's normal TTL manages its loaded instance—no direct load/unload/settings command or service stop was issued. User desktop PID46779 remains running untouched. Normal ignored test DB/build outputs retained; preexisting untracked SDK dirs/reviewer evidence/external WIP preserved. No credentials/private histories transmitted; only synthetic owned local-model input. No commit/push/merge/release.

## Outcome / next owner

**API-REV-002 Fail /82.9%**. API-F001 resolved; API-F002/F003 test-owned setup issues corrected; **API-F005 and API-F004 Open**. Complete cumulative package preserved. Rule selects **/code_reviewer**, failure-origin route, sole recipient. No success review or Delivery handoff. Re-entry must address these findings, retain recorded failed samples, rerun affected case IDs and finish remaining material integration evidence before recalculating confidence.

Handoff confirmed: send_message_to accepted=true / DELIVERED to sole recipient **/code_reviewer**, AgentRun **code_reviewer_7bd4b2c09af543088c0238d792d0fd98**. Receipt: api-e2e-evidence/api-rev-002/handoff-receipt.json. Stage complete; awaiting later incoming review, no polling.

## SR-014 bounded diagnostic coordination (not a new completed validation round)

Solution Designer requested fixed-input A,B,B,A, maximum four direct generations, plus at most one original-config full flow after no-provider all-exit observation proof. Current approval/prompt/defaults/support and API-REV-002 Fail82.9 remain unchanged. Manifest and temporary probes in `api-e2e-evidence/sr014-diagnostics/`; no confidence rescore or failure closure from these probes. Existing assertions Still Valid; add only test-owned sanitized observation support, preserve all original samples. Plan is evidence-only and does not introduce a runtime semantic validator or retry loop.

### SR-014 diagnostic supplement completed — no validation rescore

Fixed-input A,B,B,A max4 executed exactly: all4 accepted bodies fabricate completed APPROVAL-73 plan work, including both explicit temperature0 samples. Actual SDK request capture confirms frozen messages and identical non-temperature serialized controls, cap8192; unknown remote defaults/template/backend remain. One full-flow observation passes original assertions with parent0/1024 and null compactor tuple, but temporary Vitest config omitted normal Prisma setup and produced worker token-usage readiness warnings absent in prior positive log; full environment equivalence is not established. Large stdout observation was reporter-interleaved and deterministically reconstructed; direct wire JSONL is pristine. No additional/substitute attempts. API-F005/API-F004 remain Open; API-REV-002 Fail82.9% and sourcePass9.40 unchanged.

Diagnostic delta: shared test harness all-exit observation updated, safe-error helper and observation unit file added; nine cumulative API-owned durable paths. No-provider final2files7Pass and owner regression3files26Pass. Original6 other durable paths/approved requirements/prompt/design/frozen input unchanged. Owned server57025/runtime/db/key/full-flow directory cleaned; desktop/shared provider preserved. Details, output comparisons, deviations, authoring errors and current hashes: `api-e2e-evidence/sr014-diagnostics/README.md`. This is evidence-only ordinary coordination back to ongoing Solution Designer SR-014 investigation, not a new complete validation/acceptance result, confidence assessment, implementation assignment or Delivery request.
