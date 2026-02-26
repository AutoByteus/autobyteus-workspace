# Requirements - team-tool-approval-binding-fix

## Goal / Problem Statement
- Fix team-member tool approval dispatch so clicking `Approve` in the frontend actually routes approval to the intended team member agent runtime.
- Current observed production/runtime symptom:
  - backend logs repeatedly show:
    - `Failed to route tool approval ...`
    - `TypeError: Cannot read properties of undefined (reading 'submitEventToRuntime')`
  - user-visible symptom: `Approve` button appears to do nothing for team members.

## Scope Triage
- Size: `Small`
- Rationale:
  - focused change in one routing adapter plus targeted regression tests.
  - no schema/API contract changes.
  - no cross-service storage migration.

## In-Scope Use Cases
1. Team approval to local agent member:
  - when a team routes tool approval to an `Agent` member, dispatch succeeds and reaches agent runtime.
2. Team approval to sub-team proxy:
  - sub-team proxy dispatch still uses `(agentName, invocationId, isApproved, reason)` signature and remains functional.
3. Regression guard:
  - dispatch path must preserve method binding for class-instance handlers using `this`.

## Acceptance Criteria
- No backend runtime error containing `submitEventToRuntime` undefined during team tool approval routing.
- Team approval dispatch returns accepted result for local agent targets.
- Existing sub-team proxy approval path behavior is unchanged.
- Automated tests pass:
  - `tests/unit/agent-team/routing/local-team-routing-port-adapter.test.ts` (including binding regression test).

## Constraints / Dependencies
- Keep no-backward-compat stance: do not add compatibility shim branches.
- Preserve existing public routing port contracts and event shapes.
- `autobyteus-server-ts` consumes `autobyteus-ts` build artifacts; runtime verification must use updated `autobyteus-ts` build.

## Assumptions
- The failure is caused by extracted function invocation losing `this` binding on class methods.
- Fixing method invocation style in local routing adapter is sufficient for this incident.

## Open Questions / Risks
- E2E in this library-only project is limited; full UI path validation requires running `autobyteus-web` + `autobyteus-server-ts` together.
- Risk: this category of unbound-method usage could exist in other adapter dispatch paths and may need a follow-up audit ticket.
