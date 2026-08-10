# Architecture Review Revision Record — Background Agent Renderer Contention

The latest `design-review-report.md` remains authoritative. This record retains concise architecture-review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 — initial SR-001 architecture review | SR-001 | N/A | Fail — Design Impact | ARCH-001, ARCH-002 |
| ARCH-REV-002 | Round 2 — SR-002 re-review | SR-001, SR-002 | Fail — Design Impact | Fail — Design Impact | ARCH-001, ARCH-002 |
| ARCH-REV-003 | Round 3 — SR-003 re-review | SR-001, SR-002, SR-003 | Fail — Design Impact | Fail — Design Impact | ARCH-001, ARCH-002 |
| ARCH-REV-004 | Round 4 — SR-004 re-review | SR-001, SR-002, SR-003, SR-004 | Fail — Design Impact | Pass | ARCH-001, ARCH-002 |

## Revision Entries

### ARCH-REV-001 — Initial baseline identifies two missing frontend lifecycle integrations

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`
- Review round and trigger: Round 1; initial handoff from `solution_designer` for SR-001.
- Triggering role, report path, and finding IDs: `solution_designer`; no prior review report; N/A.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: The typed shared egress, status transition filter, sole scheduler, shared projector, effect model, and indexed navigation owner are sound. Independent source tracing established that SR-001 does not yet connect supported live task-agent/task-team topology mutations to the cached navigation lifecycle and does not map the Event Monitor final-witness cache through all current context/conversation/activity hydration owners.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `ARCH-001`, `ARCH-002`
- Material classification changes: Initial baseline established as `Fail — Design Impact`.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: Status identity and handler-effect completeness remain implementation-sensitive but are sufficiently specified for re-review once the two lifecycle gaps are corrected. Real Electron media/file evidence remains downstream validation.

### ARCH-REV-002 — Event Monitor lifecycle closes; exact task-row consumer remains unmapped

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`
- Review round and trigger: Round 2; SR-002 re-review handoff from `solution_designer` for ARCH-001 and ARCH-002.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`; ARCH-001, ARCH-002.
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: SR-002 now provides a task-local actual mutation result, topology precedence, one `TeamStreamingService` adaptation boundary, mutation-bearing early/drop outcomes, bounded synchronous/delayed cleanup, and a complete Event Monitor reset/prime/commit lifecycle. Re-review corrected the exact current task-navigation evidence path: transient task rows are deliberately excluded from stable `runHistoryTeamRows` and are instead constructed in `workspaceTeamExecutionDisplayRows.ts` from the live team context inside `WorkspaceHistoryWorkspaceSection.vue`. That current consumer and its removal/relocation are absent from SR-002 mappings, and task-detail-only fields are incorrectly classified as workspace-navigation presentation changes.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-001 | Open | Open — partially resolved | SR-002; ARCH-PREM-001; ARCH-PREM-003 | Task writer/router/facade ownership is now concrete, but `utils/workspaceTeamExecutionDisplayRows.ts`, its tests, and the section's `getLiveTeamContext(...)` projection remain unmapped. Current row types/tests exclude task description/reference/timeline fields, so those cannot drive the navigation `PRESENTATION` lane. |
| ARCH-002 | Open | Resolved | SR-002; ARCH-PREM-002 | DS-006 defines idempotent reset/prime/commit, zero-work unprimed `NONE`, one conservative real unprimed commit, synchronous replacement ordering, preserved subscribed reuse, exact context/open/hydration/task/promotion/removal callers, and lifecycle coverage. |

- New or remaining finding IDs: `ARCH-001`; no new finding ID was needed because the remaining gap is the same task-navigation enclosure issue.
- Material classification changes: None. Overall result remains `Fail — Design Impact`; ARCH-002 is resolved and ARCH-001 is narrowed to the current transient-row consumer/decommission and navigation-effect tightness.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: Nested status identity, exhaustive handler effects, aggregate browser performance, and final Electron media/file evidence remain downstream implementation/test risks. The scoped source paths reviewed here are unchanged by the 11 newer `origin/personal` commits, which concern media-generation recovery and one unrelated server setting registration.

### ARCH-REV-003 — Row/focus correction passes; ordinary task-agent resolver still bypasses the mutation result

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`
- Review round and trigger: Round 3; SR-003 re-review handoff from `solution_designer` for remaining ARCH-001.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`; ARCH-001.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: SR-003 successfully relocates the current stable/transient workspace-row composer and tests under run-history ownership, makes the indexed projection its sole production caller, removes component live-context row/focus construction, restricts task navigation presentation to `displayName`/visible agent `currentStatus`, preserves right-pane task details, and coordinates finite manual focus writers. Independent current-source tracing then found another production source mutation within the same still-open ARCH-001: ordinary task-agent messages bypass the task router result when `resolveTeamStreamMemberContext` calls `ensureTaskAgentContext` after the router returned `continue`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-001 | Open — partially resolved | Open — narrowed to ordinary task-agent resolver enclosure | SR-003; ARCH-PREM-004 | SR-003 closes the exact row-consumer/removal, field-tightness, right-pane, focus, and one-owner gaps from ARCH-REV-002. Current `TeamStreamingService:398-419` and `teamStreamMemberContextResolver:76-89` show that a first ordinary task-agent status can still call `ensureTaskAgentContext` after the router returned no mutation, so the cached row receives no topology result. |
| ARCH-002 | Resolved | Resolved | SR-002, SR-003 | SR-003 does not change the verified Event Monitor reset/prime/commit lifecycle or its caller inventory. |

- New or remaining finding IDs: `ARCH-001`; no new ID was created because the omitted resolver is another live task-topology caller under the same unresolved enclosure finding.
- Material classification changes: None. Overall result remains `Fail — Design Impact`; ARCH-001 is now limited to one exact production caller/result gap.
- Recommended recipient: `solution_designer`
- Remaining risks or uncertainty: The corrected row relocation and focus contract are implementation-sensitive but adequately specified. Nested status identity, generic handler effects, Event Monitor lifecycle implementation, aggregate browser performance, and final Electron evidence remain downstream risks.

### ARCH-REV-004 — Ordinary task-agent mutation path closes; design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`
- Review round and trigger: Round 4; SR-004 re-review handoff from `solution_designer` for ARCH-001 / ARCH-PREM-004.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/design-review-report.md`; ARCH-001.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Prior authoritative decision: `Fail — Design Impact`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: SR-004 replaces the context-only task-agent ensure API with a composite context-plus-mutation result, moves every exact identity-bearing ensure/repair into the task router, requires a mutation on every router outcome, merges it in `TeamStreamingService` before all branches, and makes the later member resolver observational. First status/content, repair, no-op, early/drop, existing/first offline, generic-status coordination, open/reuse restoration, and discarded-result prevention are all mapped with bounded build/patch coverage. All SR-003 row/detail/focus corrections and the SR-002 Event Monitor lifecycle remain intact.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-001 | Open — ordinary task-agent resolver enclosure | Resolved | SR-004; ARCH-PREM-004 | `ensureTaskAgentProjection` returns context plus actual mutation; the router invokes it for ordinary identity-bearing events and requires mutation on all outcomes; the facade merges before every return; `teamStreamMemberContextResolver` is read-only; open/reuse restoration folds into the topology seed; static and focused coverage reject ignored results and duplicate builds. |
| ARCH-002 | Resolved | Resolved | SR-002–SR-004 | Event Monitor reset/prime/commit semantics and exact lifecycle callers remain unchanged and coherent. |

- New or remaining finding IDs: None.
- Material classification changes: `Fail — Design Impact` -> `Pass`.
- Recommended recipient: `implementation_engineer`
- Remaining risks or uncertainty: Equality classification, mechanically complete result capture, build/patch timing, nested status identity, handler-effect/baseline conversion, row/focus fidelity, aggregate browser performance, and final Electron evidence are explicit downstream implementation/test risks rather than unresolved design findings.
