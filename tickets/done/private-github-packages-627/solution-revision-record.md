# Solution Revision Record — autobyteus-627

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial investigation and options report | N/A | N/A | Ready for Approval | BEH-001..004, REQ-001..007, DEC-001..005 | Sent to the founder for decisions |
| SR-002 | Mixed | Founder go-ahead 2026-11-24; architecture design | N/A | Ready for Approval | Requirements Approved; design Ready | DEC-001..005; REQ-002 (refined UI place); all REQ for design | Design complete, Medium / High |

| SR-003 | Requirements | Delivery Engineer finding (Requirement Gap), 2026-11-24 | delivery report: Update checks card text | Approved (SR-002) | Approved (SR-003) | REQ-008, AC-008 | Text fix routed to implementation |
## Revision Entries

### SR-001 — Investigation, measured feasibility, options and recommendation

- Phase and classification: Requirements, Initial Baseline
- Trigger: autobyteus-627 Task from `/project_task_manager`
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; no design
- IDs affected: BEH-001..004, UC-001..005, REQ-001..007, AC-001..007, SCN-001..005, DEC-001..005
- Scenario basis: all scenarios come from the Task (private package import, updates, expiry and revocation, Docker)
- Why recorded: first coherent baseline for the founder's decision
- Canonical sections: requirements-doc.md (all), investigation-notes.md (all)
- Supplements: probe-627-results.txt (evidence). The temporary probe test was removed and never committed
- Product design: not requested
- Intended behavior changed: N/A (baseline)
- Approval impact: none yet; DEC-001..DEC-004 are Needs user
- Design basis: N/A
- Classification: N/A before design
- Handoff: none; the result goes back to the founder through the caller
- Remaining gaps: DEC-001..DEC-004
- Next action: wait for the founder's decisions, then approve the requirements and design

### SR-002 — Founder approval and architecture design

- Phase and classification: Mixed (approval plus design), Refinement
- Trigger: `/project_task_manager` message of 2026-11-24 with the founder's words: "Obviously the token should be stored in private vault please send to the software engineering team which earlier worked on the investigation to get started working on it and I mean the token should be stored in private vault". The relay states Option A with the recommended defaults
- Prior status: requirements Ready for Approval; no design
- Current status: requirements Approved (SR-002); design-spec.md Ready
- IDs affected:
  - DEC-001..004 decided by the founder;
  - DEC-005 decided in design (codeload with header);
  - DEC-002 refined: the connection line is always visible in both import areas, which also serves reconnecting after expiry. Same intent: connect where the need appears;
  - AC-002 is read as "after Connect, the user presses Import again";
  - the summary's optional "Private" mark is dropped (nothing requires it).
- Scenario basis: unchanged
- Why recorded: approval capture, then the completed design
- Canonical sections: requirements-doc.md (status, decisions, readiness); investigation-notes.md §2.3, §2.4 added (second probe, architecture code facts, test token expiry 2026-11-25); design-spec.md new; follow-ups.md new
- Supplements: probe-627-results.txt gained the second probe line. The temporary probe was removed and never committed
- Intended behavior changed: No (refinements within the approved decisions)
- Approval impact: founder approval of SR-002, 2026-11-24
- Design basis: design-spec.md SR-002
- Classification: task_size Medium, architectural_risk High (secret's new consumer and new write path; shared client contract; undocumented codeload behavior)
- Design-phase finding: removing the GitHub integration source disconnects GitHub (existing DEC-015), so with one token it also ends private imports. Kept as is; the removal confirmation already names the connection, and the connection line says what the token is used for
- Remaining gaps:
  - no private agent-package fixture repository (live proof covers the transport; a full import is proven with a faked GitHub);
  - the test token expires 2026-11-25.
- Next action: route by the handoff rules

### SR-003 — The Update checks card's privacy text

- Phase and classification: Requirements, Requirement Gap
- Trigger: the Delivery Engineer's finding (release-deployment-report.md): Settings → Server Settings → Basics → Update checks says "No account or token is used. Nothing is sent to AutoByteus." Since this ticket, a check of a private source sends the node's GitHub token to GitHub. The investigation and the design missed the text because they searched docs, not the localization files
- Prior status: requirements Approved SR-002; design Ready; delivery on hold
- Current status: requirements Approved SR-003; design SR-003 (one Change Scope entry)
- IDs affected: REQ-008, AC-008 (new)
- Intended behavior changed: Yes. Product text only; it makes the statement true again
- Approval: Solution Designer, within the direction. The founder's direction is strict token custody and honesty about where the token goes; this only corrects a statement the change made false. The founder is informed in this conversation on 2026-11-24
- Route: (a) fix in this ticket. Implementation engineer, then code review, then API/E2E as their rules decide, then back to delivery. Delta classification Small / Low; the package stays Medium / High
- Lesson: for any change in what a feature sends or stores, search the user-visible strings (localization files), not only the docs, for claims about it (privacy, "no token", "nothing sent")
