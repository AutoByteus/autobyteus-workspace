# API/E2E Execution Coverage Report — Runtime Streaming Performance Follow-up

## Execution Round Meta

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/design-spec.md`
- Supplemental Performance Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/performance-evidence.md`
- Solution / Architecture / Implementation revisions: `SR-001`, `ARCH-REV-001`, `IR-001`–`IR-003`
- Code review: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-report.md`; `CRR-001`–`CRR-004`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-coverage-investigation.md`
- Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-revision-record.md`
- Current API/E2E Revision: `API-REV-002`
- Current Round: `2`
- Trigger: CRR-004 pass for implementation `75b9be359`; rerun unchanged WS-EGRESS-001 first.
- Prior Round: API-REV-001 `Fail`, `77.1%`.
- Latest Authoritative Round: `2`.

## Investigation And Execution Basis

- The coverage investigation existed before Round 1 durable edits and was updated before each new Round 2 durable harness correction.
- The exact retained WS-EGRESS-001 regression ran first and passed. The first combined server run then found three stale retained runtime-matrix expectations; approved IR-003 behavior requires one `onetwo` aggregate and nine messages, not two content frames/ten messages. API/E2E updated only those expectations and the rerun passed.
- Broader browser/runtime validation was required because repository tests cannot prove 10-minute host performance, exact 120k rendering, or real DOM/node binding.
- At the user's request, real-provider validation supplemented deterministic proof. It exposed two pre-existing live-E2E infrastructure defects before successful provider execution: equivalent SQLite targets compared by URL spelling, and a raw backend used as though it were the `AgentRun` facade. Both were fixed only in test-support/coverage code, covered by unit tests, and rerun successfully.
- No production implementation source or approved behavior changed during API/E2E.

## Compatibility / Legacy Scope Check

- Invalid backward-compatibility scope observed: `No`.
- Legacy cadence/timer retained: `No`.
- Persisted-data outcome: `Directly Usable — No Migration`, directly proven.
- Compatibility-only durable test added: `No`.

## Changed Boundary And Evidence Matrix

| Scenario | Requirement / Boundary | Execution Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| WS-EGRESS-001 | AC-002/003/004; same identity + routine status + default 500 ms | Production lifecycle/mapper/handler/egress, Fastify WS | Pass | `ws-default-window-rate-api-rev-002.log` |
| WS-EGRESS-002 | AC-002/008; active connection applies changed setting to next window | Durable real-socket integration | Pass | `api-rev-002-combined-server-coverage-rerun.log` |
| WS-EGRESS-003 | AC-004/005; team A/B/A identity/order | Durable team WS integration | Pass | Same combined rerun log |
| WS-STATUS-001 | AC-004/005; AutoByteus/Codex/Claude status/content trace | Durable runtime matrix | Pass | `ws-status-runtime-matrix-api-rev-002.log` |
| API-SET-001 | AC-008; default/save/reject/fallback/reset/persistence | Durable GraphQL E2E | Pass | Combined rerun log |
| PERF-001 / EXACT-001 | AC-001/003/006; 10 min, 120k, 40/s, exact SHA, output reduction, host health | Real Chrome + production path + real WS | Pass | `long-stream-browser-summary.json`, probe/harness/node logs |
| PERF-INTERACT-001 | AC-001; 20 supported interactions under load | Real Chrome | Pass | Structured summary |
| BROWSER-RENDER-001 | AC-007; escaped live text/reasoning then one rich completion | Production Vue components in real Chrome | Pass | Structured summary; live/final screenshots |
| BROWSER-SET-001 | AC-008; two bound nodes/save/rebind/reset/isolation | Real Chrome + two real built servers/GraphQL/files | Pass | Structured summary; node logs |
| LIVE-PROVIDER-001 | AC-005 supplemental runtime realism | Real DeepSeek `deepseek-v4-flash` AgentRun | Pass | `real-provider-deepseek-agent-flow-rerun.log` |
| LIVE-PROVIDER-002 | AC-005 supplemental control | Real OpenAI `gpt-5.4-mini` AgentRun | Pass | `real-provider-openai-agent-flow.log` |

## Repository Coverage Execution

| Order | Exact command / scope | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts -t "coalesces a representative fine-grained canonical stream" --no-watch` | 1 passed, 6 skipped | `ws-default-window-rate-api-rev-002.log` |
| 2 | Status WS + team WS + server-settings GraphQL E2E | First: 25 pass/3 stale expectations; corrected rerun: 3 files/28 pass | `api-rev-002-combined-server-coverage.log`; `...-rerun.log` |
| 3 | Status runtime matrix `-t "pairs every"` | 3 passed, 4 skipped | `ws-status-runtime-matrix-api-rev-002.log` |
| 4 | Six affected server unit suites | 6 files / 141 tests passed | `api-rev-002-server-unit-regression.log` |
| 5 | 13 affected web suites | 13 files / 140 tests passed | `api-rev-002-web-13-file-regression.log` |
| 6 | Server build-tsconfig typecheck; server build; web guards; web production build | All passed; web generated 15 routes | Corresponding `api-rev-002-*` logs |
| 7 | `pnpm exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch` | 1 file / 17 tests passed | `real-provider-harness-unit-rerun.log` |

