# API/E2E Test-Case Ledger — TEAM-PACKAGE-READ-20260915-001
Round1; assigned worktree and canonical investigation/report/revision in this ticket. Initial API result N/A. Required for multi-case lifecycle/browser work. Initialized 2026-09-15 before execution; report remains round authority.
## Planned cases
| ID | Journey / AC | Surface | Status |
|---|---|---|---|
| R01 | reader/admission/nonmutation/app consumer, AC001–005 | narrow repository tests | Planned |
| R02 | preserved migration/launch/restore | broader repository tests | Planned |
| R03 | current source complete server build | CLI | Planned |
| B01 | real supplied import/reload/catalog/select, AC001/002c/003 | actual frontend + readonly hashes | Planned |
| B02 | separate absent/null/valid defaults and launch, AC002 | actual frontend | Planned |
| B03 | owned full startup/hash/runtime migration/ledger/restart, AC005 | actual processes and data | Planned |
| B04 | migrated history/attachment/continuation, AC005b | actual frontend/provider | Planned |
## Execution events
| Seq | Case | Time | Event | Expected / observed | Result | Evidence / next |
|---|---|---|---|---|---|---|
| 1 | R01 | 2026-09-15 | Started | Regenerate shared dependencies then run narrow valid owners | N/A | api-setup.log/api-narrow.log |
## Reconciliation
All cases unresolved at initialization. No final result/confidence yet; initial revision created only after completed round.

| 2 | R01 | 2026-09-15 | Completed | Shared setup completed; 4 files59 tests Pass, including real runner/SQLite controls | Pass | validation/api-setup.log, api-narrow.log |
| 3 | R02 | 2026-09-15 | Started | Broader migration/reader/launch/restore suites | N/A | validation/api-broad.log |
| 4 | R02 | 2026-09-15 | Completed | 52 files356 tests Pass including narrow59; no double-counting | Pass | validation/api-broad.log |
| 5 | R03 | 2026-09-15 | Started | Full documented production build including shared/Prisma/assets/bootstrap | N/A | validation/api-build.log |
| 6 | R03 | 2026-09-15 | Completed | Complete documented production build exit0, sanitized bootstrap passes | Pass | validation/api-build.log |
| 7 | B03 | 2026-09-15 | Started | Seed fresh isolated authored/runtime data before first full server startup | N/A | validation/api-runtime; startup phase precedes B01/B02/B04 |
| 8 | B03 | 2026-09-15 | Checkpoint | Actual built server50461 PID85976 listening; authored files/hashes preserved, no new Org definition; runtime moved to Org, attachment locator/content/history preserved; active/pending/preparations zero | N/A | api-runtime/first-start-audit.json; native flat TREE exact zero-write; earlier independent communication migration adds backup, not whole-directory zero-write claim. Restart/ledger still pending |
| 9 | B01 | 2026-09-15 | Started | Actual Chrome3 frontend50462 ready; fresh tab after initial debugger unavailable | N/A | tab1211480441; import actual external package next |
| 10 | B01 | 2026-09-15 | Completed | Actual frontend Import success then Reload success; catalog8=3 owned controls+5 supplied available; nine supplied invalid parents absent; Classroom Run selected with no default and disabled launch. Readonly diagnostics prove7 missing-avatar/2 missing-Agent, all552 external files and24 owned seed files hash unchanged | Pass | package-import-dom.txt, package-reload-dom.txt, team-catalog-dom.txt, classroom-selected-dom.txt, live-catalog-readonly.json, after-import-audit.json |
| 11 | B02 | 2026-09-15 | Started | Supply model in selected real package launch form; then inspect absent/null/valid fixture defaults | N/A | actual frontend only for commands |
| 12 | B03 | 2026-09-15 | Checkpoint | First minimal seed insufficient for native continuation (missing required v5 snapshot); summary provenance conservative warning expected. New independent complete fixture prepared, no mutation/reset/replay of first dataset | N/A | seed-complete.py, seed-snapshots.mjs, complete/schema-setup.log; B04 unstarted |
| 13 | B02 | 2026-09-15 | Completed | Real absent/null fixtures both select with no model/Run disabled; valid supplies model+temperature0 retained in actual saved tree; actual supplied Classroom and valid fixture first frontend Send each real native reply; malformed absent from catalog; test Teams stopped | Pass | absent-selected-dom.txt, null-selected-dom.txt, valid-selected-dom.txt, valid-launch-tree.json, valid-response-dom.txt, classroom-completed-dom.txt, after-launch-audit.json; local model discovery initially pending, later15 available without config edit |
| 14 | B03 | 2026-09-15 | Checkpoint | Complete independent data/schema prepared incl old FAILED authoring row; stopping original OWNED server before full complete-fixture startup on same test port | N/A | original-server-info.json, original-telemetry-final.json, complete/old-ledger-before.json |
| 15 | B03 | 2026-09-15 | Checkpoint | Complete fixture full server PID92508 listening; runtime family SUCCEEDED, first-message history backfilled correctly, attachment exact, owned24/external552 unchanged, old FAILED authoring row byte-fields identical, providers zero | N/A | complete/first-start-audit.json, complete/ledger-inert-proof.json; same-data restart remains |
| 16 | B03 | 2026-09-15 | Completed | Complete data same-data full restart: stable family SUCCEEDED row/attempts unchanged, old FAILED authoring row unchanged, all authored hashes/names retained, native flat tree exact, correct history summary and attachment/sidecar conversion retained; provider counts0 | Pass | complete/second-start-audit.json, complete/restart-ledger-proof.json. Browser session disappeared during interruption; no kept-open-browser restart claim; reopen in fresh owned tab |
| 17 | B04 | 2026-09-15 | Started | Real frontend reopen migrated saved conversation/attachment then native continuation | N/A | fresh Chrome2 tab1211480449 after earlier Chrome3 unavailable; unrelated user tabs untouched |
| 18 | B04 | 2026-09-15 | Checkpoint | Actual frontend reopened postrestart saved Org, correct summary/history; attachment Open produced exact text via migrated endpoint. Normal direct Send restored same native identity and remembered BLUEBERRY-915 without reminder; mounted remained Offline until deliberate Send | N/A | complete/reopened-history-dom.txt, attachment-preview-dom.txt, direct-continuation-dom.txt, mounted-before-send-dom.txt; mounted response pending |
| 19 | B04 | 2026-09-15 | Completed | Direct remembers BLUEBERRY-915 in real reply; mounted normal Send replies MIGRATED-MOUNTED-915. Direct restored; never-used mounted prepared new under its same saved native ID, enclosing Org/Team definitions absent (Agent present), each new input once, old IDs retained once. Frontend StopOrg→Stopped/allOffline/backend active/pending0 | Pass | complete/direct-continuation-dom.txt, mounted-continuation-dom.txt/png, attachment-preview-dom.txt, continuation-proof.json, final-audit.json; synthetic released history with actual provider continuation, not captured old-provider-origin proof |

## Final reconciliation — 2026-09-15
R01,R02,R03,B01,B02,B03,B04 all Pass, no running/unstarted cases. B04 event19 amended to distinguish direct restore versus never-used mounted prepareNew; proof script corrected, actual UI unchanged. Cleanup completed and ports empty, validation/api-finalization.log. Reconciled into api-e2e-execution-coverage-report.md, API-REV-001 Pass95.0%; report remains authority. Browser continuity limitation explicitly recorded.
