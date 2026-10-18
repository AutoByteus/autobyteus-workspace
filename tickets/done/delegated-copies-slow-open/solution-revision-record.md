# Solution Revision Record — delegated-copies-slow-open

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Project Task e6985045 dispatched by `/project_task_manager`, 2026-10-18; re-measurement after Task 8641c0ac | N/A | N/A | Approved (Solution Designer within the direction, user informed) | BEH-001..BEH-005; REQ-001..REQ-008; AC-001..AC-009; QR-001, QR-002; DEC-001..DEC-006 | Baseline with measured cause |
| SR-002 | Requirements | Design-phase evidence (no per-copy error UI exists; artifact content route shares the generic lookup) | N/A | Approved (SR-001) | Approved (Solution Designer within the direction) | AC-004, REQ-004, Out Of Scope | Clarification, no change of intent |
| SR-003 | Design | Architecture design on approved SR-002 | N/A | Design N/A | Design Ready; `task_size=Medium`, `architectural_risk=High` | DS-001..DS-005; D-1..D-5; FU-1..FU-4 | Architecture Design Complete |
| SR-004 | Design | Architecture review ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002; residuals R-A, R-B, R-C | Design Ready (SR-003), review Fail | Design Ready; classification unchanged | D-2, D-4, D-5, DS-005; REQ-003, AC-004, AC-006, AC-007 (protected, unchanged) | Architecture Design Complete (revised) |

## Revision Entries

### SR-001 — Requirements baseline with measured cause

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Project Task e6985045 (user reports 2026-10-14/17/18, screenshots 46/47/53); update 2026-10-18 asks to re-measure after the memory refactor.
- Triggering finding IDs: N/A.
- Prior status: N/A.
- Current status: requirements `Approved`.
- IDs affected: BEH-001..BEH-005, REQ-001..REQ-008, AC-001..AC-009, SCN-001..SCN-005, QR-001, QR-002, DEC-001..DEC-006.
- Scenario-basis changes: N/A (baseline).
- Why recorded: first coherent baseline.
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md` (source log, runtime findings).
- Supplemental artifacts: `probes/open-cost-probe.test.ts`, `probes/shape.py`, `probes/probe-run1.txt` (evidence).
- Product design evidence: N/A.
- Intended behavior changed: N/A (baseline).
- Approval: Solution Designer within the direction (the Task directs fast rows and lazy details within the current storage); user informed in this conversation, 2026-10-18. No `Needs user` decision.
- Behavior-defining supplements: none.
- Affected design/review basis: N/A.
- Classification: N/A.
- Handoff: none at this round.
- Remaining gaps: U-001 (wall time in the app) for validation.
- Next action: architecture design.

### SR-002 — Clarification of AC-004 and REQ-004

- Phase and classification: Requirements, `Refinement`.
- Trigger: architecture investigation. The app has no per-copy error display (collaboration `errors` and the team-member inspection error state are not rendered). The artifact content route (`/runs/:runId/file-change-content`) uses the same unscoped lookup for every run kind.
- Triggering finding IDs: N/A.
- Prior status: Approved (SR-001).
- Current status: Approved.
- IDs affected: AC-004 (failure outcome: logged, retried on the next open; "same session" made precise as "while the hub's view is kept"); REQ-004 ("details" = conversation, activities, artifact list); Out Of Scope (artifact content route named under FU-3).
- Scenario changes: none.
- Why recorded: keep requirements consistent with design evidence and Non-Goals (no new UI).
- Sections changed: requirements Document Status, REQ-004, AC-004, Out Of Scope.
- Intended behavior changed: `No` (clarifies the outcome within the direction; no new behavior).
- Approval: Solution Designer within the direction; user informed in the same conversation message as the design result.
- Affected design basis: design written on SR-002.
- Next action: design.

### SR-003 — Architecture design

- Phase and classification: Design, `Initial Baseline` (design).
- Trigger: approved SR-002.
- Prior status: design N/A.
- Current status: `design-spec.md` Ready.
- IDs affected: DS-001..DS-005; D-1..D-5; FU-1..FU-4; all BEH/REQ/AC mapped.
- Sections: `design-spec.md` (all); `investigation-notes.md` Architecture Investigation Findings.
- Intended behavior changed: `No`.
- Approval impact: none (design only).
- Classification: `task_size=Medium` (about 9 production files in two existing subsystems, one new web file, one additive query); `architectural_risk=High` (on-demand hydration changes the lifecycle and concurrency with live events and submissions; new public GraphQL query).
- Handoff: see `handoff-architecture-design-complete.md` (route recorded there).
- Downstream impact: independent architecture review expected under the High-risk rule.
- Remaining gaps: U-001 (in-app wall time), R-002 (message payload) measured during validation.
- Next action: architecture review.

### SR-004 — Design revision for ARCH-REV-001

- Phase and classification: Design, `Design Impact`.
- Trigger: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` round 1 (ARCH-REV-001), 2026-10-18: Fail.
- Triggering finding IDs: AR-001 (High, blocking), AR-002 (Low); residuals R-A, R-B, R-C.
- Prior status: requirements Approved (SR-002); design Ready (SR-003), review Fail.
- Current status: requirements Approved (unchanged); design Ready (SR-004).
- IDs affected: D-2, D-4, D-5, DS-005, Ownership Map, Interface table, file mapping, example, Risks, test guidance (b), Change Scope docs; protects REQ-003, AC-004, AC-006, AC-007.
- Changes:
  - AR-001:
    - A load is bound to one published collaboration context and one child.
    - It ends `superseded`, with no retry and no commit, as soon as that context is no longer published.
    - Retry applies only to revision or commit conflicts within the same context.
    - The store is the single dedupe owner, keyed by (published context, child) through a `WeakMap`, so the key never spans a republication.
    - After every publication, a fresh load starts for the selected child.
    - New test: republish during a load.
  - AR-002: the pending-submission guard is dropped; the presentation revision covers a just-shown local message.
  - R-A: the hub-own-projection line was added to `probes/probe-run1.txt`, with its source run.
  - R-B: the docs scope notes live artifacts for children of a running hub.
  - R-C: accepted and recorded (D-4, R-004).
- Intended behavior changed: `No`.
- Approval impact: none (design-only; SR-002 approval stands).
- Classification: unchanged, `task_size=Medium`, `architectural_risk=High`.
- Handoff: `handoff-architecture-design-complete.md` updated; route → `/software_engineering_team/architecture_reviewer` (re-review).
- Remaining gaps: U-001, R-002 for validation.
- Next action: architecture re-review.

### Review receipt — ARCH-REV-002 (informational, no new SR round)

- 2026-10-18: `/software_engineering_team/architecture_reviewer` reported **Pass** (ARCH-REV-002) on SR-004. AR-001, AR-002 and R-A are resolved. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- The reviewer handed the package to `/software_engineering_team/implementation_engineer`. No duplicate forwarding by the Solution Designer.

### Follow-ups sent (informational, no new SR round)

- 2026-10-18: at the user's request, FU-1..FU-4 were sent to `/project_task_manager` with `followups-for-project-task-manager.md`. `design-spec.md` Change Scope marks them as sent, so the delivery receipt must not resend them.
- 2026-10-18: `/project_task_manager` recorded them as Tasks (TODO, not dispatched): FU-1 = autobyteus-151, FU-2 = autobyteus-152, FU-3 = autobyteus-153, FU-4 = autobyteus-154. This ticket's Task key is autobyteus-93.
