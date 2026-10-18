# Implementation Design Impact DI-001: flat-families retried after the conversion on a partial-target org

- Raised by: implementation engineer, 2026-10-18, during step 6 (migration), against design-spec SR-004 / ARCH-REV-003.
- Classification: `Design Impact` (Migration Plan → Released Migration Inventory row `agent-org-flat-team-families-v1`; gate rule).
- Protects: REQ-007 (released migrations that read or write JSON logs still complete correctly), AC-007.

## Finding

The inventory row says flat-families processes only "team packages that hold org families (pre-flat tree)", whose trees are own-run `not_input`, so the gate keeps them on JSON. That misses one case. Flat-families also continues **partial-target** orgs: `agent_orgs/<id>/` packages that still hold the retired team files (`team_run_execution_tree.json`, `team_communication_messages.json`, `task_delegation_records.json`) after an earlier attempt renamed the root and then failed before cleanup. Code: `agent-org-history-candidate-plan.ts:93-110` (plan `partial-target`), then `AgentOrgContextFileLocatorTransition.addRoot` (`agent-org-context-file-locator-transition.ts:132-141`) and `validateCompleteOrgRunPackage` (`agent-org-flat-team-families-v1-app-data-migration.ts:185-193`). Both read `agent_org_communication_messages.json` strictly.

The org tree in such a package is a flat-families output, and own-run's frozen parser reads it as `input`. So the gate passes, the conversion turns the org log into JSONL and removes the JSON. On the next start, the flat-families retry fails with ENOENT for that org, on every start from then on. Flat-families then never becomes terminal, so locators-v1 and summary-v1 (which list it as a prerequisite) stay blocked, and the conversion stays non-terminal. Without this change, the retry would finish the cleanup and the history-index transition.

## Reachability

Flat-families fails after `fs.rename(source, target)` and before the retired-file cleanup. Cases: the history-index transition throws (`FAILED_HISTORY`, then `return` before cleanup), or the token transition fails for that plan (`FAILED_TOKEN`, non-terminal). That leaves an `agent_orgs/<id>` with the retired team files. The conversion runs later in the same start (registered last). This is the runner's retry contract (the same basis as MP-001).

Reproduced in a scratch test (removed). Run flat-families to SUCCEEDED on the existing fixture, put `team_run_execution_tree.json` back into the target (the existing test "finishes target-only interrupted cleanup" builds the same state), run the conversion (org log MIGRATED), then retry flat-families: `FAILED_RUNTIME … ENOENT … agent_orgs/org/agent_org_communication_messages.json`.

## Options

- **(a) Recommended: gate.** An org log is also *not ready* while its folder still holds a retired team authority (`team_run_execution_tree.json`, `team_communication_messages.json` or `task_delegation_records.json`, flat-families' partial-target marker). It waits while any log-writing predecessor is pending, and is preserved after, under the existing one gate rule. Nothing is lost: current readiness already rejects such a package (a retired team tree in an org package, MANIFEST_INVALID). It becomes ready once flat-families finishes the cleanup. One extra check per org log, no released-migration change. Fixture: F-GATE-FLAT-PARTIAL-TARGET (two starts, real runner order).
- (b) A same-ID repair R-E in flat-families: `addRoot` and `validateCompleteOrgRunPackage` read the org log through the R-A reader when the JSON is missing. This changes a fourth released migration, and its rewrite paths (`writeJson` of the org log for `source-root` plans) would also need care.

## Status

Implementation continues with the work that does not depend on this decision: stores, commit path, readiness, the rest of the migration and its fixtures, tests, docs and the measurement. The gate stays as designed until the Solution Designer decides.
