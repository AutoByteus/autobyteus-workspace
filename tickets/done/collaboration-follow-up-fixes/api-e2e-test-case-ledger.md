# API/E2E Test-Case Ledger — COLLAB-FOLLOWUP-001

Completed initial API-REV-001: Pass95.0%; previous API result/confidence N/A. Original chronological initial states/checkpoints are preserved below. Authority: api-e2e-coverage-investigation.md; latest completed result will be api-e2e-execution-coverage-report.md. Required due to independent live journeys, provider waits and interruption risk. Source5710fdd/artifact270d0d7; own evidence api-e2e-evidence/API-REV-001.

## Planned cases
| Case | Boundary / AC | Entry / expected evidence | Initial state |
|---|---|---|---|
| REPO-SERVER | AC001,002,008,006 preservation | 11files controlled lifecycle/identity/task/Stop | Not Tested |
| REPO-WEB | AC003–007 preservation | 19files actual selection/message plus current controls | Not Tested |
| SCN-001 | AC001,007 | Normal fresh Codex Team launch unused Offline/runtime | Not Tested |
| SCN-007 | AC008,007 | Normal complete Org unfocused launch unused Offline/runtime | Not Tested |
| SCN-002 | AC002,006 | Real exact first human/inter-Agent/Team ingress/unused peers | Not Tested |
| SCN-003 | AC003,007 | Prior Team + Org/member/draft + repeated ordinary task publication + writer tracing | Not Tested |
| SCN-004 | AC004,007 | Explicit leave/return and late update/selection preservation | Not Tested |
| SCN-005 | AC005,007 | Normal native first text Send/reply/actual chip Open | Not Tested |
| SCN-006 | AC006,007 | Same input/file after normal reopen | Not Tested |
| PRESERVE | AC006 | Owned normal Stop/retained/Restore, current repository negative controls | Not Tested |
| CLEANUP | QR002 | Owned processes/pages/credentials/data only; source/upstream unchanged | Not Tested |

## Execution events
| Time UTC | Case / command | Event | Observed result / scope | Evidence |
|---|---|---|---|---|

