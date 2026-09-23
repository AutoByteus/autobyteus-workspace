# API/E2E Revision Record — new-models-gpt6-opus55

## Revision Index
| Revision ID | Trigger | Related revisions | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | CRR-002 Pass on IR-002 | SR-002/SR-005, ARCH-REV-003, IR-002, CRR-002 | N/A / N/A | Pass / 95% |
| API-REV-002 | User-requested AnthropicLLM live extension via Implementation Engineer | SR-002/SR-005, ARCH-REV-003, IR-002, CRR-002, API-REV-001 | Pass / 95% | Pass / 96% |
| API-REV-003 | User-requested complex game task to elicit live signed thinking/multiple tools | SR-002/SR-005, ARCH-REV-003, IR-002, CRR-002, API-REV-002 | Pass / 96% | Pass / 97% |

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
