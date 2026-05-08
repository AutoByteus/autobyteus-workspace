# Solution Design Rework — No Migration Requirement Correction

## Status

Rework completed by `solution_designer` on 2026-05-08. This artifact supersedes the earlier design assumption that private persisted-store migration was acceptable.

## Trigger

Downstream API/E2E validation, code review Round 4, and delivery reroute all identified the same requirement/design correction: the user clarified that the execution-resource rename must have **no migrations at all**. This includes private persisted-store migrations and not only public manifest/API compatibility.

Authoritative upstream artifacts updated:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/design-spec.md`

## Corrected Requirement

No old-shape compatibility or migration is allowed for this rename, public or private.

Forbidden behavior now includes:

- accepting old public request/manifest/API shapes such as `resourceSlots`, `allowedResourceOwners`, `defaultResourceRef`, `resourceRef`, or `owner` as equivalent to the new shape;
- reading old persisted `resource_ref_json` containing `owner` and rewriting it to `source`;
- accepting old run-binding `summary_json.resourceRef` and rewriting it to `executionResourceRef`;
- retaining tests whose purpose is to prove old `owner` / `resourceRef` data migrates successfully;
- adding public aliases or private dual-shape parsers that make old and new execution-resource shapes both valid.

## Expected Stale-State Behavior

Downstream implementation must use a clean-cut policy:

1. **Old public API/request/manifest shapes:** fail validation with a clear message pointing to the new execution-resource names.
2. **Old persisted configured execution-resource rows:** treat as stale setup state; destructively reset/remove so the application becomes not configured and must be reconfigured through the new execution-resource setup flow.
3. **Old persisted run-binding summary rows:** do not hydrate, rewrite, or expose old `resourceRef` / `owner` summaries. Drop/ignore them as unrecoverable old local run state, or fail with an explicit stale-state/reset error if deletion cannot safely occur at that boundary.
4. **Physical DB column names:** may remain old/private only if needed to avoid SQLite churn, but they must not imply old JSON compatibility or old-shape acceptance. Active in-memory/public shapes must be new-only.

## Implementation Rework Required

The following known paths likely need source/test/report changes:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-orchestration/stores/application-execution-resource-configuration-store.ts`
  - remove `migrateOwnerToSource` and the call that rewrites old persisted `owner` into `source`;
  - replace with rejection/reset behavior for stale `resource_ref_json` old shapes.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts`
  - remove `migrateRunBindingSummaryJson`;
  - remove or tighten `normalizeStoredExecutionResourceRef` so it does not accept old `owner` as a fallback;
  - do not rewrite `summary_json.resourceRef` into `executionResourceRef`.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/autobyteus-server-ts/tests/unit/application-orchestration/application-execution-resource-store-migrations.test.ts`
  - delete or replace; it currently proves now-forbidden migration/idempotency behavior.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-resource-naming/tickets/done/application-execution-resource-naming/api-e2e-validation-report.md`
  - superseded; API/E2E must rerun and replace migration-pass evidence with no-migration stale-state evidence.

## Validation Expectations After Rework

Implementation and API/E2E validation should prove:

- public old manifest/API keys are rejected;
- current new execution-resource setup, list, configure, and start-run behavior still works;
- stale configured-resource store rows with old `owner` are not migrated and result in reset/not-configured or clear stale-state failure;
- stale run-binding summaries with old `resourceRef` are not migrated/exposed and are dropped/ignored or produce the explicit stale-state/reset error chosen by implementation;
- no active production code contains old-shape migration helpers;
- no durable tests assert migration success.

## Routing

Return path after this solution-design correction:

1. `implementation_engineer`: remove/replace migration behavior, update tests, and refresh implementation handoff.
2. `api_e2e_engineer`: rerun executable validation and update validation report.
3. `code_reviewer`: review corrected implementation and any repository-resident durable validation.
4. `delivery_engineer`: resume only after validation and code review pass.

Delivery remains paused until that loop completes.
