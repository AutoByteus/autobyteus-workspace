# Docs Sync Report

## Scope

- Ticket: `run-history-index-consistency`
- Trigger: Delivery-stage docs sync after API/E2E validation and post-validation durable-validation code review passed.
- Bootstrap base reference: `origin/personal@aa58fabc697c50e4fb8a57cf890832b177c6b3dd` (`chore(release): bump workspace release version to 1.3.22`)
- Integrated base reference used for docs sync: `origin/personal@dd62965cbc55abc9b576d3cd95be4ae89ea45e34` (`docs(ticket): correct mobile parity artifact paths`) after `git fetch origin --prune` and merge into `codex/run-history-index-consistency` on 2026-05-21.
- Post-integration verification reference: delivery reran the representative non-live durable validation subset after the merge: server `vitest run tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts tests/unit/run-history/services/workspace-run-history-service.test.ts --reporter=verbose` passed 3 files / 7 tests; web `vitest run graphql/queries/__tests__/runHistoryQueries.spec.ts --reporter=verbose` passed 1 file / 2 tests. `git diff --check HEAD` also passed after docs/artifact edits.

## Why Docs Were Updated

- Summary: Promoted the final standalone run-history V2 catalog behavior into long-lived server/frontend docs: the standalone catalog index is retained as the fast listing source, standalone live/activity fields are no longer persisted or exposed, normal app code does not scan every metadata directory to repair the index, archive/delete/terminate/status behavior routes through the catalog boundary, and explicit migration/repair remains operator-run.
- Why this should live in long-lived project docs: This task changes persistent file ownership and public standalone GraphQL/frontend shape. Future maintainers and operators need the canonical docs to preserve the low-write catalog boundary instead of reintroducing direct index writers, persisted live status, or automatic metadata scans that would undo the reliability fix.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Canonical server module doc for persisted run history, metadata, projection, archive/delete, and workspace listing. | `Updated` | Records V2 catalog fields, catalog ownership, script-only repair, standalone status projection, prepared identity persistence, archive/delete semantics, and team-field deferral. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Canonical command lifecycle doc; prepared-run and command-overlay text still referenced persisted activation/status state. | `Updated` | Removed stale reliance on persisted standalone `lastKnownStatus` / `activationState`; documented prepared metadata facts and activation `startedAt` / platform id recording. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket command lifecycle doc also described metadata `lastKnownStatus` as a possible overlay signal. | `Updated` | Clarifies persisted metadata does not clear command overlays. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture doc for workspace history title/status merging. | `Updated` | Documents standalone GraphQL rows as `createdAt` plus derived status, with frontend mapping into the shared tree sort field while team rows retain team `lastActivityAt` / `lastKnownStatus`. |
| `autobyteus-server-ts/README.md` | Operator-facing server README contains Codex E2E cleanup commands adjacent to the new migration/repair workflow. | `Updated` | Adds explicit migration-first guidance when cleanup encounters legacy/minimal standalone indexes. |
| `autobyteus-server-ts/scripts/run-history-index-migration.md` | New operator README introduced by implementation. | `No change` | Already correctly documents dry-run/apply, backups, `--prune-stale`, deterministic `createdAt` fallback, and cleanup ordering. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Checked because it mentions run-history activity/status writes. | `No change` | Existing text is team-specific and remains accurate because team-run persisted fields are intentionally deferred. |
| `autobyteus-web/docs/agent_teams.md` | Checked for team run-history impacts. | `No change` | Team history behavior was intentionally preserved and does not need standalone V2 catalog docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Canonical persistence/API architecture update | Rewrote standalone status/prepared identity docs; changed archive visibility semantics from standalone metadata to V2 catalog row; documented index row and metadata field shapes; added `AgentRunHistoryCatalogService` ownership and explicit migration/repair script rules. | Aligns project documentation with the final low-write, single-owner standalone catalog implementation. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Command lifecycle update | Removed obsolete metadata `lastKnownStatus` / persisted `activationState` lifecycle claims and documented prepared metadata facts plus activation `startedAt` / platform id writes. | Prevents future command/restore work from treating persisted live status as truth. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | WebSocket overlay update | Replaced metadata `lastKnownStatus=ACTIVE` language with a broader statement that persisted metadata does not clear command overlays. | Keeps stream-command docs consistent with derived live status. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend history merge update | Documented standalone V2 GraphQL rows using `createdAt` and derived status; clarified frontend read-model mapping and team-field preservation. | Prevents standalone frontend code from depending on removed `lastActivityAt` / `lastKnownStatus` fields. |
| `autobyteus-server-ts/README.md` | Operator cleanup guidance | Added migration/repair command and link to script README before retrying cleanup on legacy/minimal indexes. | Makes the explicit repair workflow discoverable from the cleanup command users already see. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| V2 standalone catalog ownership | `run_history_index.json` remains the fast standalone history catalog, but only `AgentRunHistoryCatalogService` should own normal semantic mutations and flushes. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/run_history.md` |
| No persisted standalone live/activity state | Standalone rows no longer persist or expose `lastKnownStatus`, `lastActivityAt`, or `activationState`; status is projected from command overlays/runtime/prepared/historical facts. | `requirements.md`, `persisted-attribute-audit.md`, `design-spec.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-server-ts/docs/modules/agent_execution.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Explicit repair instead of normal metadata scan | Normal history listing reads the V2 index/in-memory catalog and does not scan every metadata directory. Legacy/partial repair is operator-run through `migrate-agent-run-history-index-v2.mjs`. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/scripts/run-history-index-migration.md` |
| Standalone/team field split | Standalone rows use `createdAt` plus derived status; team rows keep `lastActivityAt` / `lastKnownStatus` until a separate team history refactor. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Standalone persisted `lastKnownStatus`, `lastActivityAt`, and `activationState` as history/list truth | V2 catalog facts plus live `AgentRunStatusProjectionService` projection | `autobyteus-server-ts/docs/modules/run_history.md`; `autobyteus-web/docs/agent_execution_architecture.md` |
| Direct normal source-code writers to `memory/run_history_index.json` | `AgentRunHistoryCatalogService` as the semantic mutation/serialization boundary | `autobyteus-server-ts/docs/modules/run_history.md` |
| Automatic full metadata-directory scan as normal history repair | Explicit operator migration/repair script and README | `autobyteus-server-ts/docs/modules/run_history.md`; `autobyteus-server-ts/scripts/run-history-index-migration.md`; `autobyteus-server-ts/README.md` |
| Standalone archive state in `run_metadata.json` | `archivedAt` on the V2 catalog row | `autobyteus-server-ts/docs/modules/run_history.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale: Long-lived docs were updated in this delivery package.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete against the merged `origin/personal@dd62965cbc55abc9b576d3cd95be4ae89ea45e34` integrated state. Repository finalization, ticket archival, push/merge, release, deployment, and cleanup remain paused until explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
