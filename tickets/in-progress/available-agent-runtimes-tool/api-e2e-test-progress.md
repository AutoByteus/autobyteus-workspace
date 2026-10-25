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
