# Solution Designer handoff — unified Team/Org run-history catalog policy

## Result and approval

- Result: **Architecture Design Complete**, `SR-004`; **revised** package for renewed independent architecture review after ARCH-REV-001/DR-001. No implementation handoff.
- Package identifier: `unify-agent-team-org-run-history-policy`.
- Original user request: Verify whether the reported Team/Org run-history catalog divergence is real; if so bootstrap and work the ticket to unify the policy. The user subsequently asked whether the refactor is worthwhile and explicitly approved proceeding.
- Approval basis: `requirements-doc.md` SR-001 proposal/DEC-001–003, approved and recorded at SR-002 by the user's 2026-09-24 message: “cool. if it makes the code base cleaner. lets go. i approve”. No Product Design request or behavior-defining supplement. SR-003 and SR-004 are design-only and did not change intended behavior.
- Approved policy: per-family history index is authoritative for listing rows and index-only facts; both catalog queries are admitted, normalized, read-only and do not project trees; lifecycle events update rows; no routine startup/read reconciliation; explicit offline/local repair can add missing rows; missing index reads empty, corrupt index errors without overwrite. Org automatic read-time missing-row self-heal ends; Team's tolerant corrupt-index catalog read ends. Imported folders remain read-only.

## Workspace and artifacts

- Isolated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy`.
- Branch: `codex/unify-agent-team-org-history-policy`.
- Refreshed base: `origin/personal@40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`; finalization target `origin/personal` subject to delivery workflow.
- Approved requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/requirements-doc.md`.
- Canonical investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/investigation-notes.md`.
- Completed design: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-spec.md`.
- Cumulative solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-revision-record.md`.
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-handoff.md`.
- Prior independent review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-review-report.md`.
- Prior review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/architecture-review-revision-record.md`.
- Prior independent review: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001 Fail — DR-001). Product supplement/UI spec, implementation and validation artifacts: **N/A — not applicable yet**. The historical `approval-handoff.md` is a preapproval result, not an alternate requirements authority.

## Confirmed problem and design synopsis

The report is true with two corrections: indexes reside at the memory root; Org's tree scan/index rewrite happens on the first read of **each new instance**, not every read of an initialized instance. Team reads only the admitted index, has memory-directory shared state, and writes lifecycle events. Org's instance state and first-read reconciliation cause read-side writes, hidden pre-create `initialize()` ordering, and the unmerged Memory explorer branch's direct Org index-store bypass. Existing Team archive also lacks rollback if its post-tree index write fails and checks managed status before, rather than inside, the per-root manager transition lane; Org compensates and is lane-gated. Exact code/test/data evidence is in investigation notes.

The design adds a narrow run-history-owned shared catalog core for family-keyed state/init/queue/index-only query/admission/summary policy; Team and Org adapters retain tree projectors, managers and multi-file compensation. It removes Org read-time reconciliation and pre-create initialization; makes Org's public query `listCatalogRows()`; preserves strict/current index stores and historical migration ownership; strengthens Team failed-archive compensation and places Team archive/unarchive under its manager transition lane; conditionally updates Org root memory source when the unmerged memory branch lands. It includes dry-run-first offline/local missing-row repair selected by owned app-data profile, never called by normal reads/startup/imported sources. Existing valid current arrays are **Directly Usable — No Migration**; no schema/path changes or versioned normal-read fallback.

## Scope, scenarios and constraints

- In scope: BEH-001–004, SCN-001–004, REQ-001–007, AC-001–005. The primary spines are history listing, lifecycle writes, archive/delete, imported memory inspection, and explicit local repair; see design DS-001–006.
- Out of scope: standalone agent history, execution-tree schema, unrelated UI/public GraphQL contract changes, historical migration redesign and generalized corrupt-index recovery.
- Required invariants: admission excludes unready rows; history queries do not write/read every tree; imported memory cannot be written; state/queue shared by resolved directory and family; first nonempty summary, termination, restore and existing supported archive/delete semantics preserved; determinate failed delete/archive restores and verifies prior state.
- Data continuity: representative isolated stored Team (1 row) and Org (4 rows) current-shape arrays were inspected read-only. Full compatibility must be verified in executable tests against strict stores and sanitized representative data. Tree-only repair cannot recreate already-missing index-only summary/termination; its report must be truthful. Corrupt index is never overwritten.
- Conditional branch context: `codex/memory-team-view-slow-load` was not merged into refreshed `origin/personal` at design time. Its `AgentOrgRootMemorySource` bypasses the Org owner. Integrate its owner query if/when merged; do not cherry-pick a separate product change or claim conditional tests ran now.

## ARCH-REV-001 / DR-001 correction and real user path

The independent reviewer found a supported race, not a speculative locking concern: one user archives a stopped Team from workspace history while another message submission from that Team triggers Restore. The original design incorrectly said Team archive already entered a manager gate. Current `setArchived` performs only a pre-queue `hasManagedTeamRun` check; Restore can register the run before Archive writes. The revised design names the full frontend → GraphQL → service → manager/catalog paths and the user-visible invariant: Archive must not succeed after the run becomes managed.

The correction generalizes Team's existing deletion-only `withRootTransition` callback to `withInactiveHistoryMutation`, and uses it for Team archive, unarchive and delete. Both Team and Org archive/delete now acquire the family catalog queue **then** the per-root manager lane; the inactive check and complete tree/index write or compensation occur inside the lane. This matches Org's existing order and prevents lock inversion. Team/Org create and restore release manager lanes before recording history. Focused deterministic tests cover Restore-first refusal/no writes and Archive/Unarchive-first Restore waiting. No approved intent, task-size or risk classification changes.

## Classification and review ask

- `task_size=Medium`: several files in existing run-history ownership and direct consumers, plus explicit offline repair and tests; no new product subsystem or UI/API rewrite.
- `architectural_risk=High`: changes persistence authority/write timing, shared state and queue, Org creation sequencing, multi-file compensation and imported-folder write safety. The row payload volume does not drive classification.
- Review the **SR-004 DR-001 correction** against the supported workspace Archive versus message-triggered Team Restore path: core queue → exact-root manager lane → inactive check → full tree/index transaction and compensation, with create/restore releasing their lane before recording history. Also retain the prior review's passed core, persistence, repair and migration assessments. Please classify any intended-behavior expansion as `Requirement Gap` rather than silently redesigning it.
- Escalation trigger: any need for API/schema/admission changes, online repair, startup reconciliation, historical migration policy change, or revised missing/corrupt/orphan behavior returns to Solution Designer. Otherwise a review Pass may follow the configured route without duplicate forwarding.

## Known evidence gaps and next action

- The fresh isolated worktree has no installed Vitest binary; the attempted focused suite exited before running tests (`Command "vitest" not found`). No test-pass claim is made. Implementation/validation must establish executable coverage after dependency setup.
- Product-level scenario basis is supported for history lifecycle and explicitly read-only imported memory. Missing/corrupt/orphan recovery is now an approved explicit operational edge, not inferred from a synthetic test.
- Next expected action: renewed independent architecture review of SR-004 / DR-001. ARCH-REV-001 remains Fail; implementation waits for a Pass and its applicable review route.
- Applied handoff rule: fresh `get_handoff_rules` selected revised `Architecture Design Complete` with `architectural_risk=High` → exact recipient `/architecture_reviewer`; no direct implementation or delivery-receipt rule applies. Send this handoff file as the attached reference. Transport success is confirmed only by the send tool.
