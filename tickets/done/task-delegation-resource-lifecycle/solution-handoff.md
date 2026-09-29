# Solution Handoff — `task-delegation-resource-lifecycle`

## Result

- Classification: `Architecture Design Complete`
- Current solution revision: `SR-004` (revision for architecture review ARCH-REV-001; the SR-003 round is preserved below)
- `task_size`: `Large`
- `architectural_risk`: `High`
- Classification evidence: design-spec.md → "Task Size And Architectural Risk". It spans many subsystems and involves contract changes (tool result, LLM text, two stream-contract packages, GraphQL/REST removal), a persistence migration (Team tree v2→v3, Org tree v1→v2), concurrency and lifecycle work (grace timers, wake/shutdown leases, restore of external provider sessions), a root security boundary for wake, and replacement of the task lifecycle owner.

## Original Request (summary)

The user observed that delegated children report back with `send_message_to` and that parents rarely call `review_task_result`, so the task lifecycle is unused complexity and it leaks running children. After discussion (2026-09-27 → 2026-09-29) the user chose to:

- make `delegate_task` a pure sub-agent spawn (same name and inputs) that returns the child's run ID;
- use `send_message_to` for all later communication;
- delete `submit_task_result`, `review_task_result`, task status, task records, the task APIs and the task UI;
- manage children as resources: shut down after a grace period of quiet (default 10 minutes, a server setting), and wake with context on a same-root message;
- keep the UI minimal and consistent with the product.

## Approval Basis

