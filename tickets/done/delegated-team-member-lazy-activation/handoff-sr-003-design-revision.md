# Handoff — Architecture Design Complete (SR-003 revision)

- Package: `delegated-team-member-lazy-activation`
- Result: **Architecture Design Complete** (revised): `task_size=Small`, `architectural_risk=High`
- Solution revision: `SR-003` (design-only revision; requirements unchanged and still approved)
- From: `/software_engineering_team/solution_designer`, 2026-10-08
- Trigger: `/software_engineering_team/code_reviewer` CRR-002, a user-directed `Design Impact` (CR-FO-001/002/003) after API/E2E API-REV-001 failed DTL-003 (AC-004 member branch).

## Original request

Project Task `project_task_1a47632c-fc7c-411b-83f0-5cd9f67adf5a` from `/project_task_manager`: delegated Team copies start every member at once. Fix it so members start only when work reaches them and the UI shows their real state. The user verifies in the desktop app.

## Approval basis

Requirements are `Approved` (REQ-001..007, AC-001..007, DEC-001 = A). The user approved them on 2026-10-08 ("…There's no exception here. Go, I think it's approved."). The user also approved the refactor direction, as relayed in CRR-002. Intended behavior is unchanged: REQ-005/AC-004 already require "a not-accepted delivery naming the cause, member `error`, others unaffected".

## What this revision decides

See `design-spec.md`, section "SR-003 Design Revision".

1. Add one private `ConfiguredAgentExecutionHandle.startForInput()` (DS-005). It publishes `initializing`, then calls `ensureReady`. On failure:
   - If a run is active, it rethrows.
   - If input is closed for this member, it returns `AGENT_RUN_NOT_ACCEPTING_INPUT` with no `error` status.
   - Otherwise it publishes the `error` overlay and returns `AGENT_RUN_ACTIVATION_FAILED`. The message names the cause: the underlying code plus its message.

   `reserveInput` and `postMessage` both use it and have no try/catch of their own.
2. Remove the unconsumed `readiness_failure` event, along with `readinessFailureCode()`. The status overlay becomes the only member-facing failure channel.
3. Use one activation-failure code on both result shapes. `postMessage` failure codes become `AGENT_RUN_ACTIVATION_FAILED`, and the underlying code moves into the message. No production code branches on the old codes (AINV-011).
4. DS-002 now traces the actual teammate-delivery path through `reserveInput`.
5. IR-002 (`d30c11204`, not reviewed) is **superseded**. The implementation replaces it and does not extend it.
6. Tests are listed in the design revision. DTL-003 needs no change.

Refinement beyond CR-FO-003: `ensureReady` runs the input fence first. Without the closed-input branch, a race with Task DONE or root shutdown would be reported as an activation failure, and the member would wrongly show red.

## Classification

- `task_size=Small`: a bounded change inside one owner, plus one event variant and one contract code.
- `architectural_risk=High`, up from Low:
  - The change is on the shared member-activation failure path used by every Team, Org and collaborator member.
  - The code vocabulary visible to clients changes.
  - An internal event variant is removed.
  - The SR-002 trace was wrong.
- This follows the code reviewer's recommendation for independent review.

## Deferred (separate cleanup ticket, user-agreed, not yet written)

- `postUserMessage` reusing reserve-then-commit, including the compaction-recovery difference.
- Merging the three root delivery adapters.
- Auditing the handle's lifecycle states.
- Duplicated checks in `admit()`.
- Post-start input-rejection overlay asymmetry between `postMessage` and `reserveInput`.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation`
- Branch: `codex/delegated-team-member-lazy-activation`, HEAD `d30c11204`
- Base: `origin/personal` @ `ace86bf1f`; finalization target `origin/personal`

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/requirements-doc.md`
- Investigation notes (AINV-001..012): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-member-lazy-activation/tickets/in-progress/delegated-team-member-lazy-activation/solution-revision-record.md`
- Code review report / record (CRR-001, CRR-002): `code-review-report.md`, `code-review-revision-record.md` (same folder)
- Implementation handoff / record (IR-001, IR-002): `implementation-handoff.md`, `implementation-revision-record.md` (same folder)
- API/E2E: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/` (same folder)
- Prior handoff (SR-002): `handoff-architecture-design-complete.md`
- Architecture review artifacts: none yet (first independent review)
- Supplements / Product design: None / N/A — not applicable

## Route

The handoff rule for "Large or architectural_risk=High" sends this to `/software_engineering_team/architecture_reviewer`. Implementation Engineer and API/E2E are asked to hold until then, at the code reviewer's request. Do not validate `d30c11204` alone.

## Next expected action

The architecture reviewer reviews the SR-003 revision together with the cumulative SR-002 design.
