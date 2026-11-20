# Implementation Handoff — autobyteus-526 round 2 (`follow-ups-448-final`)

- Revision `IR-001` (2026-11-20), against design `SR-001` (`task_size: Small`, `architectural_risk: Low`, classification kept)
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-448-final`, branch `codex/follow-ups-448-final`, base `origin/personal` @ `8f2d209b2c`
- Commits: `c443fa09c1` (FU-008 Org probe), `7caf3f866c` (FU-008 BG-BROWSER-004), `04ba12409c` (FU-007), plus this ticket-folder commit
- Outcome: **REQ-001 and REQ-002 done. REQ-003 (FU-001) fails, 18 of 20 runs.** The design's escalation trigger ("FU-001 failing again: report back as a Design Impact") applies, so this goes to the Solution Designer as a **Design Impact**. No watcher code or test was changed.

## REQ-002 / AC-002 — FU-008 probes (done)

Both probes failed on the base, for test-setup reasons only. No product code changed.

| Probe | Base failure | Setup fix | Result |
| --- | --- | --- | --- |
| `test:e2e:agent-org-draft-retention` | The fixture Org view had no `agent_input_states`, so the page crashed ("not iterable"). After that was fixed: the upload never posted because `GET /rest/context-files/size-limits` returned 404, and console errors came from unanswered GraphQL operations (`GetAgentOrgMemberRunProjection`, `GetAgentOrgMemberFileChanges`, `ListWorkspaceRunHistory`, `ListCollaborationRootHistory`) and from refused WebSockets | Fixture: `agent_input_states: []`, `recoverableBlock: null`. Fake backend: answers those operations and the size limits, and accepts sockets quietly (`ws` `noServer`, terminated at cleanup) | 5/5 scenarios pass, no console errors |
| `test:e2e:background-contention` | BG-BROWSER-004: the transient `/ReviewTeam` disclosure never appeared. The probe expected delegated rows inside the Team's own `executionRows`. That is the pre-461 model; delegated runs are now server-built `runTree` rows, and statuses come from `/ws/run-status` | The probe stubs GraphQL `runTree` (a rich tree that validates against `runTreeDtoSchema`) and answers `/ws/run-status` `SUBSCRIBE` with `RUN_STATUS_SNAPSHOT` (checked with `parseRunStatusServerMessage`). BG-BROWSER-004 reads the DOM rows in order (`stable_member:/worker`, `task_agent:/fact_checker`, `task_team:/ReviewTeam`, `task_team_child:/ReviewTeam/reviewer`, `stable_member:/reviewer`), checks that delegated rows show running and that a click focuses the run, and keeps the detail-only update check. Size limits are routed, and paste uploads are held open. The unused `inspectHierarchy` was removed from the fixture | BG-BROWSER-000..004, all 12 checks pass, no console errors; screenshots reviewed |

Not a product fault: the app behaves as autobyteus-461 designed; the probes had kept the old model.

Evidence `evidence/fu-008/`:
- `r2-org-base*.txt`, `r2-org-cold.txt`, `r2-org-fix1..3.txt`, and `org/` (evidence.json and screenshots);
- `r2-bg-base.txt`, `r2-bg-fix1..2.txt`, and `bg/`.

The first Org run on the fresh worktree hit a cold Vite optimize (`504 Outdated Optimize Dep`). A rerun with the Vite cache deleted passed (`r2-org-cold.txt`), so it was a one-off cold start. Nothing was changed for it.

## REQ-001 / AC-001 — FU-007 (done)

- Removed:
  - `components/workspace/running/RunningTeamGroup.vue`, `RunningTeamRow.vue` and their two specs;
  - the 8 `RunningTeam(Group|Row).*` keys in `localization/messages/{en,zh-CN}/workspace.generated.ts`. No generator owns those files, so they were edited by hand.
- Kept: `TeamMemberRow.vue` and the `TeamMemberRow.coord` key.
- **Deviation 1, a wider removal:** `components/workspace/common/TeamActivityDot.vue` and its spec were also removed. Only the two removed components used them, so they became dead code with this change (DESIGN.md rule 7). Three vacuous `team-activity-dot` checks went with them: in `WorkspaceHistoryWorkspaceSection.spec.ts`, `team-status-live-probe.mjs` and the team-activity probe.
- Team-activity fixture and probe:
  - the fixture lost its running surface and the `runningRun(s)` code; the probe lost its running-surface steps, its zh-CN running labels and the `assertDot` helper;
  - the `WorkspaceHistoryWorkspaceSection` cases stay.
- **Deviation 2, a fixture repair needed for AC-001:**
  - On the base, the probe also failed in the kept history cases (`r2-ta-base.txt`): the history dots read offline, because row status now comes from the run-status feed (461).
  - The fixture now applies `RUN_STATUS_SNAPSHOT` to `useRunStatusStore` from its member-status and active controls: the live run follows the member status, and the stopped run is offline.
  - The probe routes `/ws/run-status` quietly.
  - SR006-BR-001..004 pass (`r2-ta-fix1.txt`, `ta/`).
- `docs/agent_execution_architecture.md`: removed the "unmounted running surface … scheduled for removal" paragraph.
- `typecheck-baseline.json`: the web total went from 87 in 37 files to 86 in 36. The shrink came from the Org fixture fix: that fixture now has 0 errors, so `typecheck:update-baseline` dropped its entry.
- Checks, logs in `evidence/fu-007/`:

  | Check | Result | Log |
  | --- | --- | --- |
  | Web typecheck | passes against the baseline | `r2-tcw*.txt`, `r2-vuetsc.txt` |
  | `guard:web-boundary` | passes | `r2-guard-web-boundary.txt` |
  | `guard:localization-boundary` | passes | `r2-guard-localization-boundary.txt` |
  | `audit:localization-literals` | passes | `r2-audit-localization-literals.txt` |
  | Targeted specs (workspace components, localization, utils) | 837 pass | `r2-web-sub.txt` |
  | Full web unit suite (see below) | 5875 pass, 3 fail, 2 skipped (781 files) | `r2-web-full.txt` |
  | The 3 failing files rerun alone | 2 pass, 1 fails every time | `r2-web-3.txt` |
  | Reference search | clean | — |

  The reference search turned up only historical ticket documents and evidence logs, plus the unrelated function name `caseRunningTeamRow`.

- The full web unit suite had 3 failing files:
  - `ProjectTaskBoard.spec.ts` and `CollaborationMessagesOrgRoot.integration.spec.ts` failed only under load (one was a 5 s timeout). Both pass when rerun alone.
  - `ServerSettingsBasicsPanel.spec.ts` ("composes only current endpoint and focused Basics cards") fails every time. It is **already on the base and outside this ticket**:
    - the base's auto-update cards say "Downloads new revisions from GitHub" (`updateNotifications.ts`, `25609abdf7`);
    - autobyteus-337's assertion says the Basics panel never mentions "GitHub";
    - this diff changes no settings file and no string containing "GitHub".
  - Follow-up candidate for the Solution Designer: decide which side changes, the assertion or the card text.

## REQ-003 / AC-003 — FU-001 (fails: Design Impact)

- Command, run 20 times in a row in `autobyteus-server-ts`: `pnpm exec vitest run tests/unit/agent-package-definitions/agent-package-folder-watcher.test.ts`
- **Result: 2 of 20 runs pass (runs 5 and 19); 18 fail.** Each failing run has 1 to 4 of the 22 tests failing. Load average was 46 to 161.
- Failure counts:

  | Failures | Test |
  | --- | --- |
  | 14 | moves a root to FOLDER_MISSING when it is renamed away and resumes watching when it returns |
  | 9 | re-arms a root whose folder was replaced in place (GitHub update rename swap) |
  | 7 | reports definition changes per folder and ignores skills and other files |
  | 5 | starts a registered root that is missing as FOLDER_MISSING and arms it when it appears |
  | 1–2 each | the catch-up and repair request cases, and "asks for nothing after close()" |

- Error counts:
  - 34 "Timed out waiting for the monitor": the test's `waitFor` hit `OS_FILE_EVENT_WAIT_MS`, which is 30 s (`tests/helpers/os-latency-under-load.ts`, raised by autobyteus-517 `b55ce60b5e`);
  - 5 "Test timed out in 5000ms";
  - 1 "Test timed out in 45000ms".
- Machine state during the runs:
  - `fseventsd` was at about 155% CPU;
  - a Virtualization.framework VM was at about 374% CPU.
  - A plain `fs.watch` latency probe (`fswatch-latency.mjs`) measured these delays: `[>20000, 3006, 3214, >20000, >20000, 2057, >20000, 3964]` ms at load 91, then `[>20000, >20000, 8060, 7762, 21611, 4164, 9853, 15859]` ms at load 127.
  - The OS often delivers file events later than the test's 30 s budget. This matches API-01's fseventsd finding.
- Reading: the failures look environmental (OS event latency), not like a watcher regression. All the failures are waits for OS events, and the 2 passing runs pass every test. Even so, the requirement (20/20) is not met, and the design names this case as a Design Impact. I made no code change: AC-003 allows none, and raising the waits again or changing the test's approach is a design decision.
- Evidence `evidence/fu-001/`: `r2-fw-1..20.txt`, `r2-fw-summary.txt`, `fswatch-latency.mjs`, `fswatch-latency-probe.txt`.

## Not done / open

- AC-003 is not met; the Solution Designer decides. Possible routes:
  - rerun on a quiet machine;
  - accept FU-001 as environment-bound and record it;
  - redesign the test so it does not depend on real fseventsd latency.
- The round's cleanup and record copy wait for the route to complete.
- `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are untracked leftovers from a build. They are not part of this change and were not staged.
