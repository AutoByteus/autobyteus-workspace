# Docs Sync Report — token-meter-accuracy

## Scope

- Ticket: `token-meter-accuracy`. Classification: `task_size=Large`, `architectural_risk=High`, reviewed route (ARCH-REV-003, CRR-002, API-REV-001, CRR-003). Delivery does not change the classification.
- Trigger: code reviewer CRR-003 Pass (test-code review), HEAD `2acf9b394`.
- Bootstrap base reference: `origin/personal` @ `927796780`.
- Integrated base reference used for docs sync: `origin/personal` @ `46e94fdea`.
  - It contains gemini-native-cache-hit (`3913a75d6`, `033a6d780`), anthropic-prompt-caching (`4e55cae2b`) and the `v1.4.99-beta.9` bump (`d7029b90a`).
  - Merges: `fdf0dd3f0` (base `d7029b90a`) and `ce6adb3a7` (base `46e94fdea`, ticket-only delta).
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary:
  - The upstream gemini-native-cache-hit merge added an AGY section that describes the cumulative `result` usage mapping. This ticket removes that mapping (D-5).
  - TESTING.md did not list the two new live suites.
  - The web Token Meter docs and the server `agent_execution.md` still described Claude SDK readings derived from the turn-end result, plus a read-time percentage repair. Both are removed by this ticket (D-2, AF-06).
  - The web docs also did not describe the compaction threshold marker or the over-window state.
- Why this should live in long-lived project docs: the Token Meter's meaning (whose reading, which window, what counts as a usage report) and the per-runtime source of each value are durable contracts. Without them, readers and future changes would reintroduce the summed-reading and result-derived defects.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Main token-usage contract; conflicting upstream AGY section | Updated | Upstream AGY section and this branch's AGY section merged into one. Claude/Codex/Grok/native/compaction sections from the implementation are kept. Pricing sections are left as upstream (REQ-011, caching tasks) |
| `TESTING.md` | Live gates for the new suites | Updated in DR-001; superseded in DR-002 | Upstream `361804e45` rewrote TESTING.md as principles; suite gates and commands now belong in test file headers. The merge keeps upstream's file unchanged: `token-usage-runtime-graphql.e2e.test.ts`, `codex-compaction-token-reading.e2e.test.ts` and `agy-token-usage-transport.e2e.test.ts` carry their gate and command in their headers |
| `autobyteus-web/docs/agent_execution_architecture.md` | Token Meter UI contract | Updated | Latest prompt meaning, threshold marker, over-window state, usage reports = model calls, Claude SDK per-call readings |
| `autobyteus-web/docs/settings.md` | Duplicate Token Meter UI contract | Updated | Same edits (this copy has no Claude-result paragraph) |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude SDK accounting paragraph | Updated | Result-derived window/percentage and read-repair replaced by per-call readings |
| `autobyteus-server-ts/docs/modules/codex_integration.md`, `docs/design/codex_raw_event_mapping.md` | Codex token usage | No change | They describe the `thread/tokenUsage/updated` transport; the `last.totalTokens` reading semantics live in `token_usage.md` |
| `autobyteus-ts/docs/llm_module_design.md`, `llm_module_design_nodejs.md` | Native observation contract | No change | Generic "latest prompt/context-window hints"; the threshold field is documented in `token_usage.md` § Native AutoByteus |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Merge + rewrite (in `fdf0dd3f0`) | One `Antigravity CLI (AGY)` section. It covers the per-step `agy_step` mapping, the `base_excludes_cache` breakdown and latest prompt, hit-rate comparability, `price_missing`, and the fix-forward history (pre-gemini gross → gemini result fix → per-step) | The upstream section stated the removed result mapping as current |
| `TESTING.md` | New row + extended rows (`2f35c00dc`) | `RUN_RUNTIME_TOKEN_USAGE_E2E` runtime token-usage row. Codex row gains `codex-compaction-token-reading.e2e.test.ts` (temporary `CODEX_HOME`, symlinked `auth.json`, quota note). AGY fake-CLI row describes per-step usage replay | Missing gates; stale description |
| `autobyteus-web/docs/agent_execution_architecture.md`, `settings.md` | Behavior update (`2f35c00dc`) | Runtime-owned latest prompt; `Auto-compacts at` marker; over-window amber state; `Usage reports` = model calls; Claude SDK per-call readings and one-time cleared pre-fix readings | Previous text described removed behavior |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior update (`2f35c00dc`) | Claude SDK context readings come per call from `getContextUsage()`; the result only reconciles | Previous text described the removed result-row window and read repair |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Per-runtime context reading | Each runtime's own reading, window and threshold; only runtime readings can exceed 100 % | design-spec D-1..D-9 | `token_usage.md` (implementation), web docs |
| AGY usage source | Per DONE `agent_response` step; result not mapped; AGY input excludes cache | design-spec D-5, investigation AF-16 | `token_usage.md` |
| Usage report count | Counts model calls only | design-spec D-1 | `token_usage.md`, web docs |
| Live gates | How to run the runtime token-usage and Codex compaction reading suites | api-e2e reports | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| AGY cumulative `result` usage mapping (`agy_result`, `agy_provider_reported_cumulative_usage`), including the upstream base_excludes_cache result variant | Per-step `agy_step` per-call observation | `token_usage.md` § Antigravity CLI (AGY) |
| Claude SDK latest prompt/window from the turn-end result; read-time percentage repair | Per-call `getContextUsage()` reading; one-time clearing migration | `token_usage.md` § Claude Agent SDK; `agent_execution.md`; web docs |
| "Usage reports = model calls or model turns" | Model calls only | web docs; `token_usage.md` |

## DR-003 Docs Sync (after the D-12 / D-13 rework)

- Integrated base: `origin/personal` @ `beb6b3b49` (unchanged since DR-002). Head `0ba052b0f`.

| Doc Path | Result | What Changed |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Updated by implementation (IR-004) and reviewed | A native compaction summary call (`autobyteus_compaction`) counts as a model call with tokens and cost and carries no reading, so the reading stays until the agent's next call (D-12) |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` | Updated by delivery (`0ba052b0f`) | The D-13 note: when it appears (native and Claude Agent SDK only), the greyed value, the mark ownership (`tokenUsageCompactionMarks.ts`, `agentStatusHandler`), clearing only on the run's next live model call (SR-014), and no note on Codex |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-compaction-token-reading-live.e2e.test.ts` header | Updated by delivery (`0ba052b0f`) | The header and two comments now state the SR-014 clear rule instead of the superseded "newer revision" rule. Assertions are unchanged. Under TESTING.md policy this header is the suite's documentation |
| `TESTING.md` | One global rule added in the rework (`99e5e1e05`, its own `docs(testing)` commit) | It adds "Test-only runtime CLI settings" (throwaway CLI homes, per-run overrides, isolated instances pass only `CODEX_HOME`) and "Forcing compaction early" per runtime, which apply to every future task. No per-suite entries, under the upstream policy (`361804e45`), suite gates and commands live in test file headers. `RUN_NATIVE_COMPACTION_METER_E2E`, `RUN_RUNTIME_TOKEN_USAGE_E2E` and the `RUN_CODEX_E2E` suite `codex-compaction-token-reading.e2e.test.ts` each carry their gate and command in their header |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: hand off for user verification (AC-010).
- Notes: during integration, delivery also adapted upstream AGY tests (two converter tests, two fold tests, the AGY upgrade-continuation E2E and the AGY fake-CLI `usage_report` replay) to the per-step path. See `release-deployment-report.md`.
