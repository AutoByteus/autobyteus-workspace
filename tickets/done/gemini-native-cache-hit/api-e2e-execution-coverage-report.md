# API/E2E Execution Coverage Report — gemini-native-cache-hit

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/requirements-doc.md` (SR-002)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/probes/` (evidence only)
- Design Review Report: `N/A — not applicable` (direct Small/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2 (user-requested live desktop check of AC-003)
- Trigger: Implementation complete (IR-001, `dd4b3de4a`), direct low-risk route
- Prior Round Reviewed: None
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. The deviations were additive:
  - AE-001 was extended from 3 to all 11 recorded turns (two real compactions);
  - AE-005 was split into the two pre-fix stored shapes that real use produces;
  - the live probe TP-002 was added;
  - a baseline test-isolation fix was made.
- Existing coverage decisions revised during execution, with evidence:
  - `token-usage-unit-prices-graphql` and `token-usage-ledger-provider-semantics` changed from `Out Of Scope` to `Needs Update` (baseline fix). They leak analytics facets into `token-usage-analytics-graphql`; this was reproduced with only pre-existing files.
- Reroute required before or during execution: `No`
- Notes: Test-design corrections only. No product defect was found.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes` (planned cases written before the AE-005 rework and the broader runs). The first three events were recorded right after the first runs.
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `N/A`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 14 (TP-002)
- Cases still running, interrupted, or not started: None
- Interruption, context-compression, or rerun note: AE-005 had two test-expectation corrections (ledger seq 3–4); AE-001 was extended (seq 6)

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| AE-001 | Pass | seq 6 | `api-e2e-logs/ae-001-agy-token-usage-transport.log` | Pass |
| AE-002 | Pass | seq 2 | `api-e2e-logs/ae-002-006-gemini-native-pricing.log` | Pass |
| AE-003 | Pass | seq 2 | same | Pass |
| AE-004 | Pass | seq 2 | same | Pass |
| AE-005 | Pass | seq 5 | `api-e2e-logs/ae-005-agy-upgrade-continuation.log` | Pass (after test-design corrections) |
| AE-006 | Pass | seq 2 | `api-e2e-logs/ae-002-006-gemini-native-pricing.log` | Pass |
| AE-007 | Pass | seq 7 | `api-e2e-logs/order1-unit-focused.log` | Pass |
| TP-001 | Pass | seq 8 | `api-e2e-logs/tp-001-fail-before.log` | Discriminates |
| TP-002 | Pass | seq 14 | `api-e2e-logs/tp-002-live-agy-usage.json` | Pass |
| LV-001 | Pass | seq 15 | `live-check/ac-003-live-receipt.json`, `live-check/ac-003-token-meter-after-turn-2.png` | Pass (round 2) |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The literal and the values were replaced in place, with no version branch and no AGY branch in the token-usage domain.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`. AE-005 proves direct use of existing rows by the current reader; it protects no legacy branch.
- Reroute classification for compatibility-related invalid scope: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| AE-001 | BEH-002; REQ-002; AC-002; AC-003 (server side) | AGY CLI → converter → enrichment → fold → SQL → WS / GraphQL | Real in-process server, real WebSocket and GraphQL, fake CLI replaying the verbatim AGY 1.2.16 recording (11 turns, 2 compactions) | Durable | Pass | Turn deltas 91,684 / 171,574 (81,515 miss + 90,059 read) / 251,464 (83,603 + 167,861); final gross 1,601,365, miss = standard 696,661, read 904,704, rate 0.565, `price_missing`, no `cumulative_snapshot_regressed` on any turn |
| AE-007 | AC-002 alternate | Converter → basis resolver | Unit | Durable | Pass | `not_reported`, gross = input = 6,110 |
| AE-002 | BEH-003; REQ-004; AC-005 | Gemini `usageMetadata` → production normalizer → enrichment (catalog policy, tier, cost) → persistence → GraphQL | Server cost path, test DB | Durable | Pass | 150K prompt (100K cached), 2K + 3K thinking: tier `prompt_le_200k`, 2.00 / 0.20 / 12 (reasoning 12); costs 0.10 + 0.02, output 0.06, reasoning 0.036, total 0.18 |
| AE-003 | same | same | same | Durable | Pass | 250K prompt (200K cached): `prompt_gt_200k`, 4.00 / 0.40 / 18; total 0.37 |
| AE-004 | REQ-004 (tier boundary) | Tier selection | same | Durable | Pass | 200,000 → `prompt_le_200k` at 2.00; 200,001 → `prompt_gt_200k` at 4.00 |
| AE-006 | AC-006 | Schedule selection, 3.8 Flash | same | Durable | Pass | Observed 2026-10-09: 0.75 / 0.075 / 3.75 (total 0.06375); observed 2027-02-01: 1.50 / 0.15 / 7.50 (total 0.1275) |
| AE-005 | REQ-005; AC-007 | Stored pre-fix series state read by the current fold (SQL codec round trip) | Production converter + enrichment/persistence transformers + SQL store + GraphQL | Durable | Pass | Shape A (cache-heavy first snapshot, stored miss = 0) is read unchanged. The next snapshot has no flag; miss catches up 0 → 8,210 (true); gross 319,295 lacks the 307,003 pre-fix reads (accepted). Shape B (pre-fix snapshot rejected as regressed) is read unchanged. The post-fix snapshot adds its true increment (83,603 + 167,861), unflagged, and miss reaches the true 256,802 |
| TP-001 | Discrimination | — | Temporary revert of the 2 production files | Temporary | Pass | 8 cases fail on pre-fix values; AE-006 passes; restore 0 diff lines |
| TP-002 | AC-003 (server side); AGY usage contract | Installed `agy` 1.3.2 → real server → SQL → GraphQL | Live AGY, real server | Live / Temporary | Pass | Raw cumulative input 8,919 → 17,920 → 27,003 (`total = input + output`); deltas 8,919 / 9,001 / 9,083 under `base_excludes_cache`; record 27,003; no regression flag or errors |

## Additional Repository Coverage Execution

Recorded in the coverage investigation › Repository Coverage Execution Plan And Results (orders 1–8). No commands were added after the post-repository decision except TP-002 (below).

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | +3 | TP-002, and in round 2 LV-001: AC-003 proven live in the real desktop Token Meter with real cache reads | None material |
| Changed-boundary execution directness | 95% | 95% | — | — | — |
| Cross-boundary integration realism and mock gap | 90% | 98% | +8 | TP-002, plus LV-001: real `agy` 1.3.2 with 24,458 real cache reads through the packaged app's server into the Token Meter | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | — | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | — | — | AGY process restart (unchanged behaviour) not exercised |
| User-surface, browser, and desktop-shell confidence | N/A | 95% | new | LV-001: the packaged desktop app's Token Meter renders the corrected gross, cache hit and breakdown | Only one model and runtime checked live |
| Durable regression coverage quality and relevance | 95% | 95% | — | — | — |

- Overall post-repository confidence: 94%
- Overall final confidence: 96% (round 2; round 1 was 95%)
- Calculation method: simple average of the applicable categories (6 in round 1; 7 in round 2, adding the user-surface category)
- Confidence change produced by broader validation: +1 overall (integration realism 90% → 95%)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: future AGY usage-format changes (named design risk; AE-001 detects drift only if the recording is refreshed, and TP-002-style live runs detect it directly)

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`, `Live API` (TP-002)
- Material deviation from the planned mode or rationale: None
- Confidence gap actually addressed: whether `agy` 1.3.2 `result.usage` is cumulative per process, as the server's `cumulative_snapshot` ingestion assumes. The investigation's 1.3.2 probe listed per-call values, so this was unproven for the installed version.
- Startup order, commands, and readiness results:
  - A temporary vitest file reused AE-001's harness (`startStudioE2eRuntimeServer`, temporary app-data dir, test-owned DB).
  - Command: `env -u ANTIGRAVITY_CLI_COMMAND RUN_TP002=1 TP002_EVIDENCE=<ticket>/api-e2e-logs/tp-002-live-agy-usage.json pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/tmp-tp002-agy-usage-live.e2e.test.ts --no-watch`
  - Readiness: `createAgentRun` success and the WebSocket open.
- Environment choices that materially affected the run: the installed `agy` 1.3.2 on PATH; the user's existing AGY login (read by the CLI, never by the test); model `gemini-3.8-flash-low`; 3 back-to-back tiny turns
- Seed data, fixtures, identities: a temporary agent definition and run (deleted)

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| 3 user turns over WS to a real AGY run | 3 `TURN_COMPLETED`, 3 `TOKEN_USAGE_UPDATED`, no `ERROR` | As expected | `tp-002-live-agy-usage.json` › frames, errors | Pass |
| AGY raw `result.usage` per turn | Cumulative per process; `total = input + output` | 8,919 / 17,920 / 27,003 input; totals 8,920 / 17,922 / 27,006 | `raw_usage_json` | Pass |
| Server deltas | Per-turn increments under `base_excludes_cache`, miss = input | 8,919 / 9,001 / 9,083, miss = standard = gross (0 reads) | frames | Pass |
| Run record via GraphQL | gross ≥ cache reads; rate < 1; no regression flag | 27,003 gross, 0 reads, rate 0; flags exclude `cumulative_snapshot_regressed` | `persisted`, `runQualityFlags` | Pass |

### Round 2 — LV-001: live AC-003 in the real desktop app (user request)

- Mode: an isolated desktop instance built from worktree HEAD `78df53634` (`pnpm --silent isolated-app start --build`, instance `iso-63523-dd36`), driven with the browser-automation skill in attach-only mode on its control port. No user app or data was touched. AGY used the installed CLI 1.3.2 and its own login.
- Setup: the agent definition "Cache Meter Check" was created through the instance's GraphQL. A ~480 KB data file was placed in the instance's own temp workspace, so each turn shares a large prefix that Google can cache.
- Journey (UI): Agents → Reload → Run → runtime Antigravity CLI, model Gemini 3.8 Flash (Low), Temp workspace → 2 composer sends → right panel Token tab.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Turn 1: read the file, reply with Record 05200's checksum | Correct reply; meter gross = input + cache read; hit < 100% | Reply 77567 (correct). AGY reported input 67,632, cache read 24,458, total 68,320 = input + output. Meter: gross 92,090, cache hit 26.6%, uncached 67,632, cache hits 24,458, 1 report | DOM text; instance DB row; receipt | Pass |
| Turn 2: Record 00042's checksum | Correct reply; cumulative snapshot accepted; meter consistent | Reply 32589 (correct). Cumulative input 95,560, read 24,458 (Google cached nothing new this turn). Meter: gross 120,018, hit 20.4%, uncached 95,560, 2 reports; no regression flag | DOM text; DB row; screenshot | Pass |
| Price status | AGY ids `price_missing` (out of scope) | "Price missing", `model_not_found` | screenshot | Pass |

- Pre-fix comparison: after turn 1 the old code would have shown gross 67,632, uncached 43,174 and a 36% hit; the fixed meter shows the true 92,090 / 67,632 / 26.6%.
- Cleanup: `isolated-app stop` reported the instance stopped, the data root removed and both ports released. Temporary files were removed. The AGY conversation from this run stays in the user's AGY CLI history.

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0)
- Runtime and relevant framework versions: Node v22.23.1; Vitest (workspace); AGY CLI 1.3.2 (live), AGY 1.2.16 recording (fake CLI)
- Browser / engine: N/A

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration` (fix-forward)
- Representative existing data exercised: AGY run records written with the pre-fix semantic through the production pipeline into the SQL store, in both real-use shapes:
  - A: cache-heavy first snapshot;
  - B: a snapshot rejected as regressed.
- Direct-use result and evidence: AE-005 Pass. The current reader returns the stored values unchanged. The next snapshot is accepted without a new regression flag, with the accepted one-time catch-up.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None material. Observation: under the pre-fix basis, real AGY series were routinely rejected as regressed whenever cache reads grew faster than input; every turn after the first in the 1.2.16 recording would have been rejected. So historical AGY rows also lack rejected turns. This is historical data under the accepted fix-forward (DEC-001), and the fix removes the cause for new data (AE-001 shows no regression across 11 real turns).

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes` (commits `88e5c6002` coverage, `871f01cb3` baseline fix)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-token-usage-transport.e2e.test.ts` | Added | AE-001: REQ-002, AC-002, AC-003 server side | Pass (gated: `RUN_AGY_FAILURE_E2E=1` + fake CLI) |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | `AGY_FAKE_CASE=usage_report` replays the recorded `result` events | Pass; sibling suites and routing guard green |
| `autobyteus-server-ts/tests/e2e/token-usage/gemini-native-pricing-graphql.e2e.test.ts` | Added | AE-002, AE-003, AE-004, AE-006: REQ-004, AC-005, AC-006 | Pass |
| `autobyteus-server-ts/tests/e2e/token-usage/agy-token-usage-upgrade-continuation.e2e.test.ts` | Added | AE-005: REQ-005, AC-007 | Pass |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts` | Updated | AE-007: AC-002 alternate | Pass |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | Updated (baseline fix) | Removes the analytics facets it creates | Pass; token-usage folder green in two orders |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Updated (baseline fix) | Same | Pass |
| `TESTING.md` | Updated | Names the new fake-CLI suite | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route; attached to the handoff as package files)
- Diff or repository evidence supplied for removed paths: N/A (none removed)

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/gemini-native-cache-hit/api-e2e-logs/*.log` | Command output per order/case | Retained | — |
| `tickets/in-progress/gemini-native-cache-hit/api-e2e-logs/tp-002-live-agy-usage.json` | Live probe receipt (usage numbers only, no secrets) | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| TP-001: `git checkout 927796780 --` the 2 production files | Prove the new tests discriminate | `tp-001-fail-before.log` | Restored with `git checkout HEAD --`; 0 diff lines |
| TP-002: `autobyteus-server-ts/tests/e2e/runtime/tmp-tp002-agy-usage-live.e2e.test.ts` | Live current-CLI check (quota-using, not deterministic) | `tp-002-live-agy-usage.json` | File deleted; never committed |
| AE-005 debug edits (console output) | Diagnose the shape-B expectation | Ledger seq 3–4 | Reverted before the final run |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (durable suite) | Fake CLI replaying a verbatim AGY 1.2.16 recording | Deterministic, no quota | Closed by TP-002 on 1.3.2 (live) |
| Google Gemini API (pricing suite) | A `usageMetadata` object fed to the production normalizer | Pricing needs no inference; avoids cost | None material: the response shape is the normalizer's documented input |
| `LLMFactory` initialization | Only the two Gemini catalog models registered (same pattern as the GPT-5.6 E2E) | Avoids provider discovery | Catalog entries are the real definitions |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | AE-001, AE-002, AE-003, AE-004, AE-005, AE-006, AE-007, TP-001, TP-002, LV-001 | All acceptance criteria in scope proven at server boundaries; fail-before verified; live current-CLI contract confirmed |
| Out Of Scope | AC-001 (review), BEH-001 (unchanged) | By plan |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, fake/live AGY processes, temporary app-data dirs | This run | `terminateAgentRun`, `app.close()`, `fs.rm` in `afterAll` | No leftover `agy-token-usage-e2e-*` dirs |
| Test DB run records and facets | This run | `afterAll` deletes | Done |
| TP-002 probe file | This run | Deleted | Done |
| AGY conversation `b9bcb5e8-633a-446d-9c98-8123fe72c609` (3 "OK" turns) in the user's AGY CLI store | Created by TP-002 | Left in place, so AGY's own conversation store is not partially mutated (same as the repository's live AGY suites) | Harmless; the user may delete it from AGY |

## Preliminary Classification

N/A (Pass).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` → Live API (TP-002), Pass; round 2: live desktop (LV-001, user request), Pass.
- Critical acceptance criteria lacking direct proof: None. AC-003 is now proven live in the desktop Token Meter (LV-001). The explicit user acceptance at finalization still belongs to Delivery.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see the handoff
- Notes:
  1. Baseline fix `871f01cb3` (Rule 9) is a pre-existing analytics-facet leak between token-usage E2E files, unrelated to this change.
  2. The known pre-existing `autobyteus-ts` Gemini retry timeout (OBS-002) is unchanged and already reported.
  3. The `investigation-notes.md` working-tree edit (OBS-002) belongs to Solution Designer and was not committed by API/E2E.
