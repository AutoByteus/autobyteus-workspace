# API/E2E Test-Case Ledger

## Ledger Meta
Round 1 / API-REV-001. Worktree and canonical paths as coverage investigation. Initialized before coverage execution; current execution report is the round authority. No prior completed API/E2E result.

## Planned Cases — reconciled final state
A/T/O mean standalone Agent, hosted Team member, nested Team member in Org. Every matrix case also proves AC-004 continuation/identity/work preservation. The original plan was initialized with Pending states; current states below reflect the final attempts, not deletion of previous failures.

| Case ID | Journey | Approved IDs | Boundary | Command | State |
| --- | --- | --- | --- | --- | --- |
| API-A-01 | A: quota/hint | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-A-02 | A: unfamiliar | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-A-03 | A: structured rate message | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-A-04 | A: missing | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-A-05 | A: empty | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-A-06 | A: malformed | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-A-07 | A: credential/markup/private response | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-T-01 | T: quota/hint | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-T-02 | T: unfamiliar | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-T-03 | T: structured rate message | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-T-04 | T: missing | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-T-05 | T: empty | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-T-06 | T: malformed | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-T-07 | T: credential/markup/private response | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-O-01 | O: quota/hint | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-O-02 | O: unfamiliar | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-O-03 | O: structured rate message | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-O-04 | O: missing | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-O-05 | O: empty | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-O-06 | O: malformed | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-O-07 | O: credential/markup/private response | AC-001/002/003/005 | Real GraphQL/WebSocket→AGY | Controlled failure transport | Pass |
| API-U01 | AGY/Claude focused units | AC-001–005 as applicable | Repository/browser | See investigation | Pass |
| API-U02 | Preserved runtime paths | AC-001–005 as applicable | Repository/browser | See investigation | Pass |
| API-D01 | Native-image denial privacy | AC-001–005 as applicable | Repository/browser | See investigation | Pass |
| API-C01 | Failure→next user turn all scopes; same identity/completed work | AC-001–005 as applicable | Repository/browser | See investigation | N/A — aggregate included in API-A/T/O-01..07 |
| API-C02 | Failed Agent normal stop→exact restore→success | AC-001–005 as applicable | Repository/browser | See investigation | Pass |
| API-R01 | Shared-fixture background/MCP regressions | AC-001–005 as applicable | Repository/browser | See investigation | Pass |
| API-W01 | Web handler/component/guard/streaming regressions | AC-001–005 as applicable | Repository/browser | See investigation | Pass |
| UI-A01 | Real Agent stream→DOM all seven shapes + next turn | AC-001–005 as applicable | Repository/browser | See investigation | Pass |
| UI-T01 | Real Team member stream→DOM all seven shapes + next turn | AC-001–005 as applicable | Repository/browser | See investigation | Pass |
| API-D02 | Existing credential-only error negative | AC-001–005 as applicable | Current public transport | See execution-index.md | Pass |
| API-CL01 | SDK errors[] rate/hint and credential redaction | AC-001–005 as applicable | Current public transport | See execution-index.md | Pass |
| API-CL02 | SDK unfamiliar markup as plain supplied message | AC-001–005 as applicable | Current public transport | See execution-index.md | Pass |
| API-CL03 | Existing scalar precedence over errors[] | AC-001–005 as applicable | Current public transport | See execution-index.md | Pass |
| API-CL04 | Malformed errors[] fallback | AC-001–005 as applicable | Current public transport | See execution-index.md | Pass |
| API-B01 | Browser interval provider-input/projection correlation | AC-001–005 as applicable | Current public transport | See execution-index.md | Pass |

## Plan Amendments / Reporting Corrections
API-D02 retained original credential-only negative; API-CL01–04 planned before Claude wire checks; API-B01 added before final combined correlation rerun. API-BUILD01 is the supplemental final production-build check, not a new product journey. UI journeys are two cases with seven meaningful shape checkpoints each; initial shorthand UI-A/T-01..07 is not seven additional journey executions. API-C01 is an aggregate trace, not separately counted.

Sequence numbers below normalize the original append order (auto/manual labels); timestamps, failures and observations are retained. First narrow quota reference corrected to transport-first.log. Initial failed browser evidence reference corrected to browser-evidence-initial.json; intermediate passing browser snapshots were replaced by the final current snapshot, and those checkpoints point to their retained run transcripts rather than falsely identifying final frames as earlier ones.

