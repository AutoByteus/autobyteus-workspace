# Solution revision record — daily-assistant-display-name

## SR-001 — 2026-10-05
- Trigger: user request with an Agents page screenshot. Keep the name "Daily Assistant" for non-technical users; the rest of agent.md need not change.
- Prior status: N/A (new package; predecessor `tickets/done/general-agent-identity` SR-002).
- Current status: requirements Ready for Approval; design not started.
- Affected: BEH-001–003, SCN-001, REQ-001–004, AC-001–004.
- Approval impact: needs explicit user approval, including decisions D-1 (exact name), D-2 (prompt self-introduction line) and D-3 (keep role/description).
- Design/review/routing impact: N/A until approval.

## SR-002 — 2026-10-05 (requirements approval)
- Trigger: user messages "coool. since its just label change thats nice" and "The words 'You are Daily Assistant, a general-purpose agent for practical tasks and requests.' like the one you proposed thanks".
- Prior status: Ready for Approval. Current status: requirements **Approved** (D-1 name `Daily Assistant`; D-2 exact line 7; D-3 keep role/description).
- Affected: BEH-001–003, REQ-001–004, AC-001–004 (AC-002 now records the target hash `49ed6e90…07b7`).
- Sections changed: requirements-doc Status, Behavior, AC table.
- Design impact: design may start.

## SR-003 — 2026-10-05 (design)
- Trigger: approved SR-002 baseline.
- Prior status: design not started. Current status: design-spec.md **Ready**; task_size Small, architectural_risk Low.
- Persisted data: Directly Usable — No Migration (existing startup sync).
- Routing: per handoff rules (recorded in handoff.md).
- Remaining gaps: none.
