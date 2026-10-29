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
