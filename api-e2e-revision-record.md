# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/api_e2e_engineer`; initial coverage investigation and execution round 1 | CRR-002; IR-002; ARCH-REV-004 | N/A | Fail for completion gate / 88% |
| API-REV-002 | `/api_e2e_engineer`; CRR-003/CRR-004 recovery investigation and execution round 2 | CRR-003; CRR-004; API-REV-001 | Fail for completion gate / 88% | Fail for completion gate / 87% |
| API-REV-003 | `/api_e2e_engineer`; CRR-005/CRR-006 local compactor disposition and bounded rerun round 3 | CRR-005; CRR-006; API-REV-002 | Fail for completion gate / 87% | Fail for completion gate / 87% |
| API-REV-004 | `/api_e2e_engineer`; CRR-007 explicit final disposition round 4 | CRR-007; API-REV-003 | Fail for completion gate / 87% | Fail for completion gate / 87% |
| API-REV-005 | /api_e2e_engineer; user-authorized provider-capability recovery and direct live-provider execution round 5 | CRR-008; CRR-006; API-REV-004 | Fail for completion gate / 87% | Fail for completion gate / 89% |
| API-REV-006 | /api_e2e_engineer; solution-designer scope disposition and ticket-specific Pass round 6 | Solution decision; CRR-009; API-REV-005 | Feature-specific Pass / aggregate broader residual 89% | Feature-specific Pass / aggregate broader residual 89% |
| API-REV-007 | /api_e2e_engineer; user-requested LM Studio test-support investigation and reviewed bounded rework round 7 | CRR-010; CRR-011; CRR-012; API-REV-006 | Feature-specific Pass / aggregate broader residual 89% | Feature-specific Pass / aggregate broader residual 89%; LM Studio rework failed and was restored, stale store API repair retained |

## Revision Entries

### API-REV-001 — Initial API/E2E baseline and staged coverage execution

- Triggering role, report path, and round: `/api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-execution-coverage-report.md`; Round 1.
- Triggering finding or scenario IDs: API-ERR-001 through API-ERR-006; API-REAL-001; API-BROWSER-001.
- Related upstream revision IDs: CRR-002, IR-002, ARCH-REV-004, SR-013.
- Why this baseline or coverage/execution revision was recorded: The code review passed with API/E2E and live-provider execution explicitly outstanding. This is the first completed coverage result and therefore records the required `N/A` prior state.
- Coverage decisions or durable test paths changed: Updated native standalone, Team adapter, application WebSocket, runtime-source unit, and Gemini metadata GraphQL E2E coverage. No tests were removed.
- Scenarios added, changed, removed, or rechecked: Added canonical provider-error assertions across native/team/application boundaries; repaired current sequenced Team publisher fixtures; repaired the retired Gemini metadata identifier; reran provider/catalog/pricing/vault/orchestration/web/SDK/team/GraphQL suites.
- Commands, environment, fixture, or broader-validation delta: Test-owned SQLite and built server checks passed; `pnpm test:e2e:real:preflight` passed with value-safe missing-key/configuration output; `pnpm test:e2e:real` did not complete after approximately three minutes and was interrupted; no browser or Electron run.

#### Prior Failure Resolution

