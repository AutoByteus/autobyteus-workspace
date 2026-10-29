# Docs Sync Report

## Scope

- Ticket: `delegated-copy-restore-from-own-file` (autobyteus-197). `Large` / `High`, reviewed route.
- Trigger: DR-002. Delivery resumed after the INT-001 merge was reviewed (CRR-004 Pass) and revalidated (API-REV-002 Pass).
- Bootstrap base reference: `origin/personal` @ `f171032e88`
- Integrated base reference used for docs sync: `origin/personal` @ `ad784b0a8f`, merged into the ticket branch by `26ad4ace20`. Fetched again at DR-002; the base has not moved since (0 commits behind).
- Post-integration verification reference: IMP-15..IMP-23 on `26ad4ace20`, and the round-2 browser probe `API-10-13-r2-*` (see `release-deployment-report.md`, Verification)

## Why Docs Were Updated

- Summary: every delegated copy now restores from its own file. `taskAgent.origin` and every fallback that went through the configured place at a copy's address were removed. A Team copy's members record their complete launch and `followsTeam`. A startup migration completes existing own files. The implementation updated the server, web and legacy docs. Delivery reviewed them on the integrated state and corrected the one doc still describing the removed catalog-only path.
- Why this should live in long-lived project docs: the persisted shape of own files, the "own file is the only source" restore rule, and the startup migration are durable contracts. Later work on run history, delegation, Settings and migrations depends on them.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/run_history.md` | Own-file shape, `source`, `followsTeam`, migration `20261019` | No change (implementation's update is accurate) | Matches the merged code: required `source`; restore never reads the placement; migration dispositions; non-terminal while 10-17 is pending |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Task sources on activation and restore; merged with base's wake-on-message text | No change | `TeamTaskExecutionAdapter` projects only `source`. Base's unclean-shutdown text merged cleanly |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Org task sources, configured-place copies | No change | The old "keeps following that place" text is gone |
| `autobyteus-server-ts/docs/modules/agent_communication.md`, `standalone_agent_run_root.md`, `docs/design/collaboration_model.md` (CM-8) | Delegation, Agent root, collaboration model | No change | CM-8 records the ticket and its migration |
| `autobyteus-server-ts/src/app-data-migrations/legacy/released-run-package-shapes/README.md` | Frozen released shapes (`configured_place` as a released value) | No change | `configured_place` is mentioned only as a released shape, which is correct |
| `autobyteus-web/docs/settings.md` | Settings delegated rows, "As configured in this run" | No change | Origin `configured` = the launch the copy recorded, not the placement's current one |
| `autobyteus-web/docs/agent_orgs.md` | Org view index and history rows | No change | `copyAgentSourceOf` / `copyTeamSourceOf` by run ID |
| `autobyteus-web/docs/agent_teams.md` | Team view: copy rows, sources, names | **Updated** | Still named the removed `teamCatalogAgentSourceAt` and said only catalog copies carry `source` |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Migration rules this ticket follows | No change | The ticket applied the guideline; nothing in it changed |
| Repo-wide grep of `*.md` for `configured_place`, `taskAgent.origin`, `TaskAgentOrigin`, `readTaskSource`, `*TaskSourceResolver`, `catalog*SourceAt`, "keeps following" | Stale concepts | Clean apart from the migration and legacy-shape docs, where the mentions are historical and correct | — |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_teams.md` | Correction | Every copy (catalog, or of a configured member) carries its started `source`, read by run ID with `agentSourceSelectors.teamAgentSourceOf` (own choice, else the Team's when `follows_team`). The display-name rule is stated as implemented (D-7): addresses outside the root Team's configured members read as display names; a configured member and its copies keep the basename | The doc named a removed selector and described the pre-ticket split between catalog and configured copies |

The implementation's doc updates (server `run_history.md`, `agent_orgs.md`, `agent_communication.md`, `agent_team_execution.md`, `standalone_agent_run_root.md`, `design/collaboration_model.md`; web `settings.md`, `agent_orgs.md`; the legacy `README.md`) were reviewed and kept.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One source per copy | A copy restores and is shown only from its own `source` (plus its own Settings choice), never from the placement at its address. Editing a configured member changes only it and later copies | requirements REQ-001..REQ-004, design D-1..D-7 | `run_history.md`, `agent_team_execution.md`, `agent_orgs.md` (server); `agent_teams.md`, `agent_orgs.md`, `settings.md` (web) |
| Team-copy follower set | Each member records its complete launch and `followsTeam`; restore reads only that | REQ-012, DEC-010, D-5 | `run_history.md` |
| Startup migration `20261019_delegated_copy_own_file_complete_v1` | Completes old own files from their slot at upgrade, removes `origin`, preserves and reports what it cannot convert, stays non-terminal while 10-17 is pending | design M0..M5, D-9 | `run_history.md`, CM-8 |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `taskAgent.origin` (`catalog` / `configured_place`) | Required `source` on every copy; removed from data by the migration | `run_history.md` |
| `TeamTaskSourceResolver`, `AgentOrgTaskSourceResolver`, the standalone resolver, `readTaskSource` | The adapters project only the copy's `source` | `agent_team_execution.md`, `agent_orgs.md` |
| Configured follower rule (`memberFollowsTeam`, `configuredTeamFollowerAddresses`) | Recorded `followsTeam` per member | `run_history.md` |
| Web `teamCatalogAgentSourceAt`, `catalogAgentSourceAt` / `catalogTeamSourceAt` | `teamAgentSourceOf`, `copyAgentSourceOf`, `copyTeamSourceOf` | `autobyteus-web/docs/agent_teams.md`, `agent_orgs.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and release notes; then the user's release decision, which AC-010 depends on
- Notes: the docs edit is documentation-only and needs no executable rerun.
