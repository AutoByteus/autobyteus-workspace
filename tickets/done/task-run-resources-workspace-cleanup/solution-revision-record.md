# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user request 2026-10-05 | N/A | N/A | Ready for Approval | REQ-001–009, AC-001–009, DEC-001–006 | Presented to user for approval |
| SR-002 | Requirements | User asks Product Team UI work first (2026-10-05) | N/A | Ready for Approval | Ready for Approval (Product Design Requested) | DEC-001–006; REQ-001–006, 008, 009 | Product Design request forwarded |
| SR-003 | Requirements | Product Design Completed, user-confirmed UI (2026-10-06) | N/A | Ready for Approval | Ready for Approval | REQ-002, 008, 009, 010; AC-010, 011; DEC-001–008 | Approved UI integrated; awaiting requirements approval |
| SR-004 | Requirements | User approval SD-AP-001 (2026-10-06) | N/A | Ready for Approval | Approved | All (SR-003 basis) | Architecture design started |
| SR-005 | Design | Architecture design after approval (2026-10-06) | N/A | Approved; design N/A | Approved; Architecture Design Complete (Large/High) | All REQ/AC | Design spec complete; routed per handoff rules |
| SR-006 | Design | ARCH-REV-001 Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004 | Architecture Design Complete | Architecture Design Complete (Large/High), revised | REQ-001, 004, 005, 006, 009 | Design revised; resubmitted for ARCH-REV-002 |
| SR-007 | Requirements | User split + pause (2026-10-06, SD-AP-002) | N/A | Approved; Architecture Design Complete (ARCH-REV-002 Pass) | Approved (REQ-010 moved out); ON HOLD; design Needs Revision on resume | REQ-010, AC-011, BEH-007, UC-004 | Paused; restyle shipped first via delegated-row-clean-style |
| SR-008 | Mixed | User: update worktree and continue (2026-10-06) | N/A | ON HOLD | Approved (resumed); Architecture Design Complete (Large/High), REQ-010 items removed | REQ-010, AC-011 (removed from design) | Worktree updated to 5c74fed71; resubmitted to architecture reviewer |
| SR-009 | Design | Full DESIGN.md check found 2 gaps; user approved revision (2026-10-06) | AE-16, AE-17 | Architecture Design Complete (ARCH-REV-003 Pass) | Architecture Design Complete (Large/High), revised | REQ-004, REQ-005 (Org history list), area contract | Resubmitted to architecture reviewer |

## Revision Entries

### SR-001 — Hide DONE Task agent run resources from the Workspaces tree

