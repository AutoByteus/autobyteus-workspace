# API/E2E Test-Case Ledger

## Ledger Meta
- Owner: /api_e2e_engineer; round 1 / API-REV-001 baseline planned, 2026-10-03.
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis.
- Canonical investigation/report/revision: this directory's api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-revision-record.md.
- Required for multi-case native-browser async validation; terminal evidence persisted before next case. No prior completed result.

## Planned Cases
| ID | Journey/check | REQ/AC | Surface/order |
| --- | --- | --- | --- |
| R-001 | Mounted lifetime + actual-publication integration (20 tests) | 001–003 | Nuxt/happy-dom, first |
| R-002 | Preserved adjacent suites + fixture HTTP/worker integration | 002/003 | Nuxt/repository, second |
| B-001 | Run caller real capture across 3 unrelated publications; explicit Stop, once/no Send | 001/003 | Chrome + native browser audio/worklet |
| B-002 | Chat caller, 390px viewport, keyboard Start/Stop; current draft/no Send | 001/003 | Chrome + native browser audio/worklet |
| B-003 | Deferred real getUserMedia; ordinary publication; release/continue | 001 | Chrome startup |
| B-004 | Deferred real getUserMedia; genuine member switch; release/dispose | 002 | Chrome startup cancellation |
| B-005 | Pending fixture IPC with ordinary publication; release/append once | 001/003 | Chrome transcription |
| B-006 | Pending fixture IPC, genuine member switch; late transcript discarded | 002 | Chrome transcription cancellation |
| B-007 | Genuine mounted owner removal stops native tracks/context | 002 | Chrome teardown |
| R-003 | Final web build after browser fixture removal | 001–003 | Nuxt production |
| R-004 | Syntax/diff/source/evidence hashes and owned cleanup | 001–003 | CLI provenance |

## Execution Events
Events appended below with timestamp, expected/observed, result and evidence. Started/checkpoint is not terminal proof.

## Re-entry And Reconciliation
Completed baseline: every required case terminal and reconciled into api-e2e-execution-coverage-report.md. Latest R-004 Pass. No unresolved/interrupted/unstarted case. In-round selector attempt failure resolved; historical-source red control distinguished from current-source results.

2026-10-03T13:12:13Z R-001 Started: expected 20 lifetime/publication tests pass; independent run.

2026-10-03T13:12:23Z R-001 Completed: exit=0; see evidence/api001-focused.log; result=Pass.

2026-10-03T13:12:35Z R-002 Started: expected preserved adjacent and fixture service cases pass.

2026-10-03T13:12:47Z R-002 Completed: exit=0; see evidence/api001-adjacent.log; result=Pass.

2026-10-03T13:17:46.411Z B-001 Started: expected Run caller survives repeated publications and Stop appends once/no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt1/evidence.json

2026-10-03T13:18:17.605Z B-001 Completed: Fail: Run caller survives repeated publications and Stop appends once/no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt1/evidence.json

2026-10-03T13:19:27.574Z B-001 Started: expected Run caller survives repeated publications and Stop appends once/no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:29.477Z B-001 Completed: Pass: Run caller survives repeated publications and Stop appends once/no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:29.477Z B-002 Started: expected Chat 390px viewport keyboard Start/Stop retains draft and no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:30.338Z B-002 Completed: Pass: Chat 390px viewport keyboard Start/Stop retains draft and no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:30.338Z B-003 Started: expected Publication during deferred native microphone acquisition preserves startup; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:31.409Z B-003 Completed: Pass: Publication during deferred native microphone acquisition preserves startup; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:31.409Z B-004 Started: expected Genuine member change during startup disposes late acquired native stream; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:32.201Z B-004 Completed: Pass: Genuine member change during startup disposes late acquired native stream; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:32.201Z B-005 Started: expected Publication during pending transcription preserves once-only append; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:33.132Z B-005 Completed: Pass: Publication during pending transcription preserves once-only append; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:33.133Z B-006 Started: expected Genuine member switch rejects late pending transcription; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:34.060Z B-006 Completed: Pass: Genuine member switch rejects late pending transcription; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:34.060Z B-007 Started: expected Composer teardown cancels and disposes actual native capture; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:19:34.890Z B-007 Completed: Pass: Composer teardown cancels and disposes actual native capture; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-attempt2/evidence.json

2026-10-03T13:21:45.905Z B-001 Started: expected Run caller survives repeated publications and Stop appends once/no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:52.490Z B-001 Completed: Pass: Run caller survives repeated publications and Stop appends once/no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:52.490Z B-002 Started: expected Chat 390px viewport keyboard Start/Stop retains draft and no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:53.336Z B-002 Completed: Pass: Chat 390px viewport keyboard Start/Stop retains draft and no Send; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:53.336Z B-003 Started: expected Publication during deferred native microphone acquisition preserves startup; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:54.407Z B-003 Completed: Pass: Publication during deferred native microphone acquisition preserves startup; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:54.407Z B-004 Started: expected Genuine member change during startup disposes late acquired native stream; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:55.175Z B-004 Completed: Pass: Genuine member change during startup disposes late acquired native stream; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:55.175Z B-005 Started: expected Publication during pending transcription preserves once-only append; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:56.209Z B-005 Completed: Pass: Publication during pending transcription preserves once-only append; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:56.209Z B-006 Started: expected Genuine member switch rejects late pending transcription; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:57.256Z B-006 Completed: Pass: Genuine member switch rejects late pending transcription; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:57.256Z B-007 Started: expected Composer teardown cancels and disposes actual native capture; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

2026-10-03T13:21:58.090Z B-007 Completed: Pass: Composer teardown cancels and disposes actual native capture; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/voice-recording-unexpected-stop-analysis/tickets/in-progress/voice-recording-unexpected-stop-analysis/evidence/api001-browser-final/evidence.json

Added planned case C-001: browser regression-sensitivity control on exact original adapter, expecting B-001 to detect lost capture; source restored/hash checked before next run. Not a current-source Fail.

2026-10-03T13:23:17Z C-001 Started: expected original source fails B-001 on publication; no IPC; fixed source restored with EXIT trap.

2026-10-03T13:23:36Z C-001 Completed: original CLI exit=1; control verdict exit=0; expected defect captured, restored fixed source; evidence/api001-browser-original-control/evidence.json.

2026-10-03T13:24:04Z R-001 Started rerun: verify fixed source restored after C-001; expected 20 pass.

2026-10-03T13:24:12Z R-001 Completed rerun: exit=0; result=Pass; evidence/api001-focused-final.log.

2026-10-03T13:24:12Z R-003 Started: expected final web build passes; temporary page absent.

2026-10-03T13:24:30Z R-003 Completed: exit=0; result=Pass; evidence/api001-build.log.

2026-10-03T13:25:34Z R-004 Started: syntax/diff, evidence collision refusal, source restoration/hashes and owned cleanup.

2026-10-03T13:25:36Z R-004 Completed: result=Pass; syntax/diff/collision/hashes/cleanup; evidence/api001-provenance.log.

Final reconciliation: R-001 20/20 (restoration rerun20/20), R-002 55/55, R-003 build Pass, R-004 scope/safety Pass; B-001–007 all Pass on final fixed source. C-001 Pass expected-red sensitivity. API-REV-001 Pass 95.71%; no case remains running.
