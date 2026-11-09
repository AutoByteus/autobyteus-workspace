# Implementation Handoff — switch-back-eexist (autobyteus-440)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent review not selected (Small / Low); `get_handoff_rules` returns the API/E2E engineer for the direct route.
- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/requirements-doc.md
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/investigation-notes.md
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/solution-revision-record.md
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/design-spec.md
- Supplemental: solution-designer-handoff.md, evidence/INV-01, evidence/repro/switch-back-reproduction.e2e.test.ts
- Design review report / architecture review revision record: N/A — not applicable
- Triggering rework: N/A

## Current Implementation Summary

- Implementation cycle: Initial
- Implementation revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/implementation-revision-record.md
- Current implementation revision ID: IR-001
- Related IDs: SR-001; others N/A
- Commit: `9833f51bf9` on `codex/switch-back-eexist`

`createAgyRunCapsule` made `<memoryDir>/agy-project` with an exclusive `mkdir`; the first Antigravity era leaves the folder behind, so the second era (or the retry of a start that failed after the capsule was made) failed with `EEXIST`. It now removes the run's own capsule folder first (`fs.rm` recursive, force); the exclusive `mkdir` and file writes stay as a correctness guard. A skill link inside the capsule is removed without being followed, and nothing outside the capsule folder is touched. Restore never calls it. That is the whole production change (7 lines including the comment).

