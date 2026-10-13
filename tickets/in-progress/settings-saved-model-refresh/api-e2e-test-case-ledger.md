# API/E2E Test-Case Ledger
Round 1 — canonical continuity ledger. Entries appended immediately; final report authoritative.

| ID | Planned proof | Initial status |
|---|---|---|
| REP-001 | Narrow mounted saved snapshot and stores | Not Tested |
| REP-002 | Broader affected web tests | Not Tested |
| API-001 | Scripted real HTTP/WS/MCP continuity/restrictions | Not Tested |
| SSR-001 | Stopped parent Agent/collaborator same-view/repeat/cancel/reopen | Not Tested |
| SSR-002 | Stopped Team follower/own choice/default/instance isolation | Not Tested |
| SSR-003 | Rejected/write failure/committed read failure/retry | Not Tested |
| DCP-001 | Active parent lock/edit/resume | Not Tested |
| DCP-002 | Team default copy save/resume | Not Tested |
| DCP-003 | Org copy save/resume | Not Tested |
| DCP-004 | Wake-during-edit refusal, backend restart | Not Tested |
| DCP-005 | Team member own choice/continuity | Not Tested |
\n- REP-001 completed exit 0: evidence/api-narrow.log
\n- REP-002 completed exit 0: evidence/api-web-regression.log
\n- API-001 completed exit 0: evidence/api-server-e2e.log (fixture sets private HOME before runtime)

