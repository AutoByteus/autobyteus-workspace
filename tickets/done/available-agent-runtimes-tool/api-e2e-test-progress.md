# API/E2E Test Progress — autobyteus-303

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-25 | API-00 | Completed | Pass | Reused IMP-01…06, IMP-09: `git diff --name-only 683b036be9 HEAD` = tickets/ only |
| 2026-10-25 | API-01…05 | Started | — | fake CLI extended; writing `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` |
| 2026-10-25 07:29 | API-01…05 | Checkpoint | — | run 1: AAR-01 failed (harness: vault not initialized → fixed in test); AAR-03 Antigravity reasons "could not be read" instead of "timed out" |
| 2026-10-25 07:33 | API-01…05 | Checkpoint | — | run 2 (vault init added): 5/5 pass; AAR-03 x3 more: pass |
| 2026-10-25 07:37 | API-03b | Completed | Fail | diagnosis probe: 9/400 timed-out Antigravity limit reads report "could not be read" (1 ms wall time left at return); evidence API-03b-*; temp probe removed from tree |
| 2026-10-25 07:39 | API-01…05 | Completed | Pass | AAR-01…05 5/5 (evidence API-01-05-*); AAR-04 parallel: 3/4 readers Codex limits unknown |
| 2026-10-25 07:45 | API-05b | Completed | Fail | two readers x10: 4/10 and 1/10 rounds a reader gets Codex models+limits unknown (lease "unresolved cleanup"); evidence API-05b-*; temp file removed |
| 2026-10-25 07:46 | API-06 | Started | — | existing scripted-CLI E2E files, clean env |
| 07:45 | API-07 | Started | — | model-routing-settings-probe.mjs --skip-server-build (dist built at 683b036be9 tree) |
| 07:48 | API-07 | Completed | Pass | run 1 probe bugs (summary selector, locale reset) fixed; run 2 7/7 Pass, no browser errors, cleanup removed |
| 07:48 | API-07b | Started | — | agent-runtimes-settings-probe.mjs --skip-server-build |
| 07:54 | API-07b | Completed | Fail (pre-existing) | 4 ARP cases fail identically on base a2faf424d6 → FU-002; not this ticket |
| 07:55 | API-08/09 | Started | — | live probe: built node, real HOME, test vault |
| 07:57 | API-08/09 | Completed | Pass | live: cold read 4.6 s, reads 4.3 s, 2x4 parallel 4.8–6.1 s, no unknowns; product = direct answers; scan 0 hits |
| 07:58 | API-08b | Completed | Fail | LM Studio (4 models) absent until ensureProviderModelCatalog; present after (REQ-002) |
| 07:59 | API-10 | Started | — | Claude get_usage repeated reads |
| 07:59 | API-10 | Completed | Pass | 6 live get_usage reads: cost 0, no model usage, utilization 13%/50% unchanged |
| 08:01 | API-11 | Completed | Pass | AutoByteus agent (LM Studio qwen) called the tool: success, same shape as GraphQL; model unloaded |
| 08:03 | API-12 | Completed | Pass | Docker test node: CLIs signed out → absent; AutoByteus providers live from test vault; 0.8–0.9 s; container removed |
| 08:05 | — | Completed | Fail | round result written: F-1 Local Fix, F-2/F-3 Design Impact; committing |
| R2 08:30 | — | Checkpoint | — | Round 2 (CRR-005; source 07c07cfc27, c4fff3eb00, 7ece4e2069): rerun by impact = every service-driven case; AAR-04 made strict for AC-013, AAR-06 added (discovered providers) |
| R2 | API-01…06(AAR) | Started | — | server E2E file at HEAD 5a87647318 |
| R2 | API-07 | Started | — | probe (MRP-02 extended: custom endpoint models unknown, LM Studio appears) on dist built at 7ece4e2069 |
| R2 | API-01…06(AAR) | Completed | Pass | 3 runs x 6/6; AC-013 strict (one shared read, 10 two-reader rounds all Codex read); AAR-06 discovered providers |
| R2 | API-03b | Completed | Pass | 400/400 "timed out" through the real service |
| R2 | API-06 | Completed | Pass | 19/19 |
| R2 | API-07 | Completed | Pass | 7/7 (MRP-02 extended), no browser errors, cleanup removed |
| R2 | API-07b | Completed | Fail (pre-existing) | same 4 cases and errors as base → FU-002 |
| R2 | API-08…11 | Started | — | live node on round-2 dist |
| R2 | API-08/09 | Completed | Pass | live: LM Studio listed on cold read; 2x4 parallel share one checkedAt, Codex read in all; product = direct |
| R2 | API-08b | Completed | Pass | LM Studio listed before any ensure |
| R2 | API-10 | Completed | Pass | 6 reads cost 0, utilization unchanged |
| R2 | API-11 | Completed | Pass | AutoByteus agent tool call success; model unloaded |
| R2 | API-12 | Completed | Pass | Docker test node; container removed |
| R2 | — | Completed | Pass | round 2 result written (95%); committing |
