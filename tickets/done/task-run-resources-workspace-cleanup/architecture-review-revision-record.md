# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-10-06) | SR-003, SR-004, SR-005 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / Revised Architecture Design Complete (2026-10-06) | SR-006 | Fail (Design Impact) | Pass | AR-001–AR-004 (resolved) |
| ARCH-REV-003 | Round 3 / SR-008 resume re-confirmation (2026-10-06) | SR-007, SR-008 | Pass | Pass | None (R-4 still open, non-blocking) |
| ARCH-REV-004 | Round 4 / SR-009 DESIGN.md full-read revision (2026-10-06) | SR-009 | Pass | Pass | None blocking; R-5, R-6 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Initial review: the core design is sound; the Org history read path and the Team filter point need revision

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-review-report.md`
- Review round and trigger: Round 1; `Architecture Design Complete` from `/solution_designer` (`solution-design-handoff.md`, 2026-10-06).
- Triggering role, report path, and finding IDs: `/solution_designer`; `solution-design-handoff.md`; N/A (first review).
- Relevant solution revision IDs: SR-003 (requirements basis), SR-004 (approval SD-AP-001), SR-005 (design).
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- Baseline established:
  - The behavior basis is confirmed and the classification (Large/High) is confirmed.
  - The core architecture is accepted: Task-side closure; a port read; a closed list beside the unchanged tree; a sequenced event from the shared release scope; listing-only filtering in the browser; persisted data `Not Affected`.
  - Two blocking gaps remain: the Org tree renders from the collaboration-root history list, which carries no closure (AR-001); and the Team filter sits on the shared navigation projection, which surfaces outside the Workspaces tree also consume (AR-002).

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (High, blocking)
  - AR-002 (Medium, blocking)
  - AR-003 (Low, non-blocking)
  - AR-004 (Low, non-blocking)
- Material classification changes: N/A
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - The REQ-009 Team/Org interpretation is accepted as a residual risk.
  - The AE-09 Org row-style drift is deferred.

### ARCH-REV-002 — Revised design resolves AR-001–AR-004; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-review-report.md`
- Review round and trigger: Round 2; revised `Architecture Design Complete` (SR-006) from `/solution_designer`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `solution-design-handoff.md` › SR-006 Revision; AR-001–AR-004.
- Relevant solution revision IDs: SR-006 (basis SR-003/SR-004 unchanged; SD-AP-001).
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The behavior basis was reconfirmed. Every prior finding was checked against the current design spec, the investigation notes (AE-12–AE-14, supplement inventory) and source.
  - No new blocking findings. Non-blocking implementation recommendations R-1–R-4 were added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High, blocking) | Resolved | SR-006; design-spec SP-3, Interface mapping, file table, sequence 3–4, tests | The `agent_org` history item carries `closed_task_executions` through `AgentOrgRunManager.closedTaskExecutionsFor`, and `projectAgentOrgHistoryRows` filters both sources. `CollaborationRootHistoryService` already holds `orgRuns` (verified). AE-14 was verified against round-1 reads. |
| AR-002 | Open (Medium, blocking) | Resolved | SR-006; Interface mapping, "Team navigation-row consumer inventory" | Option (a): `projectNavigationRows` is unchanged; `buildRunHistoryTeamExecutionRows` filters through `isTaskExecutionRowListed`; the inventory covers all five consumers plus focus. There is a DONE-time focus fallback in the Team view state. Leaving other Team surfaces unchanged is recorded as a residual risk. |
| AR-003 | Open (Low) | Resolved | SR-006; SP-1 step 0; Ownership Map | The payload is released ∩ closed ∩ in-tree. Stored reads go through the managers, and `run-history` never depends on the port. Step 3's older wording is left as R-1. |
| AR-004 | Open (Low) | Resolved | SR-006; investigation-notes Supplemental Artifact Inventory | The inventory lists the UI/UX spec, `product-design-request.md` and the review artifacts. |

- New or remaining finding IDs: None open. Non-blocking recommendations R-1–R-4.
- Material classification changes: none (Large/High).
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational).
- Remaining risks or uncertainty:
  - REQ-009 is scoped to the Workspaces tree and main view for Team roots. Other Team surfaces can still focus a closed member.
  - The Team/Org "delegating member" mapping.
  - AE-09 Org row-style drift.

### ARCH-REV-003 — Resume re-confirmation after the restyle split; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-review-report.md`
- Review round and trigger: Round 3; SR-008 resume from `/solution_designer` (`solution-design-handoff.md` › SR-008 Resume).
- Triggering role, report path, and finding IDs: `/solution_designer`; N/A (no findings).
- Relevant solution revision IDs: SR-007 (REQ-010 / AC-011 / BEH-007 / UC-004 split out, SD-AP-002), SR-008 (resume; base `5c74fed71`).
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The scope reduction is design-only. The restyle items were removed from `design-spec.md`, and the leave motion, focus and selection items are kept.
  - Base drift `88851166f..5c74fed71` in design-owned paths is limited to the delivered restyle files. Verified with `git diff --name-only`; consistent with AE-15.
  - No structural verdict changed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-004 | Resolved (ARCH-REV-002) | Still resolved | SR-008 | SP-3, the AR-002 inventory and option (a), and the manager-owned closure reads are all still in `design-spec.md`. The `agentOrgHistoryRows.ts` fallback is still present at the new base. |

- New or remaining finding IDs: None. Non-blocking R-1–R-4 carry forward (R-4: the evidence pointer still says AE-01–AE-11).
- Material classification changes: None (Large/High).
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational).
- Remaining risks or uncertainty: unchanged from ARCH-REV-002. Additionally, the stash and backup ref must not be dropped until the implementation is committed (AE-15).

### ARCH-REV-004 — Protocol-doc scope and per-root closed index (SR-009); Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/design-review-report.md`
- Review round and trigger: Round 4; SR-009 from `/solution_designer` (`solution-design-handoff.md` › SR-009 Revision). The trigger was the designer's own full re-read of `DESIGN.md` (AE-16, AE-17). The user approved the revision on 2026-10-06.
- Relevant solution revision IDs: SR-009.
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The reviewer also read `DESIGN.md` in full.
  - The protocol-doc scope addition was verified against § Team Server Messages.
  - The derived index in `swap()` was verified as the same owner, the same single update point and the same lifecycle as `owners`. It is proportionate, because AR-001 created a nested-loop cost on the normal history-list path.
  - No structural verdict changed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001–AR-004 | Resolved | Still resolved | SR-009 | SR-009 does not touch SP-3, the AR-002 inventory or the manager-owned reads. |
| R-4 (non-blocking) | Open | Mostly resolved | SR-009 | Design-spec line 32 reads AE-01–AE-17; line 8 still says AE-01–AE-11 (cosmetic). |

- New or remaining finding IDs:
  - No blocking findings.
  - New non-blocking R-5: the private map name `closedByHostRoot` collides with the existing method `TaskAgentResourceService.closedByHostRoot(taskId)`; rename it.
  - New non-blocking R-6: Agent/Org module docs (`docs/modules/agent_communication.md`, `docs/modules/standalone_agent_run_root.md`, `autobyteus-web/docs/agent_orgs.md`) need the new event and field at docs sync.
  - R-1–R-3 carry forward.
- Material classification changes: None (Large/High).
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational).
- Remaining risks or uncertainty: unchanged from ARCH-REV-003.
