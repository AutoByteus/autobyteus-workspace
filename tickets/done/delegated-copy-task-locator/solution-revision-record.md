# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from the approved Product design (implementation Task b541c02a) | N/A | N/A | Ready for Approval | BEH-001..BEH-009; REQ-001..REQ-012; AC-001..AC-020 | Sent to the requester for the user's approval and DEC-001/DEC-002 answers |
| SR-002 | Mixed | User direction 2026-10-11 (resolve details by reasoning) + PTM relay; architecture design | N/A | Ready for Approval | Requirements Approved; Design Ready | REQ-001, REQ-012, AC-020, SCN-014, ASM-001/002, DEC-001/002 | Architecture Design Complete; Large / High → architecture review |
| SR-003 | Design | Architecture review ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002, AR-003, AR-004 | Design Ready (SR-002) | Design Ready (revised); requirements unchanged (Approved SR-002) | REQ-009, AC-015, QR-001, REQ-012, AC-020, REQ-006/007 | Design revised; re-review requested |
| SR-004 | Design (sequence only) | User direction 2026-10-11: work in parallel in own worktree; not blocked | N/A | Design Ready (SR-003, ARCH-REV-002 Pass) | Design Ready; requirements unchanged | None (QR-003, RSK-001 handling) | Row work proceeds now; rebase at integration |

## Revision Entries

### SR-001 — Requirements baseline for implementing the approved "copy → its Task" design

- Phase and classification: Requirements, `Initial Baseline`.
- Triggering input: Project Task `project_task_b541c02a-587d-4ebf-b315-15648cce9d4d` from `/project_task_manager`;
  Product package `delegated-copy-task-locator` (design repo `personal` @ `b08ddf6`); overlap relays from
  `/project_task_manager` (Tasks 7a42fa46 and b2b0538a), 2026-10-11.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: N/A.
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started.
- IDs affected: all (baseline).
- Scenario-basis changes: SCN-014 recorded as `Unclear` (no right panel on the page; not designed).
- Why recorded: first coherent baseline for user approval.
- Canonical sections: `requirements-doc.md` (all), `investigation-notes.md` (all).
- Supplemental artifacts: Product `ui-ux-spec.md`, `VIS-001..014`, `product-ticket.md` linked (externally owned).
- Product design evidence incorporated: approved spec behaviour as REQ-001..REQ-007, REQ-010; rejected alternatives as out of scope.
- Intended behavior changed: `No` relative to the approved UI/UX; adds engineering requirements (REQ-008 rule
  authority, REQ-009 server data and liveness, REQ-011 Tailwind fix) and two open decisions (DEC-001 host scope,
  DEC-002 no right panel).
- Approval impact: UI/UX approved by the user 2026-10-11; this baseline needs explicit user approval.
- Behavior-defining supplement versions: `ui-ux-spec.md` @ design repo `b08ddf6` (approved 2026-10-11).
- Affected design/review basis: N/A.
- Post-design classification: N/A.
- Applied handoff-rule outcome: approval hold; returned to the requester (`/project_task_manager`) to relay to the user.
- Downstream impact: implementation of row changes must wait for the `delegated-team-aggregate-status` merge.
- Remaining gaps: DEC-001, DEC-002, approval of ASM-001.
- Next action: obtain the user's approval and decisions; then architecture design.

### SR-002 — Approval, resolved decisions and architecture design

- Phase and classification: Mixed (`Refinement` of requirements + design).
- Triggering input:
  - The user, directly, 2026-10-11: "…the requirements are rough… they set up the direction. That's why you need to
    use your own reasoning to work out the most reasonable one."
  - `/project_task_manager` relay, 2026-10-11: the same guidance; go with DEC-001 (b) and DEC-002 (a).