None. `API-REV-001` is the initial baseline.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` records the initial plan, execution-discovered stale fixtures, confidence, and remaining risk; `api-e2e-execution-coverage-report.md` records the authoritative result.
- Prior result and confidence: N/A.
- Current result and confidence: Fail for completion gate / external evidence incomplete; 88%.
- New or remaining failure IDs: API-REAL-001 (live provider capability run did not complete; external credentials/Docker identity unavailable); API-BROWSER-001 (browser DOM not tested).
- Recommended recipient: `/code_reviewer` for focused failure-origin review and proportional durable test-code review.
- Remaining risks, blocked evidence, or untested scope: Provider-account-specific GLM/Gemini/Kimi/DeepSeek/MiniMax endpoint and error fidelity, Docker build identity, browser DOM rendering, and live restart/recovery remain unproven. Completed deterministic/in-process boundaries passed.

### API-REV-002 — API-REAL-001 recovery rerun and focused failure-origin package

- Triggering role, report path, and round: `/api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-execution-coverage-report.md`; Round 2.
- Triggering finding or scenario IDs: CRR-003 / CRR-004; `API-REAL-001`; `API-BROWSER-001`.
- Related upstream revision IDs: CRR-003, CRR-004, API-REV-001, IR-002, ARCH-REV-004, SR-013.
- Why this revision was recorded: The prior configured live capability block was rechecked first, with a safe local LM Studio endpoint and a scenario-specific runner selection. The rerun exposed and repaired two stale test-support fixtures, then reached a reproducible live compactor evidence failure and a bounded model-execution hang during a focused recovery probe.

#### Prior Failure Resolution

- Prior result and confidence: Fail for completion gate / 88%; `API-REAL-001` had no final result after the unscoped live runner was interrupted.
- Rerun delta: value-safe LM Studio endpoint inventory; selected `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow`; stale `FileMemoryStore` inspection API repair; current Gemini LLM scenario fixture repair; 19-test harness suite and 18-test full preflight reruns.
- Durable coverage changes: Updated `test-support/live-e2e/live-e2e-harness.ts` to use `listTurnRawTraceCorpusOrdered()` and `test-support/live-e2e/live-e2e-scenarios.mjs` to use `gemini-3.7-flash`; reverted unproven local corpus-size and combined-turn timing experiments. No tests were removed.
- Live evidence: Separate-turn local runs reached real tool calls, four agent turns, one completed compaction, scanner-clean output, and cleanup, but failed `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING` because the selected compactor task lacked the Unicode-boundary source. A combined-turn recovery probe persisted two tool calls but produced no next turn/final result for over ten minutes and was interrupted. No provider response exception or implementation source failure was observed.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md` records the rerun plan, focused probe findings, durable decisions, and final result; `api-e2e-execution-coverage-report.md` records the complete Round 2 evidence and scorecard.
- Prior failure status: **Not resolved for completion**. The original generic live-run hang was decomposed into a fixed stale harness call plus an unresolved live scenario leaf-evidence failure and capability-execution hang.
- Current result and confidence: **Fail for completion gate / API-REAL-001 unresolved; 87%**.
- Remaining or newly exposed risks: local compactor leaf-evidence scenario fidelity, local model responsiveness under the combined-turn probe, provider-account-specific behavior, Docker identity, browser DOM rendering, and live restart/recovery remain unproven.
- Required recipient: `/code_reviewer` for focused failure-origin review and proportional review of all seven changed durable API/E2E/test-support paths.

### API-REV-003 — API-REAL-001 local compactor evidence disposition and bounded rerun

- Triggering role, report path, and round: `/api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-execution-coverage-report.md`; Round 3.
- Triggering finding or scenario IDs: CRR-005 / CRR-006; `API-REAL-001`; `API-BROWSER-001`.
- Related upstream revision IDs: CRR-005, CRR-006, API-REV-002, CRR-003, CRR-004, IR-002, ARCH-REV-004, SR-013.
- Why this revision was recorded: Code review accepted the seven prior durable test/test-support paths but requested truthful investigation or disposition of the remaining local compactor evidence/capability result before any further live claim.

#### Prior Failure Resolution

- Prior result and confidence: Fail for completion gate / 87%; the selected LM Studio scenario completed one compaction but failed `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING`, and the combined-turn recovery probe produced no final result after more than ten minutes.
- Rerun delta: the unmodified selected scenario was rerun first. Preflight passed and the run reached one compaction before the same leaf-evidence failure. Safe budget evidence showed the first trigger during the large Group-A tool result (`15952` observed against `13043` threshold), before the Unicode-boundary turn.
- Bounded probes: a temporary 40-record Group-A plus short acknowledgment did not trigger compaction and failed lifecycle completion; a second temporary context-pressure probe produced no final result within the bounded window and was interrupted. Both probe changes were restored and are not durable.
- Durable state after round: no new durable path was retained. Focused live-harness validation passed 19/19 and `git diff --check` passed; the two previously accepted support repairs remain the only live test-support changes.
- Current result and confidence: **Fail for completion gate / API-REAL-001 unresolved; 87%**.
- Classification and disposition: **API/E2E-owned Local Fix — test-support/capability-execution block**. The remaining evidence gap is explained by deterministic compaction-window selection plus local-model responsiveness under the later-trigger probe. No provider response, source exception, incorrect payload, or product implementation failure was observed; no implementation finding is reopened.
- Remaining unproven scope: external provider behavior, Docker identity, browser DOM journey, final local compactor leaf evidence, and live restart/recovery.
- Required recipient: `/code_reviewer` for focused failure-origin review of the Round 3 disposition. CRR-006 already passed proportional review of the seven changed durable paths.

