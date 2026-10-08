# Handoff — Architecture Design Complete (SR-004 correction)

- Package: `delegated-team-member-lazy-activation`
- Result: **Architecture Design Complete** (corrected), `task_size=Small`, `architectural_risk=High`
- Solution revision: `SR-004` (design-only; requirements Approved and unchanged)
- From: `/software_engineering_team/solution_designer`, 2026-10-08
- Trigger: `/software_engineering_team/implementation_engineer` Design Impact DI-001 (`implementation-design-impact-ir-003.md`). IR-003 was stopped before commit; HEAD is still `d30c11204`, and the WIP patch is saved as `ir-003-wip-start-for-input.patch`.
- Prior review: ARCH-REV-001 Pass for SR-003 (`design-review-report.md`, `architecture-review-revision-record.md`)

## Original request

Project Task `project_task_1a47632c-fc7c-411b-83f0-5cd9f67adf5a` from `/project_task_manager`: delegated Team copies start every member at once. Fix it so members start only when work reaches them and the UI shows their true state. The user verifies in the desktop app.

## Approval basis

Requirements Approved (REQ-001..007, AC-001..007, DEC-001 = A). User approval 2026-10-08: "…There's no exception here. Go, I think it's approved." The refactor direction was user-approved, as relayed in CRR-002. SR-004 keeps approved behavior; no new approval is needed.

## What changed (design-spec.md, section "SR-004 Correction")

SR-003 said to remove `readiness_failure` because it had no consumer. That was wrong (AINV-010 → AINV-013). The final fall-through in `CollaborationAgentPresentationEventAdapter` turns it into an `ERROR` event, and every root publishes it as an error card in the member's conversation. Removing it would silently change REQ-007 / BEH-002 behavior.

Corrected decision (implementation option A):
1. Keep `readiness_failure`, emitted once per failed start by `initializeReady`, as the conversation-card channel. `startForInput()` keeps owning the typed result to the sender and the `error` overlay.
2. Make the adapter branch explicit for `readiness_failure` and add an exhaustive `never` check. The output is unchanged.
3. In the closed-input race (PREM-001), emit no `readiness_failure`. It uses the same "input closed now" predicate as `startForInput`.
4. Everything else from SR-003 and AR-NB-001..003 stands.
5. Tests: existing `readiness_failure` assertions stay. Add a check that each entry point produces exactly one card on a start failure, none on closed input, and an adapter regression test. DTL-003 is unchanged.

Rejected:
- B: drop the card. That would change REQ-007 behavior and needs user approval.
- C: move card emission into `startForInput`. That changes which failures get a card.

## Classification

Unchanged: Small / High. The correction narrows the change surface, but it changes the design after ARCH-REV-001, so architecture review is repeated before implementation resumes.

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation`, branch `codex/delegated-team-member-lazy-activation`, HEAD `d30c11204`
- Base `origin/personal` @ `ace86bf1f`; finalization target `origin/personal`

## Artifacts (absolute paths, same folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/`)

- `requirements-doc.md`
- `investigation-notes.md` (AINV-001..013)
- `design-spec.md` (SR-002 base, SR-003 revision, SR-004 correction)
- `solution-revision-record.md`
- `design-review-report.md`
- `architecture-review-revision-record.md`
- `implementation-design-impact-ir-003.md`
- `ir-003-wip-start-for-input.patch`
- `code-review-report.md`
- `code-review-revision-record.md`
- `implementation-handoff.md`
- `implementation-revision-record.md`
- API/E2E: `api-e2e-*.md`, `api-e2e-evidence/`
- Prior handoffs: `handoff-architecture-design-complete.md`, `handoff-sr-003-design-revision.md`
- Supplements / Product design: None / N/A — not applicable

## Route

Handoff rule "Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.

## Next expected action

Architecture re-review of SR-004. On pass, implementation resumes from the WIP patch.

## Open risks

- Method gap: event consumers must be checked by type and exhaustiveness, not by string grep. The explicit adapter branch prevents a recurrence.
- R-001 / R-002 and CAND-005 as before.