## Re-entry
No product journey started. Run repository commands first; every receipt appends a checkpoint here. No final state inferred from an interrupted or missing record.
| 2026-09-13T11:31:53.401475+00:00 | SETUP | Started | autobyteus-application-sdk-contracts-build | api-e2e-evidence/API-REV-001/repository/autobyteus-application-sdk-contracts-build.log |
| 2026-09-13T11:31:54.859316+00:00 | SETUP | Completed | Pass | api-e2e-evidence/API-REV-001/repository/autobyteus-application-sdk-contracts-build.json |
| 2026-09-13T11:31:54.859513+00:00 | SETUP | Started | autobyteus-application-frontend-sdk-build | api-e2e-evidence/API-REV-001/repository/autobyteus-application-frontend-sdk-build.log |
| 2026-09-13T11:31:56.473866+00:00 | SETUP | Completed | Pass | api-e2e-evidence/API-REV-001/repository/autobyteus-application-frontend-sdk-build.json |
| 2026-09-13T11:31:56.474375+00:00 | SETUP | Started | autobyteus-application-backend-sdk-build | api-e2e-evidence/API-REV-001/repository/autobyteus-application-backend-sdk-build.log |
| 2026-09-13T11:31:57.568434+00:00 | SETUP | Completed | Pass | api-e2e-evidence/API-REV-001/repository/autobyteus-application-backend-sdk-build.json |
| 2026-09-13T11:31:57.568969+00:00 | REPO-SERVER | Started | server-readiness | api-e2e-evidence/API-REV-001/repository/server-readiness.log |
| 2026-09-13T11:32:07.317952+00:00 | REPO-SERVER | Completed | Pass | api-e2e-evidence/API-REV-001/repository/server-readiness.json |
| 2026-09-13T11:32:07.318192+00:00 | REPO-SERVER | Started | server-preservation | api-e2e-evidence/API-REV-001/repository/server-preservation.log |
| 2026-09-13T11:32:24.763063+00:00 | REPO-SERVER | Completed | Pass | api-e2e-evidence/API-REV-001/repository/server-preservation.json |
| 2026-09-13T11:32:24.763700+00:00 | REPO-WEB | Started | web-regressions | api-e2e-evidence/API-REV-001/repository/web-regressions.log |
| 2026-09-13T11:32:44.353777+00:00 | REPO-WEB | Completed | Pass | api-e2e-evidence/API-REV-001/repository/web-regressions.json |
| 2026-09-13T11:32:44.354084+00:00 | REPO-WEB | Started | web-preservation | api-e2e-evidence/API-REV-001/repository/web-preservation.log |
| 2026-09-13T11:33:38.627768+00:00 | REPO-WEB | Completed | Pass | api-e2e-evidence/API-REV-001/repository/web-preservation.json |
| 2026-09-13T11:33:38.628120+00:00 | SETUP | Started | guard-web-boundary | api-e2e-evidence/API-REV-001/repository/guard-web-boundary.log |
| 2026-09-13T11:33:39.243804+00:00 | SETUP | Completed | Pass | api-e2e-evidence/API-REV-001/repository/guard-web-boundary.json |
| 2026-09-13T11:33:39.244186+00:00 | SETUP | Started | guard-localization-boundary | api-e2e-evidence/API-REV-001/repository/guard-localization-boundary.log |
| 2026-09-13T11:33:39.810483+00:00 | SETUP | Completed | Pass | api-e2e-evidence/API-REV-001/repository/guard-localization-boundary.json |
| 2026-09-13T11:33:39.810757+00:00 | SETUP | Started | server-build | api-e2e-evidence/API-REV-001/repository/server-build.log |
| 2026-09-13T11:34:10.145098+00:00 | SETUP | Completed | Pass | api-e2e-evidence/API-REV-001/repository/server-build.json |
| 2026-09-13T11:35:54.853Z | SETUP | Completed | One shared Agent definition, flat Team, full Org created in owned data only | api-e2e-evidence/API-REV-001/live/seed-result.json |
| 2026-09-13T11:36:22.732Z | SETUP | Completed | Owned backend and real frontend ready; no Run/Send yet | api-e2e-evidence/API-REV-001/live/bootstrap.json |
| 2026-09-13T11:38:57.479Z | SCN-001 | Started | Normal Team config→Run→no-message inspection | api-e2e-evidence/API-REV-001/live/team-launch-intent.json |
| 2026-09-13T11:38:58.746Z | SCN-001 | Completed | {"rootActive":true,"threeUnusedOffline":false,"allCentersOffline":true,"unboundBeforeAndAfterInspection":true,"noUserWork":true,"oneLaunch":true} | api-e2e-evidence/API-REV-001/live/team-unused-result.json |
| 2026-09-13T11:38:58.761Z | SCN-001 | Checkpoint | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:    assert(Object.values(checks).every(Boolean))  | api-e2e-evidence/API-REV-001/live/team-launch-interruption.json |
| 2026-09-13T11:43:31.873Z | SCN-001 | Partial evidence | Genuine unused/unbound workers and gray dots/Offline center; accessible tree labels still initializing on same original root. Investigating bounded presentation mismatch; no replay. | api-e2e-evidence/API-REV-001/live/team-unused-steady.json |
| 2026-09-13T11:43:46.626Z | SCN-001 | Pass | Same original root settles to all three offline accessible labels/gray dots; centers Offline and bindings null. Initial immediate assertion premature, not eager startup. Previous hardcoded checkpoint description corrected; no replay. | api-e2e-evidence/API-REV-001/live/team-unused-disposition.json |
| 2026-09-13T11:44:09.442Z | SCN-002 | Started | One actual Team coordinator Send; exact /lead communication; reviewer must remain unused | api-e2e-evidence/API-REV-001/live/team-first-work-intent.json |
| 2026-09-13T11:44:10.674Z | SCN-002 | Checkpoint | Team work response observed; inspect exact traces/tool receipt and unused reviewer | api-e2e-evidence/API-REV-001/live/team-first-work-result.json |
| 2026-09-13T11:45:03.640Z | SCN-002 | Checkpoint | Actual Team assistant responses in both exact members; prior UI helper stopped too early on echoed prompt, not completed acceptance | api-e2e-evidence/API-REV-001/live/team-first-work-complete.json |
| 2026-09-13T11:47:19.777Z | SCN-007 | Started | Normal full-scope Org Run, no Send | api-e2e-evidence/API-REV-001/live/org-launch-intent.json |
| 2026-09-13T11:47:20.200Z | SCN-007 | Checkpoint | Full Org launched; inspect initial focus, five configured members and bindings | api-e2e-evidence/API-REV-001/live/org-initial.json |
| 2026-09-13T11:48:09.638Z | SCN-007 | Pass | {"initiallyUnfocused":true,"allFiveOffline":true,"allUnboundAfterInspection":true,"noRawWork":true,"oneLaunch":true,"noSend":true} | api-e2e-evidence/API-REV-001/live/org-unused-result.json |
| 2026-09-13T11:48:53.105Z | SCN-002 | Started | One actual Org director Send; two exact recipients/direct+Team coordinator ingress | api-e2e-evidence/API-REV-001/live/org-first-work-intent.json |
| 2026-09-13T11:49:21.473Z | SCN-002 | Pass | {"threeRequiredBindings":true,"unusedPeersUnbound":true,"twoExactDeliveries":true,"oneUserSend":true}; Team first-work receipt separately proves coordinator→lead and unused reviewer | api-e2e-evidence/API-REV-001/live/org-first-work-result.json |
| 2026-09-13T11:51:00.499Z | SCN-003 | Setup | One actual mounted lead Send delegates one fresh Team task; not duplicate ordinary input | api-e2e-evidence/API-REV-001/live/task-create-intent.json |
| 2026-09-13T11:51:21.713Z | SCN-003 | Setup complete | Task legitimately active with actual initial work; no configured peer eager start inferred | api-e2e-evidence/API-REV-001/live/task-created.json |
| 2026-09-13T11:52:34.563Z | SCN-003 | Fail | {"actualTargetRunningThenIdle":true,"oneSend":true,"selectedFinalExact":false,"draftRetained":true,"correctConversation":true,"noUnrequestedRoute":false,"noObserverDrop":true} | api-e2e-evidence/API-REV-001/live/publication-desktop-result.json |
| 2026-09-13T11:52:34.691Z | SCN-003 | Checkpoint | AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:    assert(Object.values(checks).every(Boolean))  | api-e2e-evidence/API-REV-001/live/publication-desktop-interruption.json |
| 2026-09-13T11:53:15.549950+00:00 | SCN-003 | Pass — corrected observed ordering | First desktop pulse preserves exact context ID/configured address and draft. Incorrect agentRunId-query oracle caused initial nonzero; original result retained, no replay. | api-e2e-evidence/API-REV-001/live/publication-desktop-disposition.json |
| 2026-09-13T11:54:31.246Z | SCN-003 | Pass — observed ordering | {"actualTargetRunningThenIdle":true,"oneSend":true,"selectedFinalExact":true,"draftRetained":true,"correctConversation":true,"noUnrequestedRoute":true,"noObserverDrop":true} | api-e2e-evidence/API-REV-001/live/publication-narrow-result.json |
| 2026-09-13T11:55:05.084Z | SCN-004 | Pass — observed ordering | {"actualTargetRunningThenIdle":true,"oneSend":true,"selectedFinalExact":true,"draftRetained":true,"correctConversation":true,"noUnrequestedRoute":true,"noObserverDrop":true} | api-e2e-evidence/API-REV-001/live/publication-leave-result.json |
| 2026-09-13T11:55:21.496Z | SCN-005 | Setup complete | Actual catalog/config Run creates selected offline native draft, no worker preparation yet | api-e2e-evidence/API-REV-001/live/native-draft.json |
| 2026-09-13T11:55:32.410Z | SCN-005 | Started | One normal first native Send after chooser upload; actual Prepare response | api-e2e-evidence/API-REV-001/live/native-prepare.json |
| 2026-09-13T11:55:35.776Z | SCN-005 | Pass | {"nativeRuntime":true,"onePrepare":true,"oneSend":true,"oneAcceptedInput":true,"realReply":true,"actualClickedFinalURL":true,"status200":true,"originalBytes":true,"storedOriginalBytes":true} | api-e2e-evidence/API-REV-001/live/native-first-result.json |
| 2026-09-13T11:58:10.066Z | SCN-006 | Pass | {"sameSingleInput":true,"allClickedFinal200":true,"allOriginalBytes":true}; normal narrow live click and desktop reload/reopen, no resend | api-e2e-evidence/API-REV-001/live/native-reopen-result.json |
| 2026-09-13T12:00:21.703Z | PRESERVE | Checkpoint | Normal Team Stop succeeds; same root/member conversation retained | api-e2e-evidence/API-REV-001/live/team-stop-result.json |
| 2026-09-13T12:03:26.050Z | PRESERVE | Pass | {"sameRoot":true,"sameMemberIds":true,"previousBindingsPreserved":true,"oldAcceptedInputsPreserved":true,"oneAdditionalInput":true,"actualReply":true} | api-e2e-evidence/API-REV-001/live/team-restore-result.json |
| 2026-09-13T12:04:20.334Z | CLEANUP | Checkpoint | Normal GUI Stop succeeded for owned Org and native Agent; Team already inactive after successful Restore control. Task history retained. | api-e2e-evidence/API-REV-001/live/final-ui-stops.json |

