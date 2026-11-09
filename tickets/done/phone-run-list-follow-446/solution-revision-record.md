# Solution Revision Record — autobyteus-446

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Investigation and reproduction | N/A | N/A | Approved (Solution Designer within the direction, user informed) | BEH-001…006, REQ-001…003, AC-001…006 | Bug, not network; requirements approved |
| SR-002 | Design | Architecture design | N/A | Requirements Approved | Design Ready; Medium / Low | REQ-001…003; DS-001 | Closed-set digest on the poll's statuses answer |

## Revision Entries

### SR-001 — Closed Task's delegated rows stay on lists where their host is not open

- Phase and classification: `Initial Baseline`
- Trigger: Project Task autobyteus-446 and the user's comments (2026-11-09); reproduction `evidence/repro-run-1`.
- Prior status: N/A. Current status: requirements Approved.
- IDs affected: all of the requirements doc at SR-001.
- Intended behavior changed: `Yes` (rows of a closed or reopened Task follow on the list's refresh in every window).
- Approval: by the Solution Designer within the Task's direction ("fix it only if it is a bug": it is a bug); the user was informed in the Solution Designer's conversation and the PM by message on 2026-11-09. No `Needs user` decision: no UI change, no data change, no release.
- Remaining gaps: UNK-001 (Team hosts), resolved in design as not affected, with a validation check.
- Next action: design.

### SR-002 — Design

- Phase and classification: `Design`
- Trigger: architecture investigation (`design-spec.md`).
- Prior status: requirements Approved, no design. Current: design Ready.
- IDs affected: REQ-001…003; DS-001.
- Intended behavior changed: `No`. Approval impact: none.
- Classification: `task_size: Medium`, `architectural_risk: Low` (an additive field on an internal query, plus a contracts function; no persistence, security or new concurrency).
- Follow-ups recorded: FU-001 (inactive hosts), FU-002 (key copies).
- Applied handoff-rule outcome: `handoff-sr-002.md`; rule "Small or Medium and Low risk → implementation" routes it to `/software_engineering_team/implementation_engineer`.
- Next action: implementation.

### Note (no new SR round): user confirmation and autobyteus-380

- 2026-11-09: the PM relayed the user's go-ahead in his words: "Ok great yeah, let's work on the fix now." It confirms the SR-001 requirements and the SR-002 fix approach; nothing changes. Implementation already holds the SR-002 package.
- The PM asks that the receipt say whether this fix covers part of autobyteus-380 ("delegated copies stay listed after their Task closed; copies of temporary Tasks are never closed").
  - Preliminary answer, to confirm at the receipt: it covers the first part for active hosts in windows where the host is not the open run (on the list's refresh).
  - It does not cover copies whose Task never closes (temporary Tasks), because those never become closed task executions.
  - It does not cover stopped hosts (FU-001).
