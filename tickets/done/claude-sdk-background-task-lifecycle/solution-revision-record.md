# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from the user's background-Bash report and the live probes | N/A | N/A | Draft (awaiting DEC-001 decision and approval) | BEH-001..003, REQ-001..003, AC-001..004 | Root cause confirmed; options presented |
| SR-002 | Evidence | User question: "did we use the Claude Agent SDK correctly?" | N/A | Draft | Draft (DEC-001 still open) | DEC-001 context | Our code uses the valid but limited single-message mode; the SDK docs recommend streaming input for long-lived hosted sessions; streaming input existed at build time (0.2.63) |
| SR-003 | Mixed | User question: "is CLAUDE_CODE_DISABLE_BACKGROUND_TASKS supported by the Claude CLI?" | N/A | Draft | Draft (DEC-001, DEC-003 open) | BEH-005 added; REQ-001 trace; DEC-003 added; UNK-001 resolved | Switch is officially documented; found that foreground commands over their timeout are auto-backgrounded and then killed too |
| SR-004 | Mixed | User approval of Option 1 + DEC-003 (30 min); architecture design | N/A | Draft | Requirements Approved; Design Ready | REQ-004, AC-005, AC-006 added; DEC-001..003 decided | Architecture Design Complete: Small / Low |

## Revision Entries

### SR-001 — Background Bash killed by per-turn query close

- Phase and classification: Requirements / Initial Baseline
- Trigger: User report 2026-09-24 (delivery_engineer Electron build never finished; screenshot of `run_in_background: true` Bash)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Draft`; design not started
- IDs affected: BEH-001..003, SCN-001..002, REQ-001..003, AC-001..004, DEC-001..002
- Why recorded: first baseline presented to the user for a direction decision
- Canonical sections: all (new)
- Supplements: `probe-evidence/probe-results.md`, `probe.mjs`, `probeD.mjs`
- Intended behavior changed: N/A (baseline)
- Approval impact: not yet approved
- Design/review basis: N/A
- Task size/risk: N/A before design (expected Small/Low for Option 1; Large/High for Option 2)
- Handoff: none. Held in the requirements conversation pending the user's decision
- Remaining gaps: DEC-001, DEC-002, UNK-001
- Next action: user picks Option 1 / 2 / 1-then-2 and approves; then design

### SR-002 — SDK usage conformance review

- Phase and classification: Evidence / Refinement
- Trigger: user question 2026-09-24, "did we use the claude agent sdk correctly … maybe claude agent sdk has improved"
- Triggering finding IDs: N/A
- Prior status: requirements Draft (SR-001)
- Current status: requirements Draft; design not started
- IDs affected: DEC-001 (context only)
- Why recorded: new evidence that affects which option to choose
- Canonical sections changed: `investigation-notes.md` → "SDK Usage Conformance Review (SR-002)"
- Supplements: none added
- Intended behavior changed: No
- Approval impact: none (nothing approved yet)
- Design/review basis: N/A
- Task size/risk: N/A before design
- Handoff: none (user conversation)
- Remaining gaps: DEC-001, DEC-002, UNK-001
- Next action: user decides DEC-001 knowing that Option 2 moves us to the SDK's recommended mode

### SR-003 — CLI switch confirmed official; auto-backgrounding on timeout found

- Phase and classification: Mixed (Evidence + Requirements refinement)
- Trigger: user question 2026-09-24, "is this CLAUDE_CODE_DISABLE_BACKGROUND_TASKS supported by claude cli itself?"
- Triggering finding IDs: N/A
- Prior status: requirements Draft (SR-002)
- Current status: requirements Draft; design not started
- IDs affected: BEH-005 (new), REQ-001 (trace), DEC-003 (new), UNK-001 (resolved), External Contracts
- Why recorded: official docs confirm the switch and show a second path to the same bug
- Canonical sections changed: investigation-notes "Official CLI Documentation Check (SR-003)" and UNK-001; requirements-doc behavior table, REQ-001 row, External Contracts, Open Decisions, Traceability
- Intended behavior changed: No. The proposed Option 1 behavior now explicitly covers BEH-005 as well. Nothing was previously approved
- Approval impact: none yet
- Handoff: none (user conversation)
- Remaining gaps: DEC-001, DEC-002, DEC-003
- Next action: user decides DEC-001 and DEC-003 and approves

### SR-004 — Approval of the temporary fix; design complete

- Phase and classification: Mixed (Requirements approval + Design)
- Trigger: user messages 2026-09-24: "i strongly agree with you, lets first do a temp fix using the env variable … after the ticket is done. we will do ticket two right?" and "I'd lean towards raising it to 30 minutes … your suggestion is good here"
- Triggering finding IDs: N/A
- Prior status: requirements Draft; no design
- Current status: requirements `Approved`; `design-spec.md` `Ready`
- IDs affected: DEC-001 (Option 1 now; Option 2 = next separate ticket), DEC-002 (separate ticket), DEC-003 (30 min ceiling), REQ-004, AC-005, AC-006, ASM-002 added
- Canonical sections changed: requirements-doc (status, scope, REQ/AC, contracts, decisions, traceability, readiness); design-spec (new)
- Intended behavior changed: Yes, the REQ-004 ceiling was added and approved by the user in the same round
- Approval impact: approved basis = requirements-doc at SR-004
- Design/review basis: new design-spec at SR-004
- Task size/risk: `Small` / `Low` (one production file, CLI-documented env vars at the existing provider-policy boundary, no lifecycle/contract/persistence change)
- Handoff: `solution-handoff.md`; rule outcome → `/implementation_engineer` (direct route, Small/Low)
- Remaining gaps: follow-up ticket (Claude backend → SDK streaming input mode), which must remove this policy env
- Next action: route per handoff rules
