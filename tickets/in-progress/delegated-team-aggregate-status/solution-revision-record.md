# Solution Revision Record — delegated-team-aggregate-status

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from Project Task project_task_7a42fa46 | N/A | N/A | Ready for Approval | BEH-001..005, REQ-001..005, AC-001..007 | Superseded before approval by SR-002 |
| SR-002 | Requirements | User direction UD-001 + discussion (universal Team status) | N/A | Ready for Approval (R1) | Approved (R2, AP-001) | BEH-001..006, REQ-001..008, AC-001..011, SCN-001..005 | Universal rule approved |
| SR-003 | Design | Architecture design on approved R2 | N/A | N/A (no design) | Design Ready; Medium / Low | DS-001..005; all REQ | Architecture Design Complete |
| SR-006 | Evidence | User: where is agent and team status ownership located | Ownership finding | Design Ready | Design under question (open user decision) | REQ-001..008 (owner of the rule) | Server has no Team status owner; web design reconstructs it |
| SR-005 | Evidence | User: "the backend will send events for the status, right?" | R-002 | ASM-001 open | ASM-001 narrowed (open user decision) | ASM-001 | SR-004 overstated the gap; Team runs are live |
| SR-004 | Evidence | User asked whether the "risk found" was really resolved | R-002 | Design Ready | Design Ready; ASM-001 reopened (open user decision) | ASM-001, REQ-003, REQ-008 | Freshness risk corrected; awaiting user decision |

## Revision Entries

### SR-001 — Initial requirements baseline

- Phase and classification: Requirements / Initial Baseline
- Trigger: Task from `/project_task_manager` (2026-10-09) with the user's screenshot.
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not yet created.
- IDs affected: BEH-001..005, UC-001..005, REQ-001..005, AC-001..007, SCN-001..003, DEC-001..002, ASM-001.
- Scenario-basis changes: N/A (baseline)
- Why recorded: first baseline presented to the user.
- Canonical sections: all of requirements-doc.md and investigation-notes.md.
- Supplements: user screenshot (evidence only).
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: pending.
- Supplement approvals: N/A
- Design/review basis: N/A
- Size/risk classification: N/A before design.
- Handoff: none (approval hold).
- Downstream impact: N/A
- Remaining gaps: DEC-001, DEC-002.
- Next action: user decision and approval.

### SR-002 — Universal Team status (approved R2)

- Phase and classification: Requirements / Refinement (scope extension by the user)
- Trigger: the user pointed out that standalone and Org-internal Teams already have a status (screenshot 2, run row blue while members idle/offline), then proposed one universal rule for Teams. The Solution Designer refined it (ranking, error kept, starting = busy, stopped = gray, group row) and the user agreed.
- Triggering finding IDs: UD-001; DEC-001..003 resolved.
- Prior status: R1 Ready for Approval (never approved).
- Current status: R2 `Approved` (AP-001, 2026-10-09).
- IDs affected: BEH-004/005 desired changed; BEH-006 added; REQ-001..008 and AC-001..011 rewritten; SCN-004/005 added; ASM-002 added.
- Scenario-basis changes: SCN-004 (standalone run row) and SCN-005 (group row) added as Supported Normal Scenarios.
- Why recorded: intended behavior changed from "delegated rows only, five colours" to "every Team row, four Team states".
- Canonical sections: requirements-doc.md (all); investigation-notes.md source log (standalone/Org/server evidence).
- Supplements: screenshot 2 (evidence only).
- Product design evidence: N/A
- Intended behavior changed: Yes
- Approval impact: AP-001 quotes in requirements-doc Document Status. One recorded clarification ("anything shown under the Team row counts", matching the earlier approved sub-team rule) is surfaced to the user for objection.
- Supplement approvals: N/A
- Design/review basis: no design existed.
- Size/risk classification: N/A
- Handoff: none.
- Downstream impact: binary Team cue removed from TEAMS rows; probes and docs must change.
- Remaining gaps: none blocking.
- Next action: architecture design.

### SR-003 — Architecture design

- Phase and classification: Design / Initial design
- Trigger: approved R2.
- Prior status: N/A
- Current status: design-spec.md `Ready`.
- IDs affected: DS-001..005 map all REQ/AC.
- Why recorded: complete solution for handoff.
- Canonical sections: design-spec.md (new); investigation-notes.md architecture findings.
- Intended behavior changed: No
- Approval impact: none (design within R2).
- Design decisions: one web Team rule owner (`resolveTeamStatus`, `TeamStatus`); shared contract fold unchanged; per-root counting stays with existing owners; render-time derivation for Team runs; binary cue and `hasActiveRuns` removed; running/* cluster + TeamActivityDot listed as follow-up dead-code removal.
- Size/risk classification: `task_size: Medium`, `architectural_risk: Low` (presentation-only, web-only, ~12 source files + specs/probes).
- Handoff: see `handoff-architecture-design-complete.md`.
- Remaining gaps: none.
- Next action: apply handoff rules.

### SR-004 — Freshness risk corrected (evidence-only)

- Phase and classification: Evidence / Refinement
- Trigger: the user asked whether the risk mentioned earlier (a live team run not open in this session) was really resolved.
- Finding: R-002 in investigation notes. The history list does carry member statuses (so not always gray), but for runs without a live stream, both those statuses and `isActive` are a snapshot refreshed only after mutations. The earlier wording ("same as member dots", "accepted") understated the visible effect on always-visible run rows.
- Intended behavior changed: No. ASM-001 is reopened as an open user decision; the design is unchanged until the user decides.
- Next action: user decides between accepting the limitation and extending scope (live status for every active run); a scope extension would be a Requirement Gap needing renewed approval and a design revision.

### SR-005 — Freshness re-verified (evidence-only)

- Trigger: the user asked whether the backend sends status events.
- Finding: R-002 rewritten. The backend pushes status per subscribed run, and the app subscribes to **every active TeamRun and Agent run** on each history load, so TeamRun rows are live. SR-004's "snapshot only" was wrong for them. The real gap is limited to delegated Teams under Agent runs whose collaboration stream was never attached (host never selected in this session) and Orgs never opened.
- Intended behavior changed: No. Design unchanged.
- Next action: user decision on the follow-up for the remaining gap.

### SR-006 — Status ownership investigation (evidence-only, design questioned)

- Trigger: the user stressed ownership/authority and asked where agent and team status ownership lives.
- Finding: Status Ownership Investigation in investigation-notes.md. The server `AgentRun` owns agent status; `RootTeamRun`/`AgentOrgRun` own only binary lifecycle; no one owns Team status, and the aggregate is computed in four places (server task adapters, web nested/Org rows, and now planned for all web rows).
- Intended behavior changed: No (the colour rule stands). The owner of the rule is in question: frontend derivation (SR-003) vs. server-owned Team status pushed to the frontend.
- Approval impact: a server-owned, pushed Team status adds an API/stream contract, which R2 lists as out of scope → Requirement Gap needing renewed approval; design would become Large/High → architecture review.
- Next action: user decision; implementation of SR-003 continues unless the user pauses it.
