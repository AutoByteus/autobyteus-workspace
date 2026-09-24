# Solution Revision Record — Unify Agent Team and Agent Org run-history catalog policy

## Revision index

| Revision ID | Phase | Trigger | Prior status | Current status | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements/Evidence | User ticket, 2026-09-24; requested truth check then ticket bootstrap | N/A | Ready for Approval; design N/A | Divergence confirmed, three product decisions proposed; no approval or implementation. |
| SR-002 | Requirements | User explicit approval, 2026-09-24 | Ready for Approval; design N/A | Approved; design pending | Approves SR-001 policy and DEC-001–003 without changing the proposed behavior. |
| SR-003 | Design/Evidence | Approved basis SR-002 plus architecture investigation | Approved; design N/A | Approved; design Ready | Completed Medium/High design, direct-use persisted-data decision and explicit repair boundary. |
| SR-004 | Design/Evidence | ARCH-REV-001 Fail / DR-001 and user real-scenario reminder | Approved; design Needs Revision | Approved; revised design Ready | Corrected Team archive/unarchive manager transition gate and queue order; renewed review required. |

## SR-001 — Verified divergence and proposed unified policy

- Classification: Initial coherent requirements baseline, evidence-backed but not approved.
- Trigger/finding: User-supplied history-policy divergence; direct code and existing-test inspection confirms the central claim, with index-path and first-read frequency corrections in `investigation-notes.md`.
- Prior authoritative status: N/A; current requirements status Ready for Approval, design N/A.
- Affected IDs: BEH-001–004, SCN-001–004, REQ-001–007, AC-001–005, DEC-001–003.
- Scenario validity: normal history/lifecycle and explicit imported-memory read-only are supported; missing/corrupt/orphan policy requires approval rather than promotion from a technical edge case.
- Canonical artifacts: `requirements-doc.md` and `investigation-notes.md` in this ticket; no design or behavior-defining supplement yet.
- Intended behavior changed: Proposed, not approved. No user approval reference; exact approved baseline N/A.
- Design/review/routing impact: Architecture work, classification and implementation handoff blocked pending DEC-001–003. Product Design not requested. No source files changed.
- Remaining gap: user choice on authority, reconciliation and missing/corrupt index behavior; fresh worktree has no Vitest binary for executable baseline check.
- Next action: obtain explicit user decisions, then investigate/design the approved policy and route according to completed size/risk classification.

## SR-002 — Explicit approval of unified index-authoritative policy

- Phase/classification: Requirements approval, no intended-behavior revision.
- Trigger: The user asked whether the refactor is worthwhile; after the Solution Designer explained the concrete benefit and tradeoff, the user wrote, “cool. if it makes the code base cleaner. lets go. i approve” on 2026-09-24.
- Prior/current status: Ready for Approval / Approved; design still N/A at this entry.
- Affected IDs: BEH-001–004, REQ-001–007, AC-001–005, SCN-001–004, DEC-001–003.
- Approval basis: SR-001 `requirements-doc.md` presented in the preceding exchange, including index authority, no routine reconciliation, explicit local-only repair, missing-empty and corrupt-error/no-overwrite. The follow-up recommendation made the main tradeoff (end of Org automatic self-heal) explicit.
- Scenario validity: SCN-004 is now a supported explicit operational edge under the approved policy.
- Intended behavior changed from SR-001 proposal: No.
- Canonical sections changed: document status, approval reference, approved policy and decision statuses; investigation approval evidence. No supplements or Product artifacts.
- Design/review impact: architecture design may begin; route and task-size/risk remain pending completed design.
- Next action: perform architecture investigation and design; verify persistence transition and classify.

## SR-003 — Completed unified catalog architecture design

