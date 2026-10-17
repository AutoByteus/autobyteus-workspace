# Architecture Review Revision Record — task-keys-and-dependencies

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-10-17) | SR-001 | N/A | Pass | None (non-blocking REC-001–REC-004) |
| ARCH-REV-002 | Round 2 / SR-002 re-review (2026-10-17) | SR-001, SR-002 | Pass | Fail | AR-001, AR-002, AR-003, AR-004 (new); REC-005, REC-006 (non-blocking) |
| ARCH-REV-003 | Round 3 / SR-003 re-review (2026-10-17) | SR-001, SR-002, SR-003 | Fail | Pass | AR-001–AR-004 resolved; REC-007, REC-008 (non-blocking, new) |

## Revision Entries

### ARCH-REV-001 — Initial baseline: keys, depends on, backfill migration

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` from `/software_engineering_team/solution_designer`, handoff `handoff-architecture-design-complete.md`.
- Triggering role, report path, and finding IDs: Solution Designer; N/A; N/A.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Pass`
- Baseline established:
  - The behavior basis BEH-001 to BEH-010 is confirmed against the current code at `c600028072`.
  - The Large/High classification is confirmed.
  - The persisted-data decisions are accepted: Migration Required for keys; Directly Usable for `dependsOnTaskIds`.
  - The material premises are recorded: MP-001 Not Reachable; MP-002 Unsupported and harmless.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none blocking; non-blocking recommendations REC-001 (strip `taskKeys` at runtime in `ProjectService.toView`), REC-002 (allocation leaves the Project's `updatedAt` unchanged), REC-003 (guideline checklist item 8 line), REC-004 (QR-002 wording note).
- Material classification changes: none.
- Recommended recipient: implementation (primary pass rule); Solution Designer (informational).
- Remaining risks or uncertainty: server and web shipped separately (out of scope); codegen needs a running server; global catalog lock for creates (accepted tradeoff).

### ARCH-REV-002 — SR-002 extension: keys as the agent-facing Task ID, tool dependencies, reserved prefixes, key URLs

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/design-review-report.md`
- Review round and trigger: round 2; SR-002 re-review request from `/software_engineering_team/solution_designer` (user-approved scope extension, 2026-10-17).
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md` (SR-002); N/A.
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Pass` (ARCH-REV-001, SR-001 only)
- Current authoritative decision: `Fail`
- What changed in the review result:
  - SR-001 verdicts are preserved.
  - Confirmed for SR-002: D-REF (single resolver; key and ID strings are disjoint, MP-004 Not Reachable); canonical IDs inward; D-RETIRED; tool `depends_on` through the SR-001 validation; the link-builder inventory.
  - Raised against SR-002:
    - two approved-requirement ambiguities: AR-001 (no long ID vs context-file paths); AR-002 (Temp-task IDs in `delegate_task`);
    - two design gaps: AR-003 (web route reference used as the Task identity); AR-004 (no reference defined for a deleted current Task, MP-003 Reachable).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| REC-001–REC-004 | Non-blocking (ARCH-REV-001) | Still applicable, non-blocking | SR-002 handoff says they remain implementation guidance | Not re-verified against the uncommitted implementation (out of design-review scope) |

- New or remaining finding IDs: AR-001, AR-002 (Requirement Gap); AR-003, AR-004 (Design Impact); REC-005, REC-006 (non-blocking).
- Material classification changes: none (Large / High).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: agents with old memory send long IDs (accepted); tool-wording effects on agent behavior.

### ARCH-REV-003 — SR-003 corrections: ARCH-REV-002 findings resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/design-review-report.md`
- Review round and trigger: round 3; SR-003 re-review request from `/software_engineering_team/solution_designer` (2026-10-17).
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md` (SR-003); AR-001–AR-004, REC-005, REC-006.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result: the behavior basis is now `Confirmed`. The two requirement ambiguities are clarified to the preserved-behavior readings (DEC-011, DEC-012) without new behavior. The web Task-page boundary and the deleted-Task wording are designed (AR-003, DEC-013). Refusal order and case-insensitive keys are accepted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Requirement Gap) | Resolved | SR-003; DEC-011; REQ-018; AC-020; design "SR-003 Corrections / AR-001" | REQ-018 now limits "no long ID" to Task-ID fields and texts and keeps `storedFilename` / `locator` / `localPath` and delegated paths stored; AC-020 says "locator / localPath unchanged". Consistent with `project-task-context.ts:7` and out-of-scope "Changing the stored Task identity". |
| AR-002 | Open (Requirement Gap) | Resolved | SR-003; DEC-012; REQ-019; AC-022; design "AR-002" | REQ-019: `delegate_task` Project-only; Temp-task ID → `TASK_NOT_FOUND`. Design splits the resolver: `resolveProjectTaskReference` for `resolveAssignment` and `depends_on`, `resolveTaskReference` for `updateTaskById` only. Matches `uniqueTask` today and CM-6. |
| AR-003 | Open (Design Impact) | Resolved | SR-003; design "AR-003" | The single resolver `useProjectTaskPage(projectId, taskReference)` exposes canonical `taskId`. The `ProjectTaskDetail` context client is built from the resolved ID; delete, lookup, detail/edit targets and draft-editor targets are switched; pages pass `taskReference`. This covers `ProjectTaskDetail.vue:48,61` and both page entries. |
| AR-004 | Open (Design Impact) | Resolved | SR-003; DEC-013; REQ-018; AC-023 alternate; design "AR-004" | `referenceOf` → `string \| null`; null → "a deleted Task" (MP-003 path). The pre-existing impossible advice is recorded as FU-004 (out of scope). |
| REC-005 | Non-blocking | Accepted | design "REC-005" | Order stated (Task refusal first) with pinned unit tests. |
| REC-006 | Non-blocking | Accepted | REQ-019; design "REC-006" | `toLowerCase()` on key references; stored prefixes are lower-case. |
| REC-001–REC-004 | Non-blocking | Still applicable | — | Implementation guidance |

- New or remaining finding IDs: none blocking. REC-007 (stale SR-002 Extension lines; SR-003 overrides) and REC-008 (`depends_on` resolution failure → `TASK_DEPENDENCY_INVALID`, pinned by a test) are non-blocking.
- Material classification changes: none (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty: agents with old memory send long IDs (accepted); tool-wording effects; FU-004.
