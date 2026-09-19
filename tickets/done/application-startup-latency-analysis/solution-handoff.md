# Architecture Design Complete — Typed Token-Data Warning Boundary

## Current Result

- Package: `APP-STARTUP-LATENCY-20260918-001`
- Current solution revision: `SR-011`
- Classification: `Architecture Design Complete`
- Task size / risk: `Medium / High`
- Requirements: cumulative `SR-010` `Approved`; `SR-011` makes no intended-behavior change
- Design: cumulative `SR-011` `Ready for repeated independent architecture review`
- Trigger: `ARCH-REV-006 / ARCH-F-004 / MP-004` proved that `SR-010` incorrectly treated every root-keyed token failure as an approved warning even though the current map also contains structural, database-operational, concurrency/reread and unknown faults.
- Downstream state: preserve `IR-001`–`IR-003` and every specialist artifact. Existing Implementation and Code Reviewer executions remain held. Do not implement/test/forward until review passes; do not create a duplicate task.

## Preserved Goal And Completed Corrections

The original request is to remove a ~27-second, ~5.5-GiB historical trace/attachment scan from startup while preserving strict structural Team/AgentOrg admission and exact request-time attachment security.

Preserve:

- `IR-001`: structural-only readiness; obsolete global attachment auditor removed.
- `IR-002`: exact Team/Org attachment owner/path/file validation and narrow Team `400`/`404` outcomes.
- `IR-003`: exact pre-plan missing execution-tree warning/no-plan result.
- API evidence: zero readiness raw-trace reads, representative sub-10-second starts, protected-state preservation and attachment matrix.

No part of `SR-011` reopens those results.

## Approved Migration Policy (Unchanged)

Only two conditions may be terminal warning items:

1. legacy Team source lacks its required execution tree before a plan exists;
2. one Org/root contains malformed or conflicting legacy token-attribution **data**, its root SQL transaction rolls back, and its existing `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY` guard continues to reject restore locally.

Every structural, SQL/query/update, concurrency/precondition, strict-reread, unknown, global-discovery/index/commit or otherwise unsupported failure remains `FAILED`/retryable and dominates warnings. Warning roots are not called migrated or usable. No new migration, generic framework, conversion reorder, repair, fallback, shared runner/status or schema change is approved.

## `ARCH-F-004` Root Cause

Current `AgentOrgTokenAttributionTransition.execute()` uses one broad root-level `try/catch`. Its `failures` map includes:

- root-ID validation;
- Team/Org family collision;
- current Org execution-tree read/validation;
- approved malformed/conflicting token data;
- repository database query/update failure;
- changed update precondition;
- strict allowed-difference reread failure;
- unknown exceptions.

Therefore root-keying is not a semantic warning discriminator. `SR-010`'s coordinator-only interpretation was unsafe.

## Revised `DS-002`

### Repository semantic owner

Add a migration-local `AgentOrgTokenAttributionDataRejection` (or equivalent discriminated result) in `agent-org-token-attribution-repository.ts`.

It is produced only at explicit approved source-data checks:

- claimant is outside the selected Org members;
- `identity_summary_json` cannot be parsed;
- parsed identity is missing/not an object/invalid for migration;
- legacy attribution tuple conflicts with the selected Org.

Do **not** type or wrap these as data rejection:

- Prisma/SQL availability, query or update error;
- update count/precondition change;
- strict reread/postcondition mismatch;
- unexpected/unknown exception.

The typed rejection is thrown inside the existing root transaction, so rollback remains owned by Prisma transaction semantics.

### Transition result owner

Revise `AgentOrgTokenAttributionTransition.execute()` to return:

```ts
{
  warnings: Map<rootId, reason>,
  failures: Map<rootId, reason>,
  changed: Map<rootId, count>
}
```

- catch only `AgentOrgTokenAttributionDataRejection` into `warnings`;
- catch root-ID, family/tree structural and every untyped repository exception into `failures`;
- keep token-root discovery/global database failure as a thrown attempt-wide error;
- do not inspect messages, paths or error strings.

### Coordinator aggregation owner

In `agent-org-flat-team-families-v1-app-data-migration.ts`:

1. add warning and fatal root IDs to the existing blocking/dependency map, so neither can enter history-index completion or cleanup;
2. record typed warning roots using a dedicated warning disposition;
3. record transition failures and outer thrown failure as fatal token dispositions;
4. keep dependency propagation fatal—a warning root that makes a dependent candidate incomplete cannot produce warning-only terminal status;
5. aggregate: clean -> `SUCCEEDED`; missing-tree/typed-token-data warnings only -> `SUCCEEDED_WITH_WARNINGS`; any fatal -> `FAILED`.

