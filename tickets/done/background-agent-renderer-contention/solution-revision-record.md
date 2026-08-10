# Solution Revision Record — Background Agent Renderer Contention

The current `requirements.md`, `investigation-notes.md`, `design-spec.md`, and supplemental evidence remain authoritative. This record indexes completed solution rounds without duplicating them.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User-approved initial solution round | N/A | `Initial Baseline` | Shared server-egress and frontend projection design ready for architecture review |
| SR-002 | `architecture_reviewer` / `design-review-report.md` / ARCH-REV-001 | ARCH-001, ARCH-002 | `Design Impact` | Reachable task-topology and Event Monitor baseline lifecycles enclosed; ready for re-review |
| SR-003 | `architecture_reviewer` / `design-review-report.md` / ARCH-REV-002 | ARCH-001 | `Design Impact` | Actual stable/transient workspace-row bypass removed from target; task presentation restricted to represented row fields; ready for re-review |
| SR-004 | `architecture_reviewer` / `design-review-report.md` / ARCH-REV-003 | ARCH-001 / ARCH-PREM-004 | `Design Impact` | Ordinary task-agent ensure/repair moved into required mutation-bearing router; member resolver made read-only; ready for re-review |

## Revision Entries

### SR-001 — Shared Presentation-Egress And Bounded Frontend Projection Baseline

- Triggering role, report path, and round: User-approved initial solution round; no review report yet.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: Initial design baseline is ready for architecture review.
- Why this baseline or revision entry is recorded: Investigation isolated a supported renderer-wide amplification path and the user approved correcting both the avoidable upstream status pressure and the unreasonable frontend mutation/navigation structures in this ticket.
- Resolution: Preserve canonical lifecycle companions, background subscriptions, the configurable 500 ms content cadence, and progressive rich Markdown. Introduce one per-connection typed presentation-egress pipeline shared by standalone and team sockets: ordered forward/suppress filters, exactly one scheduling owner, and non-authoritative observers. Add exact status-transition filtering after identity enrichment. Replace duplicate frontend generic dispatch transactions with handler-reported mutation effects, an effect-driven recent Event Monitor coordinator, and a run-history-owned indexed navigation projection.
- Approved behavior or requirement IDs affected: BEH-001–BEH-009; FR-001–FR-007; AC-001–AC-010.
- Canonical artifacts and sections updated: `requirements.md` (approved behavior, requirements, acceptance criteria); `investigation-notes.md` (production paths, historical lifecycle rationale, runtime/source evidence); `design-spec.md` (full baseline design, removals, spines, ownership, contracts, file mapping, sequence, risks).
- Supplemental artifacts updated, added, or removed: `performance-evidence.md` and retained `probe-evidence/` remain current evidence-only supplements; no intended-behavior supplement was added.
- Downstream and architecture-review impact: Review must validate exact nested identity, filter-before-scheduler semantics, one-scheduler authority, actual handler-effect coverage, Event Monitor final-witness lifecycle, navigation topology/patch separation, and clean-cut removal of the multiplied paths.
- Next recipient or routing: `architecture_reviewer` for initial architecture review.
- Remaining gaps or risks: Distributed frontend mutation writers need implementation-time exhaustive mapping; nested task-team status identity must reuse enriched fields and fail open; deterministic browser coverage must be followed by a final Electron voice/file smoke because device latency is partly external.

