# Design Rework Round 5 — Final Self-Contained Field Policy

## Trigger

The user paused architecture review to clarify the historical/accounting data model for Settings > Token Statistics after seeing roster-oriented behavior in the built Electron app.

The key product clarification is:

- Token Statistics is a usage/cost report, not a live team roster viewer.
- The persisted token-statistics data should be self-contained only for the fields needed to render the Token Statistics UI meaningfully.
- The design must not add broad technical metadata just because it is available elsewhere.

## Supersedes

This round supersedes the roster-complete/no-usage-member and broad display-context direction in earlier round 3/4 notes.

Earlier artifacts remain useful as history, but the authoritative target is now the requirements/design package plus this Round 5 note.

## Final Data Policy

### Reuse existing ledger fields

Do not duplicate these existing usage/cost facts and identifiers:

- run/team/member grouping: `runId`, `rootTeamRunId`, `memberAgentRunId`, `memberRouteKey`;
- hierarchy hints: `teamRunPathJson` / `memberPathJson` (`team_run_path` / `member_path` in payloads);
- runtime/model: `runtimeKind`, `modelProvider`, `modelIdentifier`, `modelValue`;
- token/cost facts: existing accounting input/output fields, cache fields, reasoning fields, estimated cost fields, currency/status/missing-price fields.

### Add only five display fields

Persist only these new self-contained display fields for the Settings task table:

1. `teamName` — displayed title for root team rows.
2. `agentName` — displayed title for standalone agent rows.
3. `runSummary` — displayed summary/snippet under top-level rows.
4. `runCreatedAt` — root team run or standalone agent run creation time for top-level display/sort.
5. `memberName` — displayed label for team member usage rows.

### Explicitly do not add

- `workspaceId`, `workspaceName`, `workspaceRootPath`, or workspace path derivatives.
- Source-node id/name.
- Full agent/team definitions.
- Full conversation content.
- Tool schemas/package configuration.
- Generic snapshot id or broad display-context blob.
- Team/member roster order.
- Configured member runtime/model for no-usage members.
- `memberCreatedAt` or member created-time source.
- `agentName` for team member rows unless a future UI separately displays underlying member-agent names.

## Team Expansion Policy

Expanded team rows show only members with selected-period usage events.

Implementation implications:

- Group child rows by `memberAgentRunId` first, then `memberRouteKey`.
- Carry existing `memberPath` when available for optional nested path label/indentation.
- Do not create no-usage rows for inactive roster members.
- Do not fetch/merge full team roster into Settings statistics for MVP.
- Do not emit `periodUsageState` because all returned member rows have usage.

## Created Time Policy

- Top-level team rows use `runCreatedAt` captured from root team run creation time.
- Top-level standalone agent rows use `runCreatedAt` captured from standalone agent run creation time.
- If unavailable, the provider may fall back to earliest ledger `observedAt` and expose a response-only source/label such as `First usage observed`.
- Member rows do not need separate member creation time. In the UI `Created Time` cell they may render `—`, `same as team`, or muted inherited parent team time.

## Current Paused Implementation Corrections Required

The current worktree contains prior implementation artifacts that must be removed or tightened before implementation resumes:

- `TokenUsageRunHistoryEnricher.listTeamAgentMemberRoster` and `TokenUsageTeamMemberRosterEntry` should not drive Settings member rows.
- `buildNoUsageTokenUsageCostSummaryAggregate` should not be used to create no-usage Settings member rows.
- DTO/API/frontend fields such as `workspaceName`, `workspaceRootPath`, `agentDefinitionId` for display, `periodUsageState`, roster index/order, configured no-usage runtime/model, and member `createdAt` should be removed from the Settings statistics shape unless already required by unrelated existing APIs.
- If `token-usage-run-history-enricher.ts` is retained, its responsibility should be tightened to capture/backfill exactly the five display fields. Otherwise replace it with a concrete `token-usage-display-field-capturer.ts`.

## Updated Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-spec.md`
- UI prototype: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`
- UI behavior matrix: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md`

## Review Request

Architecture review should verify that the revised package:

1. follows the Authoritative Boundary Rule by keeping `TokenUsageStatisticsProvider` as the task/runtime-model statistics owner;
2. keeps the aggregate core identity-free;
3. avoids broad metadata creep;
4. removes roster/no-usage member semantics from Settings statistics MVP;
5. uses existing ledger runtime/model/path fields instead of duplicating them;
6. leaves no ambiguity for implementation around which fields may be added.
