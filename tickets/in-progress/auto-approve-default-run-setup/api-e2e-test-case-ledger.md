# API/E2E Test-Case Ledger

Round 1; initialized before execution.

| Case | Expected | Result | Evidence |
|---|---|---|---|
| R01 | 8 focused suites pass | Pass | api-e2e-focused.log; 8 files / 83 tests, exit 0 |
| R02 | Preservation/Chat/first-send suites pass | Pass | api-e2e-preservation.log; 6 files / 93 tests, exit 0 |
| B01 | Library Agent checked and PrepareAgentRun true | Pass | browser-probe/fresh-run-auto-approval-evidence.json; real renderer/actions/request assertions |
| B02 | Agent opt-out edits and outgoing false | Pass | browser-probe/fresh-run-auto-approval-evidence.json; real renderer/actions/request assertions |
| B03 | Team checked root/inherited true | Pass | browser-probe/fresh-run-auto-approval-evidence.json; real renderer/actions/request assertions |
| B04 | Team opt-out/member false serialized | Pass | browser-probe/fresh-run-auto-approval-evidence.json; real renderer/actions/request assertions |
| B05 | Antigravity locked and invalid settings block | Pass | browser-probe/fresh-run-auto-approval-evidence.json; real renderer/actions/request assertions |
| B06 | Chat true and opt-out | Pass | browser-probe/fresh-run-auto-approval-evidence.json; real renderer/actions/request assertions |
| B07 | Saved/derived false read/preserved | Pass | browser-probe/fresh-run-auto-approval-evidence.json; real renderer/actions/request assertions |
| D01 | Isolated worktree app restart fresh true | Pass | desktop-agent/team-before/after-restart.json; actual packaged catalog journeys and two restarts, opt-out false before each |

D01 checkpoint: isolated build/start passed at HEAD; actual Agent catalog Run checked true (desktop-agent-before-restart.json); UI opt-out false (desktop-agent-opt-out.json); owned instance restart started, no final result inferred.
B01 harness checkpoint: first attempt missing bound-backend readiness (no GraphQL requests), not product behavior. Correct CORS + health fixture; rerun pending.

| R03 | Canonical saved Agent/Team false readers with real editor | Pass | saved-reader-probe/existing-run-model-config-evidence.json; existing probe passed |

B01 checkpoint Pass: real Library selection, checked=true and outgoing PrepareAgentRun.autoExecuteTools=true in browser-probe evidence; launch deliberately rejected by fixture after recording.
D01 checkpoint: actual restarted General Agent catalog Run checked=true, desktop-agent-after-restart.json. Additional Team definition created through own UI, actual Team Run checked=true (desktop-team-before-restart.json); second owned restart planned before final D01 completion.

2026-10-03T09:30:06.410Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:30:37.407Z B02: Fail; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:31:30.134Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:32:01.163Z B02: Fail; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:32:36.980Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:33:08.089Z B02: Fail; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:34:17.411Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:34:18.533Z B02: Pass; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:34:19.603Z B03: Pass; Library Team root and inherited members submit true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:34:21.885Z B04: Fail; Team opt-out ordinary edits and explicit member false; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:35:21.380Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:35:22.462Z B02: Pass; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:35:23.533Z B03: Pass; Library Team root and inherited members submit true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:35:26.243Z B04: Pass; Team opt-out ordinary edits and explicit member false; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:35:27.078Z B05: Fail; Missing workspace blocks; Antigravity stays checked/locked; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:36:06.470Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:36:07.360Z B02: Pass; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:36:08.218Z B03: Pass; Library Team root and inherited members submit true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:36:10.146Z B04: Pass; Team opt-out ordinary edits and explicit member false; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:37:40.869Z B05: Fail; Missing workspace blocks; Antigravity stays checked/locked; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

| B08 | Actual MobileRunSetup fresh true, opt-out, non-contradictory helper | Fail | browser-probe/fresh-run-auto-approval-evidence.json; AEF-001 stale mobile helper |

2026-10-03T09:38:51.482Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:38:52.502Z B02: Pass; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:38:53.359Z B03: Pass; Library Team root and inherited members submit true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:38:55.473Z B04: Pass; Team opt-out ordinary edits and explicit member false; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:38:57.203Z B05: Fail; Missing workspace blocks; Antigravity stays checked/locked; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:39:29.310Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:39:30.368Z B02: Pass; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:39:31.259Z B03: Pass; Library Team root and inherited members submit true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:39:33.287Z B04: Pass; Team opt-out ordinary edits and explicit member false; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:39:34.747Z B05: Pass; Missing workspace blocks; Antigravity stays checked/locked; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:39:38.207Z B06: Pass; Chat Agent/Team true defaults and deliberate opt-out reach launch boundaries; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:39:40.180Z B07: Pass; Existing draft false copied through RunningAgentsPanel; fresh session resets only fresh defaults; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

