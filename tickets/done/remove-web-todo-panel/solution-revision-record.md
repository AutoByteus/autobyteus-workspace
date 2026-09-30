# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user report 2026-09-29 | N/A | N/A | Ready for Approval | BEH-001..004; REQ-001..005; AC-001..006; DEC-001, DEC-002 | Awaiting user approval |
| SR-002 | Mixed (Evidence + Requirements) | User feedback 2026-09-29: investigate why to-dos never appear; replace To-Do with Claude background tasks | N/A | Ready for Approval (SR-001, unapproved) | Ready for Approval | BEH-005, BEH-006 added; REQ-002 changed; REQ-006..010 added; AC-002 changed; AC-007..012 added; SCN-003..004; DEC-001 decided; DEC-002 superseded; DEC-003..006 added | Awaiting user approval |
| SR-003 | Mixed (Evidence + Requirements) | User feedback 2026-09-29: naming, tab switching, Antigravity question | N/A | Ready for Approval (SR-002, unapproved) | Ready for Approval | DEC-006, DEC-008 decided; DEC-007, BEH-007, REQ-011, AC-013, SCN-005 added; REQ-010 changed | Awaiting user approval |
| SR-004 | Mixed (Evidence + Requirements) | User feedback 2026-09-29: section like To-Do; AGY daemon experiments; live-only | N/A | Ready for Approval (SR-003, unapproved) | Ready for Approval | DEC-004, DEC-005 decided; BEH-001, BEH-007, REQ-002, REQ-011, AC-002, AC-013, SCN-005, UI section changed; ASM-003 added | Awaiting user approval |
| SR-005 | Requirements | User approval 2026-09-29 | N/A | Ready for Approval (SR-004) | Approved | DEC-003, DEC-007 decided; all REQ/AC approved | Architecture design started |
| SR-006 | Design | Architecture design after approval (SR-005) | N/A | Requirements Approved; design N/A | Requirements Approved; design Ready | All BEH/REQ/AC mapped; no requirement change | task_size Large, architectural_risk High |

## Revision Entries

### SR-001 — Remove the dead To-Do panel and `TODO_LIST_UPDATE` path

- Phase and classification: Requirements — Initial Baseline
- Triggering evidence: User screenshot/report; code investigation showing no runtime can deliver non-empty todos (native tools removed in `fa0fd927a`; Codex mappings forward payloads without `todos`; `turn/taskProgressUpdated` absent from Codex 0.159.0 protocol).
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: Requirements `Ready for Approval`; design not started.
- IDs affected: BEH-001..004, REQ-001..005, AC-001..006, SCN-001..002, DEC-001..002
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline presented for approval.
- Canonical sections changed: all (created)
- Supplemental artifacts: None
- Prototype evidence: N/A
- Intended behavior changed: `Yes` (proposed; supersedes REQ-003/BEH-003 of `tickets/done/remove-todo-list-tools`, which preserved the server/web path on the now-disproven assumption that Codex populated it)
- Approval impact: Pending explicit user approval
- Behavior-defining supplements: None
- Design/review basis invalidated: N/A
- Task-size/risk classification: N/A before design
- Handoff outcome: None yet (approval hold)
- Downstream impact: N/A
- Remaining gaps: DEC-001, DEC-002 user confirmation
- Next action: Obtain user approval, then architecture design.

### SR-002 — Why Codex to-dos never appear; replace To-Do with Claude background tasks

- Phase and classification: Mixed (Evidence + Requirements) — Refinement / user change to intended behavior
- Triggering user feedback: 2026-09-29 — "I want to remove all the to-do list events… rename the to-do as background tasks… for Claude Agent SDK… show it in progress… when it's finished, show that it's finished"; "I never see there are to-do's… You have to investigate." User declined inspection of personal `~/.codex` session files; investigation used protocol + code only.
- Triggering finding IDs: N/A
- Prior status: Requirements Ready for Approval (SR-001, never approved)
- Current status: Requirements Ready for Approval; design not started
- IDs affected: BEH-005, BEH-006 (new); REQ-002 (changed), REQ-006..010 (new); AC-002 (changed), AC-007..012 (new); SCN-003, SCN-004 (new); UC-003 (new); QR-002 (new); ASM-002 (new); DEC-001 decided (A), DEC-002 superseded by DEC-004, DEC-003..006 (new)
- Scenario-basis changes: Added Claude background-task scenarios (Supported Normal; evidence Probe C + streaming-input ticket).
- Why recorded: Evidence showed the Codex to-do path is broken four ways (plan mode never enabled; `turn/taskProgressUpdated` nonexistent; `turn/plan/updated` unhandled; payload never carries `todos`). User changed intended behavior to add background-task visibility — the UI deferred by `claude-sdk-streaming-input-session` DEC-006.
- Canonical sections changed: requirements (all sections), investigation notes (new "SR-002 Investigation" section)
- Supplemental artifacts: None
- Prototype evidence: N/A
- Intended behavior changed: `Yes`
- Approval impact: Pending renewed explicit user approval of SR-002 incl. DEC-003..006
- Behavior-defining supplements: None
- Design/review basis invalidated: N/A (no design yet)
- Task-size/risk classification: N/A before design (expected larger than SR-001: new cross-package contract + Claude projection)
- Handoff outcome: None (approval hold)
- Downstream impact: N/A
- Remaining gaps: DEC-003..006 confirmation; SDK 0.3.280 frame-shape verification in design
- Next action: Obtain user approval, then architecture design.

