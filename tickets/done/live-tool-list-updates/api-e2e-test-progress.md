# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-29T18:54:49Z | API-01, API-02 | Completed | Pass | Reused local checks (IR-002/IR-003) and real runs (native, Claude, AGY) |
| 2026-10-29T18:54:49Z | setup | Completed | | Codex limit checked without a model turn: ordinaryUsageAllowed true (50% used) |
| 2026-10-29T18:54:49Z | API-03 | Started | | Codex live e2e; out /tmp/ab324e2e/API-03 |
| 2026-10-29T18:56:18Z | API-03 | Completed | Pass | Codex gpt-5.6-luna: reopen at next message, beta used, codeword quoted, notices, alpha not offered; throwaway CODEX_HOME removed |
| 2026-10-29T18:56:18Z | API-04 | Started | | Grok live e2e attempt, turn timeout 120 s |
| 2026-10-29T19:00:01Z | API-04 | Blocked | Blocked (environment) | Grok turn 1 got no reply in 120 s; direct grok -p: 'reached your free Grok Build usage limit'. Note: the run view showed no error for the refused prompt (observation, outside this ticket) |
| 2026-10-29T19:00:01Z | API-05 | Started | | durable server e2e, scripted Grok reopen failure |
| 2026-10-29T19:05:46Z | API-05 | Completed | Fail | single Grok run: failed reopen is not shown to the user (stream: ack accepted, queue emptied, idle; no ERROR, no rejected ack). Not sent / no notice / run B untouched / retry: pass |
| 2026-10-29T19:05:46Z | API-06, API-07 | Not run this round | | deferred to the next round: the fix for API-05 may touch the stream and the web; the worktree goes back to implementation |
| 2026-10-29T19:38:58Z | round 2 | Started | | code 011275b49a (IR-004), head 5ee923081a; recheck API-05 first |
| 2026-10-29T19:38:58Z | API-05 | Started | | rerun on 011275b49a |
| 2026-10-29T19:39:28Z | API-05 | Completed | Pass | ERROR shown with the plain message; rest unchanged |
| 2026-10-29T19:39:28Z | API-04 | Completed | Blocked (environment) | grok -p: still at the free usage limit |
| 2026-10-29T19:41:14Z | API-07 | Started | | server-level frame capture, real Claude haiku, temporary test file (not committed) |
| 2026-10-29T19:42:14Z | API-07 | Completed | Pass | same frame sequence and one invocation id with auto-execute on and off (reason agent_tools_enabled); no approval request; one tool_call entry |
| 2026-10-29T19:43:52Z | API-06 | Started | | build server dist, then pnpm -C autobyteus-web test:e2e:tool-list-updates; out /tmp/ab324e2e/r2/API-06 |
| 2026-10-29T19:51:17Z | API-06 | Completed | Pass | TLU-001 Pass (38 s); 3 cards in order live; refusal 'Tool is not enabled for this session' (-32602); restore card; 0 browser errors. First attempt failed on the probe's label read (innerText uppercased); fixed in the probe. Reload places the 2nd card above its message (failed turn): FU-004 |
| 2026-10-29T19:53:35Z | API-04 | Completed | Not Tested (owed) | user: credits back tomorrow; real Grok run then. FU-003 closed: stream shows ERROR ACP_PROMPT_FAILED 429 |
| 2026-10-29T20:51:23Z | round 3 | Completed | Pass | IR-005 (137ce572aa, spec only) + fast-forward to origin/personal: no src change since 5ee923081a (git diff --stat 5ee923081a 1c454e1ec1 -- '*/src/*' autobyteus-ts empty); my tests unchanged since db27b28223; API-05 rerun Pass; API-04 still owed |
| 2026-10-29T20:54:34Z | API-03 | Started | | round 3 recheck on 6823d55920, user's request; limit ordinaryUsageAllowed true |
| 2026-10-29T20:55:40Z | API-03 | Completed | Pass | round 3 on 6823d55920: DONE-2 OKAPI-4865 (conversation kept), both notices, list_projects not used after removal; throwaway CODEX_HOME removed |
