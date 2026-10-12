# Solution Revision Record — agy-docker-node-availability-diagnostics

## Revision Index

| Revision ID | Phase | Trigger / Round | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after live investigation and user scope message | N/A | N/A | Approved (within direction) | BEH-001..006, REQ-001..007, AC-001..008, DEC-001..007 | Baseline with a proposed GraphQL cause field and per-cause labels |
| SR-002 | Requirements | Own pre-design architecture check: no client/server version handling | Version-skew finding | Approved (SR-001) | Approved (within direction) | REQ-002, REQ-003, AC-001..003, DEC-002, DEC-005, DEC-007, QR-004, new BEH-007 | Contract kept; neutral label + visible server reason; clearer AGY texts |
| SR-003 | Design | Architecture design completed | N/A | No design | Design Ready; Small / Low | All | Implementation-ready package |

## Revision Entries

### SR-001 — Requirements baseline

- Phase and classification: Requirements, Initial Baseline
- Trigger:
  - Project Task (URGENT) with screenshots;
  - live investigation of Docker nodes 8001/8003;
  - user messages 2026-10-12: image-age question; Codex question; "It is installed. It's just not logged in."; "fix the agy bug now. codex is not a bug…".
- Finding IDs: N/A
- Prior status: N/A. Current status: Approved within direction.
- Affected IDs: BEH-001..006, REQ-001..007, AC-001..008, SCN-001..006, DEC-001..007
- Scenario basis: SCN-001..006 Supported Normal. Codex plan display excluded (DEC-006, user).
- Why recorded: first coherent baseline.
- Canonical sections: whole `requirements-doc.md`; `investigation-notes.md` created.
- Supplements: none
- Product design: N/A
- Intended behavior changed: N/A (baseline)
- Approval: Solution Designer within the direction, user informed. Reference: the user's scope message in this conversation, plus my message to the user describing the fix and that I am approving within the direction.
- Design/review basis: N/A
- Classification: N/A
- Handoff: none
- Remaining gaps: none

### SR-002 — Keep the API contract; visible server reason

- Phase and classification: Requirements, Refinement (decision owner: Solution Designer; within direction)
- Trigger: my own architecture-level check before design. `autobyteus-web` has no node/server version handling, and the availability query fails as a whole if it names a field the node doesn't know. That would mark every runtime unavailable on an older remote node.
- Finding IDs: investigation "Architecture Investigation Findings" — version skew
- Prior status: Approved (SR-001). Current status: Approved (SR-002).
- Affected IDs: REQ-002 (cause enum → clearer AGY texts), REQ-003 (per-cause labels → neutral "Unavailable" + visible reason), AC-001..003, QR-004, DEC-002 (reversed), DEC-005 (texts), DEC-007 (label), BEH-007 added, SCN-X1 recorded
- Scenario basis: SCN-X1 (newer app with an older node) recorded as the driver
- Why: avoid a regression the SR-001 design would introduce; smaller change (DESIGN.md rules 1 and 5)
- Canonical sections: requirements Status, Problem/Desired, Behavior table, Out of Scope, REQ/AC, UI, QR, Decisions, Traceability; investigation codebase table, structural inventory, architecture findings
- Intended behavior changed: Yes, narrowed. The user still sees the actual reason and a recovery step, but the short label is "Unavailable" instead of "Sign in required", and the reason line carries the cause.
- Approval: Solution Designer within the direction. The user is informed of the final behavior in the result summary. No `Needs user` decision.
- Design/review basis: no design yet
- Remaining gaps: none

### SR-003 — Architecture design complete

- Phase and classification: Design, Initial design
- Trigger: approved basis SR-002
- Prior status: none. Current status: `design-spec.md` Ready.
- Affected IDs: all REQ/AC mapped to DS-001..004
- Canonical sections: `design-spec.md` (new); investigation notes extended (version skew, store re-check semantics, existing tests)
- Intended behavior changed: No
- Approval: unchanged (SR-002)
- Classification: `task_size = Small`, `architectural_risk = Low`. About 4 source files, 2 locale entries, 2 docs and focused tests, all within existing owners. No API, persistence, security-boundary, concurrency or deployment change.
- Handoff: see `solution-handoff.md` (route recorded there after `get_handoff_rules`)
- Downstream impact: implementation, executable validation, delivery/release, user verification on 8003
- Remaining gaps: none
- Next action: route per handoff rules