## Broader Browser / Runtime Results

The authoritative rerun used `--duration-ms 601000` to guarantee the measured active interval exceeds ten minutes. A preceding 600000 ms attempt produced 599.999 measured seconds and was classified as a probe-threshold precision issue, not a product failure; it is retained separately and superseded.

| Metric / Assertion | Required | Observed | Result |
| --- | ---: | ---: | --- |
| Active interval | >=600 s | 600.999 s | Pass |
| Accumulated content | >=120,000 chars | 120,220 | Pass |
| Source/internal content events | all preserved | 24,044 / 24,044 | Pass |
| Internal input rate | >=30/s | 40.0067/s | Pass |
| Ordinary client content rate | <=2.2/s | 1.7155/s (1,031 frames) | Pass |
| Content-frame reduction | >=90% | 95.7120% | Pass |
| Exact final equality | exact bytes/hash | length 120,220; SHA-256 `4e5d7aef6b1ca3635dfedd272ebc526de31bc7f66179c7951fa63ab587756807` both sides | Pass |
| Routine status visibility | separate/undeduplicated | 24,049 client status frames | Pass |
| 50 ms renderer drift | p95 <=50 ms; max <=250 ms | p95 1.10 ms; max 9.10 ms | Pass |
| Renderer CPU (one core) | mean <=25%; p95 <=50% | mean 4.84%; p95 10.23%; max 18.76% | Pass |
| WS receipt-to-visible | <=configured +150 ms | p95 18.10 ms; max 24.70 ms | Pass |
| Backend health latency | p95 <=20 ms | p95 7.99 ms; max 18.34 ms | Pass |
| Backend event-loop drift | no saturation | p95 2.26 ms; max 20.82 ms | Pass |
| Supported interactions | >=20; p95 <=250 ms | 20; p95 88.92 ms; max 92.74 ms | Pass |

### Presentation and Settings

- Active text and reasoning each used one live renderer, no rich renderer, no heading/image mount, and unsafe authored markup remained literal.
- Completion switched once to the rich renderer. Observed: headings 2, code block 1, KaTeX 1, Mermaid containers 1/SVGs 2, image 1, rich reasoning, no `onerror` attribute, and no XSS execution.
- Node A and B each reported absent default 500. Browser validation rejected 99 and decimal input, saved A=1000/B=2000, rebound without cross-node leakage, and reset both to 500 with direct isolated file confirmation.
- One fixture-local Nuxt request to `/rest/health` returned 500 because the temporary route did not proxy that relative endpoint. Direct backend health sampling and all task assertions remained green; this is retained as non-blocking fixture diagnostic evidence, not hidden.

## Real-Provider Execution

- Source: `/Users/normy/.autobyteus/server-data/.env`, explicitly authorized by the user. No value was printed or copied into evidence.
- Value-safe dry-run found nine known mappings, including DeepSeek and OpenAI. The importer created a test-only SQLite vault; preflight reported both agent-flow scenarios `READY`.
- DeepSeek: production AutoByteus agent instantiated `DeepSeekLLM` for `deepseek-v4-flash`, produced token/content/completion lifecycle events, passed 2/2 scenario tests, and shut down cleanly.
- OpenAI: equivalent production AgentRun used `OpenAILLM` / `gpt-5.4-mini`, passed 2/2, and shut down cleanly.
- The runner captured and scanned output for secret leakage. The imported database/key and live runtime root were deleted afterward; the source file was unchanged.
- These live controls prove actual credential/provider/runtime operation. They do not replace deterministic cadence/equality proof because provider chunking is nondeterministic.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Final Evidence / Residual |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 90% | 98% | AC-001–008 directly covered; only approved no-replay limitation remains. |
| Changed-boundary execution directness | 95% | 100% | Production lifecycle/handler/egress/real WS/browser exercised. |
| Cross-boundary realism and mock gap | 90% | 97% | Deterministic exact stress plus real DeepSeek/OpenAI controls. |
| Environment/config/identity fidelity | 90% | 98% | Real Chrome, two servers/roots, real API/files, isolated managed-secret vault. |
| Failure/edge/lifecycle/recovery | 95% | 95% | Boundaries, errors, terminal paths, reconnect/teardown, interval changes; no replay claim. |
| User/browser/desktop confidence | 75% | 98% | Real Chrome production renderer; Electron shell unchanged and intentionally not launched. |
| Durable regression quality | 95% | 97% | API/WS/harness coverage is stable and relevant; proportional review remains. |

