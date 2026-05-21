# Docs Sync Report

## Scope

- Ticket: `run-history-index-consistency`
- Trigger: Delivery resumed after Round-11 post-validation durable-validation re-review passed and CR-DV-002 was resolved.
- Bootstrap base reference: `origin/personal@aa58fabc697c50e4fb8a57cf890832b177c6b3dd` (`chore(release): bump workspace release version to 1.3.22`)
- Integrated base reference used for docs sync: `origin/personal@9a27e3d2686c36676e6061ed9aec2de430a9eba5`; `git fetch origin personal` on 2026-05-21 confirmed no advancement beyond the already-merged base.
- Ticket branch state used for docs sync: `codex/run-history-index-consistency@c239af5c3f42bca4038bff0e73b9c0335bd61f7e` plus Round-11 reviewed working-tree implementation/validation changes.
- Post-integration verification reference: server typecheck passed; 32-file server unit/integration/E2E suite passed; web run-history query/store suite passed; local macOS Electron verification build passed; final `git diff --check HEAD` pending below/recorded in release-deployment report.

## Why Docs Were Updated

- Summary: Round-11 final implementation expanded the earlier standalone-only delivery docs to include team-run history V2 catalog behavior, team startup migration repair, team metadata field cleanup, frontend team history mapping, and the current verification Electron build.
- Why this should live in long-lived project docs: Future backend/frontend work must not reintroduce normal list-time metadata scans, persisted live-status fields, direct index writes, or stale team metadata fields. These are architecture boundaries, not one-off ticket notes.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | Operator cleanup/migration instructions referenced standalone-only V2 repair. | `Updated` | Clarified that startup migrations repair both standalone and team indexes; the manual fallback command is standalone-only. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Canonical backend run-history module doc needed the final standalone + team V2 catalog model. | `Updated` | Added `TeamRunHistoryCatalogService`, `TeamRunStatusProjectionService`, team V2 row fields, team migration order, archive semantics, and no-scan/no-live-status rules. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend history architecture still described team `lastActivityAt` / `lastKnownStatus` as existing backend fields. | `Updated` | Clarified both standalone and team GraphQL history rows use `createdAt` plus derived live status; local team tree fields are view-model derived values. |
| `autobyteus-web/docs/agent_teams.md` | Agent Teams docs needed team history/reopen context after team V2 catalog cleanup. | `Updated` | Added team workspace-history V2 catalog note and clarified persisted vs frontend-derived team tree fields. |
| `autobyteus-server-ts/scripts/run-history-index-migration.md` | Standalone manual repair docs reviewed for accuracy after team migration addition. | `No change` | Remains accurate because it documents only the standalone manual fallback script; team repair is startup migration only. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Reviewed for standalone activation/status persistence overlap. | `No change` | Prior docs remain consistent with command-overlay/runtime-derived status and no persisted standalone activation state. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Reviewed for status projection and stream restore overlap. | `No change` | Prior docs remain consistent; Round-11 team index cleanup does not change WebSocket command semantics. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | Operator migration/cleanup update | Mentioned both startup V2 migrations and limited the manual command to standalone `run_history_index.json`. | Prevents operators from expecting a team manual script and clarifies startup repair ownership. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Backend architecture update | Documented team V2 catalog row shape, team catalog mutation owner, team status projection, team metadata field target, startup migration order, archive/delete semantics, and normal-list no-scan rule. | Promotes the final reviewed runtime/data-flow truth out of ticket artifacts. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend history read-model update | Replaced stale team backend `lastActivityAt` / `lastKnownStatus` language with V2 `createdAt` + derived live status mapping. | Keeps frontend contributors from depending on removed GraphQL/backend fields. |
| `autobyteus-web/docs/agent_teams.md` | Team history UX/persistence update | Added persisted team history V2 catalog note and clarified local tree fields are view-model-derived. | Keeps team reopen/history docs aligned with current GraphQL and store behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Standalone V2 catalog | `run_history_index.json` remains the fast list source, but normal writes go through `AgentRunHistoryCatalogService`; live/status/activity fields are not persisted. | `requirements.md`, `persisted-attribute-audit.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-server-ts/README.md` |
| Team V2 catalog | `team_run_history_index.json` is now a strict plain row-array catalog owned by `TeamRunHistoryCatalogService`; normal list reads catalog rows first and metadata only by indexed team-run id for topology projection. | `team-history-refactor-analysis.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_teams.md` |
| Startup migration boundary | Full metadata scans for repair belong to startup app-data migrations; normal history listing must not rebuild/repair by scanning directories. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-server-ts/README.md` |
| Frontend derived status/activity | Stored standalone/team rows carry stable catalog facts; UI status/activity tree fields are derived from V2 rows plus live runtime state. | `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/agent_teams.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Standalone persisted `lastKnownStatus`, `lastActivityAt`, and `activationState` as history/list truth | V2 standalone catalog facts plus `AgentRunStatusProjectionService` | `autobyteus-server-ts/docs/modules/run_history.md`; `autobyteus-web/docs/agent_execution_architecture.md` |
| Team persisted catalog `version`, `lastActivityAt`, `lastKnownStatus`, and `deleteLifecycle` | V2 team catalog facts plus `TeamRunStatusProjectionService` and frontend-derived tree view-model fields | `autobyteus-server-ts/docs/modules/run_history.md`; `autobyteus-web/docs/agent_teams.md`; `autobyteus-web/docs/agent_execution_architecture.md` |
| Team metadata `updatedAt` | Stable metadata facts: `teamRunId`, `teamDefinitionId`, `teamDefinitionName`, `coordinatorMemberRouteKey`, `createdAt`, optional `archivedAt`, and `memberTree` | `autobyteus-server-ts/docs/modules/run_history.md` |
| Normal list-time index repair by metadata directory scanning/rebuild | Required startup app-data migrations and standalone manual fallback script | `autobyteus-server-ts/docs/modules/run_history.md`; `autobyteus-server-ts/README.md`; `autobyteus-server-ts/scripts/run-history-index-migration.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs were updated`
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs are synchronized for the Round-11 reviewed state. Repository finalization remains intentionally paused until the user tests the latest local Electron build and explicitly approves finalization.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