## Final reconciliation — 2026-09-13T12:19:19.802901+00:00
Cleanup receipts completed12:04–12:06; final ledger closure follows user interruption and reporting. No tests repeated. Original nonzero attempts are retained with corrected final dispositions, not overwritten. No planned case remains running, interrupted or unstarted.

| Case | AC / boundary | Mode | Final result | Evidence (relative to /home/autobyteus/workspace/.codex/worktrees/collaboration-follow-up-fixes/tickets/in-progress/collaboration-follow-up-fixes/api-e2e-evidence/API-REV-001) | Reconciliation |
|---|---|---|---|---|---|
| REPO-SERVER | AC-001,002,006,008 | Durable / actual configured-scope composition and controlled runtime negatives | Pass | repository/server-readiness.json; repository/server-preservation.json | 11 disjoint files / 56 tests; exact readiness, origin authorization, binding, task and Stop controls. |
| REPO-WEB | AC-003–007 | Durable / actual Apollo-Pinia-selection and mounted chip, controlled transport | Pass | repository/web-regressions.json; repository/web-preservation.json | 19 disjoint files / 167 tests; delayed explicit selection, lower-owner recovery, publication and canonical first-message controls. |
| SCN-001 | AC-001,007 | Browser + live Codex Team / no-message inspection | Pass | live/team-unused-steady.json; live/team-unused-disposition.json | Normal Run; three unused members gray/Offline and unbound; no accepted work. Initial immediate aria initializing settles on same root. |
| SCN-007 | AC-008,007 | Browser + live full Org / no-message inspection | Pass | live/org-unused-result.json | Initially unfocused complete direct/mounted scope, five unused Agents Offline/unbound, inspection does not start them. |
| SCN-002 | AC-002,006,007 | Browser + real provider inter-Agent/Team ingress | Pass | live/team-first-work-complete.json; live/org-first-work-result.json | One human input per root; actual replies/deliveries to exact required members; unrelated reviewer / mounted peers still unbound. |
| SCN-003 | AC-003,007 | Browser + normal real task/member publication / read-only writer tracing | Pass | final/navigation-reconciliation.json; live/publication-desktop-disposition.json; live/publication-narrow-result.json | Two distinct publication-only pulses preserve exact Org/member/conversation/draft; real task statuses/replies update; no selection intent or router write. Current functional Pass, historical cause remains UNASSIGNED. |
| SCN-004 | AC-004,007 | Browser / explicit same-Org receiver leave and mounted-member return during real work | Pass | live/publication-leave-result.json; final/navigation-reconciliation.json | Exactly two deliberate intents/router pushes; selected identities follow choices, late publications do not redirect. No cross-root disposed-draft claim. |
| SCN-005 | AC-005,007 | Browser + native AutoByteus / DeepSeek V4 Flash + real file HTTP | Pass | live/native-first-result.json | Actual chooser upload, first Send, real reply, immediate actual sent-chip Open returns final200 with original bytes; one accepted input. |
| SCN-006 | AC-006,007 | Browser / live390 Open then normal reload/history reselect and Open | Pass | live/native-reopen-result.json | Same single accepted input, exact final locator and original bytes; no resend; existing separate-link behavior. |
| PRESERVE | AC-006; REQ-006 | Browser / actual Stop-retained-Restore plus repository negatives | Pass | live/team-stop-result.json; live/team-restore-response.json; live/team-restore-result.json; live/final-ui-stops.json | Same root/member identities, prior bindings/input retained; one new input and actual restored reply. Existing Restore preparation preserved; final owned root Stops succeed, task interruption/history truthful. |
| CLEANUP | QR-002 | Owned process, vault, filesystem and upstream integrity | Pass | final/cleanup-integrity.json; final/process-cleanup.json; final/credential-cleanup.json; final/completion-integrity.json | Only owned resources removed after sanitized archive; protected source/upstream unchanged, no staged/unmerged edits. |

| 2026-09-13T12:19:19.802901+00:00 | CLEANUP / API-REV-001 | Pass / complete | All11 planned groups reconciled; final95.0%, no API durable changes; user declines redundant open_tab rerun | api-e2e-evidence/API-REV-001/final/completion-integrity.json; api-e2e-execution-coverage-report.md |