- Overall post-repository confidence: `90.0%`.
- Overall final confidence: `97.6%` (`683 / 7`).
- Every critical acceptance criterion directly proven: `Yes`.
- Applicable category below 90%: `No`.
- Default 95% target met: `Yes`.
- Residual limitations: browser proof is web-equivalent renderer evidence, not Electron shell evidence; provider-generated load was not used for deterministic rate/equality; physical socket-loss replay remains intentionally unsupported.

## Platform / Runtime Targets

- macOS 26.5.2, arm64, Apple M1 Max, 10 logical CPUs.
- Node v22.23.1; pnpm 10.28.2.
- Chrome 151.0.7922.108, headless isolated profile.
- Server package 0.1.1; web package 1.4.44.

## Lifecycle / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`.
- Absent config, valid persistence, invalid fallback/rejection, reset, active next-window application, and two-node isolation all passed.
- No version-specific branch, migration, dual read/write, or compatibility fallback observed.

## Tests / Durable Coverage Updated

| Path | Change | Result |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | Added interval public API/persistence coverage | Pass |
| `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | Added representative/default/next-window scenarios; updated current aggregate trace | Pass |
| `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts` | Added exact A/B/A team scenario | Pass |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` | Added normalized DB identity and AgentRun adapter regression | Pass, 17 tests |
| `test-support/live-e2e/live-e2e-harness.ts` | Fixed durable real-E2E DB identity and production facade adapter | Preflight and live provider runs pass |

Tests removed: `None`.

Repository-resident durable coverage changed: `Yes`. All five paths must receive proportional test-code review before delivery.

## Temporary Execution Artifacts

| Artifact | Purpose / Status |
| --- | --- |
| `long-stream-production-harness.mjs`, `long-stream-browser-probe.mjs` | Retained ticket-specific executable evidence; not normal CI coverage. |
| `long-stream-browser-summary.json` | Authoritative structured pass. |
| `long-stream-browser-live.png`, `long-stream-browser-final.png` | Supporting real-DOM screenshots. |
| `long-stream-*.log`, node/Nuxt logs | Correlated process/runtime evidence. |
| `real-provider-*.log` | Value-safe import, preflight, unit, provider runs, cleanup. |
| `api-rev-002-*.log`, `ws-*.log` | Repository execution evidence. |

## Cleanup

| Resource | Cleanup Result |
| --- | --- |
| Browser, Nuxt, harness, nodes A/B | Closed/stopped; no owned process remains. |
| Temporary Nuxt route | Removed. |
| Node A/B roots and browser profile | Removed. |
| Settings values | Reset to 500 before roots were removed. |
| Live-provider test DB and adjacent vault key | Removed. |
| Live-provider runtime root/temp agent workspaces | Removed. |
| User processes/ports/data and source `.env` | Untouched. |

## Result Summary

| Result | Scenarios | Summary |
| --- | --- | --- |
| **Pass** | AC-001–AC-008; WS/API/browser/performance/live-provider scenarios above | All critical requirements directly pass with 97.6% confidence. |
| Out of changed scope | Electron shell | No shell source changed; browser accurately proves the web-equivalent renderer boundary. |

## Recommended Recipient

`code_reviewer` for proportional review of the five updated durable coverage/test-support paths. This is a successful API/E2E round, not a failure-origin reroute.

## Latest Authoritative Result

- Result: `Pass`.
- Final validation confidence: `97.6%`.
- Default 95% target met: `Yes`.
- Any category below 90%: `No`.
- Broader validation: `Required and completed` (real Chrome/runtime/API/WS/two-node plus real DeepSeek/OpenAI agent-flow controls).
- Critical acceptance criteria lacking direct proof: `None`.
- Required next recipient: `code_reviewer` for proportional durable coverage review.
