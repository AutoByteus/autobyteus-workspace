# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-572 (founder report 2026-11-20); investigation and phone reproduction | N/A | N/A | Ready for Approval (DEC-001 needs the user) | BEH-001…007; REQ-001…006; AC-001…006 | Root cause reproduced; streaming vs download is the user's decision |
| SR-002 | Mixed | The user's decision on DEC-001 (2026-11-20) | N/A | Ready for Approval | Approved (by the user); design Ready | DEC-001, REQ-002…004, AC-002/004/005 | A: honest download with progress; streaming → FU-001; Medium / Low |
| SR-003 | Requirements | Implementation DI-001 | DI-001 | Approved (SR-002); design Ready | Approved (corrected); design Ready | REQ-002, UC-001, DEC-003 | Relative paths are not file links: REQ-002 means absolute paths; FU-003 |
| SR-004 | Mixed | CRR-001 (failure origin of API-REV-001 API-03) | CRR-001 | Approved (SR-003); design Ready | Approved (refined); design Ready (revised) | AC-006, DEC-004, D-7, BEH-007 | Retry on the phone viewer's own failure state, every file, both routes; not for a folder |

## Revision Entries

### SR-001 — Requirements baseline; DEC-001 to the user

- Trigger: Task autobyteus-572 from `/project_task_manager`.
- Root cause reproduced on the phone bundle (scratch case MSP-572): the phone downloads a protected media file whole before playing it and shows "Video URL is not available." during the download (9.6 s for 9.7 MB at 8 Mbit/s).
- DEC-001 (stream with a short-lived per-file grant, a node access model change, vs keep downloading with an honest loading state) asked of the user in the Solution Designer's conversation, 2026-11-20.
- Next action: the user's answer, then approval and design.

### SR-002 — User decision A; requirements approved; design complete

- Trigger: the user's answers, 2026-11-20 ("Security is really important here"; then "You know the best for our product I follow by our recommendation" on "A for this ticket, C as a follow-up").
- Changed: requirements DEC-001 = A, REQ-002/003/004, AC-002/004/005, status Approved (by the user); design-spec.md created (D-1…D-6); follow-ups.md FU-001 (streaming without keys in links).
- Classification: task_size Medium, architectural_risk Low (no security, credential, permission or path-rule change; a standard `Content-Length` header).
- Handoff: `handoff-architecture-design-complete.md` → per the rules (Medium / Low: `/implementation_engineer`).

### SR-003 — Relative paths are not file links (implementation DI-001)

- Classification: `Requirement Gap` resolved within the direction. Trigger: the implementation engineer's DI-001: SR-002 assumed a relative path in chat opens on the workspace route; it is never a file link (`absoluteFilePathAction.ts`, `mobileFileOpening.ts`), for any file type, before and after this change.
- Changed: requirements REQ-002, UC-001, out of scope, DEC-003; design current-state and probe wording; follow-ups.md FU-003.
- Intended behavior changed: narrowed to what chat makes tappable (the Task asked to check relative paths; they were checked). Approval: Solution Designer within the direction; user informed in the Solution Designer's conversation, 2026-11-20. DEC-001 (the user's) unchanged.
- Design/implementation impact: none for absolute paths; IR-001 goes on to API/E2E as it is.
- Project design case: `docs/design-cases.md` Case 5 gains this ticket.

### SR-004 — Retry on the phone viewer's failure state (CRR-001, Design Impact)

- Trigger: API/E2E round 1 (API-REV-001) failed API-03 (MSP-91 outside-folder step): a broken node-file download on the phone showed a plain message with no Retry; the code reviewer's failure-origin review CRR-001 traced it to the design (D-2/D-6 gave Retry to the players only; the node-file route fails before a player exists, in `MobileFileViewer`'s own branch).
- Decisions (Solution Designer, within the direction: REQ-005 already asks for Retry on failure): DEC-004 — Retry for every file the phone viewer opens, both routes; on a broken download and a missing file, not on a folder. AC-006 restated with the folder exception (its approved outcome unchanged).
- Design: D-7 (`retryable` + `retry` on `MobileFileViewer`; `useMobileNodeFile.reload()`; workspace mount re-opens with `openFileReadOnly`); BEH-007 map; sequence step 3 (unit + probes, incl. an outside missing file that is created then opened by Retry).
- Classification unchanged: Medium / Low.
- Handoff: `handoff-design-revised-sr-004.md` → per the rules (`/implementation_engineer`).
