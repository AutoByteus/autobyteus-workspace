# API/E2E Test-Case Ledger — token-meter-tps
Round 1 / API-REV-001 pending. Canonical plan: api-e2e-coverage-investigation.md; report pending. All evidence under evidence/api-001. Initialized before execution, 2026-10-13.

## Planned Cases
| ID | Expected result / AC | Surface | Order |
|---|---|---|---|
| TPS-REPO | approved arithmetic, exact attribution, lifecycle and cost regressions / AC-001–007 | focused Nuxt suites | 1 |
| TPS-RUNTIME | normalization + false call semantics preserved / AC-002,004,005,007 | focused server suites | 2 |
| TPS-BROWSER | 20→30, zero, missing, frozen, locale/accessibility / AC-001,003–006 | durable browser fixture | 3 |
| TPS-TRANSPORT | multi-call same turn includes tool gap, exact identity / AC-001–005,007,008 | scripted runtime, real server WS + renderer | 4 |
| TPS-DESKTOP | actual isolated changed build, Token UI journey / AC-002,006,008 | temporary owned desktop probe | 5 |
| TPS-GUARDS | web/localization boundaries clean / AC-007 | guards | 6 |

## Execution Events
| Time (UTC) | Case | Event | Expected / observed | Result | Evidence |
|---|---|---|---|---|---|
| 2026-10-13T16:09:05Z | TPS-REPO | Started | Focused Nuxt regressions | N/A | web-regression.log |
| 2026-10-13T16:09:48Z | TPS-REPO | Completed | Exit 0 | Pass | web-regression.log |
| 2026-10-13T16:10:54Z | TPS-RUNTIME | Started | Canonical adapter and fold suites | N/A | server-runtime.log |
| 2026-10-13T16:11:09Z | TPS-RUNTIME | Completed | Exit 0 | Pass | server-runtime.log |
| 2026-10-13T16:11:41Z | TPS-BROWSER | Started | Durable deterministic browser probe | N/A | browser-1/result.json |
| 2026-10-13T16:12:06Z | TPS-BROWSER | Completed | Exit 0 | Pass | browser-1/result.json |
| 2026-10-13T16:12:19Z | TPS-TRANSPORT | Started | Scripted CLI to real server WS to renderer | N/A | transport-1/result.json |
| 2026-10-13T16:12:37Z | TPS-TRANSPORT | Completed | Exit 1 | Fail | transport-1.log |
| 2026-10-13T16:13:12Z | TPS-TRANSPORT | Started | Rerun with fixture command before imports | N/A | transport-2/result.json |
| 2026-10-13T16:13:53Z | TPS-TRANSPORT | Completed | Exit 0 | Pass | transport-2.log |
| 2026-10-13T16:14:03Z | TPS-DESKTOP | Started | Serialized current worktree Linux ARM64 package build | N/A | desktop-build.log |
| 2026-10-13 | TPS-ATTRIBUTION | Planned | Actual Org/collaboration context admission and exact selection, plus existing selection stores | Not Tested | attribution.log pending |
| 2026-10-13T16:18:09Z | TPS-GUARDS | Started | Web boundary and localization | N/A | guards.log |
| 2026-10-13T16:18:13Z | TPS-GUARDS | Completed | Exit 0 | Pass | guards.log |
| 2026-10-13T16:21:16Z | TPS-DESKTOP | Checkpoint | Build exit 0; launch pending | N/A | desktop-build.log |
| 2026-10-13T16:21:30Z | TPS-ATTRIBUTION | Started | Real context attribution, eight target projection and selection regressions | N/A | attribution.log |
| 2026-10-13T16:21:52Z | TPS-DESKTOP | Checkpoint | Desktop attempt-1 exit 0 | Pass | desktop-runs/attempt-1/result.json |
| 2026-10-13T16:22:00Z | TPS-ATTRIBUTION | Completed | Exit 0 | Pass | attribution.log |
| 2026-10-13T16:22:04Z | TPS-DESKTOP | Completed | All packaged UI/WS/arithmetic/selection/reload checks; owned instance removed and ports released | Pass | desktop-runs/attempt-1/result.json |
| 2026-10-13T16:22:20Z | TPS-TRANSPORT | Started | Final durable probe asserts BOTH interval readings and WS readiness | N/A | transport-3/result.json |
| 2026-10-13T16:23:07Z | TPS-TRANSPORT | Completed | Exit 0 | Pass | transport-3.log + transport-3/result.json |
| 2026-10-13T16:23:18Z | TPS-BROWSER | Started | Final durable script, unexpected GraphQL fails | N/A | browser-2/result.json |
| 2026-10-13T16:23:46Z | TPS-BROWSER | Completed | Exit 0 | Pass | browser-2/result.json |
| 2026-10-13T16:24:03Z | TPS-REPO | Started | Final cumulative 10-file regressions | N/A | web-regression-final.log |
| 2026-10-13T16:24:46Z | TPS-REPO | Completed | Exit 0 | Pass | web-regression-final.log |

## Final Reconciliation
All planned cases TPS-REPO, TPS-RUNTIME, TPS-BROWSER, TPS-TRANSPORT, TPS-DESKTOP, TPS-GUARDS and added TPS-ATTRIBUTION: Pass. Transport-1 setup failure resolved by transport-2 and final transport-3, no hidden/skipped acceptance pass. No interrupted/running/not-started case. Final web cumulative 10 files/155 tests. Cleanup verified in evidence/api-001/cleanup.json. Reconciled into api-e2e-execution-coverage-report.md Execution / Ledger Reconciliation and Acceptance-Criteria Proof. API-REV-001 Pass / 95%.