- Phase/classification: Design and architecture evidence; no intended-behavior change.
- Trigger: SR-002 approval; architecture investigation of managers, strict index stores, historical migration imports, archive compensation, representative current persisted arrays, and memory-branch source.
- Prior/current status: requirements Approved throughout; design N/A → Ready (Architecture Design Complete).
- Affected IDs: BEH-001–004, SCN-001–004, REQ-001–007, AC-001–005; no new behavior ID.
- Canonical artifacts changed: architecture section of `investigation-notes.md`, current-status references in `requirements-doc.md`, new `design-spec.md`.
- Intended behavior changed: No; approval remains the 2026-09-24 user message recorded by SR-002. No supplements or Product artifacts.
- Design decision: index-only shared family-keyed core with specialized family mutation adapters; explicit offline/local missing-row repair; current Team/Org index arrays directly usable without migration; preserve historical migration owners.
- Classification: `task_size=Medium`, `architectural_risk=High`; existing run-history ownership but material persistence/concurrency and lifecycle risk.
- Review impact: independent architecture review required by applicable handoff rule; implementation must wait for review pass.
- Remaining gaps: memory branch not yet merged (conditional integration), executable baseline blocked by absent Vitest in fresh worktree; these do not alter approved intent or current design.
- Applied handoff rule: Medium/High Architecture Design Complete → `/architecture_reviewer`; result file `solution-handoff.md`.
- Next action: send cumulative solution package for independent architecture review.

## SR-004 — Team archive/restore transition-lane design correction

- Phase/classification: Design Impact and evidence clarification within approved scope.
- Trigger: Architecture Reviewer `ARCH-REV-001` / `DR-001`, canonical `design-review-report.md` and `architecture-review-revision-record.md`; user reminder that design must follow real user scenarios.
- Prior/current authoritative status: requirements Approved at SR-002 throughout; SR-003 design → Needs Revision on review Fail → revised design Ready at SR-004. Reviewer decision remains Fail until a renewed independent review passes.
- Affected IDs: BEH-002, SCN-002, REQ-002/004, AC-002, DS-003; no new approved behavior or requirement ID.
- Scenario-basis change: no new policy; existing SCN-002 now names supported workspace Archive versus message-triggered Team Restore overlap, as demonstrated by reviewer PM-001 and direct frontend/GraphQL/service inspection.
- Canonical sections changed: `investigation-notes.md` reviewer recovery evidence and user-path clarification; `requirements-doc.md` SCN-002 evidence clarification/status pointer; `design-spec.md` current-state, behavior path, DS-003, core/manager queue ordering, interface, file/removal map, change sequence and deterministic concurrency test intent; `solution-handoff.md` revised review packet.
- Intended behavior changed: **No**. Approval basis remains the 2026-09-24 user message recorded by SR-002; no renewed approval required. No new supplement or Product artifact.
- Design correction: Team `withUnmanagedHistoryDeletion` becomes general `withInactiveHistoryMutation` under existing per-root `withRootTransition`; both Team archive/unarchive and delete acquire shared catalog queue then that manager lane, check managed state inside, and keep full tree/index commit or compensation inside. Org already uses queue → lane. Create/restore release manager lane before history queue. Remove stale pre-queue Team check and old deletion-only API.
- Classification: `task_size=Medium`, `architectural_risk=High` unchanged. Prior ARCH-REV-001 Fail basis is not a pass; renewed architecture review is mandatory before implementation.
- Remaining gaps: no executed tests in design worktree (Vitest absent); memory branch remains unmerged.
- Applied handoff rule: revised Medium/High Architecture Design Complete → `/architecture_reviewer`; result file `solution-handoff.md`.
- Next action: hand revised complete package to Architecture Reviewer; implementation remains blocked until review Pass.

## Informational architecture-review notification (not a solution revision)

- Received 2026-09-24 from Architecture Reviewer: `ARCH-REV-002` **Pass** on `SR-004`; prior `DR-001` resolved. This does not alter approved requirements, design, task classification or SR numbering.
- Canonical review evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-review-report.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/architecture-review-revision-record.md`.
- The reviewer reports its primary reviewed-package handoff to `/implementation_engineer` succeeded. Solution Designer must not repeat that handoff or perform implementation work. No executable test pass is claimed by the design review.
- Fresh `get_handoff_rules` check: no rule matches this informational Pass notification. The completed-architecture route was already used for SR-004, and the reviewer owns the primary implementation handoff. No `send_message_to` action is applicable here.
