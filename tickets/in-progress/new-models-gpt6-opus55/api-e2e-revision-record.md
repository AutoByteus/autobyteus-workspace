# API/E2E Revision Record — new-models-gpt6-opus55

## Revision Index
| Revision ID | Trigger | Related revisions | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | CRR-002 Pass on IR-002 | SR-002/SR-005, ARCH-REV-003, IR-002, CRR-002 | N/A / N/A | Pass / 95% |

## API-REV-001 — Initial executable baseline
- Trigger: Code Reviewer `code-review-report.md` CRR-002 Pass; first API/E2E round after implementation commit `42ba8549b`.
- Coverage: AC-001–010 mapped to direct no-key contract, signed-turn lifecycle, server price/snapshot, SDK build/regression, live Codex dynamic catalog and three exact GPT-6 turns, one small direct Anthropic Opus 5.5 call and one subscription-backed Claude Agent SDK query.
- Durable test updates: `autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` exact Sol/Luna/Opus server rates; `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` current query session-binding contract. No durable paths added/removed. Temporary Codex probe retained only in ticket evidence.
- Environment delta: documented shared contract build corrected an import/setup failure; current `startInput` corrected a temporary Codex probe harness failure; current `sessionBinding` corrected a gated Claude SDK live-test harness failure. None was a final product failure. User cost constraint observed with only one tiny Anthropic API request and one Claude subscription query, not a large paid suite.
- Prior Failure Resolution: None — first API/E2E result; prior result/confidence N/A. In-round local setup/harness corrections are in the ledger and report, not a prior API revision.
- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`; evidence `evidence/api-e2e/`.
- Current result/confidence: **Pass / 95%**; no open API/E2E failure ID. Recommended recipient `/code_reviewer` for proportional test-code review of two updated paths. Residual: OpenAI live entitlement and live paid Anthropic signed tool cycle untested under approved scope; no such live success inferred from mocks.