### SR-003 — Naming, no tab switching, other runtimes (Antigravity)

- Phase and classification: Mixed (Evidence + Requirements) — Refinement
- Triggering user feedback: 2026-09-29 — "name it as a background tasks"; "Are there other ones? Antigravity?"; "no tab switching… keep it as how it behaves now"; tasks stay listed after done "just like the activity itself".
- Prior status: Ready for Approval (SR-002, unapproved) → Current: Ready for Approval
- IDs affected: DEC-006 decided; DEC-008 added/decided; DEC-007, BEH-007, REQ-011, AC-013, SCN-005 added; REQ-010 changed (Must; title; tab behavior unchanged)
- Evidence: investigation notes "SR-003 — Other runtimes"; only Claude (full lifecycle) and AGY daemons (start + stop-by-AutoByteus only) start background tasks.
- Intended behavior changed: `Yes` (pending approval)
- Approval impact: renewed explicit approval needed; DEC-003/004/005/007 pending
- Design impact: N/A (no design yet)
- Next action: user confirmation, then architecture design.

### SR-004 — Section behaves like today's To-Do; AGY daemon exit is observable

- Phase and classification: Mixed (Evidence + Requirements) — Refinement
- Triggering user feedback: 2026-09-29 — section "just like the to do section today… no background tasks"; "did you already do experiments… if it's possible, that's definitely good"; "of course it's not a persistent".
- Evidence: probes P3/P4 (`probes/agy-daemon-exit-signal-probe.py`, `probe-evidence/p3-*.log`, `p4-*.log`): AGY writes a per-conversation message file at daemon exit with step index and exit code; nothing on stdout until the next user turn.
- Prior status: Ready for Approval (SR-003, unapproved) → Current: Ready for Approval
- IDs affected: DEC-004 decided (always present, empty state); DEC-005 decided (live only); DEC-007 recommendation updated; BEH-001, BEH-007, REQ-002, REQ-011, AC-002, AC-013, SCN-005, UI section changed; ASM-003 added
- Intended behavior changed: `Yes` (pending approval)
- Approval impact: renewed explicit approval needed; DEC-003, DEC-007 pending
- Design impact: N/A (no design yet)
- Next action: user approval, then architecture design.

### SR-005 — Requirements approved

- Phase and classification: Requirements — approval capture
- Trigger: User 2026-09-29: "Approve. … we can actually use the event approach. Earlier we called it to do list events… call it like background process event or something… because we're always using event driven approach."
- Prior status: Ready for Approval (SR-004) → Current: Approved
- IDs affected: DEC-003, DEC-007 decided (recommendations); REQ-011/AC-013 no longer conditional
- Intended behavior changed: `No` (approval of SR-004 content)
- Approval: explicit user approval of the SR-004 baseline incl. all REQ-001..011, AC-001..013
- Design guidance (non-normative for requirements, binding for design direction): event-driven realization; a background-task event replaces the to-do event across the stream.
- Next action: architecture design.

### SR-006 — Architecture design complete

- Phase and classification: Design — Initial design (no requirement change)
- Trigger: Requirements approval SR-005 and user design guidance (event-driven background-task event)
- Prior status: Requirements Approved; design not started → Current: Requirements Approved; `design-spec.md` Ready
- IDs affected: none changed; all BEH-001..007, REQ-001..011, AC-001..013 mapped in design-spec behavior map
- Canonical sections changed: `design-spec.md` (new); investigation notes "Architecture Investigation Findings (post-approval, SR-006)"
- Key design decisions: event `BACKGROUND_TASK_UPDATED` (per-task upsert snapshot, not activity, not persisted); Claude registry extended as single owner with change callback; new `AgyBackgroundTaskMonitor` polling AGY message files (fail-safe); shared `agent-background-task.ts` domain vocabulary; extracted `agy-brain-file.ts`; web `agentBackgroundTaskStore` + `BackgroundTaskPanel` in To-Do's place; full to-do removal.
- Intended behavior changed: `No`
- Approval impact: None (design realizes approved SR-004/SR-005 basis)
- Post-design classification: `task_size = Large`, `architectural_risk = High` (shared contract change; new runtime owner reading undocumented AGY files; events outside turns; five subsystems)
- Handoff outcome: see `solution-handoff.md`
- Remaining gaps: SDK 0.3.280 raw task_type verification (non-shell kinds); AGY file-format drift (fail-safe)
- Next action: apply handoff rules

#### SR-006 review note — ARCH-REV-001 Pass (informational)

- 2026-09-29: Architecture review ARCH-REV-001 round 1 returned **Pass** on SR-005/SR-006 basis; no blocking findings. Report: `design-review-report.md`; reviewer record: `architecture-review-revision-record.md`. Reviewer delivered the package to `/implementation_engineer` (no repeated handoff by Solution Designer).
- Non-blocking AR-REC-001 (editorial staleness in requirements UI section/SCN-001/Desired Outcome/UC-003 wording and several superseded investigation-note lines; supplement inventory title) deferred to the next solution touch; authoritative REQ/AC/DEC items are unambiguous, so no approval or design impact.