2026-10-03T09:39:41.469Z B08: Fail; Dedicated mobile Agent/Team setup defaults and helper agree; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe/fresh-run-auto-approval-evidence.json

Final browser attempt: B01..B07 Pass, B08 Fail AEF-001, zero page errors, exact current runtime antigravity_cli. Own browser server closed, Nuxt group exited, installed fixture removed. All earlier failures before this attempt were harness/fixture corrections except the promoted current mobile-copy contradiction.

R03 final rerun Pass after explicit saved-false assertions: 6 cases, canonical Agent/root/member false; api-e2e-saved-readers.log. Additional mobile component suite Pass 1 file / 2 tests; api-e2e-mobile-unit.log. Final independent repository total 15 files / 178 tests.

## Round 2 / API-REV-002 — planned before execution
Prior table/events are round-1 history. Current HEAD 9b023852; prior AEF-001 unresolved until B08 rerun.
| Case | Expected | Initial round-2 state | Evidence plan |
|---|---|---|---|
| R04 | Card/constructor/policy narrow 3-file suite | Not Tested | api-rev002-narrow.log |
| B08 | Actual mobile Agent/Team fresh true, accurate helper, opt-out false FIRST | Not Tested | browser-probe-api-rev002 |
| B01..B07 | Full same-ID default/request/preservation cases after B08 | Not Tested | browser-probe-api-rev002 |
| R01 | 8 focused suites | Not Tested | api-rev002-focused.log |
| R02 | 6 preservation/first-send/Chat suites | Not Tested | api-rev002-preservation.log |
| R03 | Six canonical saved-reader cases with explicit false assertions | Not Tested | saved-reader-probe-api-rev002 |
| D01 | Retained actual prior-HEAD isolated Agent/Team restart evidence; unchanged paths | Pass (carried) | desktop-agent/team-before/after-restart.json at 4bf2d449; NOT rerun at 9b023852 |

Round-2 R04 exit 0; evidence api-rev002-narrow.log

2026-10-03T10:03:25.508Z B08: Pass; Dedicated mobile Agent/Team setup defaults and helper agree; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe-api-rev002/fresh-run-auto-approval-evidence.json

2026-10-03T10:03:26.296Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe-api-rev002/fresh-run-auto-approval-evidence.json

2026-10-03T10:03:27.273Z B02: Pass; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe-api-rev002/fresh-run-auto-approval-evidence.json

2026-10-03T10:03:28.113Z B03: Pass; Library Team root and inherited members submit true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe-api-rev002/fresh-run-auto-approval-evidence.json

2026-10-03T10:03:30.096Z B04: Pass; Team opt-out ordinary edits and explicit member false; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe-api-rev002/fresh-run-auto-approval-evidence.json

2026-10-03T10:03:31.597Z B05: Pass; Missing workspace blocks; Antigravity stays checked/locked; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe-api-rev002/fresh-run-auto-approval-evidence.json

2026-10-03T10:03:34.879Z B06: Pass; Chat Agent/Team true defaults and deliberate opt-out reach launch boundaries; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe-api-rev002/fresh-run-auto-approval-evidence.json

2026-10-03T10:03:36.527Z B07: Pass; Existing draft false copied through RunningAgentsPanel; fresh session resets only fresh defaults; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/browser-probe-api-rev002/fresh-run-auto-approval-evidence.json

Round-2 R01 exit 0; evidence api-rev002-focused.log

Round-2 R02 exit 0; evidence api-rev002-preservation.log

Round-2 R01 Pass: 8 files / 83 tests. R02 Pass: 6 files / 93 tests. R04 Pass: 3 files / 30 tests.

