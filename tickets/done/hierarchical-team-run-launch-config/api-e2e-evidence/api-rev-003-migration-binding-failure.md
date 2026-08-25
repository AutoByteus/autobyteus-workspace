# API-REV-003 Migration Binding Failure Evidence

- Failure ID: `API-E2E-F-001`
- Result: `Fail`
- Preliminary classification: implementation-source defect exposed by the CRR-003/TR-002 durable-fixture correction
- Affected acceptance criterion: `AC-030`
- Requirement: a representative nested V1 -> V2 migration preserves application binding together with IDs, topology, handoffs, tasks, and Agent launch snapshots.

## Reproduction

Working directory:

`/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/autobyteus-server-ts`

Commands:

1. `pnpm run build:full` — passed.
2. `pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` — failed, 2 passed / 2 failed.

Raw evidence:

- `api-rev-003-server-build-full.txt`
- `api-rev-003-v2-production-upgrade-full.txt`
- `api-rev-003-static-and-cleanup-audit.txt`

## Expected Versus Observed

The enriched released-shape fixture stores the same non-empty context on both configured Agents:

```json
{
  "applicationId": "synthetic-migration-application",
  "bindingId": "synthetic-migration-binding"
}
```

Expected final `team_run_execution_tree.json`:

```json
{
  "schemaVersion": 2,
  "applicationBinding": {
    "applicationId": "synthetic-migration-application",
    "bindingId": "synthetic-migration-binding"
  }
}
```

Observed final V2 tree in both the clean supported cohort and the mixed-warning cohort:

```json
{
  "schemaVersion": 2,
  "applicationBinding": null
}
```

The surrounding handoff assertion matched, so this is not a failure to load the supported predecessor package.

## Source Correlation

`autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/predecessor-team-run-planner.ts` attempts to find `applicationExecutionContext` recursively. Its visitor returns immediately when a value is an array:

```ts
if (!value || typeof value !== "object" || Array.isArray(value)) return;
```

Released nested Agent metadata is under the `memberTree` arrays. The visitor therefore never reaches either Agent context, leaves its binding-pair map empty, and writes `applicationBinding: null`. This source correlation is a preliminary origin assessment for code review; the API/E2E role did not modify implementation source.

## Other Local-Fix Evidence

- `TR-001` durable correction passed: the hierarchy GraphQL lifecycle file ran 7/7 and now checks complete root/nested Team and four exact Agent launch configurations on disk, active API projection, process restart, and restore.
- The production-upgrade fixture also now carries distinct direct-coordinator configurations, non-empty handoff, settled task, complete Agent assertions, and the binding assertion. Execution stops at the binding mismatch before all later enriched assertions can become successful evidence.
- `git diff --check` passed; owned test databases/runtimes/processes were cleaned.
- API-E2E-013's real `open_tab` Codex-root / AutoByteus-DeepSeek-subteam result remains independently passed and is not invalidated by this migration-specific failure.

## Required Follow-Up

`/code_reviewer` should perform focused failure-origin review and route the implementation correction. After source correction, return the cumulative package to `/api_e2e_engineer` to rerun the full four-scenario production-upgrade E2E, recheck `TR-002`, and update the authoritative result.
