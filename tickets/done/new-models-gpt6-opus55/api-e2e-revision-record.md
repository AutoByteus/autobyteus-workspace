# API/E2E Revision Record — new-models-gpt6-opus55

## Revision Index
| Revision ID | Trigger | Related revisions | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | CRR-002 Pass on IR-002 | SR-002/SR-005, ARCH-REV-003, IR-002, CRR-002 | N/A / N/A | Pass / 95% |
| API-REV-002 | User-requested AnthropicLLM live extension via Implementation Engineer | SR-002/SR-005, ARCH-REV-003, IR-002, CRR-002, API-REV-001 | Pass / 95% | Pass / 96% |
| API-REV-003 | User-requested complex game task to elicit live signed thinking/multiple tools | SR-002/SR-005, ARCH-REV-003, IR-002, CRR-002, API-REV-002 | Pass / 96% | Pass / 97% |
| API-REV-004 | User-reported Electron Claude SDK Opus variant price missing | SR-002/SR-005, API-REV-003, DR-004 | Pass / 97% (approved prior scope) | Design Impact diagnostic / Not scored (no revised AC) |
| API-REV-005 | CRR-007 Pass on IR-004 after Approved SR-011/SR-012 | SR-011/SR-012/SR-013, ARCH-REV-008, IR-003/004, CRR-007, API-REV-004 | Design Impact diagnostic / Not scored (new scope) | Pass / 95% |
| API-REV-006 | CRR-009 Pass on IR-005 after Approved SR-014/DS-018 | SR-014/DS-018, ARCH-REV-009, IR-005, CRR-009, API-REV-005 | Pass / 95% (earlier AC-011–014) | Pass / 95% (AC-015) |

