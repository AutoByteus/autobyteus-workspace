# Design Rework Round 4 — Self-Contained Token Statistics Display Context

Date: 2026-06-29
Owner: solution_designer

## Trigger

After round 3 was paused, the user clarified that token usage statistics should be self-contained historical usage/cost data. The concern is that agent/team definitions and run-history metadata can be renamed, deleted, exported, imported, or merged across nodes, while past usage statistics must remain meaningful.

The user also corrected the field-selection principle: self-contained does not mean storing every nearby technical field. It means storing the fields needed to construct the meaningful frontend token statistics UI.

## Design Correction

The revised package now makes token-statistics display context token-usage-owned and frontend-field-driven.

### What remains in usage event rows

Usage ledger events remain the source of truth for token and cost facts:

- `observedAt`
- `runId`
- `rootTeamRunId`
- `memberAgentRunId`
- `memberRouteKey`
- runtime/model
- token/cache/output/thinking counters
- cost/currency/status/missing-price fields

### New compact top-level task display context

One context row per top-level task/team row, containing only fields used by the current UI:

- `taskRunId`
- `taskType` (`Agent` or `Team`) only if not derivable from run/team ids
- `taskDisplayName`
- `taskSummary`
- `taskCreatedAt`
- `createdTimeSource`

### New compact team-member display context

One context row per expanded team member row, containing only fields used by the current UI:

- `parentTeamRunId`
- `memberAgentRunId` when known
- `memberRouteKey`
- `memberDisplayName`
- `memberAgentName`
- `memberCreatedAt`
- `createdTimeSource`
- `memberOrder`
- `runtime`
- `model`

### Explicitly excluded from MVP context

The design now explicitly excludes fields that are not used by the token statistics UI:

- workspace id/path/name
- source-node id/name
- full agent definition JSON
- full team definition JSON
- full conversation content
- tool schemas
- package configuration
- generic `snapshotId`
- unrelated definition IDs unless later UI requirements need them

## Architecture Impact

Previous round 3 relied on a `TokenUsageRunHistoryEnricher` as the normal statistics display source. Round 4 changes that boundary:

- `TokenUsageDisplayContextStore` becomes the token-usage-owned source for row labels, summaries, created-time source, runtime/model defaults, and member roster display context.
- `TokenUsageDisplayContextBackfiller` or equivalent may use run-history/team metadata to populate missing context while metadata exists.
- `TokenUsageStatisticsProvider` should prefer display context rows and should not permanently join live run-history/team metadata for normal row labels once context exists.

## Files Updated

- Requirements: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-spec.md`
- UI prototype spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`
- UI behavior matrix: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md`

## Review Focus

Please review whether the new display-context boundary:

1. makes token statistics self-contained enough for the current frontend;
2. avoids storing unrelated metadata fields;
3. still preserves roster-complete team expansion and zero/no-usage member rows;
4. keeps cost/token aggregation independent and unchanged;
5. keeps run-history metadata as capture/backfill input rather than a permanent display dependency.

---

## Superseded By Round 5

Round 4's broader display-context and roster-complete language is superseded by `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-rework-round5-final-field-policy.md`.

The authoritative final policy is: reuse existing ledger runtime/model/path fields; add only `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName`; omit no-usage roster members and all unrelated metadata.