### API-REV-004 — Explicit final disposition of API-REAL-001

- Triggering role, report path, and round: `/api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-execution-coverage-report.md`; Round 4.
- Triggering finding or scenario IDs: CRR-007; `API-REAL-001`; `API-BROWSER-001`.
- Related upstream revision IDs: CRR-007, API-REV-003, CRR-005, CRR-006, CRR-003, CRR-004, CRR-002.
- Why this revision was recorded: CRR-007 confirmed the Round 3 evidence and requested either a deterministic reviewed live compactor result or an explicit final disposition.
- New capability decision: no new safe configured provider/model, external credential set, Docker identity, or reviewed deterministic scenario redesign is available. Repeating the same LM Studio run without a changed capability would not add truthful evidence.
- Explicit result: **API-REAL-001 remains Fail / blocked for the completion gate; 87% confidence**. Preflight and partial compaction are supporting evidence only and are not promoted to Pass.
- Classification: **API/E2E-owned Local Fix — test-support/capability-execution disposition block**. CRR-002 source pass remains authoritative; no implementation finding is reopened.
- Resume condition: provide a deterministic reviewed live compactor capability or an explicitly reviewed scenario/test-support redesign that produces final scanner-clean leaf evidence without weakening the contract.
- Durable state: no Round 4 code or coverage change; the seven previously reviewed paths and two accepted test-support repairs remain unchanged; no tests were removed.
- Remaining unproven scope: external provider behavior, Docker identity, browser DOM journey, final local compactor leaf evidence, and live recovery. The package is not delivery-ready.
- Required recipient: `/code_reviewer` with this explicit disposition and cumulative artifact package.


### API-REV-005 — User-authorized provider-capability recovery

- Triggering role, report path, and round: /api_e2e_engineer; /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-execution-coverage-report.md; Round 5.
- Triggering scenario IDs: API-REAL-001; API-BROWSER-001; direct deepseek.llm, gemini.vertex-express.llm, openai.llm, grok.llm, kimi.llm, glm.llm, and anthropic.llm.
- Related upstream revision IDs: CRR-008, CRR-006, API-REV-004, CRR-007, CRR-005, CRR-002.
- Why this revision was recorded: The user authorized use of the owner-private environment assignment file after prior rounds established that LM Studio was only a supplemental local capability and external-provider evidence was blocked. Repository instructions were followed by importing only mapped credentials into the assigned worktree test database.
- Safe environment delta: value-safe dry run reported CREATE 9, BLOCKED 0; confirmed import reported CONFIGURED 9, SKIPPED 0, REPLACED 0. No values, headers, responses, or raw provider exceptions were recorded.
- Preflight: pnpm test:e2e:real:preflight passed 18/18. OpenAI, DeepSeek, Vertex Express Gemini, Anthropic, AutoByteus, and LM Studio were READY; Serper and Gemini AI Studio were missing; MiniMax had no imported credential/scenario.
- Direct live results: Vertex Express Gemini, OpenAI, Anthropic, Grok, and GLM passed. DeepSeek and Kimi returned value-free LIVE_E2E_PROVIDER_OPERATION_FAILED results. The live wrapper intentionally hides provider body/status details, so these remain capability/provider-operation failures rather than source findings.
- Temporary coverage decision: direct Grok/Kimi/GLM scenario entries were probe-only and restored. Final harness validation passed 19/19 and git diff --check passed. No new Round 5 repository-resident durable test/support path was retained; CRR-006 remains applicable.
- Prior failure status: Round 4 87% blocked result was not resolved to Pass. External provider reachability evidence improved, but LM Studio compactor leaf evidence, DeepSeek/Kimi operation success/fidelity, MiniMax, Docker identity, provider error-body fidelity, browser DOM, and live recovery remain incomplete.
- Current result and confidence: Fail for completion gate / API-REAL-001 unresolved; 89%.
- Classification: API/E2E-owned Local Fix — external-provider capability/execution block, with no implementation finding reopened. No delivery-ready claim is made.
- Required recipient: /code_reviewer for focused failure-origin review of the safe DeepSeek/Kimi operation failures and cumulative package. No new durable test-code review is requested beyond CRR-006.


