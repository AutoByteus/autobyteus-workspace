# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-12) | N/A | N/A | Ready for Approval | BEH-001..005, REQ-001..009, AC-001..008, DEC-001..011 | Awaiting the user's decisions DEC-001..003 and approval |
| SR-002 | Requirements | User conversation 2026-11-10 (design summary, location, approval) | N/A | Ready for Approval | Approved | REQ-003, REQ-005, AC-001, DEC-001, DEC-002, DEC-003, DEC-006, DEC-010, SCN-006 | Location `memory/semantic/<agent>/`; minimal instruction section; approved by the user |
| SR-003 | Mixed | Architecture design | AF-01..AF-26 | Approved (requirements); design N/A | Approved; design Ready | REQ-002, AC-007, DEC-012; UNK-001, UNK-002 | Design spec written; Large / High |
| SR-004 | Mixed | User request 2026-11-10: put the prompt in a contract file | N/A | Approved; design Ready (in architecture review) | Approved; design Ready | REQ-004, REQ-005, REQ-008, REQ-009, AC-001, AC-005 | `semantic-memory-prompt-contract.md` added as behavior-defining supplement |

## Revision Entries

### SR-001 — Requirements baseline for agent semantic memory

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task autobyteus-12 from `/project_task_manager` (the user's direction 2026-11-09/10)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not yet created
- IDs affected: BEH-001..005, SCN-001..006, UC-001..004, REQ-001..009, AC-001..008, DEC-001..011
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline presented to the user for approval
- Canonical sections changed: all of `requirements-doc.md`, `investigation-notes.md`; `follow-ups.md` FU-001..004 created
- Supplemental artifacts: `follow-ups.md`
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: pending the user's answer on DEC-001, DEC-002, DEC-003
- Behavior-defining supplements: None
- Design/review basis: N/A
- Task-size/risk classification: N/A before design
- Handoff: N/A
- Downstream impact: N/A
- Remaining gaps: UNK-001, UNK-002 (architecture phase)
- Next action: obtain the user's approval, then architecture design

### SR-002 — User decisions and approval

- Phase and classification: Requirements, `Refinement`
- Triggering input: the user in the Solution Designer conversation, 2026-11-10: (1) the system only tells the agent where its folder is; managing semantic memory (structure, rules, future distillation from work journals) is the agent's; (2) put it inside the memory folder as `semantic`; (3) "don't rename … the episodic … too much changes"; (4) "I agree with you" to the summarized design.
- Triggering finding IDs: N/A
- Prior status: Ready for Approval (SR-001)
- Current status: Approved
- IDs affected: REQ-003 (location `<data-dir>/memory/semantic/<agent>/`), REQ-005 (minimal section, no system rules), AC-001, DEC-001 (user: inside memory folder), DEC-002 (user: no history), DEC-003 (user: switch + path only), DEC-006 and DEC-010 (no system guidance), SCN-006; Out Of Scope gains "no renaming of run folders"
- Scenario-basis changes: SCN-006 mitigation is left to skills
- Why recorded: user decisions and approval
- Canonical sections changed: requirements Document Status, REQ-003, REQ-005, AC-001, Decisions, Out Of Scope, SCN-006, Readiness; investigation notes (scanner evidence, user evidence, RSK-001/002); follow-ups (a briefly added FU-005 removed after the user decided against renaming)
- Supplemental artifacts: `follow-ups.md`
- Product design evidence: N/A
- Intended behavior changed: Yes (location, instruction content)
- Approval impact: approved by the User, 2026-11-10, baseline SR-002
- Behavior-defining supplements: None
- Design/review basis: N/A (design not yet written)
- Task-size/risk classification: N/A before design
- Handoff: N/A
- Downstream impact: N/A
- Remaining gaps: UNK-001, UNK-002 (architecture)
- Next action: architecture design

### SR-003 — Architecture design

- Phase and classification: Mixed (`Refinement` of REQ-002 within the direction + design)
- Triggering input: architecture investigation AF-01..AF-26 (Codex sandbox probe AF-01/AF-02; personal settings AF-19); the user's remark of 2026-11-10 that making the folder writable differs per runtime (answered with the per-runtime table)
- Triggering finding IDs: AF-19 (switch for package agents must survive package updates), AF-20/AF-14/AF-24 (file sizes)
- Prior status: requirements Approved (SR-002); design not created
- Current status: requirements Approved (REQ-002 refined, DEC-012 added, Solution Designer within the direction, user informed in the conversation); `design-spec.md` Ready
- IDs affected: REQ-002, AC-007, DEC-012; UNK-001, UNK-002 resolved
- Scenario-basis changes: none
- Canonical sections changed: requirements REQ-002, AC-007, Decisions; investigation notes Architecture Investigation Findings, UNK rows, reproduction; `design-spec.md` created; `follow-ups.md` FU-005..FU-009
- Intended behavior changed: refinement within the approved direction (where the app's switch saves for package agents)
- Approval impact: no renewed user approval needed (within direction; user informed)
- Post-design classification: task_size Large, architectural_risk High (shared contracts: agent-config.json, personal-settings.json, GraphQL; Codex/Claude write-access boundary; all runtimes)
- Handoff: per handoff rules (recorded in `handoff-architecture-design.md`)
- Remaining gaps: Codex app-server `writable_roots` to be shown in E2E; DeepSeek harness untestable here (FU-007)
- Next action: independent architecture review per the handoff rules

### SR-004 — Prompt contract

- Phase and classification: Mixed, `Refinement`
- Triggering input: the user, 2026-11-10: "write the prompt also inside a contract file … because implementation engineer doesn't like invent itself"
- Prior status: requirements Approved, design Ready (sent to architecture review at SR-003)
- Current status: same; supplement added
- IDs affected: REQ-004, REQ-005, REQ-008, REQ-009, AC-001, AC-005
- Canonical sections changed: requirements Document Status (supplements), REQ-005 source, Supplemental Artifacts; investigation supplement inventory; design spec approval basis, supplements, examples, implementation guidance
- Supplemental artifacts added: `semantic-memory-prompt-contract.md` (exact text = the text shown to and approved by the user in the conversation; placement after `## Project`, before native-only sections; presence rule; path form; examples incl. disabled and Windows)
- Intended behavior changed: No (the approved text is fixed as a contract)
- Approval impact: supplement in the approval basis, Solution Designer within the direction at the user's request, user informed
- Design/review impact: architecture reviewer informed of the added supplement; design structure unchanged; classification unchanged (Large / High)
- Next action: architecture review continues on the SR-004 package