Preserve exact failed item details/`failedCount`, conversion order, token transaction, local readiness guard, shared status and runner terminal skip.

## Production File Responsibilities

- `agent-org-token-attribution-repository.ts`: define/type only approved token-data rejection; all operational/postcondition errors remain ordinary/fatal.
- `agent-org-token-attribution-transition.ts`: separate typed warnings from root structural/operational failures; preserve global discovery throw.
- `agent-org-flat-team-families-v1-app-data-migration.ts`: block both maps; aggregate only typed warning + missing tree as nonfatal; preserve fatal/dependency precedence.
- `agent-org-history-candidate-plan.ts`: preserve `IR-003` missing-tree/no-plan behavior.
- `token-usage/providers/token-usage-run-store.ts`: preserve affected-Org local readiness guard unchanged.
- Shared runner/status, locator/runtime/history owners and readiness/access files: unchanged.

## Required Validation

1. Baseline proves the current mixed map cannot distinguish data rejection from structural/operational failure.
2. Repository tests cover every typed data rejection plus negative controls:
   - SQL query/update error;
   - precondition/update-count change;
   - strict reread mismatch;
   - unknown error;
   none may be typed warning.
3. Transition tests prove:
   - typed data rejection -> `warnings`;
   - invalid root ID, family collision, malformed/current Org tree, SQL/concurrency/reread/unknown -> `failures`;
   - global discovery failure -> throw.
4. Coordinator tests prove both maps block completion, dependency propagation remains fatal, warning-only status is terminal, and any fatal dominates mixed warnings.
5. End-to-end fixture proves transaction rollback, exact warning detail/count, affected-Org readiness rejection, unrelated-root usability and next-run terminal skip.
6. Preserve all `IR-001`–`IR-003` tests/evidence, exact attachment suites and server build.
7. API/E2E runs `P01` first on an isolated representative clone, followed by typed token-data warning/local-guard, fatal controls, fatal precedence and three terminal-stability starts. Never mutate the live profile during implementation validation.

## `ARCH-F-004` Resolution

- The semantic decision moves to the repository validation site that knows data versus operation.
- The transition exposes cause-typed warning/fatal channels instead of a mixed map.
- The coordinator aggregates rather than diagnoses exceptions.
- Structural, SQL, concurrency, reread and unknown root failures remain retryable.
- No generic error framework, cross-store transaction redesign or conversion reorder is introduced.

## Classification Basis

`Medium / High` remains appropriate. The incremental delta is small and migration-local, but terminal warning suppresses later retry and the cumulative ticket governs startup, persisted migration state and attachment security. Repeated architecture review is required.

## Canonical Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/design-spec.md`
- Solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/solution-revision-record.md`
- Architecture review/history: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/design-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/architecture-review-revision-record.md`
- Implementation handoff/history: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/implementation-handoff.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/implementation-revision-record.md`
- Code Review reports: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/code-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/code-review-revision-record.md`
- API reports/evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/api-e2e-execution-coverage-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/api-e2e-revision-record.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/validation/api-e2e/p01-preservation-result.json`; `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/validation/api-e2e/three-launch-summary.json`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/tickets/in-progress/application-startup-latency-analysis/solution-handoff.md`

Private migration log cited in investigation remains unattached/uncommitted.

## Workspace And Next Action

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis`
- Branch: `codex/application-startup-latency-analysis`
- Target: `origin/requirements/flat-agent-organization-model` at bootstrap `4e84b76a918253da22fd4a382c653cb47744dc6c`, not `personal`
- Existing uncommitted `IR-001`–`IR-003` source/tests/docs/evidence must be preserved.
- Solution Designer changed only the five owned canonical artifacts; no implementation/reviewer/API file, service, user data, migration execution or Git finalization action was performed.
- Current blocker: repeated architecture review of `SR-011`.
- On Pass: continue the existing Implementation Engineer execution to `IR-004`; do not create a duplicate task.

## Applied Handoff Route

Fresh `get_handoff_rules` selected the sole matching rule: Architecture Design Complete with `architectural_risk=High` -> `/software_engineering_team/architecture_reviewer`. No Product Design, direct implementation or Delivery-correction rule applies. Only that exact recipient is notified with this handoff attached.
