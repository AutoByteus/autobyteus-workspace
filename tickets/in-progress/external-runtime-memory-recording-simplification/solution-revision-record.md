# Solution Revision Record

The latest requirements, investigation notes, design spec, and retained supplement remain authoritative. This record is a chronological index; architecture review is still pending.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User request / bootstrap | N/A | `Initial Baseline` | `Bootstrap complete; solution remains Draft` |
| SR-002 | User continuation and explicit approval / solution round 1 | N/A | `Requirement Gap` | `Approved requirements and complete solution package ready for architecture review` |
| SR-003 | `code_reviewer` / CRR-001 plus user clarification / solution round 2 | `CR-001`, `CR-MP-001` | `Design Impact` | `Cleanup-failure inspector residual explicitly accepted; revised package ready for architecture re-review` |

## Revision Entries

### SR-001 — External runtime raw-trace-only memory bootstrap

- Triggering role, report path, and round: User request; no report; bootstrap round.
- Triggering finding IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Dedicated ticket/worktree and Draft core artifacts created; requirements are not approved and design is not architecture-ready.
- Why this baseline or revision entry is recorded: The user requested a separate simplification ticket based exactly on the latest `origin/personal` so another team can complete it.
- Resolution: Bootstrapped `codex/external-runtime-memory-recording-simplification` at `ea6d6b011035d71dc9594d61ad035470985fca8e`; captured the confirmed raw-trace projection/recording baseline, proposed scope, acceptance intent, persisted-data direction, and open design questions.
- Approved behavior or requirement IDs affected: None approved; Draft BEH-001 through BEH-006 and REQ-001 through REQ-010 were introduced for refinement.
- Canonical artifacts and sections updated: Initial `requirements.md`, `investigation-notes.md`, and `design-spec.md`.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: A new team can continue solution design without redoing bootstrap; implementation and architecture review remain gated.
- Next recipient or routing: User-selected follow-on team / solution designer.
- Remaining gaps or risks: Requirement approval, complete code/data inventory, runtime-scoped cleanup design, full spines/ownership/file mapping, architecture review, and downstream execution.

### SR-002 — Approved external raw-only solution completion

- Triggering role, report path, and round: User continuation and explicit approval; no report; solution round 1.
- Triggering finding IDs: N/A
- Prior authoritative result: Bootstrap-only Draft package with unresolved consumer, runtime-scope, persisted cleanup, and file-responsibility questions.
- Current authoritative result: `Design-ready` approved requirements, completed investigation, retained aggregate persisted-data evidence, and implementation-actionable design ready for architecture review.
- Why this baseline or revision entry is recorded: The continued solution pass closed the bootstrap gaps and the user explicitly approved the resulting behavior after clarifying the frontend projection and Memory Inspector distinction.
- Resolution: Proved that normal run/event-monitor projection is raw-backed for all current runtimes; scoped WorkingContext removal to Codex/Claude; identified the generic Memory Inspector as the intentional external absence change; classified approximately 3.18 GiB of safely removable external duplicates; selected exact metadata-derived startup cleanup with conservative native/import/unclassified exclusions; and completed the raw-only writer contraction, spines, ownership, interfaces, removal plan, file mapping, sequencing, and risk controls.
- Approved behavior or requirement IDs affected: BEH-001 through BEH-006; REQ-001 through REQ-012; AC-001 through AC-013.
- Canonical artifacts and sections updated: `requirements.md` throughout including approval; `investigation-notes.md` throughout; `design-spec.md` completed throughout.
- Supplemental artifacts updated, added, or removed: Added `persisted-snapshot-inventory.md` as a complete aggregate evidentiary supplement with approval applicability `N/A`.
- Downstream and architecture-review impact: Architecture review can evaluate a locked, clean-cut Codex/Claude-only design without rediscovering consumer or persisted-data facts. Implementation remains gated on review pass.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: Architecture decision pending; intentionally preserved unclassified historical duplicates; API/E2E will determine proportionate live-provider/browser execution breadth after source review.

### SR-003 — Clarify failed-cleanup inspector residual

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/external-runtime-memory-recording-simplification/tickets/in-progress/external-runtime-memory-recording-simplification/code-review-report.md`; CRR-001 / source-review round 1, followed by explicit user tradeoff clarification.
- Triggering finding IDs: `CR-001`, material premise `CR-MP-001`.
- Prior authoritative result: SR-002 / ARCH-REV-001 required unconditional external WorkingContext absence while also allowing non-blocking cleanup failure.
- Current authoritative result: The raw-only recording and exact cleanup design remain. Successful cleanup/new runs naturally have no external WorkingContext; a reported non-`ENOENT` unlink failure may retain stale data that the unchanged generic file-backed Memory Inspector can display until retry/manual removal. Provider continuation, future raw recording, normal raw-backed projection, and startup remain healthy.
- Why this baseline or revision entry is recorded: CR-MP-001 proved the old two guarantees could conflict. The user decided the rare stale optional inspector display/delayed reclamation is acceptable and explicitly rejected defensive runtime-qualified or UI-specific hiding logic.
- Resolution: Revised BEH-004/BEH-006, REQ-011/REQ-012, AC-012/AC-013, use-case/risk/transition wording, design spines/ownership/dependency/reuse/tradeoff/test mapping, and investigation evidence. Added DS-011 to make the accepted cleanup-failure-to-inspector lifecycle explicit. No implementation-source redesign is requested by this solution revision.
- Approved behavior or requirement IDs affected: BEH-004, BEH-006; REQ-011, REQ-012; AC-012, AC-013; UC-007, UC-008.
- Canonical artifacts and sections updated: `requirements.md` behavior, scope, requirements, acceptance criteria, persisted outcome, risks, coverage, and approval; `investigation-notes.md` status, source log, production paths, CRR-001 evidence, transition/test mapping, risks, and reviewer notes; `design-spec.md` current state, intended change, behavior map, transition lifecycle, DS-006/DS-011, ownership/dependencies, test/file mapping, compatibility rejection, tradeoffs, risks, and guidance.
- Supplemental artifacts updated, added, or removed: None; `persisted-snapshot-inventory.md` remains relevant and unchanged.
- Downstream and architecture-review impact: ARCH-REV-001 must be superseded by architecture re-review against SR-003 before implementation/source review resumes. Current IR-001 source is expected to remain structurally applicable because it already reports/retains failed unlinks and leaves generic inspection unchanged.
- Next recipient or routing: `architecture_reviewer` with the cumulative package and CRR-001 evidence.
- Remaining gaps or risks: Architecture re-review pending; rare failed items require retry/manual removal and may remain inspectable; API/E2E still owns durable test validity/execution after source review passes.
