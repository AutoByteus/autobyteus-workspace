# API/E2E Test-Case Ledger — O1
Round1 / API-REV-001; investigation api-e2e-coverage-investigation.md; report api-e2e-execution-coverage-report.md; evidence api-e2e-evidence/api-rev-001.
## Planned Cases
| ID | Case | Boundary / criteria |
| --- | --- | --- |
| API-001 | Source-zero/proposal proof | AC-003/005 |
| API-002 | Owned native pair/RPC/complete override | AC-003/005 |
| API-003 | Normal startup/HTTP/reread/named update | AC-003/005, live AC-004 NOT inferred |
| API-004 | Owned repeat startup/HTTP/cleanup | AC-005 |
| API-005 | Final artifact/source gates | Scope/privacy/hygiene |
## Events
| UTC | Case | Event | Expected | Observed/result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 2026-10-13T13:15:41.526342+00:00 | API-001 | Started | No source delta; exact proposal/applicable O1 boundary | Pending | API-001.json |
| 2026-10-13T13:15:41.617483+00:00 | API-001 | Completed | As planned | Pass: Zero shipped delta; exact two-value proposal; pinned local arm64 image | API-001.json |
| 2026-10-13T13:15:41.617571+00:00 | API-002 | Started | Owned signed-out native605 pair/RPC and complete override | Pending | API-002.json |
| 2026-10-13T13:15:42.009223+00:00 | API-002 | Completed | As planned | Pass: Installed5.22 native605 query/schema/RPC listMigrationDirectories and existing-env/canonical DB checks Pass; only tmpfs mounts | API-002.json |
| 2026-10-13T13:15:42.009301+00:00 | API-003 | Started | Normal startup via installed reread/named update, repeated HTTP and sibling PID continuity | Pending | API-003.json |
| 2026-10-13T13:15:43.059972+00:00 | API-003 | Checkpoint | Repeated health | Not ready yet: RemoteDisconnected | API-003.json |
| 2026-10-13T13:15:49.437720+00:00 | API-003 | Completed | As planned | Pass: reread no start; named update starts actual normal backend;3 HTTP200/statusok; existing-env/migrations; sibling PIDs unchanged | API-003.json |
| 2026-10-13T13:15:49.437827+00:00 | API-004 | Started | Repeat only owned backend normal startup on same owned data; repeated readiness; cleanup | Pending | API-004.json |
| 2026-10-13T13:15:57.360432+00:00 | API-004 | Completed | As planned | Pass: Same-container owned backend repeat startup/3 health observations; sibling PIDs retained; cleanup follows | API-004.json |
| 2026-10-13 | API-003/004 | Checkpoint | Nonvacuous sibling PID proof | Initial startup/RPC/HTTP/restart passed and cleanup complete; first pre-update RUNNING PID set empty while siblings STARTING, so continuity claim narrowed. Rerun owned proof with >=7 ready sibling PIDs and explicit tmpfs/sign-out checks; original evidence retained in initial-proof. Chrome FATAL on pristine owned base is outside backend O1 scope, not user browser proof. | initial-proof/ |
| 2026-10-13T13:17:38.275073+00:00 | API-001 | Started | No source delta; exact proposal/applicable O1 boundary | Pending | API-001.json |
| 2026-10-13T13:17:38.368668+00:00 | API-001 | Completed | As planned | Pass: Zero shipped delta; exact two-value proposal; pinned local arm64 image | API-001.json |
| 2026-10-13T13:17:38.368763+00:00 | API-002 | Started | Owned signed-out native605 pair/RPC and complete override | Pending | API-002.json |
| 2026-10-13T13:17:38.815719+00:00 | API-002 | Completed | As planned | Pass: Installed5.22 native605 query/schema/RPC listMigrationDirectories and existing-env/canonical DB checks Pass; only tmpfs mounts | API-002.json |
| 2026-10-13T13:17:38.815810+00:00 | API-003 | Started | Normal startup via installed reread/named update, repeated HTTP and sibling PID continuity | Pending | API-003.json |
| 2026-10-13T13:17:45.542374+00:00 | API-003 | Checkpoint | Repeated health | Not ready yet: RemoteDisconnected | API-003.json |
| 2026-10-13T13:17:52.057974+00:00 | API-003 | Completed | As planned | Pass: reread no start; named update starts actual normal backend;3 HTTP200/statusok; existing-env/migrations; sibling PIDs unchanged | API-003.json |
| 2026-10-13T13:17:52.058254+00:00 | API-004 | Started | Repeat only owned backend normal startup on same owned data; repeated readiness; cleanup | Pending | API-004.json |
| 2026-10-13T13:17:59.905513+00:00 | API-004 | Completed | As planned | Pass: Same-container owned backend repeat startup/3 health observations; sibling PIDs retained; cleanup follows | API-004.json |
| 2026-10-13T13:20:50.393578+00:00 | API-004 | Checkpoint | Cleanup/nonempty comparison reconciled | Pass both owned containers absent; final7 siblings stable across reread/update/restart; initial empty comparator not counted proof | cleanup.json, repeat-continuity.json |
| 2026-10-13T13:21:38.190684+00:00 | API-005 | Started | License/hygiene/zero production/localdiff; cumulative upstreamEOF retained | Pending | final-gates.json |
| 2026-10-13T13:21:40.977579+00:00 | API-005 | Completed | License/hygiene/zero production/localdiff; cumulative upstreamEOF retained | Pass applicable gates/zero production delta; raw cumulative diff Fail(exit2) ONLY two known upstreamEOF blanks, not green; owned outer gate HOME cleaned | final-gates.json |

## Reconciliation
CasesAPI-001..005 complete; latest owned scopePass; final rerun directproof used, initial evidence retained. No running/unstarted/interrupted case. Both ownercontainers absent. Raw cumulativeEOF whitespaceFail and wholeSupervisor statusexit3/chromeFATAL retained, not silently converted into global-green assurance. Reconciled into report Acceptance-Criteria Proof/Case Matrix; only Delivery can complete live AC-004; O2/source requirements remain deferred.