R03 subcases planned before execution (same existing IDs):
- API-E2E-004-A: Not Tested; expect existing saved-reader/model-editor scenario Pass; raw evidence saved-reader-probe-api-rev002.
- API-E2E-004-B: Not Tested; expect existing saved-reader/model-editor scenario Pass; raw evidence saved-reader-probe-api-rev002.
- API-E2E-004-C: Not Tested; expect existing saved-reader/model-editor scenario Pass; raw evidence saved-reader-probe-api-rev002.
- API-E2E-004-D: Not Tested; expect existing saved-reader/model-editor scenario Pass; raw evidence saved-reader-probe-api-rev002.
- API-E2E-004-E: Not Tested; expect existing saved-reader/model-editor scenario Pass; raw evidence saved-reader-probe-api-rev002.
- API-E2E-004-F: Not Tested; expect existing saved-reader/model-editor scenario Pass; raw evidence saved-reader-probe-api-rev002.

2026-10-03T10:05:50.781Z API-E2E-004-A: Pass; Agent Settings loads network-fresh, locks runtime identity, and saves a same-model selection; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/saved-reader-probe-api-rev002/existing-run-model-config-evidence.json

2026-10-03T10:05:51.348Z API-E2E-004-B: Pass; Flat Team Settings renders root plus direct Agents and saves one exact configured-Agent patch; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/saved-reader-probe-api-rev002/existing-run-model-config-evidence.json

2026-10-03T10:05:51.430Z API-E2E-004-C: Pass; Narrow browser viewport keeps the existing Team Settings editor usable without page overflow; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/saved-reader-probe-api-rev002/existing-run-model-config-evidence.json

2026-10-03T10:05:51.893Z API-E2E-004-D: Pass; A supported external activation makes an already-open Agent Save return RUN_ACTIVE and relock; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/saved-reader-probe-api-rev002/existing-run-model-config-evidence.json

2026-10-03T10:05:52.894Z API-E2E-004-E: Pass; Compatible Agent replacement uses keyboard selection, target defaults and the complete canonical pair; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/saved-reader-probe-api-rev002/existing-run-model-config-evidence.json

2026-10-03T10:05:53.553Z API-E2E-004-F: Pass; Flat Team replacement preserves divergent and directly edited Agents and verifies one all-scope save with Retry; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/saved-reader-probe-api-rev002/existing-run-model-config-evidence.json

Round-2 R03 exit 0; evidence api-rev002-saved-readers.log

## Round-2 Final Reconciliation — authoritative current results
All planned cases complete; none interrupted/running/blocked/unstarted. R03 subcases are individually appended above. Raw evidence retains exact details and cleanup. Prior round-1 Fail remains history.
| Case | Result | Evidence / follow-up |
|---|---|---|
| R04 | Pass | api-rev002-narrow.log, 3 files / 30 |
| R01 | Pass | api-rev002-focused.log, 8 files / 83 |
| R02 | Pass | api-rev002-preservation.log, 6 files / 93 |
| R03 / API-E2E-004-A..F | Pass (six) | saved-reader-probe-api-rev002/existing-run-model-config-evidence.json |
| B08 | Pass | browser-probe-api-rev002/fresh-run-auto-approval-evidence.json; Dedicated mobile Agent/Team setup defaults and helper agree |
| B01 | Pass | browser-probe-api-rev002/fresh-run-auto-approval-evidence.json; Library Agent fresh true and first-send true |
| B02 | Pass | browser-probe-api-rev002/fresh-run-auto-approval-evidence.json; Narrow Agent opt-out survives model/workspace/permitted runtime edits |
| B03 | Pass | browser-probe-api-rev002/fresh-run-auto-approval-evidence.json; Library Team root and inherited members submit true |
| B04 | Pass | browser-probe-api-rev002/fresh-run-auto-approval-evidence.json; Team opt-out ordinary edits and explicit member false |
| B05 | Pass | browser-probe-api-rev002/fresh-run-auto-approval-evidence.json; Missing workspace blocks; Antigravity stays checked/locked |
| B06 | Pass | browser-probe-api-rev002/fresh-run-auto-approval-evidence.json; Chat Agent/Team true defaults and deliberate opt-out reach launch boundaries |
| B07 | Pass | browser-probe-api-rev002/fresh-run-auto-approval-evidence.json; Existing draft false copied through RunningAgentsPanel; fresh session resets only fresh defaults |
| D01 | Pass (carried, NOT rerun) | Actual prior-HEAD 4bf2d449 packaged Agent/Team setup and two restarts; desktop-*.json. Current repair affects mobile prose only. |
API-REV-002 Pass / 95.71%; AEF-001 / CRF-001 executable-resolved B08. Distinct repository total 15 files / 180 tests; 206 executions with 26 duplicated narrow tests. Required broader browser execution complete; prior desktop direct evidence retained with exact HEAD limit. Separate durable-test review required.