### SR-002 — Enclose Live Task Topology And Event Monitor Baseline Lifecycles

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`; `ARCH-REV-001`.
- Triggering finding IDs: ARCH-001, ARCH-002.
- Prior authoritative result: `Fail — Design Impact` for SR-001.
- Current authoritative result: Bounded design rework is complete and ready for architecture re-review.
- Why this baseline or revision entry is recorded: Architecture review independently traced two supported paths omitted from SR-001: live task-agent/task-team source mutations can change the cached navigation hierarchy before generic dispatch, and the proposed Event Monitor final-witness cache spans conversation plus activity inputs established by separate lifecycle writers.
- Resolution: DS-002/DS-007 now route every actual task root/child/task-agent create, reparent, visible update, and cleanup through one task-local `NONE`/`PRESENTATION`/`TOPOLOGY` result. Task helpers remain source owners, `TeamStreamingService` adapts/commits the result once, and run history remains the authoritative navigation owner; there is no deep watcher or dynamic-builder fallback. DS-006 now defines idempotent reset/prime/unprimed semantics, synchronous replacement ordering, an exact standalone/team/template/recovery/lazy-hydration/task/promotion/removal caller inventory, and lifecycle coverage without restoring a before scan.
- Approved behavior or requirement IDs affected: BEH-003, BEH-005, BEH-006; FR-002, FR-003, FR-005; AC-002, AC-003, AC-007, AC-009. Requirements remain unchanged and approved.
- Canonical artifacts and sections updated: `investigation-notes.md` (source log, production paths, SPINE-05/SPINE-06, file inventory, resolved questions/risks); `design-spec.md` (current state, behavior map, DS-002/DS-006/DS-007, owners, interfaces, caller inventories, event/effect table, files, removals, sequence, examples, risks, guidance); this revision record.
- Supplemental artifacts updated, added, or removed: None; `performance-evidence.md` and `probe-evidence/` remain current and unchanged.
- Downstream and architecture-review impact: Re-review should verify that every supported task outcome carries an actual mutation even on early return/drop after mutation; topology precedence and asynchronous cleanup cause at most one build per operation; task helpers do not depend on run history; reset-to-prime replacement has no await/stream gap; preserved subscribed contexts are not reset; and unprimed `NONE` remains zero-work.
- Next recipient or routing: `architecture_reviewer` for ARCH-REV-002.
- Remaining gaps or risks: Implementation must faithfully return actual field-change flags from distributed task helpers and apply every mapped context lifecycle hook. Nested egress identity, handler-effect completeness, aggregate browser performance, and final Electron device/file evidence remain the already-recorded downstream risks.

### SR-003 — Put Stable/Transient Workspace Rows And Focus Behind Run History

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`; `ARCH-REV-002`.
- Triggering finding IDs: ARCH-001 (partially resolved in SR-002; remaining workspace-row projection and field-tightness gaps).
- Prior authoritative result: `Fail — Design Impact` for SR-002; ARCH-002 resolved, ARCH-001 open.
- Current authoritative result: Bounded design rework is complete and ready for architecture re-review.
- Why this revision entry is recorded: Architecture re-review traced the actual transient workspace-row production path that SR-002 omitted. `WorkspaceHistoryWorkspaceSection` calls the generic `workspaceTeamExecutionDisplayRows` helper with a live team context and reads live focus, while stable run-history rows intentionally filter transient tasks. The review also confirmed that task details excluded by that row contract were incorrectly classified as navigation presentation.
- Resolution: Run history now owns a tight `RunHistoryTeamExecutionRow` shape and completed `TeamTreeNode.executionRows`. The current pure stable/transient composition semantics/tests relocate under run history, with `runHistoryNavigationProjection` as the only production caller; the old utility, component computed/live-context contract, child inference, and dependent fixture path are removed cleanly. Topology covers identity/path/kind/order/depth/children; task `PRESENTATION` admits only actual `displayName`/visible-agent-`currentStatus` changes; description, references, arguments, timeline, and task-detail status remain with the existing right-pane owner and yield navigation `NONE`. One run-history focus facade coordinates source focus/hydration plus the exact cached focus, while cleanup fallback focus remains part of topology.
- Approved behavior or requirement IDs affected: BEH-003, BEH-006; FR-002, FR-003, FR-005; AC-002, AC-003, AC-004, AC-007, AC-009. Requirements remain unchanged and approved.
- Canonical artifacts and sections updated: `investigation-notes.md` (base revalidation, source log, current production path, SPINE-02/SPINE-05, file inventory, ownership findings, constraints/questions/risks); `design-spec.md` (current state/intended change, BEH-003/006, DS-002/DS-007, tight row/mutation types, ownership/removal/interfaces, decision table, exact file mapping, coverage, sequence, tradeoffs/risks/guidance); this revision record.
- Supplemental artifacts updated, added, or removed: None. `performance-evidence.md` and the six retained `probe-evidence/` files remain current and unchanged because SR-003 corrects the mapped production/target ownership rather than the retained measurements.
- Downstream and architecture-review impact: Re-review should verify clean-cut disposal of `utils/workspaceTeamExecutionDisplayRows.ts`, relocation rather than duplication of its semantics/tests, stable/transient ordering/depth/child/status/focus preservation behind run history, no component live-context bypass, field-tight task presentation, right-pane detail independence, finite focus-writer closure, and one build/patch semantics.
- Next recipient or routing: `architecture_reviewer` for ARCH-REV-003.
- Remaining gaps or risks: Implementation must keep the stable member tree transient-free while publishing completed execution rows, convert every enumerated focus caller, and avoid either dropping or duplicating transient rows during relocation. Existing egress identity, handler-effect, Event Monitor lifecycle, aggregate browser performance, and final Electron evidence risks remain unchanged.

