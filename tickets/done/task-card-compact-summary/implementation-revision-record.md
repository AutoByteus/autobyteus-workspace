# Implementation Revision Record — `task-card-compact-summary`

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `solution_designer` / `handoff-implementation.md` / SR-002 (direct route) | N/A | `Initial Baseline` | SR-002 | Implementation complete; routed to direct API/E2E |

## Revision Entries

### IR-001 — Compact Task cards: working clamp, bounded card text and labels

**Trigger and classification**
- Triggering role, report path, and round: `/solution_designer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/task-card-compact-summary/tickets/in-progress/task-card-compact-summary/handoff-implementation.md`, SR-002 (Small/Low, direct route).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: implementation complete for REQ-001..004 and AC-001..006.

**Related revisions**
- Solution: `SR-002`.
- Architecture review: `N/A`.
- Code review: `N/A`.
- API/E2E: `N/A`.
- Delivery: `N/A`.

**Why this baseline is recorded:** it is the first implementation handoff for the approved package.

**Approved behavior or requirement IDs affected:** BEH-001 (changed); BEH-002/003 (preserved); REQ-001..004.

**Implementation delta**
- `taskSummary.ts`:
  - `taskPreview`;
  - `boundTaskText` (word boundary, surrogate-safe, "…" within `max`);
  - `taskCardSummary` / `taskCardPreview` (300);
  - `taskSummaryLabel` (120).
- `ProjectTaskRow.vue`:
  - `block` is removed from both clamped spans, and the preview gets `break-words`;
  - the text is bounded and the `aria-label` uses the label;
  - the preview has a test id.
- `ProjectTaskDetail.vue`: the delete message uses the label.
- Tests: `taskSummary.spec.ts` (extended) and `ProjectTaskRow.spec.ts` (new).
- Probe: PMU-013.
- Docs: `docs/projects.md` and `TESTING.md`.

**Local validation and result**
- Projects web specs: 185 pass. The 1 failure, `org-definition-navigation`, also fails on the base.
- The localization guard and audit pass.
- `vue-tsc`: no errors in changed files.
- Browser probe: PMU-001..013 Pass, 13/13.
- Mutation run: PMU-013 against the old row fails (a 58,752 px summary).

**Next recipient or routing:** `get_handoff_rules` → direct API/E2E (Small/Low).

**Remaining limitations or risks**
- The packaged desktop was not run.
- The probe's row bound was relaxed from 160 to 200 px after the run (measured maximum 156 px).
