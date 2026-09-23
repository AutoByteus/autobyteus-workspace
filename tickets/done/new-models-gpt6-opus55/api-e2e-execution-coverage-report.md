# API/E2E Execution Coverage Report — API-REV-006

## Authority and result
**Pass / 95%** for Approved SR-014/AC-015, DS-018, ARCH-REV-009 Pass, IR-005 `f04c4389c`, CRR-009 source Pass; cumulative **Large / High**. This is the first AC-015 conformance result. API-REV-005 Pass/95%, CRR-008 and DR-007 are earlier AC-011–014 scope only. The cumulative requirements/design/implementation/review artifacts, current investigation, ledger and revision record in this ticket are active authority.

## Execution and evidence
| Case | Observed result | Evidence |
| --- | --- | --- |
| API-C16 event, SQL, GraphQL, historical null and invalid capacity | **3 server files/11 tests passed.** Mixed Haiku/Opus selected raw `claude-opus-5-5[1m]`, canonical `claude-opus-5-5`: prompt **22,135**, selected capacity **1,000,000**, percentage **2.2135%** in event, real SQLite and GraphQL. After setting stored percent null, GraphQL derives 2.2135% from same latest record; SQL stays null, cost unchanged. Source tests cover missing/zero/unsafe capacity, no cross-record stitching and Codex stored percent preservation. | `evidence/api-e2e/api-rev006-c16-server.log` |
| API-C17 stream and Token Meter | **2 Nuxt files/23 tests passed.** Strict stream DTO→store retains all three context fields. Rendered card shows `22,135 / 1,000,000`, visible **2.2%** from existing one-decimal formatting, exact progress width **2.2135%**, no unavailable branch; selected model and configured `$0.0032` fixture cost unchanged. Unknown capacity branch still passes. | `api-rev006-c17-web.log` |
| API-C18 real SDK | One small **real CLI-default authenticated Claude Agent SDK** `opus[1m]` turn via production `ClaudeSdkClient`, selected binding, event builder and real SQL accumulator, **1/1 passed**. Actual Haiku+Opus result selected Opus correctly: prompt **16,619**, selected capacity **1,000,000**, event/stored **1.6619%**, configured price `estimated`. This is not a paid direct Anthropic API or Electron/browser test. | `api-rev006-c18-live-sdk-rerun.log` |
| API-C19 build and regressions | Server build passed; opt-in Codex catalog/GraphQL, GPT accounting and pricing config **3 files/28 tests passed**, including live Codex catalog/GraphQL but **not** current Astra/Sol/Luna live turns. Web boundary guard passed. Isolated backend/Nuxt/SQLite/Chromium generic token-statistics probe passed **nine named journeys**, zero failures, with owned service/DB cleanup. | `api-rev006-server-build.log`, `api-rev006-c19-regressions.log`, `api-rev006-web-guard.log`, `api-rev006-c19-browser.log`, `api-rev006-browser/token-statistics-browser-result.json` |

The ledger records exact commands and checkpoints. An initial temporary live probe syntax error occurred before any SDK call; the corrected live turn passed. No live success is inferred from fixtures. Generic browser statistics is **not** a selected Claude workspace-card journey; the latter is evidenced by stream/store and rendered component tests.

## Durable coverage and transition
Updated this round: `autobyteus-server-ts/tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts`, `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`, and `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts`. Added/removed this round: **none**. The server E2E was originally added in API-REV-005 and is currently untracked in the shared worktree; its AC-015 extension is a current test delta. No production code changed by API/E2E. Temporary live probe removed from test tree and retained only under ticket evidence.

The approved nullable SQL transition is unchanged. The old null percentage is read-derived without database mutation, backfill or repricing. Missing/zero/unsafe capacity remains unavailable; no static `[1m]` capacity assumption. Claude selected token/cost flow and configured **API-equivalent estimate, not subscription billing**, are unchanged. Direct/Codex regressions passed. IR-004's duplicate-decoder assertion remains excluded: the decoder does not reject duplicate same-series persisted state and no released interim duplicate state is established.

## Confidence and broader validation
| Mandatory category | Final | Bounded basis |
| --- | ---: | --- |
| Requirement/AC proof | 98% | Exact current/historical/unknown/Codex assertions; no current Electron proof. |
| Changed-boundary directness | 98% | Real SDK→selected event→SQL; deterministic SQL→GraphQL→stream/card. |
| Integration realism/mock gap | 95% | Live SDK, real SQL/GraphQL and browser, separately exercised selected card. |
| Environment/configuration/identity/fixture | 95% | CLI-default auth, isolated SQL/browser; no key import. |
| Failure/edge/lifecycle/recovery | 95% | Old null/read-only, unsafe/unknown, same-record, Codex guards. |
| User surface/browser/shell | 90% | Selected rendered card plus generic Chromium; rebuilt Electron awaits user verification. |
| Durable regression relevance | 95% | Three narrow updated tests and retained direct/Codex checks. |

Arithmetic mean **95.1% → 95%**; none below 90%; AC-015 directly proved. Broader validation was **Required and completed** via one bounded real SDK turn and isolated browser. A single selected live SDK→browser/Electron journey remains unrun and is not credited. No whole-web typecheck or I-44 command-safety success claimed. The user's current packaged Electron remains defective until rebuilt and explicitly verified; this result does not claim it is fixed.

## Security, cleanup and route
No `$HOME/.autobyteus/server-data/.env` key was imported, printed or persisted; default SDK CLI auth sufficed. No prompt response, raw SDK payload, signature or secret logged. Own live workspace/query/SQL row and browser processes/temp DB cleaned; other agents' artifacts untouched. `git diff --check` passed.

**Pass / 95%**. Route cumulative package to `/code_reviewer` for proportional review of the three changed durable tests on Large/High route; Delivery subsequently owns rebuilt-Electron/user verification if accepted.