- Requirements `Approved`, SR-002, by the user 2026-09-29: "I agree with your approach. Approved." (confirms DEC-001–DEC-004), then "OK, approved. Continue." after the UI clarification.
- The design introduces no change to intended behavior. Evidence-only clarification: operator composer messages to a shut-down child wake it, which preserves today's ability to message children (ARCH-10).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle`
- Branch: `codex/task-delegation-resource-lifecycle`
- Base: `origin/personal` @ `8bffda04575eaa7198fae186856699011ad5c04b`
- Finalization target: `origin/personal`
- Artifacts are uncommitted in the worktree; the user has not asked for commits.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/solution-revision-record.md`
- Supplements: None
- Product Design artifacts: N/A — not applicable
- Prior review artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/design-review-report.md` (ARCH-REV-001, reviewed basis SR-002 + SR-003: Fail — Design Impact)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/task-delegation-resource-lifecycle/tickets/in-progress/task-delegation-resource-lifecycle/architecture-review-revision-record.md`

## Scope Snapshot

- In scope: UC-001 … UC-007; REQ-001 … REQ-017; AC-001 … AC-019; SCN-001 … SCN-011.
- Out of scope: cross-root wake, silent-child notification, renaming `delegate_task`, configured-member lifecycle, converting old task records, deleting old task-record files.
- Canonical migration authority: `autobyteus-server-ts/docs/design/data_migration_guideline.md` (reviewed; design follows its worksheet).

## Open Risks / Validation Obligations

- Per-runtime restore of task agents (AutoByteus native memory; Codex/Claude via `platformAgentRunId`): AC-007 E2E per runtime.
- Approval-pending is never quiet on any runtime: AC-006 per runtime.
- Migration on real released data: coexistence of valid, missing-tree and missing-records packages; repeat startup; unchanged records hashes.
- Timer disposal on root termination and fail-stop.

## Next Expected Action

Independent architecture review of the design against the approved requirements, then implementation.

## Route

- Rule lookup (2026-09-29) returned three rules. Matching rule: "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review", which routes to `/architecture_reviewer`.
- Not matching: the direct implementation rule (needs Small/Medium and Low) and the Delivery receipt rule (no receipt).
- Recipient: `/architecture_reviewer`

## Round 2 (SR-004) — Revision For ARCH-REV-001

- Result: `Architecture Design Complete` (revised). `task_size=Large`, `architectural_risk=High` (unchanged).
- Resolutions (design-spec.md → "Review Round 1 Resolution"):
  - **AR-001:** `error` arms the idle schedule. Task-execution open work counts only `initializing|running`. Leases arm the chain on release, and already-restored executions are armed when a restore throws.
  - **AR-002:** option (a). An `assertRestorableChain` precheck gives `TASK_EXECUTION_CONTEXT_UNAVAILABLE` before any restore when the ingress has no conversation. The planner is unchanged.
  - **AR-003:** result `{target_agent_run_id}` or `{target_agent_run_id: null, message}`.
  - **R-1:** evidence-only clarification. **R-2:** admission rule. **R-3:** helper dispositions. **R-4:** delivery must confirm the `offline` label with the user.
- Requirements: unchanged (SR-002 approved). No renewed approval needed.
- Focused re-review requested: DS-002, DS-003, DS-005, the restore contract and the result shape.
- Round 2 route: the rule lookup (2026-09-29) matched "completed or revised architecture package … Large or High … ready for independent architecture review", which routes to `/architecture_reviewer`. The other rules do not match.

## Review Outcome (informational)

- 2026-09-29: architecture_reviewer reported **Pass**, `ARCH-REV-002`, reviewed basis SR-002 + SR-004. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- Non-blocking implementation notes from the reviewer:
  - R-5: implement a single open-work predicate for task executions.
  - R-6: the DS-002 inventory row and narrative still describe idle/offline-only arming; the DS-005 mapping (`idle|offline|error` arm) is authoritative.
  - R-7: the Team adapter must use the root-neutral tree projection after the Team re-export is removed.
- The reviewer forwarded the package to `/implementation_engineer`. No duplicate forwarding from Solution Designer.

## Round 3 (SR-005) — Migration Checklist, Real Data, Basis Refresh

- Result: `Architecture Design Complete` (revised). `task_size=Large`, `architectural_risk=High` (unchanged). Requirements SR-002 approved and unchanged.
- What changed (design-spec.md → "SR-005 Migration Checklist And Basis Refresh"; evidence ARCH-16 to ARCH-19):
  - The data migration guideline checklist is answered.
  - Real installed data was inspected read-only with user authorization:
    - 594 roots; only 9 have task executions (18 in total), all settled, with no orphans and every delegator resolvable;
    - 8 tree-less roots preserved by predecessor migrations.
  - Records are now read only for trees with task executions.
  - Dispositions and aggregate status are defined. The migration never gates startup, and the all-roots-excluded case is covered.
  - Cross-feature reference: `context-file-record-locators.ts`, which is used only by released migrations and is unaffected because records files stay unchanged.
  - Evidence obligations include a stopped-writer copy of this install before delivery.
- **Basis refresh:**
  - Upstream `origin/personal@f2924a2b0` changed 75 server files. The ticket branch must be rebased before further implementation.
  - The upstream handle re-activation (`restore` after the run died) simplifies in-session wake: terminate only the AgentRun and keep the handle.
- Focused re-review requested: the Persisted Data / Migration Plan and SR-005 sections, and the DS-003 wake simplification.
- Round 3 route: the rule lookup (2026-09-29) matched "completed or revised architecture package … Large or High", which routes to `/architecture_reviewer`.

## Round 4 (SR-006) — Resolution of ARCH-REV-003

- Result: `Architecture Design Complete` (revised). `Large` / `High` (unchanged). Requirements SR-002 approved and unchanged.
- **AR-004:** option (b). Register right after `20260901` with prerequisites `[20260824 tree v2, 20260901 org flat families]`. The released-migration disposition table covers `20260814`, `20260824`, the token-usage records migration and index, `20260901` plus its transitions, `20260926`, `20260905` and the later migrations. Frozen legacy module `src/app-data-migrations/legacy/released-run-package-shapes/` (~1,100 lines verbatim); one ~10-line adaptation of `20260905`; skip-version fixture added; reconciliation after the rebase stated.
- **AR-005:** single liveness predicate. A task agent is live when its handle's AgentRun is active; a task team is live when its TeamRun is registered. The shutdown commit keeps agent handles registered. The predicate is applied everywhere, and `approve_tool`/`interrupt` on a non-live child give `RUN_NOT_ACTIVE` without touching the handle.
- **R-8:** published guideline numbering; boundary contracts answered (`STARTUP_ONLY`, `RESTART_TO_RETRY`, runner summary, attempt-log reasons, no SQL).
- **R-9:** implementation, code-review and API/E2E gates must be re-run on the rebased basis.
- Focused re-review requested: Terminology (liveness), the SR-005 checklist items 5, 7 and 8, and "SR-006 Resolution".
- Round 4 route: the rule lookup (2026-09-29) matched "completed or revised architecture package … Large or High", which routes to `/architecture_reviewer`.

## Review Outcome, Round 4 (informational)

- 2026-09-29: architecture_reviewer reported **Pass**, `ARCH-REV-004`, reviewed basis SR-002 + SR-006. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- Non-blocking notes:
  - R-10 (optional): declare the new migration as a prerequisite of `20260926` and `20260905`.
  - R-11: the Migration Plan "Trigger" line still says "registered after existing tree and Org migrations"; "SR-006 Resolution → Released-migration ordering" is authoritative (immediately after `20260901`).
- The reviewer forwarded the package, including the rebase instruction, to `/implementation_engineer`. No duplicate forwarding from Solution Designer.

## Round 5 (SR-007) — Tolerant Tree Reading, No Migration

- Result: `Architecture Design Complete` (revised). `Large` / `High` (unchanged).
- Requirements: SR-007 delta explicitly approved by the user 2026-09-29 (DEC-008): tolerant read and exact write for Team and Org execution trees, no schema version field, no data migration, `delegatorAgentRunId` optional (the 18 old child entries show no starter).
- Design: "SR-007 Tolerant Tree Reading — No Migration" is authoritative and supersedes the migration parts of SR-003 to SR-006.
  - **Removed:** the new migration (implementation must delete its in-progress code and registry entry).
  - **Released migrations:** they use the strict validators as classifiers (for example the `20260901` candidate plan, and `20260824` "already current" detection), so they are repointed to a frozen strict module (~850 lines). `20260926` is unchanged. `20260905` gets a ~10-line adaptation. The current Org index stays.
  - **Evidence:** tolerant/exact unit tests; V1 still rejected structurally; released-migration regression; skip-version chain; installed-data copy with no startup rewrite.
- Focused re-review requested: REQ-018 and AC-020/AC-021 in requirements-doc.md, and the design section "SR-007 Tolerant Tree Reading — No Migration".
- Round 5 route: the rule lookup (2026-09-29) matched "completed or revised architecture package … Large or High"; requirements have current explicit user approval. This routes to `/architecture_reviewer`.

## Review Outcome, Round 5 (informational)

- 2026-09-29: architecture_reviewer reported **Pass**, `ARCH-REV-005`, on SR-007. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- Non-blocking notes:
  - R-12: align older design lines that still mention v3/v2, the migration or a required delegator at the next design touch; the SR-007 section takes precedence.
  - R-13: decide whether the stream/view DTO `schema_version` literals stay. These are transport contracts, not persisted files; this is a candidate for the project-wide follow-up.
  - R-14: write `delegatorAgentRunId` only for children that have one. Every child created by `delegate_task` has a delegator, so the writer always has it for new children; the rule restates that nothing is fabricated.
  - R-10: obsolete.
- The reviewer forwarded the package to `/implementation_engineer` with an instruction to stop the migration work. No duplicate forwarding from Solution Designer.

## User Decisions After ARCH-REV-005 (2026-09-29)

- **Guideline change ships with this ticket.** Delivery brings the guideline revision from `/Users/normy/autobyteus_org/autobyteus-worktrees/data-migration-guideline-refresh` (branch `codex/data-migration-guideline-refresh`) into this ticket's branch during docs sync, reconciles it with upstream, and commits it with the ticket. The docs worktree is removed at cleanup. See design-spec.md, "SR-007 → Project practice".
- **No project-wide follow-up ticket.** Tolerant reading is adopted gradually through the guideline rule; the user only cares about this ticket. There is no strict-format inventory.
- This is a scope clarification only: intended behavior is unchanged and no review is needed. The downstream package reads these notes from the design and this file.
