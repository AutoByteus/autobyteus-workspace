# Implementation Revision Record — autobyteus-524 round 1 (`native-follow-ups-524`)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md`, round 1 | N/A | `Initial Baseline` | SR-001 | Implemented; ready for direct API/E2E validation |

## Revision Entries

### IR-001 — Measured limits for native command start and stop (FU-003)

- Triggering role, report path, and round: `/solution_designer`, `handoff-implementation.md`, round 1 (Architecture Design Complete, Small / Low)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: commit `80483cce9d` (plus the documents commit carrying this record)
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A (not selected)
- Related code-review revision IDs: N/A (not selected)
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: first implementation round
- Approved behavior or requirement IDs affected: BEH-001…BEH-004; REQ-001…REQ-005
- Implementation delta:
  - `command-deadline.ts`: named limits (start 30 s, observation 10 s, stop 30 s), graces (cancel gate 500 ms, TERM→KILL 500 ms, end marker 1 s), shutdown budget 3 s, each with what it bounds
  - `native-command-process-scope.ts`: defaults and graces from the names; a launch cancelled while starting says why (`(tool-abort)`, `(tool-timeout)`, … or `by shutdown`)
  - `process-group-observer.ts`: default observation deadline from the name; no 500 ms cap on a `ps` read or a WSL kill
  - `shell-command-executor.ts`: start deadline `min(start limit, call timeout)`; "Command did not start within N s: <reason>"; a Stop during the start ends the call as that Stop (`tool-abort`); end-marker grace from the name
  - Tests: AC-002…AC-005 unit cases and the Stop-during-start case; the cleanup hooks of `terminal-tools`, `run-bash-wrapper`, `background-process-manager` and `tool-approval-flow` get the stop limit as their timeout
- Changed files or areas: `git show --stat 80483cce9d`
- Local validation and result: `implementation-handoff.md` Checks Run (IMP-01…IMP-07)
- Next recipient or routing: API/E2E (direct route, Small / Low)
- Remaining limitations or risks: `implementation-handoff.md` Known Risks
