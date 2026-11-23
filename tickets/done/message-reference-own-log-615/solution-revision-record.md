# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-615: investigation, then the founder's go-ahead (2026-11-23) | root-cause report | N/A | Requirements Approved (founder); design Ready | BEH-001…005, REQ-001…005, AC-001…006 | Baseline; to architecture review (Medium / High) |
| SR-002 | Requirements | The founder's question via the PM (2026-11-23): why the tests and release missed it | `test-gap-report.md` | Approved; ARCH-REV-001 Pass | Approved (REQ-006, AC-007, AC-008 added within the direction) | REQ-006, AC-007, AC-008 | Test-only additions; design unchanged apart from the test plan |

## Revision Entries

### SR-001 — One owner for the messages of a view, for the list and its references

- **Phase and classification:** `Initial Baseline`.
- **Triggering evidence:**
  - the founder's report and screenshots;
  - the root-cause report (90 requests, all 404, through the PM's route; the messages stored in delegated teams' logs);
  - the founder's go-ahead and his direction that the architecture follow the design principles.
- **Decisions:**
  - DEC-001 (b): one server owner and one route, plus one web builder;
  - DEC-002: remove the three routes;
  - DEC-003: the not-found text.
- **Approval:** the founder, 2026-11-23, in this conversation.
- **Design cases:** Case 28 added.
- **Classification:** `Medium` / `High` (a REST contract and an ownership restructuring).
- **Handoff:** `solution-designer-handoff.md`.
- **Follow-ups:** FU-001 (duplicate case numbers).

### SR-002 — Guard the class of bug (test gap)

- **Trigger:** the founder's question via `/project_task_manager`, answered in `test-gap-report.md`. The only end-to-end test of a reference opened a cross-run message, which is also stored in the root's log. No test opened a message inside a delegated run, or asserted a delegated view's link.
- **Added:**
  - REQ-006;
  - AC-007, a permanent "every listed reference opens" E2E over each root kind with delegated runs, plus a web builder unit test per row kind;
  - AC-008, a TESTING.md rule for changes that move where data lives, written by API/E2E.
- **Approval:** within the founder's direction ("make sure that our code base and our overall architecture is healthy"). The founder is informed through the PM's report and this conversation.
- **Design impact:** none beyond the test plan; ARCH-REV-001's pass still holds (no structure changes).
