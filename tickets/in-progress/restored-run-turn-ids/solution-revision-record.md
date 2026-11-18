# Solution Revision Record

| Revision | Phase | Trigger | Status | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Mixed | autobyteus-526 round 1 dispatch (2026-11-18) | Requirements Approved (SD within direction); Design Ready | Medium / Low |
| SR-002 | Design | CRR-001 / API-E2E F-1 (Design Impact) | Design Ready (revised) | Medium / High: one identity per notice |

### SR-001 — Round 1 baseline and design

- Cause: `TurnTracker` restarts at 1 for a restored native run (`turn-tracker.ts` L4-13; `memory-manager.ts` L114)
- Requirements approved by the Solution Designer within the Task's direction (user informed); decisions DEC-001..003
- Design: seed the turn counter from the stored corpus; localize the reminder card's time in the web
- Classification: Medium / Low → implementation

### SR-002 — Design Impact from validation: the doubled card is a second, id-independent cause

- Trigger: API/E2E F-1, code review CRR-001 (failure origin: Design Impact): with unique turn ids the reminder card still shows twice live (phone MSP-75; desktop V-04) and after a desktop reload; base shows the same; the server sends one notice and stores one
- My gap: I attributed BEH-002 wholly to reused turn ids and left the doubling layer unknown (U-1) instead of tracing it; the escalation trigger fired as written
- Cause: a notice reaches the web on two paths (snapshot stored part, kept because notices have no turn; live frame with only sender and content) and carries no id on any path, so the 461 rule "the web matches notices by messageId" cannot work
- Design: one id per notice from its producer through preface metadata, stored trace (`message_id`), projection, live payloads and the web segment; the web shows a notice id once (design-spec SR-002)
- Requirements: unchanged (REQ-002's intended behavior); classification now Medium / High → architecture review
- Review result 2026-11-18: ARCH-REV-001 Pass on SR-002; the reviewer routed it to `/implementation_engineer` (informational, no duplicate handoff).
  - R-1 decided (Solution Designer): the agent-input-pipeline emit (`agent-input-pipeline.ts` L94-101) and the task-delegation presentation (`collaboration-agent-presentation-event-adapter.ts` L57-64) send `message_id: null` in this round: neither is on REQ-002's path, and a notice without an id is shown as today.
  - R-3 noted, design kept: carrying the notice trace's turn id so `keepsStored` drops it would need the live notice frame to carry the same turn, but a native preface notice is published at forward time with no turn id (RR-10), so a snapshot taken during that turn would show the notice nowhere; one id per notice also completes 461's stated contract for every path.
