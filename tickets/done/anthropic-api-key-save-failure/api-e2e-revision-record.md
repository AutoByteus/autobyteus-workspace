# API/E2E Revision Record — Anthropic credential save

The canonical coverage investigation and execution report hold the current truth. This record indexes completed validation rounds.

## Revision Index
| Revision ID | Trigger / round | Related upstream revisions | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Complete IR-001 / initial API/E2E round | SR-004; IR-001; architecture/source review N/A | N/A / N/A | Pass / 95.0% |

## API-REV-001 — Isolated browser/API and shared-caller baseline
- Trigger: `implementation-handoff.md` and `implementation-revision-record.md` IR-001, initial round; related AC-001–004, API-CASE-001–004.
- Why recorded: first completed independent API/E2E validation result; no prior result or confidence was inferred.
- Durable coverage: updated `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts`; added `autobyteus-web/tests/e2e/provider-api-key-save-probe.mjs`; registered `test:e2e:provider-api-key-save` in `autobyteus-web/package.json`. No removal.
- Execution: 35 focused tests, worktree server build, both web guards, Nuxt build and diff check passed. Two isolated Chromium/API runs passed; second used the self-contained named command and is authoritative. Real synthetic backend saves showed immediate Configured/success/cleared input, repeat success, value-free responses and refresh persistence; injected rejection preserved failure/input/status. Owned resources cleaned.
- Prior failure resolution: None — no prior completed API/E2E round.
- Current canonical artifacts: `api-e2e-coverage-investigation.md` (coverage inventory and confidence gate), `api-e2e-test-case-ledger.md` (case events), `api-e2e-execution-coverage-report.md` (round result), `evidence/api-e2e/browser-recheck/result.json` (latest browser/API result).
- Prior result/confidence: N/A / N/A. Current result/confidence: **Pass / 95.0%**. New or remaining failure IDs: None.
- Route: Direct Small/Low Pass to Delivery; proportional test-code review Not Required.
- Remaining bounded risk: real vault-outage rejection not induced; user's credential identity/validity and unchanged Electron shell not tested; broad standalone TypeScript gate remains pre-existing non-green per IR-001.