- Phase and classification: Requirements / Initial Baseline
- Trigger: User request 2026-10-05 (voice transcript).
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: Requirements `Ready for Approval`; design not started.
- Affected IDs: BEH-001–006, UC-001–003, REQ-001–009, AC-001–009, SCN-001–004, DEC-001–006.
- Scenario-basis changes: N/A (baseline).
- Why recorded: First coherent baseline for approval.
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md` created.
- Supplements: None.
- Product design: N/A.
- Intended behavior changed: Yes (new). Reverses the visibility clause of prior approved REQ-BL-009 Q-2 in `tickets/done/project-task-manager-linked-delegation/requirements-doc.md` (DEC-006).
- Approval impact: Pending explicit user approval.
- Design/review basis: N/A.
- Size/risk: N/A before design.
- Handoff: None (approval hold).
- Remaining gaps: DEC-001–006 confirmation.
- Next action: Obtain user approval; then architecture design.

### SR-002 — Product Design requested before approval

- Phase and classification: Requirements / Refinement (routing; no intended-behavior change)
- Trigger: User message 2026-10-05: "@Product Team could you ask ui to work on UI first then".
- Triggering finding IDs: N/A
- Prior status: Requirements `Ready for Approval` (SR-001).
- Current status: Requirements `Ready for Approval`; Product Design requested; design not started.
- Affected IDs: DEC-001–006 (UX questions forwarded); REQ-001–006, REQ-008, REQ-009.
- Scenario-basis changes: None.
- Why recorded: User directed UI/UX work before approval.
- Canonical sections changed: `investigation-notes.md` › Product Design Request Context; new `product-design-request.md`.
- Supplements: `product-design-request.md` (handoff/request context; not behavior-defining).
- Product design: Requested; no result yet.
- Intended behavior changed: No.
- Approval impact: None; approval still pending and will consider the returned UI result.
- Design/review basis: N/A.
- Size/risk: N/A.
- Handoff: see `product-design-request.md` › Route.
- Remaining gaps: Product result; DEC-001–006; user approval.
- Next action: Await Product Team result; integrate user-approved UI decisions; obtain approval.

### SR-003 — Integrate user-confirmed Product UI/UX result

- Phase and classification: Requirements / Refinement (Product result integration)
- Trigger: `/product_team/product_ui_ux_designer` Design Completed, 2026-10-06; user confirmation "perfect. i like the UI. now i confirm".
- Triggering finding IDs: N/A
- Prior status: Ready for Approval (SR-002).
- Current status: Ready for Approval (awaiting explicit requirements approval).
- Affected IDs: REQ-002, REQ-008, REQ-009 (strengthened to Must, motion/focus details); new BEH-007, UC-004, REQ-010, AC-010, AC-011; DEC-001–006 decided; new DEC-007 (motion), DEC-008 (no archive).
- Scenario-basis changes: None.
- Canonical sections changed: requirements Document Status, behavior table, UC, REQ, AC, UI section, Supplemental Artifacts, Decisions, Traceability, Architecture Phase Input; investigation Product Design Findings.
- Supplements: Product-owned `ui-ux-spec.md` @ design repo `a38bd6e` (behavior-defining, linked not copied).
- Product design incorporated: yes (verified consistency; see investigation notes).
- Intended behavior changed: Yes (REQ-010 row style; motion/focus details).
- Approval impact: requires explicit user approval of SR-003 requirements.
- Design/review basis: N/A (design not started).
- Size/risk: N/A.
- Handoff: none (approval hold).
- Remaining gaps: user approval.
- Next action: obtain approval; start architecture design.

### SR-004 — Requirements approved

- Phase and classification: Requirements / Approval
- Trigger: User 2026-10-06: "coool. i think you already got UI i think its clear the requirement right?" → Solution Designer asked to record as approval → "yess".
- Prior status: Ready for Approval (SR-003). Current: Approved (SD-AP-001).
- Affected IDs: none changed; approval of SR-003 basis (REQ-001–010, AC-001–011, DEC-001–008) and Product `ui-ux-spec.md` @ `a38bd6e`.
- Intended behavior changed: No.
- Approval impact: Approved basis = SR-003 requirements + UI/UX spec @ a38bd6e.
- Next action: Architecture investigation and design.

### SR-005 — Architecture design complete

- Phase and classification: Design / Initial design.
- Trigger: Approved requirements SD-AP-001 (SR-004).
- Prior status: Requirements Approved; design not started. Current: `design-spec.md` complete; `Architecture Design Complete`.
- Affected IDs: REQ-001–010, AC-001–011 mapped in design production-path map.
- Canonical sections changed: new `design-spec.md`; `investigation-notes.md` › Architecture Investigation Findings (AE-01–AE-11).
- Intended behavior changed: No. Design interpretations recorded (not requirement changes): live removal applies to active (streaming) roots, inactive roots hide on next read (REQ-002/REQ-004); Team/Org selection fallback goes to the delegating member, else the root default (REQ-009).
- Evidence discrepancy recorded: Org task rows do not use the shared row component (AE-09); REQ-010 applied directly in the Org collection.
- Approval basis: SR-003 requirements + ui-ux-spec.md @ a38bd6e (SD-AP-001).
- Classification: task_size=Large, architectural_risk=High (shared wire contracts across three root kinds, neutral port read, server+web).
- Handoff: see `solution-design-handoff.md`.
- Next action: independent architecture review per handoff rules.

### SR-006 — Design revision for ARCH-REV-001

- Phase and classification: Design / Design Impact.
- Trigger: `/architecture_reviewer` ARCH-REV-001 Fail (Design Impact), `design-review-report.md`.
- Finding IDs: AR-001 (High), AR-002 (Medium), AR-003, AR-004 (non-blocking).
- Prior status: Architecture Design Complete (SR-005). Current: Architecture Design Complete (revised).
- Changes:
  - AR-001: the Org collaboration-root history item carries `closed_task_executions` through `AgentOrgRunManager.closedTaskExecutionsFor`; the web parser and `projectAgentOrgHistoryRows` apply the shared predicate for both sources (SP-3, AE-12, AE-14).
  - AR-002: the Team filter moves from `projectNavigationRows` to the Workspaces tree consumer `buildRunHistoryTeamExecutionRows` via `isTaskExecutionRowListed`; consumer inventory added; other surfaces are unchanged (AE-13).
  - AR-003: the event payload is the released refs ∩ closed ∩ in-tree; every stored closure read goes through the root-kind manager; no `run-history → port` dependency.
  - AR-004: the supplement inventory is completed.
- Intended behavior changed: No. Clarification: REQ-009 "cannot be selected" is realized for the Workspaces tree and main view. Other Team surfaces (members panel, running list, token usage, mobile focus bar) keep current behavior because they are outside REQ-001's Workspaces-tree scope. Hiding there would be a new requirement.
- Approval impact: none (SD-AP-001 basis unchanged).
- Classification: unchanged, Large/High.
- Handoff: `/architecture_reviewer` for ARCH-REV-002.

#### SR-006 review outcome (informational, 2026-10-06)

- ARCH-REV-002: **Pass** for SR-006 (`design-review-report.md`). AR-001–AR-004 resolved; no new blocking findings.
- Non-blocking R-1–R-4 forwarded by the reviewer to implementation:
  - R-1: SP-1 step 3 payload wording;
  - R-2: explicit port reference on the standalone and Org managers;
  - R-3: widen the `orgRuns` Pick;
  - R-4: evidence pointer AE-01–AE-14.
- The design spec is left unchanged to preserve the reviewed basis.
- Residual: Team-root REQ-009 scope (Workspaces tree + main view); confirm with the user at delivery verification.
- The reviewer delivered the primary handoff to `/implementation_engineer`. The Solution Designer does not repeat it.

### SR-007 — Restyle split out; package paused

- Phase and classification: Requirements / user scope change (reduction) + hold.
- Trigger: User 2026-10-06: "can we bootstrap another ticket for this because I feel this one is a little bit independent"; "work on … this first, and after this is done, then we can come back to work on this."
- Prior status: Requirements Approved (SD-AP-001); design SR-006, ARCH-REV-002 Pass; implementation in progress (uncommitted, about 50 files in this worktree, including the restyle and leave motion).
- Current status: Requirements Approved minus REQ-010 / AC-011 / BEH-007 / UC-004, which moved to `delegated-row-clean-style` (SR-001 there). Package **ON HOLD**.
- Approval: the user's explicit split/pause instruction (SD-AP-002). The remaining intended behavior is unchanged.
- Design impact: on resume, remove REQ-010 items from `design-spec.md` (Removal Plan restyle items, REQ-010 map row, AC-011 tests). Rebase onto the delivered restyle. Reconfirm with the architecture reviewer per handoff rules (the scope reduction is design-only).
- Worktree: preserved as is; the in-progress implementation is not discarded.
- Next action: resume after `delegated-row-clean-style` is delivered.

### SR-008 — Resume after the restyle was delivered

- Phase and classification: Mixed / resume plus design-only scope reduction.
- Trigger: `delegated-row-clean-style` delivered (merged `24e00db81`, release 1.4.95-beta.3). User 2026-10-06: "now udpate the local worktree to continue work on the ticket".
- Prior status: ON HOLD (SR-007). Current: Approved (resumed); design revised.
- Worktree: stash, then `--ff-only` to `origin/personal@5c74fed71`, then stash apply. No conflicts. Backup kept (`stash@{0}`, `refs/backup/task-run-resources-workspace-cleanup-wip-2026-10-06`). See AE-15.
- Design changes: REQ-010 / AC-011 / BEH-007 restyle items removed from `design-spec.md` (production-path map row, Removal Plan, ownership row, file table, sequence, tests). Base references updated. Drift check: no impact.
- Intended behavior changed: No (the SR-007 reduction was already approved).
- Classification: Large/High, unchanged.
- Handoff: `/architecture_reviewer` for re-confirmation (rule for a revised Large/High package). Implementation resumes after that.

#### SR-008 review outcome (informational, 2026-10-06)

- ARCH-REV-003: **Pass** for SR-008 (`design-review-report.md`). The restyle removal is correct; leave motion, focus and selection are kept; AR-001–AR-004 are still resolved.
- Non-blocking R-1–R-4 carry forward to implementation. R-4 is the stale evidence pointer in `design-spec.md` lines 8 and 32. The design spec is left unchanged to preserve the reviewed basis.
- Evidence note: the review summary says the base drift in design-owned paths touches only the restyle files. AE-15 records slightly more: Project authoring-tool files in `projects/services/project-service.ts` and the new `agentOrgLaunchService.ts`. Both conclude there is no design impact, so the difference is not material.
- The reviewer delivered the primary handoff to `/implementation_engineer`. The Solution Designer does not repeat it.

### SR-009 — Protocol-doc sync and per-root closure index

- Phase and classification: Design / Design Impact (self-found).
- Trigger: User asked whether the design principle file was read. The Solution Designer found that `DESIGN.md` had been read only up to about line 150 (truncated tool output) and the package AGENTS.md files not at all, then read all of them (AE-16).
- Findings:
  - AE-16: the touched area contract `agent_websocket_streaming_protocol.md` was not in scope.
  - AE-17: closure lookup was a full scan per call, giving O(Orgs × entries) on the Org history list. The scaling was unstated.
- User: "Is it a big design update or small?" → told it is small → "okayy. approved" (2026-10-06).
- Changes in `design-spec.md`:
  - `closedAgentRunsIn` is backed by a per-host-root closed map derived in `TaskAgentResourceService.swap()`, the same single update point as `owners`;
  - protocol-doc update added to the file table;
  - new "Before accepting a design" summary with the scaling;
  - test for the map's consistency across `swap()`;
  - evidence pointer updated to AE-01–AE-17 (also clears R-4).
- Intended behavior changed: No. Requirements and approval are unchanged.
- Classification: Large/High, unchanged.
- Handoff: `/architecture_reviewer`. Implementation can continue meanwhile; neither change conflicts with built work.

#### SR-009 review outcome (informational, 2026-10-06)

- ARCH-REV-004: **Pass** for SR-009. The protocol-doc scope (AE-16) and the per-host-root closed index (AE-17) are accepted.
- R-5: the map name `closedByHostRoot` would collide with the existing method `TaskAgentResourceService.closedByHostRoot(taskId)`.
  - Editorial correction in `design-spec.md`: the map is now named `closedRunsByHostRoot`, with a no-collision note. There is no structural change.
  - The reviewer has already told implementation to rename it.
- R-6: Agent and Org module docs also need the new event and field, at implementation or docs sync:
  - `autobyteus-server-ts/docs/modules/agent_communication.md`;
  - `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`;
  - `autobyteus-web/docs/agent_orgs.md`.
- R-4: the cosmetic leftover on design-spec line 8 is fixed (pointer AE-01–AE-17).
- The reviewer delivered the primary handoff to `/implementation_engineer`. The Solution Designer does not repeat it.