## Execution Events
| Sequence | Case ID | Timestamp | Event | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | API-U01 | 2026-10-03T12:48:55.048330+00:00 | Started | 171 focused unit cases pass | Running | N/A | evidence/api-e2e/focused-unit.log |
| 2 | API-U01 | 2026-10-03T12:49:01.404633+00:00 | Completed | Focused unit cases pass | exit=0 | Pass | evidence/api-e2e/focused-unit.log |
| 3 | API-A-01 | 2026-10-03T12:53:20.167Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-first.log |
| 4 | API-A-01 | 2026-10-03T12:53:20.606Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-first.log |
| 5 | API-D01 | 2026-10-03T12:53:55.776Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 6 | API-D01 | 2026-10-03T12:53:56.090Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 7 | API-A-01 | 2026-10-03T12:53:56.376Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 8 | API-A-01 | 2026-10-03T12:53:56.735Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 9 | API-A-02 | 2026-10-03T12:53:56.735Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 10 | API-A-02 | 2026-10-03T12:53:57.077Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 11 | API-A-03 | 2026-10-03T12:53:57.078Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 12 | API-A-03 | 2026-10-03T12:53:57.423Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 13 | API-A-04 | 2026-10-03T12:53:57.423Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 14 | API-A-04 | 2026-10-03T12:53:57.773Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 15 | API-A-05 | 2026-10-03T12:53:57.773Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 16 | API-A-05 | 2026-10-03T12:53:58.115Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 17 | API-A-06 | 2026-10-03T12:53:58.115Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 18 | API-A-06 | 2026-10-03T12:53:58.451Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 19 | API-A-07 | 2026-10-03T12:53:58.452Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 20 | API-A-07 | 2026-10-03T12:53:58.810Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 21 | API-T-01 | 2026-10-03T12:53:58.811Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 22 | API-T-01 | 2026-10-03T12:53:59.217Z | Completed | Approved runtime message/continuity | AssertionError: Error: Launch settings for Team member '/worker' were not provided.: expected false to be true // Object.is equality | Fail | evidence/api-e2e/transport-initial.log |
| 23 | API-T-02 | 2026-10-03T12:53:59.221Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 24 | API-T-02 | 2026-10-03T12:53:59.521Z | Completed | Approved runtime message/continuity | AssertionError: Error: Launch settings for Team member '/worker' were not provided.: expected false to be true // Object.is equality | Fail | evidence/api-e2e/transport-initial.log |
| 25 | API-T-03 | 2026-10-03T12:53:59.522Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 26 | API-T-03 | 2026-10-03T12:53:59.851Z | Completed | Approved runtime message/continuity | AssertionError: Error: Launch settings for Team member '/worker' were not provided.: expected false to be true // Object.is equality | Fail | evidence/api-e2e/transport-initial.log |
| 27 | API-T-04 | 2026-10-03T12:53:59.852Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 28 | API-T-04 | 2026-10-03T12:54:00.240Z | Completed | Approved runtime message/continuity | AssertionError: Error: Launch settings for Team member '/worker' were not provided.: expected false to be true // Object.is equality | Fail | evidence/api-e2e/transport-initial.log |
| 29 | API-T-05 | 2026-10-03T12:54:00.241Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 30 | API-T-05 | 2026-10-03T12:54:00.557Z | Completed | Approved runtime message/continuity | AssertionError: Error: Launch settings for Team member '/worker' were not provided.: expected false to be true // Object.is equality | Fail | evidence/api-e2e/transport-initial.log |
| 31 | API-T-06 | 2026-10-03T12:54:00.557Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 32 | API-T-06 | 2026-10-03T12:54:00.851Z | Completed | Approved runtime message/continuity | AssertionError: Error: Launch settings for Team member '/worker' were not provided.: expected false to be true // Object.is equality | Fail | evidence/api-e2e/transport-initial.log |
| 33 | API-T-07 | 2026-10-03T12:54:00.851Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 34 | API-T-07 | 2026-10-03T12:54:01.148Z | Completed | Approved runtime message/continuity | AssertionError: Error: Launch settings for Team member '/worker' were not provided.: expected false to be true // Object.is equality | Fail | evidence/api-e2e/transport-initial.log |
| 35 | API-O-01 | 2026-10-03T12:54:01.149Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 36 | API-O-01 | 2026-10-03T12:54:01.920Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 37 | API-O-02 | 2026-10-03T12:54:01.920Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 38 | API-O-02 | 2026-10-03T12:54:02.667Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 39 | API-O-03 | 2026-10-03T12:54:02.667Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 40 | API-O-03 | 2026-10-03T12:54:03.401Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 41 | API-O-04 | 2026-10-03T12:54:03.402Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 42 | API-O-04 | 2026-10-03T12:54:04.136Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 43 | API-O-05 | 2026-10-03T12:54:04.136Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 44 | API-O-05 | 2026-10-03T12:54:04.873Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 45 | API-O-06 | 2026-10-03T12:54:04.873Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 46 | API-O-06 | 2026-10-03T12:54:05.630Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 47 | API-O-07 | 2026-10-03T12:54:05.630Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 48 | API-O-07 | 2026-10-03T12:54:06.427Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-initial.log |
| 49 | API-C02 | 2026-10-03T12:54:06.428Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-initial.log |
| 50 | API-C02 | 2026-10-03T12:54:06.677Z | Completed | Approved runtime message/continuity | Error: [{"message":"Cannot query field \"runtimeKind\" on type \"RunResumeConfigPayload\".","locations":[{"line":1,"column":61}]},{"message":"Cannot query field \"llmModelIdentifier\" on type \"RunResumeConfigPayload\".","locations":[{"line":1,"column":73}]},{"message":"Cannot query field \"llmConfig\" on type \"RunResumeConfigPayload\".","locations":[{"line":1,"column":92}]},{"message":"Cannot query field \"autoExecuteTools\" on type \"RunResumeConfigPayload\".","locations":[{"line":1,"column":102}]},{"message":"Cannot query field \"workspaceRootPath\" on type \"RunResumeConfigPayload\".","locations":[{"line":1,"column":119}]}] | Fail | evidence/api-e2e/transport-initial.log |
| 51 | API-T-01 | 2026-10-03T12:57:56.402Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-corrected.log |
| 52 | API-T-01 | 2026-10-03T12:57:57.140Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-corrected.log |
| 53 | API-T-02 | 2026-10-03T12:57:57.141Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-corrected.log |
| 54 | API-T-02 | 2026-10-03T12:57:57.813Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-corrected.log |
| 55 | API-T-03 | 2026-10-03T12:57:57.814Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-corrected.log |
| 56 | API-T-03 | 2026-10-03T12:57:58.491Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-corrected.log |
| 57 | API-T-04 | 2026-10-03T12:57:58.491Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-corrected.log |
| 58 | API-T-04 | 2026-10-03T12:57:59.339Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-corrected.log |
| 59 | API-T-05 | 2026-10-03T12:57:59.340Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-corrected.log |
| 60 | API-T-05 | 2026-10-03T12:58:00.049Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-corrected.log |
| 61 | API-T-06 | 2026-10-03T12:58:00.050Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-corrected.log |
| 62 | API-T-06 | 2026-10-03T12:58:00.803Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-corrected.log |
| 63 | API-T-07 | 2026-10-03T12:58:00.803Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-corrected.log |
| 64 | API-T-07 | 2026-10-03T12:58:01.523Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport-corrected.log |
| 65 | API-C02 | 2026-10-03T12:58:01.524Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport-corrected.log |
| 66 | API-C02 | 2026-10-03T12:58:01.785Z | Completed | Approved runtime message/continuity | Error: [{"message":"Cannot query field \"platformAgentRunId\" on type \"RunRuntimeReferenceObject\".","locations":[{"line":1,"column":169}]}] | Fail | evidence/api-e2e/transport-corrected.log |
| 67 | API-C02 | 2026-10-03T12:58:41.534Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/restore-recheck.log |
| 68 | API-C02 | 2026-10-03T12:58:42.153Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/restore-recheck.log |
| 69 | API-W01 | 2026-10-03T12:59:04.179377+00:00 | Started | Web handler/component/stream tests pass | Running | N/A | evidence/api-e2e/web-unit.log |
| 70 | API-W01 | 2026-10-03T12:59:15.206844+00:00 | Completed | Web cases pass | exit=0 | Pass | evidence/api-e2e/web-unit.log |
| 71 | API-D01 | 2026-10-03T12:59:43.529Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 72 | API-D01 | 2026-10-03T12:59:43.892Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 73 | API-A-01 | 2026-10-03T12:59:44.174Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 74 | API-A-01 | 2026-10-03T12:59:44.525Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 75 | API-A-02 | 2026-10-03T12:59:44.525Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 76 | API-A-02 | 2026-10-03T12:59:44.870Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 77 | API-A-03 | 2026-10-03T12:59:44.871Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 78 | API-A-03 | 2026-10-03T12:59:45.218Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 79 | API-A-04 | 2026-10-03T12:59:45.219Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 80 | API-A-04 | 2026-10-03T12:59:45.563Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 81 | API-A-05 | 2026-10-03T12:59:45.564Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 82 | API-A-05 | 2026-10-03T12:59:45.906Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 83 | API-A-06 | 2026-10-03T12:59:45.907Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 84 | API-A-06 | 2026-10-03T12:59:46.248Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 85 | API-A-07 | 2026-10-03T12:59:46.248Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 86 | API-A-07 | 2026-10-03T12:59:46.597Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 87 | API-T-01 | 2026-10-03T12:59:46.598Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 88 | API-T-01 | 2026-10-03T12:59:47.289Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 89 | API-T-02 | 2026-10-03T12:59:47.289Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 90 | API-T-02 | 2026-10-03T12:59:47.989Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 91 | API-T-03 | 2026-10-03T12:59:47.989Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 92 | API-T-03 | 2026-10-03T12:59:48.899Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 93 | API-T-04 | 2026-10-03T12:59:48.900Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 94 | API-T-04 | 2026-10-03T12:59:49.680Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 95 | API-T-05 | 2026-10-03T12:59:49.680Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 96 | API-T-05 | 2026-10-03T12:59:50.395Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 97 | API-T-06 | 2026-10-03T12:59:50.396Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 98 | API-T-06 | 2026-10-03T12:59:51.094Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 99 | API-T-07 | 2026-10-03T12:59:51.095Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 100 | API-T-07 | 2026-10-03T12:59:51.754Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 101 | API-O-01 | 2026-10-03T12:59:51.754Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 102 | API-O-01 | 2026-10-03T12:59:52.511Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 103 | API-O-02 | 2026-10-03T12:59:52.512Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 104 | API-O-02 | 2026-10-03T12:59:53.249Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 105 | API-O-03 | 2026-10-03T12:59:53.250Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 106 | API-O-03 | 2026-10-03T12:59:54.056Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 107 | API-O-04 | 2026-10-03T12:59:54.056Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 108 | API-O-04 | 2026-10-03T12:59:54.818Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 109 | API-O-05 | 2026-10-03T12:59:54.818Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 110 | API-O-05 | 2026-10-03T12:59:55.559Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 111 | API-O-06 | 2026-10-03T12:59:55.559Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 112 | API-O-06 | 2026-10-03T12:59:56.303Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 113 | API-O-07 | 2026-10-03T12:59:56.304Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 114 | API-O-07 | 2026-10-03T12:59:57.048Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 115 | API-C02 | 2026-10-03T12:59:57.049Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 116 | API-C02 | 2026-10-03T12:59:57.584Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 117 | API-U02 | 2026-10-03T13:00:20.589492+00:00 | Started | Preserve Native/Codex/ACP messages/provider metadata | Running | N/A | evidence/api-e2e/preserved-unit.log |
| 118 | API-U02 | 2026-10-03T13:00:25.340641+00:00 | Completed | Preserved-path cases pass | exit=0 | Pass | evidence/api-e2e/preserved-unit.log |
| 119 | API-R01 | 2026-10-03T13:01:16.995246+00:00 | Started | Shared CLI background/MCP regressions pass | Running | N/A | evidence/api-e2e/shared-fixture.log |
| 120 | API-R01 | 2026-10-03T13:01:28.540136+00:00 | Completed | Shared fixture regression | exit=0 | Pass | evidence/api-e2e/shared-fixture.log |
| 121 | API-CL01 | 2026-10-03T13:03:51.029Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire-initial.log |
| 122 | API-CL01 | 2026-10-03T13:03:51.697Z | Completed | Approved runtime message/continuity | AssertionError: expected { …(5) } to match object { code: 'CLAUDE_RUNTIME_ERROR', …(2) } (2 matching properties omitted from actual) | Fail | evidence/api-e2e/claude-wire-initial.log |
| 123 | API-CL02 | 2026-10-03T13:03:51.709Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire-initial.log |
| 124 | API-CL02 | 2026-10-03T13:03:51.729Z | Completed | Approved runtime message/continuity | AssertionError: expected { …(5) } to match object { code: 'CLAUDE_RUNTIME_ERROR', …(2) } (2 matching properties omitted from actual) | Fail | evidence/api-e2e/claude-wire-initial.log |
| 125 | API-CL03 | 2026-10-03T13:03:51.730Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire-initial.log |
| 126 | API-CL03 | 2026-10-03T13:03:51.744Z | Completed | Approved runtime message/continuity | AssertionError: expected { …(5) } to match object { code: 'CLAUDE_RUNTIME_ERROR', …(2) } (2 matching properties omitted from actual) | Fail | evidence/api-e2e/claude-wire-initial.log |
| 127 | API-CL04 | 2026-10-03T13:03:51.745Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire-initial.log |
| 128 | API-CL04 | 2026-10-03T13:03:51.756Z | Completed | Approved runtime message/continuity | AssertionError: expected { …(5) } to match object { code: 'CLAUDE_RUNTIME_ERROR', …(2) } (2 matching properties omitted from actual) | Fail | evidence/api-e2e/claude-wire-initial.log |
| 129 | API-CL01 | 2026-10-03T13:05:22.712Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire-burst.log |
| 130 | API-CL01 | 2026-10-03T13:05:22.826Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/claude-wire-burst.log |
| 131 | API-CL02 | 2026-10-03T13:05:22.826Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire-burst.log |
| 132 | API-CL02 | 2026-10-03T13:05:22.846Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/claude-wire-burst.log |
| 133 | API-CL03 | 2026-10-03T13:05:22.847Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire-burst.log |
| 134 | API-CL03 | 2026-10-03T13:05:22.864Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/claude-wire-burst.log |
| 135 | API-CL04 | 2026-10-03T13:05:22.865Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire-burst.log |
| 136 | API-CL04 | 2026-10-03T13:05:22.880Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/claude-wire-burst.log |
| 137 | API-CL01 | 2026-10-03T13:07:42.603Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire.log |
| 138 | API-CL01 | 2026-10-03T13:07:42.716Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/claude-wire.log |
| 139 | API-CL02 | 2026-10-03T13:07:42.717Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire.log |
| 140 | API-CL02 | 2026-10-03T13:07:42.737Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/claude-wire.log |
| 141 | API-CL03 | 2026-10-03T13:07:42.738Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire.log |
| 142 | API-CL03 | 2026-10-03T13:07:42.758Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/claude-wire.log |
| 143 | API-CL04 | 2026-10-03T13:07:42.758Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/claude-wire.log |
| 144 | API-CL04 | 2026-10-03T13:07:42.774Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/claude-wire.log |
| 145 | API-D01 | 2026-10-03T13:08:23.562Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 146 | API-D01 | 2026-10-03T13:08:23.959Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 147 | API-A-01 | 2026-10-03T13:08:24.273Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 148 | API-A-01 | 2026-10-03T13:08:24.622Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 149 | API-A-02 | 2026-10-03T13:08:24.623Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 150 | API-A-02 | 2026-10-03T13:08:24.983Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 151 | API-A-03 | 2026-10-03T13:08:24.983Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 152 | API-A-03 | 2026-10-03T13:08:25.337Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 153 | API-A-04 | 2026-10-03T13:08:25.337Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 154 | API-A-04 | 2026-10-03T13:08:25.698Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 155 | API-A-05 | 2026-10-03T13:08:25.699Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 156 | API-A-05 | 2026-10-03T13:08:26.054Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 157 | API-A-06 | 2026-10-03T13:08:26.054Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 158 | API-A-06 | 2026-10-03T13:08:26.411Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 159 | API-A-07 | 2026-10-03T13:08:26.411Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 160 | API-A-07 | 2026-10-03T13:08:26.768Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 161 | API-T-01 | 2026-10-03T13:08:26.769Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 162 | API-T-01 | 2026-10-03T13:08:27.512Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 163 | API-T-02 | 2026-10-03T13:08:27.512Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 164 | API-T-02 | 2026-10-03T13:08:28.211Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 165 | API-T-03 | 2026-10-03T13:08:28.211Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 166 | API-T-03 | 2026-10-03T13:08:28.913Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 167 | API-T-04 | 2026-10-03T13:08:28.914Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 168 | API-T-04 | 2026-10-03T13:08:29.635Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 169 | API-T-05 | 2026-10-03T13:08:29.635Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 170 | API-T-05 | 2026-10-03T13:08:30.342Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 171 | API-T-06 | 2026-10-03T13:08:30.342Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 172 | API-T-06 | 2026-10-03T13:08:30.993Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 173 | API-T-07 | 2026-10-03T13:08:30.993Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 174 | API-T-07 | 2026-10-03T13:08:31.636Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 175 | API-O-01 | 2026-10-03T13:08:31.636Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 176 | API-O-01 | 2026-10-03T13:08:32.373Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 177 | API-O-02 | 2026-10-03T13:08:32.373Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 178 | API-O-02 | 2026-10-03T13:08:33.111Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 179 | API-O-03 | 2026-10-03T13:08:33.111Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 180 | API-O-03 | 2026-10-03T13:08:33.901Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 181 | API-O-04 | 2026-10-03T13:08:33.902Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 182 | API-O-04 | 2026-10-03T13:08:34.651Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 183 | API-O-05 | 2026-10-03T13:08:34.652Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 184 | API-O-05 | 2026-10-03T13:08:35.377Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 185 | API-O-06 | 2026-10-03T13:08:35.377Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 186 | API-O-06 | 2026-10-03T13:08:36.110Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 187 | API-O-07 | 2026-10-03T13:08:36.111Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 188 | API-O-07 | 2026-10-03T13:08:36.892Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 189 | API-C02 | 2026-10-03T13:08:36.892Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/transport.log |
| 190 | API-C02 | 2026-10-03T13:08:37.416Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/transport.log |
| 191 | UI-A01 | 2026-10-03T13:10:39.738Z | Started | Public message→DOM and continuity | agent real stream journey | N/A | evidence/api-e2e/browser-evidence-initial.json |
| 192 | UI-A01 | 2026-10-03T13:10:40.188Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence-initial.json |
| 193 | UI-A01 | 2026-10-03T13:10:40.400Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence-initial.json |
| 194 | UI-A01 | 2026-10-03T13:10:40.618Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence-initial.json |
| 195 | UI-A01 | 2026-10-03T13:10:40.834Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence-initial.json |
| 196 | UI-A01 | 2026-10-03T13:10:41.051Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence-initial.json |
| 197 | UI-A01 | 2026-10-03T13:10:41.267Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence-initial.json |
| 198 | UI-A01 | 2026-10-03T13:10:41.638Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence-initial.json |
| 199 | UI-A01 | 2026-10-03T13:10:41.776Z | Completed | Public message→DOM and continuity | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:  2 !== 1 | Fail | evidence/api-e2e/browser-evidence-initial.json |
| 200 | UI-A01 | 2026-10-03T13:14:00.314Z | Started | Public message→DOM and continuity | agent real stream journey | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 201 | UI-A01 | 2026-10-03T13:14:00.759Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 202 | UI-A01 | 2026-10-03T13:14:00.972Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 203 | UI-A01 | 2026-10-03T13:14:01.189Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 204 | UI-A01 | 2026-10-03T13:14:01.409Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 205 | UI-A01 | 2026-10-03T13:14:01.626Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 206 | UI-A01 | 2026-10-03T13:14:01.839Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 207 | UI-A01 | 2026-10-03T13:14:02.226Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 208 | UI-A01 | 2026-10-03T13:14:02.385Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 209 | UI-T01 | 2026-10-03T13:14:02.385Z | Started | Public message→DOM and continuity | team real stream journey | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 210 | UI-T01 | 2026-10-03T13:14:02.994Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 211 | UI-T01 | 2026-10-03T13:14:03.207Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 212 | UI-T01 | 2026-10-03T13:14:03.423Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 213 | UI-T01 | 2026-10-03T13:14:03.645Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 214 | UI-T01 | 2026-10-03T13:14:03.872Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 215 | UI-T01 | 2026-10-03T13:14:04.090Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 216 | UI-T01 | 2026-10-03T13:14:04.478Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 217 | UI-T01 | 2026-10-03T13:14:04.635Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/browser-server.log (checkpoint frames later superseded by final browser-evidence.json) |
| 218 | API-D01 | 2026-10-03T13:16:49.386Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 219 | API-D01 | 2026-10-03T13:16:49.744Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 220 | API-D02 | 2026-10-03T13:16:49.744Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 221 | API-D02 | 2026-10-03T13:16:50.052Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 222 | API-A-01 | 2026-10-03T13:16:50.053Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 223 | API-A-01 | 2026-10-03T13:16:50.398Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 224 | API-A-02 | 2026-10-03T13:16:50.398Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 225 | API-A-02 | 2026-10-03T13:16:50.743Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 226 | API-A-03 | 2026-10-03T13:16:50.744Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 227 | API-A-03 | 2026-10-03T13:16:51.091Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 228 | API-A-04 | 2026-10-03T13:16:51.091Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 229 | API-A-04 | 2026-10-03T13:16:51.437Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 230 | API-A-05 | 2026-10-03T13:16:51.437Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 231 | API-A-05 | 2026-10-03T13:16:51.785Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 232 | API-A-06 | 2026-10-03T13:16:51.785Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 233 | API-A-06 | 2026-10-03T13:16:52.134Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 234 | API-A-07 | 2026-10-03T13:16:52.134Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 235 | API-A-07 | 2026-10-03T13:16:52.485Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 236 | API-T-01 | 2026-10-03T13:16:52.485Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 237 | API-T-01 | 2026-10-03T13:16:53.242Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 238 | API-T-02 | 2026-10-03T13:16:53.243Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 239 | API-T-02 | 2026-10-03T13:16:53.947Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 240 | API-T-03 | 2026-10-03T13:16:53.947Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 241 | API-T-03 | 2026-10-03T13:16:54.611Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 242 | API-T-04 | 2026-10-03T13:16:54.611Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 243 | API-T-04 | 2026-10-03T13:16:55.281Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 244 | API-T-05 | 2026-10-03T13:16:55.281Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 245 | API-T-05 | 2026-10-03T13:16:56.010Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 246 | API-T-06 | 2026-10-03T13:16:56.011Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 247 | API-T-06 | 2026-10-03T13:16:56.718Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 248 | API-T-07 | 2026-10-03T13:16:56.718Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 249 | API-T-07 | 2026-10-03T13:16:57.419Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 250 | API-O-01 | 2026-10-03T13:16:57.420Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 251 | API-O-01 | 2026-10-03T13:16:58.206Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 252 | API-O-02 | 2026-10-03T13:16:58.206Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 253 | API-O-02 | 2026-10-03T13:16:59.217Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 254 | API-O-03 | 2026-10-03T13:16:59.218Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 255 | API-O-03 | 2026-10-03T13:17:00.001Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 256 | API-O-04 | 2026-10-03T13:17:00.001Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 257 | API-O-04 | 2026-10-03T13:17:00.800Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 258 | API-O-05 | 2026-10-03T13:17:00.800Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 259 | API-O-05 | 2026-10-03T13:17:01.547Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 260 | API-O-06 | 2026-10-03T13:17:01.547Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 261 | API-O-06 | 2026-10-03T13:17:02.304Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 262 | API-O-07 | 2026-10-03T13:17:02.304Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 263 | API-O-07 | 2026-10-03T13:17:03.061Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 264 | API-C02 | 2026-10-03T13:17:03.061Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 265 | API-C02 | 2026-10-03T13:17:03.588Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 266 | UI-A01 | 2026-10-03T13:17:17.027Z | Started | Public message→DOM and continuity | agent real stream journey | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 267 | UI-A01 | 2026-10-03T13:17:17.447Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 268 | UI-A01 | 2026-10-03T13:17:17.660Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 269 | UI-A01 | 2026-10-03T13:17:17.877Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 270 | UI-A01 | 2026-10-03T13:17:18.111Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 271 | UI-A01 | 2026-10-03T13:17:18.330Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 272 | UI-A01 | 2026-10-03T13:17:18.560Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 273 | UI-A01 | 2026-10-03T13:17:18.931Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 274 | UI-A01 | 2026-10-03T13:17:19.071Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 275 | UI-T01 | 2026-10-03T13:17:19.071Z | Started | Public message→DOM and continuity | team real stream journey | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 276 | UI-T01 | 2026-10-03T13:17:19.575Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 277 | UI-T01 | 2026-10-03T13:17:19.794Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 278 | UI-T01 | 2026-10-03T13:17:20.010Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 279 | UI-T01 | 2026-10-03T13:17:20.233Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 280 | UI-T01 | 2026-10-03T13:17:20.443Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 281 | UI-T01 | 2026-10-03T13:17:20.661Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 282 | UI-T01 | 2026-10-03T13:17:21.032Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 283 | UI-T01 | 2026-10-03T13:17:21.187Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/final-e2e-initial.log; browser-server-correlation-initial.json |
| 284 | API-CL01 | 2026-10-03T13:17:28.869Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 285 | API-CL01 | 2026-10-03T13:17:28.981Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 286 | API-CL02 | 2026-10-03T13:17:28.981Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 287 | API-CL02 | 2026-10-03T13:17:29.001Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 288 | API-CL03 | 2026-10-03T13:17:29.001Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 289 | API-CL03 | 2026-10-03T13:17:29.020Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 290 | API-CL04 | 2026-10-03T13:17:29.020Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e-initial.log |
| 291 | API-CL04 | 2026-10-03T13:17:29.037Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e-initial.log |
| 292 | API-B01 | 2026-10-03T13:19:57.024938+00:00 | Completed | Exactly 16 browser-origin inputs, no duplicate | Counted 60 including 44 earlier Node-case inputs | Fail | evidence/api-e2e/final-e2e-initial.log |
| 293 | API-D01 | 2026-10-03T13:20:05.010Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 294 | API-D01 | 2026-10-03T13:20:05.341Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 295 | API-D02 | 2026-10-03T13:20:05.342Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 296 | API-D02 | 2026-10-03T13:20:05.638Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 297 | API-A-01 | 2026-10-03T13:20:05.639Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 298 | API-A-01 | 2026-10-03T13:20:05.994Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 299 | API-A-02 | 2026-10-03T13:20:05.994Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 300 | API-A-02 | 2026-10-03T13:20:06.344Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 301 | API-A-03 | 2026-10-03T13:20:06.345Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 302 | API-A-03 | 2026-10-03T13:20:06.715Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 303 | API-A-04 | 2026-10-03T13:20:06.715Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 304 | API-A-04 | 2026-10-03T13:20:07.067Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 305 | API-A-05 | 2026-10-03T13:20:07.067Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 306 | API-A-05 | 2026-10-03T13:20:07.420Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 307 | API-A-06 | 2026-10-03T13:20:07.421Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 308 | API-A-06 | 2026-10-03T13:20:07.766Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 309 | API-A-07 | 2026-10-03T13:20:07.767Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 310 | API-A-07 | 2026-10-03T13:20:08.109Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 311 | API-T-01 | 2026-10-03T13:20:08.109Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 312 | API-T-01 | 2026-10-03T13:20:08.832Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 313 | API-T-02 | 2026-10-03T13:20:08.833Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 314 | API-T-02 | 2026-10-03T13:20:09.501Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 315 | API-T-03 | 2026-10-03T13:20:09.501Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 316 | API-T-03 | 2026-10-03T13:20:10.291Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 317 | API-T-04 | 2026-10-03T13:20:10.291Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 318 | API-T-04 | 2026-10-03T13:20:10.977Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 319 | API-T-05 | 2026-10-03T13:20:10.977Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 320 | API-T-05 | 2026-10-03T13:20:11.666Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 321 | API-T-06 | 2026-10-03T13:20:11.666Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 322 | API-T-06 | 2026-10-03T13:20:12.370Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 323 | API-T-07 | 2026-10-03T13:20:12.370Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 324 | API-T-07 | 2026-10-03T13:20:13.041Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 325 | API-O-01 | 2026-10-03T13:20:13.041Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 326 | API-O-01 | 2026-10-03T13:20:13.851Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 327 | API-O-02 | 2026-10-03T13:20:13.852Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 328 | API-O-02 | 2026-10-03T13:20:14.620Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 329 | API-O-03 | 2026-10-03T13:20:14.620Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 330 | API-O-03 | 2026-10-03T13:20:15.408Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 331 | API-O-04 | 2026-10-03T13:20:15.408Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 332 | API-O-04 | 2026-10-03T13:20:16.160Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 333 | API-O-05 | 2026-10-03T13:20:16.160Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 334 | API-O-05 | 2026-10-03T13:20:16.917Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 335 | API-O-06 | 2026-10-03T13:20:16.917Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 336 | API-O-06 | 2026-10-03T13:20:17.684Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 337 | API-O-07 | 2026-10-03T13:20:17.684Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 338 | API-O-07 | 2026-10-03T13:20:18.503Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 339 | API-C02 | 2026-10-03T13:20:18.504Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 340 | API-C02 | 2026-10-03T13:20:19.041Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 341 | API-B01 | 2026-10-03T13:20:19.041Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 342 | UI-A01 | 2026-10-03T13:20:27.816Z | Started | Public message→DOM and continuity | agent real stream journey | N/A | evidence/api-e2e/browser-evidence.json |
| 343 | UI-A01 | 2026-10-03T13:20:28.271Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 344 | UI-A01 | 2026-10-03T13:20:28.496Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 345 | UI-A01 | 2026-10-03T13:20:28.713Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 346 | UI-A01 | 2026-10-03T13:20:28.929Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 347 | UI-A01 | 2026-10-03T13:20:29.147Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 348 | UI-A01 | 2026-10-03T13:20:29.363Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 349 | UI-A01 | 2026-10-03T13:20:29.750Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 350 | UI-A01 | 2026-10-03T13:20:29.909Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/browser-evidence.json |
| 351 | UI-T01 | 2026-10-03T13:20:29.910Z | Started | Public message→DOM and continuity | team real stream journey | N/A | evidence/api-e2e/browser-evidence.json |
| 352 | UI-T01 | 2026-10-03T13:20:30.405Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 353 | UI-T01 | 2026-10-03T13:20:30.630Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 354 | UI-T01 | 2026-10-03T13:20:30.847Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 355 | UI-T01 | 2026-10-03T13:20:31.064Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 356 | UI-T01 | 2026-10-03T13:20:31.281Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 357 | UI-T01 | 2026-10-03T13:20:31.498Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 358 | UI-T01 | 2026-10-03T13:20:31.901Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| 359 | UI-T01 | 2026-10-03T13:20:32.058Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/browser-evidence.json |
| 360 | API-B01 | 2026-10-03T13:20:32.488Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 361 | API-CL01 | 2026-10-03T13:20:40.637Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 362 | API-CL01 | 2026-10-03T13:20:40.752Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 363 | API-CL02 | 2026-10-03T13:20:40.752Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 364 | API-CL02 | 2026-10-03T13:20:40.774Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 365 | API-CL03 | 2026-10-03T13:20:40.775Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 366 | API-CL03 | 2026-10-03T13:20:40.796Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 367 | API-CL04 | 2026-10-03T13:20:40.796Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/final-e2e.log |
| 368 | API-CL04 | 2026-10-03T13:20:40.817Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/final-e2e.log |
| 369 | API-C01 | 2026-10-03T13:30:52.065474+00:00 | Reconciled | Continuation in all three scopes | Included in 21 matrix cases, no extra independent execution | N/A | API-A/T/O-01..07 evidence |
| 370 | API-BUILD01 | 2026-10-03T13:30:52.065474+00:00 | Completed | Strict production build/bootstrap | exit=0; shared builds/Prisma generation/bootstrap smoke passed | Pass | evidence/api-e2e/server-build.log |

## Re-entry And Reconciliation
Reconciled into api-e2e-execution-coverage-report.md: Yes. No case remains running, interrupted, unstarted or blocked. All meaningful product cases' final attempts Pass; API-C01 N/A as an included aggregate. Earlier authored setup/assertion/instrumentation failures remain in events and the execution index, not product-source defects. Current final suite: 36 passed, one opt-in real-Claude case skipped (Not Tested; out of the deterministic scope). No pass inferred from a checkpoint. Final event: API-BUILD01 completed, above.
