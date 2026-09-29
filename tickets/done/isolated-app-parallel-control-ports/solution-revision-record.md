# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user request (2026-09-29) | N/A | N/A | Ready for Approval | BEH-001..008, REQ-001..008, AC-001..009 | Awaiting user approval and DEC-001..003 |
| SR-002 | Requirements | User: "keep it simple" (2026-09-29) | N/A | Ready for Approval (SR-001) | Ready for Approval | REQ-001..004, AC-001..005 | Simplified scope: auto free port + docs |
| SR-003 | Mixed | User approval (2026-09-29) + design | N/A | Ready for Approval | Approved; Design Ready | REQ-001..004 | Small / Low; design complete |

## Revision Entries

### SR-001 — Parallel-safe isolated-app control ports: requirements baseline

- Phase and classification: Requirements, `Initial Baseline`
- Triggering user feedback: The user reported that the fixed Electron E2E port breaks parallel E2E engineers in different worktrees who use browser-automation.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`. Design not started.
- IDs affected: BEH-001..008, REQ-001..008, AC-001..009, SCN-001..005, DEC-001..003
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline presented to the user for approval
- Canonical sections changed: All sections created (`requirements-doc.md`, `investigation-notes.md`)
- Supplemental artifacts: None
- Prototype evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: Approval pending
- Behavior-defining supplement versions: N/A
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: None. Approval hold stays in the requirements conversation.
- Downstream impact: None yet
- Remaining gaps: DEC-001..003, ASM-001..002, UNK-001..002 (architecture probes)
- Next action: Obtain the user's decisions and explicit approval, then architecture design

### SR-002 — Simplified baseline at the user's request

- Phase and classification: Requirements, `Refinement`
- Trigger: User asked to keep the solution simple and for a single recommendation (2026-09-29).
- Prior status: SR-001 `Ready for Approval` (never approved)
- Current status: Requirements `Ready for Approval`. Design not started.
- IDs affected:
  - SR-001 REQ-001..008 were replaced by REQ-001..004.
  - AC-001..009 were replaced by AC-001..005.
  - Registry owner scoping (old REQ-005/006) was dropped.
  - Readiness identity proof (old REQ-003) was dropped.
  - DEC-002 was withdrawn.
- Why:
  - Once the default is an OS-assigned random free port instead of the shared 9333, concurrent starts practically never contend for the same port. The existing busy check still fails cleanly if they do.
  - Cross-worktree `stop`/`restart` is avoided by the docs rule "always pass your own `instanceId`". Every engineer already receives it from `start`.
- Intended behavior changed: Yes, the scope was reduced. SR-001 was not approved, so no approval is invalidated.
- Approval impact: Approval of SR-002 pending.
- Next action: Obtain explicit user approval, then a concise design.

### SR-003 — Approval recorded and design completed

- Phase and classification: Mixed (approval capture + Design)
- Trigger: User approval "if yes, lets do it" (2026-09-29). It followed the recommendation against adding `--port` to the browser CLI, recorded as DEC-004 = No.
- Prior status: Requirements `Ready for Approval` (SR-002). No design.
- Current status: Requirements `Approved` (basis SR-002). Design `Ready`.
- IDs affected: REQ-001..004, AC-001..005, DEC-001/003 approved, DEC-004 decided
- Canonical sections changed:
  - `requirements-doc.md`: status, approval and decisions.
  - `investigation-notes.md`: architecture-phase findings.
  - `design-spec.md`: created.
- Intended behavior changed: No (approval of SR-002 as-is)
- Approval reference: User message in conversation, 2026-09-29
- Post-design classification: `task_size=Small`, `architectural_risk=Low`. One lifecycle function, its tests and probe, and doc edits. CLI contract fields and codes are unchanged.
- Downstream impact: Two repositories are touched. The superrepo task branch holds the code, tests and docs. `autobyteus_mcps` needs a separate worktree from `origin/main` for the one-line SKILL.md edit, because the main checkout is dirty with unrelated changes.
- Remaining gaps: Real packaged validation of concurrent auto-port starts (API/E2E)
- Next action: Apply the handoff rules for `Architecture Design Complete`