### API-REV-006 — Solution-dispositioned ticket-specific Pass

- Triggering role, report path, and round: /api_e2e_engineer; /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-execution-coverage-report.md; Round 6.
- Triggering decision: solution designer confirmed that LM Studio compaction and broad live-provider capability are not hard gates for this ticket because they are not named requirements or acceptance criteria.
- Feature-specific result: **Pass** for exercised API/E2E requirements. Deterministic missing-key mapping, original provider-message preservation/redaction, canonical native code/message transport, native/team/application message-only projection, relevant catalog/pricing/runtime/API coverage, and relevant configured provider requests passed.
- Evidence authority: deterministic provider-message fixtures are authoritative for AC-010–AC-012; Docker-equivalent contract tests are authoritative for AC-013–AC-015; no live account balance or live provider response is required. The application SDK remains { type: ERROR, message: string }.
- Residual classification: DeepSeek/Kimi live operation/body fidelity, unavailable MiniMax/Gemini AI Studio, actual Docker build/port-8001 identity, browser DOM, LM Studio compactor leaf evidence, and live restart/recovery remain non-gating API/E2E capability residuals. They are not marked Pass and are not attributed to source.
- Durable state: no Round 6 durable coverage or test-support change. CRR-006 remains the applicable proportional review; CRR-009 remains the focused failure-origin review.
- Confidence: aggregate broader-validation confidence remains 89% to expose residual uncertainty; this does not downgrade the ticket-specific Pass.
- Current result: **Feature-specific API/E2E Pass; ready for delivery review with explicit non-gating residuals**.

### API-REV-007 — User-requested LM Studio test-support investigation and bounded rework

- Triggering role, report path, and round: `/api_e2e_engineer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-execution-coverage-report.md`; Round 7.
- Triggering request and scenario IDs: user-requested test-error analysis; `API-REAL-001`; `lmstudio.qwen36.compaction-agent-flow`.
- Related upstream revision IDs: CRR-010, CRR-011, CRR-012, API-REV-006.
- Why this revision was recorded: The user asked for a bounded analysis and repair if the earlier LM Studio failure originated in test support. The coverage investigation identified a directly observed stale FileMemoryStore method and a scenario timing hypothesis; code review accepted the bounded changes before rerun.
- Reviewed rework executed: original Group-A → Unicode → Group-B order, local Group-A fixture count 100, and the current `listTurnRawTraceCorpusOrdered()` API. The run used the documented built runner, worktree-owned runtime, value-safe preflight, and no secret/provider-body recording.
- Live evidence: build/bootstrap and preflight passed. One compaction completed with phases `requested/started/completed`; safe prompt tokens were `[2527,10492,10647,11628,11750,13493,5768,6012]` against threshold `13043`. The scenario then failed `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING` after 132.823 seconds of test execution (137.28 seconds total).
- Prior failure resolution: the test-support stale API defect is resolved by retaining `listTurnRawTraceCorpusOrdered()`. The Group-A count rework did not resolve the canonical leaf-evidence failure and was restored to 170. The stale call was not reached in this run because the leaf assertion still failed first; harness validation passed 19/19 and `git diff --check` passed after restoration.
- Durable coverage state: retain only the bounded stale test-support repair. No production source, public contract, assertion, scanner safeguard, or test was removed or weakened.
- Classification and result: **Feature-specific API/E2E Pass remains authoritative.** The LM Studio scenario remains an explicit non-gating API/E2E-owned test-support/capability residual. No provider response, source exception, incorrect product payload, or deterministic application implementation failure was observed; CRR-002 source Pass remains authoritative.
- Confidence: retain **89% aggregate broader-validation confidence**. The Round 7 run confirms the residual but does not alter the approved feature-specific result or eliminate DeepSeek/Kimi, MiniMax/Gemini AI Studio, Docker identity, browser DOM, and live recovery gaps.
- Required recipient: `/code_reviewer` for focused failure-origin continuity and proportional review of the retained durable test-support repair. Delivery must wait for that reroute and may not claim the broader LM Studio capability as Pass.
