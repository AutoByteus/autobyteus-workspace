# Solution Revision Record

| Revision ID | Phase | Trigger | Prior | Current | Affected | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | autobyteus-279; Apple's message; the founder's direction, decisions and approval; the Product team's approved specification; my verification rounds 1–7; the measured phone network inventory | N/A | Requirements Approved; Design Ready | REQ-001…014, AC-001…011 | The demo node in a separate demo build, bundled in the iOS app; the iOS start screen, shell bridge and share handling as on Android; iPad layout; DC-007, DC-011; local icons. Large / High → architecture review |

## SR-001

- Trigger and basis: as in the requirements' Document Status; the Product package `autobyteus-web-design/tickets/done/ios-demo-mode-279/` (reference `78b51f73`).
- Approval: the founder's words (requirements); engineering mechanism: "Thanks you decide you know the best of the project and what apple required".
- Classification: `Large` / `High`.
- Next: architecture review.

| SR-002 | Design | ARCH-REV-001 (Fail, Design Impact) | Design Ready (SR-001) | Design Ready | AR-001…AR-003, R-1…R-3; REQ-002, 003, 005, 006, 011, 012 | demoBoot as the first plugin with a demo session through the session owner; transport passes the page origin; local subset of all icon collections; widened first check; second coverage oracle; one owner of "demo". Requirements unchanged. Large / High → architecture review again |
| SR-002 review | Design | ARCH-REV-002 Pass | SR-002 | SR-002 Passed; editorial alignment N-1…N-3 (no design change) | — | handed to /implementation_engineer by the reviewer |
| SR-003 | Design | CRR-002 (Design Impact): F-1, the placeholder in saved computers' displayName | SR-002 Passed | SR-003 Ready | REQ-013, AC-001, AC-011 | displayName migration (iOS migration owner); one known-name rule for the flow and hello; design case 24. Requirements unchanged. Large / High → architecture review |
| SR-004 | Design | ARCH-REV-003 (Fail, Design Impact): AR-004, N-4 | SR-003 | SR-004 Ready | REQ-001, REQ-013, AC-001 | knownName/shownName as on Android for every native label; corrected accepted effect and Case 24; migration write order. Large / High → architecture review |