### SR-004 — Enclose Ordinary Task-Agent Ensure/Repair Before Member Resolution

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`; `ARCH-REV-003`.
- Triggering finding IDs: ARCH-001 / material premise ARCH-PREM-004.
- Prior authoritative result: `Fail — Design Impact` for SR-003; ARCH-002 and all prior SR-003 row/detail/focus sub-gaps remain resolved.
- Current authoritative result: The remaining ordinary task-agent resolver mutation is enclosed and the package is ready for architecture re-review.
- Why this revision entry is recorded: Architecture review traced a supported first task-agent `AGENT_STATUS running`/content path where the task router returns `continue`, then `resolveTeamStreamMemberContext` calls `ensureTaskAgentContext` and mutates task context/maps/tree after the task accumulator saw no topology result. Under the authoritative cached row design, the first transient row could remain unpublished.
- Resolution: The context-only `ensureTaskAgentContext` export is replaced cleanly by `ensureTaskAgentProjection -> {context, mutation}`. All exact identity-bearing task-agent ensure/repair moves into `teamTaskExecutionEventRouter.ts`, including ordinary non-task-team-scoped messages. The router returns the ensured context and makes `TaskExecutionProjectionMutation` required on every `continue`/`handled`/`drop`/`memberContext` outcome. `TeamStreamingService` merges it before every branch, commits pre-generic topology only when needed/not immediately removed, coordinates any later exact generic status patch, and merges offline cleanup without a second full build. `teamStreamMemberContextResolver.ts` becomes read-only existing-context lookup. First create/reparent/map-tree repair is topology; represented row display/status is field-tight presentation; unchanged ensure is none. All mutation-bearing helper calls must have captured results, including open/reuse restore folded into its one topology seed.
- Approved behavior or requirement IDs affected: BEH-003, BEH-006; FR-002, FR-003, FR-005; AC-001, AC-002, AC-007, AC-009. Requirements remain unchanged and approved.
- Canonical artifacts and sections updated: `investigation-notes.md` (ARCH-REV-003 source evidence, ordinary resolver production path, SPINE-01/SPINE-05, file inventory, ownership/constraints/questions/risks); `design-spec.md` (current state/intended change, BEH-003/006, DS-002/DS-007, required router result, read-only resolver, event/effect table, boundaries/dependencies/interfaces, exact files, coverage/static checks, sequence, tradeoffs/risks/guidance); this revision record.
- Supplemental artifacts updated, added, or removed: None. `performance-evidence.md` and six retained `probe-evidence/` files remain current and unchanged.
- Downstream and architecture-review impact: Re-review should verify ordinary first-status/content enclosure, router ownership of all identity-bearing ensure/repair, required mutation propagation before early returns, a read-only resolver, generic-status/offline-cleanup coordination, no discarded topology-helper result, and at-most-one full build plus only a necessary exact patch.
- Next recipient or routing: `architecture_reviewer` for ARCH-REV-004.
- Remaining gaps or risks: Implementation must compare existing ensure/repair precisely enough to distinguish topology from none, make result use mechanically visible at every production helper call, and avoid duplicate topology builds around generic status/offline cleanup. Previously recorded egress identity, handler-effect, Event Monitor lifecycle, stable/transient relocation, focus, aggregate browser, and Electron evidence risks remain.