## API-REV-001 — Initial executable baseline
- Trigger: Code Reviewer `code-review-report.md` CRR-002 Pass; first API/E2E round after implementation commit `42ba8549b`.
- Coverage: AC-001–010 mapped to direct no-key contract, signed-turn lifecycle, server price/snapshot, SDK build/regression, live Codex dynamic catalog and three exact GPT-6 turns, one small direct Anthropic Opus 5.5 call and one subscription-backed Claude Agent SDK query.
- Durable test updates: `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` exact Sol/Luna/Opus server rates; `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` current query session-binding contract. No durable paths added/removed. Temporary Codex probe retained only in ticket evidence.
- Environment delta: documented shared contract build corrected an import/setup failure; current `startInput` corrected a temporary Codex probe harness failure; current `sessionBinding` corrected a gated Claude SDK live-test harness failure. None was a final product failure. User cost constraint observed with only one tiny Anthropic API request and one Claude subscription query, not a large paid suite.
- Prior Failure Resolution: None — first API/E2E result; prior result/confidence N/A. In-round local setup/harness corrections are in the ledger and report, not a prior API revision.
- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`; evidence `evidence/api-e2e/`.
- Current result/confidence: **Pass / 95%**; no open API/E2E failure ID. Recommended recipient `/code_reviewer` for proportional test-code review of two updated paths. Residual: OpenAI live entitlement and live paid Anthropic signed tool cycle untested under approved scope; no such live success inferred from mocks.

### API-REV-002 — Cost-limited real AnthropicLLM tool continuation
- Trigger: Implementation Engineer relayed user request for a real product `AnthropicLLM` request/tool-continuation integration check using candidate local env credentials, without a large paid suite.
- Prior authoritative result/confidence: API-REV-001 **Pass / 95%**. C01–C06 baseline remained valid; no prior unresolved API failure.
- New case: API-C07. One first live stream emitted native tool use/usage but no signed thinking and stopped at an overstrict temporary probe assertion. A single two-request rerun streamed a native tool turn and completed exact native-turn/tool-result continuation through product `AnthropicLLM`, with content and usage. Three small product API requests total in this extension.
- Live signed-thinking replay: **Not Tested** because the provider emitted no signed thinking on either trivial tool task; synthetic no-key signed replay remains passing. No live signed success was inferred. OpenAI live still Not Tested (no key).
- Durable coverage paths changed this round: none. The two API-REV-001 durable test updates remain pending proportional Code Reviewer review. Temporary probe source retained at `evidence/api-e2e/anthropic-opus55-live.probe.test.ts`; removed from repository test tree. Secret parsed in memory; no vault import, secret output or persistence.
- Canonical investigation, ledger, execution report and evidence summary updated. Current authoritative result/confidence: **Pass / 96%**. Recommended recipient: `/code_reviewer` for cumulative proportional test-code review; no new failure ID.


### API-REV-003 — Complex live signed native turn and multiple tools
- Trigger: user suggested a more complex small Mario-style one-file HTML game with multiple tool calls to elicit signed thinking absent in API-C07.
- Prior authoritative result/confidence: API-REV-002 **Pass / 96%**. C01–C07 baseline remains valid; no unresolved prior API/E2E failure.
- New case API-C08: two real product `AnthropicLLM` Opus 5.5 requests at xhigh adaptive thinking. First response returned signed thinking plus `write_html` and `inspect_html` native tool uses. Tools ran against one isolated 4,259-byte `index.html`, passing six structural checks. Second request replayed the exact signed native assistant block array and tool results through production renderer; provider accepted it and completed with usage. Two requests, 3,733 input/4,211 output tokens, within four-request cap. No signature/thinking/key/HTML/response text logged. Browser gameplay not claimed.
- Coverage change: temporary probe only, `evidence/api-e2e/anthropic-opus55-game-live.probe.test.ts`, removed from test tree after run. No durable test/source changes in this round; API-REV-001's two durable test updates already passed CRR-003, while CRR-004 marked API-REV-002 Not Applicable. API-REV-003 needs the same no-delta route decision.
- Canonical investigation, ledger, execution report and evidence summary updated. Current result/confidence: **Pass / 97%**. Remaining external gap: live OpenAI direct API not run (no key); reset/compaction live not claimed. Recommended recipient `/code_reviewer` for cumulative proportional test-code review.


### API-REV-004 — Diagnostic investigation, upstream design impact
- Trigger: user screenshot of delivered Electron build: `claude_agent_sdk` `claude-opus-5-5[1m]` with `model_not_found`/Price missing, versus `gpt-6-sol` complete estimate. Prior API-REV-003 Pass/97% is not inferred as covering this newly identified SDK variant.
- API-C09 no-key SDK-shaped usage to production event and pricing resolver passed 1/1, reproducing `missing/model_not_found` for `[1m]` and `trusted` for the exact direct API ID. API-C10 live SDK list gave `opus[1m]`; one small subscription-backed Opus turn returned both Haiku and Opus variant `modelUsage` keys and no top-level model, exposing first-entry model selection. 2/2 focused live-probe tests passed. No paid direct Anthropic API call, no response text/key output.
- Classification: **Design Impact / Requirement Gap**. SR-005 says Claude SDK dynamic catalog must not consume static Opus direct row; AC-005 specifies direct-API rates, not subscription-backed SDK estimates or mixed-model allocation. Current observed user behavior is incomplete, but no approved fix criterion or new conformance verdict exists. Do not call current state “everything working.”
- Artifacts: canonical investigation, ledger and report updated; `evidence/api-e2e/claude-sdk-variant.probe.test.ts`, `claude-sdk-opus-price-live.probe.test.ts` and corresponding logs. Temporary probes removed from test tree. No durable coverage or production code changed.
- Current result/confidence: **Design Impact diagnostic / Not scored**, not API/E2E Pass. Recommended recipient `/solution_designer` for approval and revised architecture; resume formal API/E2E validation against that approved package.


### API-REV-005 — Current selected-only SDK estimate validation
- Trigger: Code Reviewer CRR-007 source Pass on IR-004 `c5f31df45` after CR-F-002 reset fix; Approved SR-011/AC-011–014, reviewed SR-012/ARCH-REV-008. Prior API-REV-004 was diagnostic/Not Scored; prior API-REV-003 Pass/97% applies only to AC-001–010.
- New current-scope API-C11–C15 completed. Focused selected SDK/price suites 70/70, SQL/startup 29/29, built-server restart 1/1, GraphQL/stream 9/9, current Nuxt meter/store 21/21, new real-pricing SDK event→SQL→GraphQL 1/1, one small real SDK selected Opus query through configured SQL 1/1, browser generic statistics nine journeys Pass. Shared direct contracts 30/30, GPT SQL/GraphQL 6/6, opt-in live Codex catalog/GraphQL 1/1. Two temporary web-test fixture/API mistakes corrected before final store suite 10/10; no product failure.
- Durable added: `autobyteus-server-ts/tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts`. Durable updated: `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`. Removed: none. Temporary live probe retained under ticket evidence only.
- Actual SDK result contained both Haiku and Opus but selected raw binding resolved Opus; canonical Opus alone contributed tokens and configured catalog cost. No SDK dollar/billing claim, response text/secret output or direct paid Anthropic call.
- Current result/confidence: **Pass / 95%**, no open validation failure. Broader validation Required and completed. Residual: selected SDK→browser in one live journey and current Electron user verification not performed; whole-web typecheck not claimed; I-44 command guard not verified; IR-004 duplicate-decoder claim excluded. Send to `/code_reviewer` for proportional durable test-code review on Large/High route.


### API-REV-006 — Claude SDK selected context meter correction
- Trigger: CRR-009 renewed source Pass on IR-005 `f04c4389c`, Approved SR-014/AC-015, DS-018 and ARCH-REV-009. Prior API-REV-005 Pass/95% was earlier AC-011–014 scope, not proof of the user's packaged Electron context meter.
- API-C16–C19: focused server 11/11, Nuxt stream/card 23/23, one small real CLI-auth SDK turn 1/1, server build, Codex/GPT/pricing regressions 28/28, web guard and isolated generic browser statistics nine journeys all passed. Deterministic event/SQL/GraphQL/stream/card proves 22,135/1M/2.2135%; old null derives on read without SQL mutation; UI displays 2.2% with exact 2.2135% bar. Actual live SDK result was 16,619/1M/1.6619% with configured estimated price, not direct paid API or Electron verification.
- Durable updated: `autobyteus-server-ts/tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts`, `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`, `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`. Added/removed this round: none. Temporary live probe retained only as ticket evidence. No production source edit by API/E2E.
- Current result/confidence: **Pass / 95%**, no open AC-015 validation failure. Broader validation Required and completed. Residual: no single selected live SDK→browser/Electron journey; current packaged Electron needs rebuild/user verification; whole-web typecheck and I-44 command safety unverified. No key imported or logged. Route `/code_reviewer` for proportional review of three changed test paths under Large/High classification.
