# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-sr-001.md`, initial implementation | N/A | `Initial Baseline` | SR-001; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | FU-003, FU-005 done; FU-002 done as designed, AC-001 partly met (product causes found) → Design Impact to the Solution Designer |
| IR-002 | Solution Designer, `solution-revision-record.md` SR-002 (Design Impact IR-001 resolved: option (a) + (c)) | IR-001 Design Impact | `Design Impact` (resolved) | SR-002; others N/A | (c) done; AC-001 as refined met; DCF-E2E-003 recorded as FU-003; ready for API/E2E |

## Revision Entries

### IR-001 — FU-002, FU-003, FU-005 of autobyteus-517 round 2

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/followups-483-517/handoff-sr-001.md`, round 1 (direct route, Small/Low).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`; outcome routed as `Design Impact` (AC-001 cannot be fully met by test waits: see the handoff).
- Prior authoritative result: `N/A`
- Current authoritative result: FU-003 (REQ-003) and FU-005 (REQ-005) complete. FU-002 (REQ-001/REQ-002) implemented as designed. Under the same machine load, base failed 24 tests in 6 files and the branch fails 9 in 3. The causes left are product behaviour under load, not waits: events not delivered within 30 s, unlink/add not paired into a move, and an in-process server close taking ~297 s.
- Related solution revision IDs: `SR-001`; architecture-review / code-review / API/E2E / delivery: `N/A`
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002, REQ-003, REQ-005; AC-001, AC-002, AC-004.
- Implementation delta:
  - `agy-background-task-monitor.ts` (`tasks` map plus `running` set; `list()` returns all tasks) and its test;
  - `tests/helpers/os-latency-under-load.ts`, used by the seven listed files;
  - `AC_BOUND_MS` elapsed assertions removed in `package-auto-refresh` and, as an extension of DEC-002, in the live-refresh suite (DCF-E2E-002, DCF-E2E-009, the creator case);
  - `settings.md` (Settings only; the copy removed, Existing Run Configuration kept);
  - `agent_execution_architecture.md` (Run Workspace Choice On Start Surfaces moved in; line 1416 repointed to it).
- Changed files or areas: commits `1224f6498c` (FU-003), `b55ce60b5e` (FU-002), `807951b6e0` (FU-005), then the ticket-documents commit.
- Local validation and result: IMP-01..IMP-06 in the handoff.
- Next recipient or routing: `get_handoff_rules` → Design Impact rule → `/solution_designer`.
- Remaining limitations or risks: AC-001's remaining failures; a durable E2E assertion of an ended AGY task in `currentTasks` is not written (the unit test pins `list()`).

### IR-002 — SR-002 option (c): DCF-E2E-002 final diagnostic, DCF-E2E-005 budget

- Triggering role, report path, and round: Solution Designer, `solution-revision-record.md` SR-002 (message of 2026-11-18), round 2.
- Triggering finding IDs: the IR-001 Design Impact (AC-001).
- Classification: `Design Impact` (resolved upstream: AC-001 refined; FU-001, FU-002 recorded).
- Prior authoritative result: IR-001 (HEAD `e61300a086`).
- Current authoritative result: (c) done, test-only.
  - DCF-E2E-002 waits for the broken-Team diagnostic of the final state.
  - DCF-E2E-005's budget is its own 60 s plus its two file-event waits.
  - Both pass alone. The whole live-refresh suite has one failure, DCF-E2E-003 (the restored root is never seen within 30 s). It reproduces alone; the base test fails the same case earlier, at its 5 s wait. It is recorded as FU-003 in `follow-ups.md`, same class as FU-001.
- Related solution revision IDs: `SR-001`, `SR-002`; others `N/A`.
- Why recorded: the implementation round SR-002 asked for.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002; AC-001 (refined).
- Implementation delta: `agent-package-definitions-live-refresh.e2e.test.ts`:
  - DCF-E2E-002's `waitFor` accepts only the final diagnostic (code `DEFINITION_CONTRACT_INVALID`, `definitionPath` = `team.md`, `usingLastGood` false);
  - DCF-E2E-005's timeout is `60_000 + 2 * OS_FILE_EVENT_WAIT_MS`. Not `FILE_EVENT_TEST_TIMEOUT_MS`: that is 45 s, below the 60 s the case already had, and would have shortened it.
- Changed files or areas: the test file above; `follow-ups.md` (FU-003); this record and the handoff.
- Local validation and result: IMP-06 (typecheck, rerun), IMP-07.
- Next recipient or routing: `get_handoff_rules` → direct API/E2E (Small/Low).
- Remaining limitations or risks: FU-001..FU-003 (product behaviour under load); the load had dropped to ~26–50 at these reruns (fseventsd 160–168%).