- Prior status: requirements `Ready for Approval`; no design.
- Current status: requirements `Approved` (SR-002); `design-spec.md` `Ready`.
- IDs affected:
  - REQ-001 (hosts: Agent + Team runs);
  - REQ-012 / AC-020 / SCN-014 (no right panel → open the row's run, then locate; scenario now Supported Normal);
  - ASM-001, ASM-002 adopted;
  - DEC-001 (b), DEC-002 (a) resolved;
  - Org-run Task workers added to Out Of Scope.
- Note on DEC-001:
  - I first resolved it to (c), adding Org runs. I revised it to (b) the same day, before any handoff.
  - Reasons: the approved Product spec lists Org workers as out of scope; Product never validated them visually;
    and their separate rows would need a restructure. (c) would have widened the approved scope.
- Intended behavior changed: No change to the approved UI/UX. This revision decides details within it.
- Approval basis: the user's direction 2026-10-11 (delegation of details), plus the Product spec user approval
  2026-10-11.
- Design: `design-spec.md`.
  - Server: an additive `taskWorkerTasks` GraphQL read on `ProjectTaskService`, answered from the execution-resource
    index.
  - Client: `taskWorkerTaskStore`, live from `/ws/projects`.
  - Locate: a `taskLocatorStore` request with explicit steps (shell → panel → board → card).
  - Hosts: Agent and Team runs; an `onOpenTeamRun` split for REQ-012.
  - Tailwind `utils/` glob.
- Classification: `task_size=Large`, `architectural_risk=High`. Reasons: a new GraphQL contract; client cache with
  live invalidation; a cross-surface request flow; a shared row that another branch changes at the same time.
- Applied handoff-rule outcome: Architecture Design Complete, Large / High → `/software_engineering_team/architecture_reviewer`.
- Downstream impact: tree-row implementation waits for the `codex/delegated-team-aggregate-status` merge (PTM notifies).
- Remaining gaps: none blocking. Follow-up candidate: Org-run Task workers.
- Next action: independent architecture review.

### SR-003 — Design revision for architecture review ARCH-REV-001

- Phase and classification: Design, `Design Impact`.
- Triggering report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/design-review-report.md`
  (ARCH-REV-001, round 1, Fail).
- Findings: AR-001 (Medium, blocking), AR-002, AR-003, AR-004 (Low), plus the per-key ordering recommendation.
- Prior status: design `Ready` (SR-002). Current status: design `Ready` (SR-003). Requirements unchanged and still
  `Approved` at SR-002.
- Evidence check: I verified AR-001 in source.
  - `ProjectStore.deleteProject` keeps agent run resources and `ProjectService` publishes only `project_removed`.
  - `ProjectTaskService.readTaskChangeView` / `readTaskAt` already map `PROJECT_NOT_FOUND` to null.
- Changes to `design-spec.md`:
  - **AR-001.**
    - The server read uses `readTaskChangeView`: a missing Task or Project → `task: null`.
    - One worker never fails the batch.
    - DS-003 and the store handle `project_removed`, re-reading the workers whose cached Task has that `projectId`.
    - Added a "Project deleted" example and tests.
  - **AR-002.** The Agent host uses a new `open-run` emit wired to `selectAgentRun` (the run row's own open path),
    not `select-run`. Added a test.
  - **AR-003.** The "three hosts" leftovers now read "Agent and Team hosts", and the reason for ref-counted interest
    is restated.
  - **AR-004.**
    - Removed the `drop` branch; an unfinished request simply expires after 10 s.
    - Boards act only when no read of their list is in flight.
  - **Recommendation adopted.** Per-key read epochs in `taskWorkerTaskStore`: a stale response never overwrites a
    newer one.
- Intended behavior changed: No. Approval impact: none (all within approved scope; REQ-012 wording kept).
- Classification: unchanged, `Large` / `High`.
- Next action: architecture re-review.

## Review Notifications (informational)

- 2026-10-11: ARCH-REV-002 (round 2) **Pass** for SR-003; AR-001..AR-004 resolved, no open findings. The reviewer
  handed the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.
  No solution re-authoring; tree-row work still waits for the `codex/delegated-team-aggregate-status` merge.
- 2026-10-11: implementation progress (via the architecture reviewer). Design steps 1–3 are committed on
  `codex/delegated-copy-task-locator`: `40b689078` (server), `6bd2b694a` (web data), `96791230a` (Projects
  surfaces); tests pass (`implementation-progress.md`). Steps 5–6 wait for the `codex/delegated-team-aggregate-status`
  merge. **Pending action for Solution Designer:** when `/project_task_manager` announces that merge, relay it to
  `/software_engineering_team/implementation_engineer`.

### SR-004 — Change sequence: no waiting on the overlapping branch

- Phase and classification: Design (change sequence only), `Refinement`.
- Triggering input: the user, 2026-10-11, directly. Every team works in its own worktree, which is how parallelism
  is achieved; this work is not blocked by another branch.
- Prior status: design `Ready` (SR-003), ARCH-REV-002 Pass. Current status: design `Ready` (SR-004). Requirements
  unchanged (Approved, SR-002).
- Change to `design-spec.md` → Change / Refactor Sequence:
  - The old step 4 ("wait for `codex/delegated-team-aggregate-status`") is removed.
  - The tree-row work proceeds now in this worktree, under the unchanged QR-003 constraints.
  - A new integration step: rebase on the latest `origin/personal` before delivery. Whichever branch lands second
    resolves the small overlap.
  - RSK-001 mitigation restated accordingly.
- Structure, ownership, interfaces and classification are unchanged. No re-review is needed. ARCH-REV-002 reviewed
  the same structure, and its sequence verdict concerned order, not a dependency on the other branch.
- Notified: `/software_engineering_team/implementation_engineer` (proceed with the row work and validation) and
  `/project_task_manager` (why the work is not blocked). The earlier "pending relay on merge" is no longer needed.
