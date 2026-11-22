# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-designer-handoff.md` (SR-001, direct route) | N/A | `Initial Baseline` | SR-001 | Implemented I-1…I-5; I-6 left to API/E2E (DEC-003); to API/E2E |

## Revision Entries

### IR-001 — Six small follow-ups

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/small-follow-ups-579/solution-designer-handoff.md`, SR-001 (Medium / Low, direct implementation)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: I-1…I-5 implemented as design-spec.md's Change / Refactor Sequence; I-6 is the API/E2E engineer's (DEC-003). Medium / Low confirmed.
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…005; REQ-001…006; AC-001…006 (AC-007 is API/E2E's).
- Implementation delta:
  - I-1: `fileContent` refusals are GraphQL errors with codes; the demo follows; four server tests and a store test;
  - I-3: the shared probe helper and its three users, with a unit test of both labels;
  - I-4: condition waits in the race test;
  - I-5: `dispose` stops and awaits the fake CLIs; team-run-config awaits a killed server's exit; a unit test;
  - I-2: measured per file and changed per DEC-002; FU-001 for the built-server stop.
- Changed files or areas: see the handoff's Key Files Or Areas; commits `0f2707969e`, `8135a5922f`, `c27b85c52a`, `45ad9817e4`, `02ee9c2237`, `4c77e3e78a` on `f2c0d2a902`.
- Local validation and result: IMP-01…IMP-12 Pass (whole server unit, server E2E and web unit suites included); every change has a failing negative control.
- Next recipient or routing: API/E2E engineer (Medium / Low, direct route).
- Remaining limitations or risks: the I-2 failure regime (busy `fseventsd`) was not reproducible here; its causes are read from the 576/583 runs.