**U-1 on a Team member (reproduced before the change).** I added MS-05 to the members built-server harness, after MS-03, so the Team worker goes native -> Antigravity (MS-01) -> native (MS-02) -> back to Antigravity: on the base the message fails with `ACTIVATION_FAILED` / `EEXIST: file already exists, mkdir '…/agy-project'` (evidence IMP-01); MS-01..04 were green on the base. The standalone case RS-09 (my version of the designer's scratch reproduction, extended to four hops and asserting markers and segments) fails on the base at the first return to Antigravity with the same error (IMP-02).

## Routing Classification (Mandatory)

- Task size: Small
- Architecture risk: Low
- Design classification section / evidence reference: design-spec.md, classification
- Classification confirmed or changed: Confirmed
- Evidence and rationale: one function in one file; the switch sequence, Restore, markers and the journal are untouched.
- Selected route: Direct API/E2E
- Lightweight implementation self-review completed for the direct route: Yes (the diff is the one `rm` and its comment; the only data it can delete is `<memoryDir>/agy-project` of the run being started, which no running process uses at that point because a start is the first thing an era does; unit cases prove the skill target and the workspace stay intact)
- New design impact or escalation trigger: None

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| AC-001 / REQ-001, 004 | Standalone Antigravity -> native -> Antigravity completes; markers and segments as RS-01 | `createAgyRunCapsule` | Pass: RS-09 (four hops: one segment and one marker per switch, each segment equals the previous era's records, notice first) |
| AC-002 | Team member, same sequence | same | Pass: MS-05 (one segment, one marker, I-7, the other member untouched) |
| AC-003 | Native -> Antigravity -> native and a fourth hop | same | Pass: RS-01 unchanged and green; RS-09 and MS-05 are the fourth hop |
| AC-004 | The stuck state (pending switch to Antigravity with an earlier capsule): the next message completes it | same | Pass: it is exactly the state before the message in RS-09 hop 2 and MS-05; unit case "replaces the capsule of an earlier era" |
| AC-005 | A start that fails after the capsule was made, then retried | same | Pass: factory unit test (model mismatch after the capsule, then retry); built-server: not staged (the scripted CLI cannot fail once after the capsule) |
| AC-006 | A leftover capsule with a skill link: target intact, workspace untouched | same | Pass: two unit cases (link target and its extra file intact and re-linked; the workspace including its own `.agents` unchanged) |
| AC-007 | Restore in its own era | unchanged | Pass: unit case (restore reads the capsule, bytes unchanged) and the existing capsule/restore tests |

- Changes stayed within the requirements doc's Scope Guardrail: Yes

## Key Files Or Areas

`autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-run-capsule.ts` (+7). Tests: `tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (RS-09), `runtime-switch-members-built-server.e2e.test.ts` (MS-05), `tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts` (6 cases), `agy-agent-run-backend-factory.test.ts` (2 cases).

## Important Assumptions

No process uses a run's capsule at the moment its new era starts (the previous era's AGY process is stopped before the switch; a failed start's process is stopped by the start's own cleanup).

## Known Risks

- Anything that wrote into the old capsule after the first era ended (nothing in the product does) is removed with it.
- Grok and the native runtime make no such folder: RB-02 (the designer's sweep) passed on the base and RS-06/RS-07 stay green.
- The two new capsule unit cases that call `restoreAgyRunCapsule` and `createAgyRunCapsule` pass the descriptor with a cast, like the type-baselined rest of that file.

## Task Design Health Assessment Implementation Check

- Reviewed change posture / root-cause classification / refactor decision: as designed
- Implementation matched the reviewed assessment: Yes
- If challenged, routed as Design Impact: N/A

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead code in the touched files removed: Yes (none found)
- Dead code found elsewhere, added to follow-ups.md: None
- Shared structures remain tight: Yes
- Canonical shared design guidance reapplied: Yes
- Changed source file size: Yes (the capsule file stays far below 500 lines)
- Notes: none

## Persisted Data Transition Check

Not Applicable (no persisted data shape changes).

## Environment Or Dependency Notes

Built-server cases need `pnpm -C autobyteus-server-ts build` first and the gate `RUN_AGY_FAILURE_E2E=1` with `ANTIGRAVITY_CLI_COMMAND` set to `tests/fixtures/agy-failure-cli.mjs` (the command is in each test file header). They use a test-owned data root and an isolated HOME; no user data, no node 8001, no `~/.autobyteus` and no secret was used.

## Checks Run

Evidence in /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist/evidence/.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | members built-server, new MS-05 on the BASE | 31aa11b241 + test | macOS arm64, Node 22 | base capsule | U-1, AC-002 | Reproduced (fails) | evidence/IMP-01-team-member-reproduction-on-base.log | `EEXIST: file already exists, mkdir`, `Tests  1 failed | 4 passed (5)` |
| IMP-02 | native built-server, new RS-09 on the BASE | 31aa11b241 + test | same | base capsule | AC-001 | Reproduced (fails) | evidence/IMP-02-standalone-reproduction-on-base.log | `hop 2 to antigravity_cli must complete` ... `ACTIVATION_FAILED` `EEXIST` |
| IMP-03 | native built-server RS-01..RS-09 | 9833f51bf9 | same | capsule + switch | AC-001, 003, 004 | Pass | evidence/IMP-03-fix-standalone-built-server.log | `Tests  9 passed (9)` |
| IMP-04 | members built-server MS-01..05 and members-extended | 9833f51bf9 | same | capsule + Team member | AC-002 | Pass | evidence/IMP-04-fix-members-built-server.log | `Tests  5 passed (5)` twice |
| IMP-05 | delegated-copy e2e (Antigravity copies) | 9833f51bf9 | same | capsule | preserved | Pass | evidence/IMP-05-fix-delegated-copy-e2e.log | `Tests  9 passed (9)` |
| IMP-06 | `test:unit`, typecheck, the antigravity unit folder | 9833f51bf9 | same | capsule, factory | AC-005, 006, 007 | Pass | evidence/IMP-06-fix-unit-typecheck.log | `Tests  8172 passed | 9 skipped`; `production errors: 0 ... baseline 1182 in 365` |

- Not run, and why: a built-server case where the scripted Antigravity CLI fails once after the capsule (it cannot; the factory unit test covers it); the server integration suite (the change is below it; the full unit suite ran); a live (real Antigravity) switch back, which needs the user's sign-in.

## Frontend Rendered-Result Check

Not Applicable (server only).

## Downstream Coverage Hints / Suggested Scenarios

- A live Antigravity -> Codex or Claude -> Antigravity switch back on a Team member (needs the test vault / sign-in).
- A server restart between the save and the message of the third hop.
- The user's stuck run recovers at its next message once the fixed server runs (its pending switch is intact; nothing else to repair).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Everything marked not run above; API/E2E owns broader coverage and the live pair.