- 2026-10-13T15:46:38.205Z DCP-001 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:47:00.946Z DCP-001 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:47:00.947Z DCP-002 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:48:16.787Z DCP-002 Fail: Timed out waiting for sidebar Team copy row has the stop icon; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:48:16.789Z DCP-003 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:48:38.340Z DCP-003 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:48:38.341Z DCP-004 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:50:59.977Z DCP-004 Fail: locator.waitFor: Timeout 120000ms exceeded.
Call log:
[2m  - waiting for locator('[data-testid="agent-workspace-surface"]') to be visible[22m
; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:50:59.978Z DCP-005 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:52:13.219Z DCP-005 Fail: Timed out waiting for sidebar row lead_2d74_2d6043e7d44d46ffb7eaddfc5d06a702; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:52:13.219Z SSR-001 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:52:34.334Z SSR-001 Fail: Collaborator Save not canonical; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:52:34.335Z SSR-002 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:52:53.789Z SSR-002 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:52:53.795Z SSR-003 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- 2026-10-13T15:53:40.440Z SSR-003 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-01

- Attempt desktop-01 completed: 4 Pass / 4 harness failures. SSR-002 and SSR-003 passed direct desktop/readback; SSR-001 collaborator selector shape corrected; DCP-002/005 collapsed Team-root helper corrected; DCP-004 restart needs desktop reload (hash goto is not HTTP reload). See investigation and preserved failure screenshots. Owned instance removed, control/backend ports released and test node root deleted. Rerun all cases with same built asar; no product-source changes.

- 2026-10-13T15:54:24.881Z SSR-001 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:54:49.913Z SSR-001 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:54:49.916Z SSR-002 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:55:09.391Z SSR-002 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:55:09.393Z SSR-003 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- SSR-004 planned (Not Tested): real Grok schema same-model thinking-only Save, repeat and reopen on stopped parent. Added after catalog investigation; existing SSR-002 own-default member fixture reused.

- 2026-10-13T15:55:55.993Z SSR-003 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:55:55.996Z DCP-001 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:56:17.945Z DCP-001 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:56:17.947Z DCP-002 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:56:52.577Z DCP-002 Fail: message to the stopped copy not accepted; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:56:52.579Z DCP-003 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:57:14.123Z DCP-003 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:57:14.126Z DCP-004 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:57:43.703Z DCP-004 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:57:43.704Z DCP-005 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:58:11.718Z DCP-005 Fail: the other rows should be unchanged; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-02

- 2026-10-13T15:59:28.465Z DCP-002 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-03

- 2026-10-13T16:00:03.971Z DCP-002 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-03

- 2026-10-13T16:00:03.972Z DCP-005 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-03

- 2026-10-13T16:00:37.910Z DCP-005 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-03

- 2026-10-13T16:00:37.911Z SSR-004 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-03

- 2026-10-13T16:01:23.240Z SSR-004 Fail: locator.click: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('[data-test="chat-thinking-option-primary-low"]')[22m
; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-03

- 2026-10-13T16:02:30.892Z DCP-005 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-04

- 2026-10-13T16:03:04.989Z DCP-005 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-04

- 2026-10-13T16:03:04.990Z SSR-004 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-04

- 2026-10-13T16:03:25.459Z SSR-004 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-04

- 2026-10-13T16:04:36.963Z SSR-001 Started (browser); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:05:02.150Z SSR-001 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:05:02.152Z SSR-002 Started (browser); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:05:21.867Z SSR-002 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:05:21.869Z SSR-003 Started (browser); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:06:09.260Z SSR-003 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:06:09.262Z SSR-004 Started (browser); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:06:30.211Z SSR-004 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:06:30.213Z DCP-002 Started (browser); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:07:08.676Z DCP-002 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:07:08.679Z DCP-005 Started (browser); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:07:45.776Z DCP-005 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/browser-01

- 2026-10-13T16:08:24.601Z SSR-001 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:08:49.814Z SSR-001 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:08:49.815Z SSR-002 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:09:09.069Z SSR-002 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:09:09.072Z SSR-003 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:09:55.647Z SSR-003 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:09:55.650Z SSR-004 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:10:16.267Z SSR-004 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:10:16.270Z DCP-001 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:10:38.083Z DCP-001 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:10:38.085Z DCP-002 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:11:13.832Z DCP-002 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:11:13.838Z DCP-003 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:11:35.549Z DCP-003 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:11:35.555Z DCP-004 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:12:05.180Z DCP-004 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:12:05.182Z DCP-005 Started (desktop); /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

- 2026-10-13T16:12:39.369Z DCP-005 Pass: assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/desktop-final

## Reconciled final state — API-REV-001
- REP-001 Pass 46 tests; REP-002 Pass 170 tests; API-001 Pass 6 grouped tests (DCM-001..008).
- SSR-001..004 and DCP-001..005: **Pass** in final consolidated desktop (9/9); evidence/desktop-final*.
- Browser SSR-001..004 and DCP-002/005: **Pass** (6/6); evidence/browser-01*.
- Earlier harness failures retained/resolved in investigation/report; no open case or incomplete product proof.
- Cleanup audit **Pass**, evidence/api-cleanup-and-identity.json; no owned instance/root/port remains. Final report supersedes initial planning statuses, not historical events.


## API-REV-002 plan — integrated source revalidation
Candidate 4dd213be08; prior API-REV-001 preserved. Expected all Pass; no result inferred yet.
- REP-001: narrow Settings/store + incoming Stop.
- REP-002: affected 26-file web suite, syntax/runner check.
- API-001: fresh server build + six real HTTP/WS/MCP tests (DCM-001..008).
- Desktop SSR-001..004 and DCP-001..005, explicit nine-case order, fresh build.
- Browser SSR-001..004 and DCP-001/002, real node/HTTP path.
- AUDIT-002: ledger one Started/Completed, evidence identity and exact owned cleanup.

- REP-001 Completed Pass 57/57; evidence/api-rev-002/narrow.log
- REP-002 Started affected web and merged-runner checks

- REP-002 Completed Pass syntax 3 modules, runner 5 synthetic variants, web 26 files/181 tests; evidence/api-rev-002/
- API-001 Started fresh server build then scripted real API suite

- API-001 Completed Pass fresh server build, 6 tests grouping DCM-001..008; evidence/api-rev-002/server-e2e.log

- 2026-10-13T16:41:30.500Z SSR-001 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:41:55.373Z SSR-001 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

- 2026-10-13T16:41:55.373Z SSR-002 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:42:14.654Z SSR-002 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

- 2026-10-13T16:42:14.654Z SSR-003 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:43:01.783Z SSR-003 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

- 2026-10-13T16:43:01.783Z SSR-004 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:43:22.192Z SSR-004 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

- 2026-10-13T16:43:22.192Z DCP-001 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:43:47.548Z DCP-001 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

- 2026-10-13T16:43:47.548Z DCP-002 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:44:32.387Z DCP-002 Completed Fail; locator.evaluate: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for locator('[data-test="workspace-team-transient-execution-row"]').filter({ hasText: 'pair team 8b11' }).first().locator('[data-test="workspace-delegated-stop"]')[22m
; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

- 2026-10-13T16:44:32.387Z DCP-003 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:44:53.978Z DCP-003 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

- 2026-10-13T16:44:53.979Z DCP-004 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:45:24.852Z DCP-004 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

- 2026-10-13T16:45:24.853Z DCP-005 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop

- 2026-10-13T16:45:59.193Z DCP-005 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop/delegated-launch-defaults-evidence.json

### API-REV-002 desktop final rerun after exact-root selector repair e00d34ffdd
Reuse newly built 4dd213be application bytes only (asar 15ff98c7...), not API-REV-001 package. Same nine case order; all unresolved until reexecuted.

- 2026-10-13T16:46:58.784Z SSR-001 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:47:23.780Z SSR-001 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:47:23.780Z SSR-002 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:47:43.255Z SSR-002 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:47:43.255Z SSR-003 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:48:29.937Z SSR-003 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:48:29.938Z SSR-004 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:48:50.549Z SSR-004 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:48:50.550Z DCP-001 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:49:16.224Z DCP-001 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:49:16.224Z DCP-002 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:50:01.769Z DCP-002 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:50:01.769Z DCP-003 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:50:23.287Z DCP-003 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:50:23.287Z DCP-004 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:50:53.172Z DCP-004 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:50:53.173Z DCP-005 Started desktop; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final

- 2026-10-13T16:51:27.600Z DCP-005 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/desktop-final/delegated-launch-defaults-evidence.json

- 2026-10-13T16:52:36.805Z SSR-001 Started browser; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser

- 2026-10-13T16:53:02.217Z SSR-001 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser/delegated-launch-defaults-evidence.json

- 2026-10-13T16:53:02.217Z SSR-002 Started browser; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser

- 2026-10-13T16:53:21.969Z SSR-002 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser/delegated-launch-defaults-evidence.json

- 2026-10-13T16:53:21.969Z SSR-003 Started browser; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser

- 2026-10-13T16:54:09.079Z SSR-003 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser/delegated-launch-defaults-evidence.json

- 2026-10-13T16:54:09.079Z SSR-004 Started browser; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser

- 2026-10-13T16:54:29.984Z SSR-004 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser/delegated-launch-defaults-evidence.json

- 2026-10-13T16:54:29.984Z DCP-001 Started browser; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser

- 2026-10-13T16:54:56.093Z DCP-001 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser/delegated-launch-defaults-evidence.json

- 2026-10-13T16:54:56.093Z DCP-002 Started browser; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser

- 2026-10-13T16:55:45.875Z DCP-002 Completed Pass; assertions passed; /Users/normy/autobyteus_org/autobyteus-worktrees/settings-saved-model-refresh/tickets/in-progress/settings-saved-model-refresh/evidence/api-rev-002/browser/delegated-launch-defaults-evidence.json


## Reconciled final state — API-REV-002
- REP-001 Pass 57 tests (4 files, overlaps broader selection); REP-002 Pass 181 tests / 26 files, syntax 3 modules, synthetic actual-runner 5 variants, 20 source-preservation checks.
- API-001 Pass fresh server build + six actual API tests grouping DCM-001..008.
- Initial integrated desktop 8 Pass / DCP-002 Fail: wrong same-label row selected before Stop; preserved in evidence/api-rev-002/desktop. API-owned exact-root selector repair e00d34ffdd resolves it.
- Final desktop SSR-001..004 + DCP-001..005 **9/9 Pass**, evidence/api-rev-002/desktop-final; browser SSR-001..004 + DCP-001/002 **6/6 Pass**, evidence/api-rev-002/browser. Zero page errors. No open/interrupted/unstarted required case.
- AUDIT-002 **Pass**: exact order, one Started/Completed per case for all attempts; final 9+6 result JSONs observed persisted at completion; cleanup/identity proof in validation-audit.json. Initial supplementary observer missed the multiline failed entry; final event-block parser and audit reconcile it, no missing ledger event.
- Final result **Pass / 95%**. API-REV-001 stays pre-integration history; this is the current integrated result.
