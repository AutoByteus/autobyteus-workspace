# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial user bug report, screenshots, code/history investigation, and targeted reproduction | N/A | N/A | Ready for Approval | BEH-001-BEH-006; REQ-001-REQ-006; AC-001-AC-010 | Root cause confirmed; session-scoped retention requirements proposed for explicit user approval |
| SR-002 | Requirements | User clarification that switching must preserve drafts for all run types, whether new or existing, followed by explicit approval | N/A | SR-001 Ready for Approval | Approved | BEH-004; REQ-001, REQ-005; AC-009; SCN-004; DEC-001 | Generalized the product contract across standalone Agent, Agent Team, and Agent Org without changing the session-only boundary; explicitly approved by the user on 2026-09-22 |
| SR-003 | Architecture | Approved SR-002 plus post-approval Agent/Team/Org lifecycle comparison | N/A | Requirements Approved; design N/A | Architecture Design Complete | BEH-001-BEH-006; REQ-001-REQ-006; AC-001-AC-010 | Retain Agent Org roots across navigation, reserve explicit release for archive/delete, remove destructive view/facade coupling; Medium/Low |

## Revision Entries

### SR-001 — Agent Org in-session draft retention baseline

- Phase and classification: `Requirements` / `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: User report dated 2026-09-22 with three screenshots; repository investigation on refreshed `origin/personal`; targeted temporary Vitest reproduction; existing test suites.
- Triggering finding IDs: N/A — initial baseline.
- Prior authoritative requirements/design status: N/A.
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design `N/A — not started before approval`.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001-BEH-006; REQ-001-REQ-006; AC-001-AC-010; SCN-001-SCN-006; DEC-001.
- Scenario-basis or scenario-validity changes: Established cross-Agent-Org and cross-surface navigation as supported normal scenarios; established explicit archive/delete/session teardown as release boundaries; cross-restart draft persistence is out of scope.
- Why this baseline or revision was recorded: Investigation reproduced the defect and isolated it to Agent Org view departure invoking full context disposal. It also showed sent history survives through server hydration and that standalone Agent/Agent Team do not share the same disposal path.
- Canonical requirements, investigation and design sections changed: Created complete `requirements-doc.md`; expanded `investigation-notes.md`; design remains N/A.
- Supplemental artifacts added, changed or removed: Indexed three user-supplied screenshots with hashes and dimensions. Temporary reproduction spec was deleted after execution and is not a supplement.
- Prototype evidence or product decisions incorporated: N/A — no Product Design request.
- Intended behavior changed: `Yes` — proposed correction makes ordinary in-session navigation retain Agent Org drafts instead of discarding them.
- Approval impact, exact approved requirements baseline and user-approval reference: Explicit user approval of this `SR-001` baseline is required. No approval has been recorded yet.
- Behavior-defining supplement versions and approval references: N/A.
- Affected design/review basis invalidated or rebuilt: N/A — no design exists yet.
- Post-design task-size/risk classification and rationale changes: N/A before design completion.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: N/A — routine approval hold; no handoff.
- Downstream and architecture-review impact: Architecture design, size/risk classification, and downstream routing are blocked until explicit approval.
- Remaining gaps, assumptions or blocked decisions: User must approve session-scoped behavior, including cross-surface navigation and the explicit exclusion of cross-restart persistence/TTL change.
- Next action: Present the evidence-backed requirements summary and request explicit approval. After approval, record the exact reference and begin architecture investigation/design.

### SR-002 — Uniform draft-retention contract across run types and run age

- Phase and classification: `Requirements` / `User Clarification`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: User clarification dated 2026-09-22 that a user drafting text or context in an Agent Org, Agent Team, or standalone Agent run must be free to switch to other runs and return without retyping, regardless of whether the run is newly started or existing.
- Triggering finding IDs: N/A — direct intended-behavior clarification.
- Prior authoritative requirements/design status: `SR-001` requirements were ready for approval but not yet approved; design N/A.
- Current authoritative requirements/design status: `SR-002` requirements approved; architecture design authorized and in progress.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-004; REQ-001; REQ-005; AC-009; SCN-004; DEC-001.
- Scenario-basis or scenario-validity changes: The navigation-retention expectation is now expressly uniform across standalone Agent, Agent Team, and Agent Org composers and across newly started and existing runs.
- Why this revision was recorded: The earlier baseline described standalone Agent and Agent Team primarily as preserved regression surfaces. The user clarified that retention on those surfaces is an affirmative product requirement even if current evidence indicates they already satisfy it.
- Canonical requirements, investigation and design sections changed: Updated desired outcome, BEH-004, UC-004, REQ-001, REQ-005, AC-009, SCN-004, and DEC-001; updated investigation intake summary; design remains N/A.
- Supplemental artifacts added, changed or removed: None.
- Prototype evidence or product decisions incorporated: N/A — no visible redesign requested.
- Intended behavior changed: `Clarified` — the same session-scoped behavior is required for all supported run types and both new and existing runs.
- Approval impact, exact approved requirements baseline and user-approval reference: User explicitly replied "approve" on 2026-09-22 after the `SR-002` session-scoped, all-run-types summary. `SR-002` is the approved requirements baseline.
- Behavior-defining supplement versions and approval references: N/A.
- Affected design/review basis invalidated or rebuilt: N/A — no design exists yet.
- Post-design task-size/risk classification and rationale changes: N/A before design completion.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: N/A — routine approval hold; no handoff.
- Downstream and architecture-review impact: Architecture investigation/design may proceed; downstream routing remains pending completed design and classification.
- Remaining gaps, assumptions or blocked decisions: None at requirements level. Persistence across full app restart remains explicitly out of scope.
- Next action: Complete architecture investigation/design against approved `SR-002`, classify the solution, and route the implementation-ready package.

### SR-003 — Agent Org retained-root lifecycle design

- Phase and classification: `Architecture` / `Architecture Design Complete`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: User approved `SR-002` and asked whether Agent Org should use a design similar to Agent Team. Post-approval investigation compared the Agent, Agent Team and Agent Org context/stream/view lifecycles.
- Triggering finding IDs: N/A — initial architecture round on the approved baseline.
- Prior authoritative requirements/design status: `SR-002` requirements approved; design N/A.
- Current authoritative requirements/design status: `SR-002` remains the exact approved requirements baseline; `design-spec.md` is Ready under `SR-003`.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001-BEH-006; REQ-001-REQ-006; AC-001-AC-010; SCN-001-SCN-006; DEC-001.
- Scenario-basis or scenario-validity changes: None. Architecture implements the approved normal navigation and explicit release scenarios without adding cross-restart persistence.
- Why this baseline or revision was recorded: The Agent Team comparison is correct at the lifecycle-invariant level: session contexts outlive view selection. Agent Org already has the needed retained multi-root owner, but its view incorrectly invokes a full-release method during navigation.
- Canonical requirements, investigation and design sections changed: Requirements approval/current revision metadata updated; architecture investigation added to `investigation-notes.md`; complete `design-spec.md` created.
- Supplemental artifacts added, changed or removed: None; supplied screenshots remain evidence only.
- Prototype evidence or product decisions incorporated: N/A — no UI redesign or Product Design work required.
- Intended behavior changed: `No` — design realizes approved `SR-002`.
- Approval impact, exact approved requirements baseline and user-approval reference: No renewed approval required. Exact baseline is `SR-002`, explicitly approved by user reply `approve` on 2026-09-22.
- Behavior-defining supplement versions and approval references: N/A.
- Affected design/review basis invalidated or rebuilt: Initial design established. No prior design/review basis existed.
- Post-design task-size/risk classification and rationale changes: `task_size=Medium`; `architectural_risk=Low`. Production change is bounded to existing frontend owners; no new external contract, persistence, security, deployment, runtime owner or concurrency mechanism.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: Matched `Architecture Design Complete` with `task_size=Medium` and `architectural_risk=Low`; selected direct implementation recipient `/software_engineering_team/implementation_engineer`. Canonical handoff file: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/solution-handoff.md`.
- Downstream and architecture-review impact: Direct implementation route selected; independent architecture review is N/A for this classification.
- Remaining gaps, assumptions or blocked decisions: None. Escalate if implementation discovers resource eviction, stream concurrency, persistence or a second draft authority is required.
- Next action: Persist the full handoff context, apply handoff rules, and notify the single matching recipient.
