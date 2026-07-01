# Docs Sync Report

## Scope

- Ticket: `task-team-focused-member-messages`
- Trigger: Post-API/E2E durable coverage-code re-review passed for the address-first Team Communication model; delivery docs impact was explicitly marked `Yes`.
- Bootstrap base reference: `origin/personal` at `51ece107f0c7bfa501fac32a8709220078bb1932` (recorded in investigation notes).
- Integrated base reference used for docs sync: `origin/personal` `1af6d6702c484ce5b72c02fb25e931181f015d64`, fetched on 2026-07-01; merged into ticket branch via `629f7364e83b1d1f7dac9ccf6ce92a8ef58b38d3` after checkpoint `a250722daff7b292f55452a521464b42852ae9c9`.
- Post-integration verification reference: targeted post-merge checks passed on 2026-07-01: `git diff --check origin/personal...HEAD`; server Team Communication API integration; E2E helper TypeScript compile; env-gated nested E2E transform/skip smoke; frontend GraphQL query shape spec. After docs edits, `git diff --check` also passed.

## Why Docs Were Updated

- Summary: Long-lived Team Communication, artifact/reference, streaming, run-history, and frontend architecture docs still described the old flat sender/receiver identity model in several places (`senderRunId`, member path/route metadata, represented-subteam metadata, and counterpart member-name grouping). They were updated to match the integrated implementation: Team Communication projections store a top-level `teamRunId`, message-level `senderAddress` and `receiverAddress` `ConversationTargetAddress` values, content/type/created timestamp, and `referenceFiles`; old flat files are handled only by app-data migration.
- Why this should live in long-lived project docs: Team Communication identity is a durable persisted/API/WebSocket/frontend store contract. Future implementation, migration, support, and UI work must not reintroduce flat participant fields, fuzzy route/name matching, or runtime old-shape compatibility based only on stale docs.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend artifact/reference doc had an old TeamCommunicationMessage shape with run-id/member-name fields. | Updated | Replaced message shape with projection + `ConversationTargetAddress`; recorded migration-only old-flat handling and counterpart address labels. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Streaming protocol doc described represented-subteam metadata for Team Communication perspective matching. | Updated | Replaced with address-first `senderAddress`/`receiverAddress` matching and no runtime flat-field output. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Parsing/projection doc described persisted sender/receiver memberKind/path/route/representedSubTeam fields. | Updated | Documented top-level `teamRunId`, message address fields, exact address matching, and app-data migration boundary. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Artifact-serving design doc described path-aware/representative Team Communication participant metadata. | Updated | Documented `ConversationTargetAddress` segments for Team Communication reference metadata and current-runtime migration boundary. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Agent communication module doc owns `recipient_name` vs exact-run route distinction. | Updated | Added address-first sender/receiver projection and focused address equality. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Canonical team execution module doc had old projection-preserves-flat-metadata wording. | Updated | Replaced with sender/receiver `ConversationTargetAddress` projection contract. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run-history doc listed Team Communication projection and old flat persisted identity. | Updated | Switched projection path wording to root team run and documented address-first historical hydration. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend sidecar-store doc described Team Communication store behavior. | Updated | Clarified live source as `TEAM_COMMUNICATION_MESSAGE`, address-first projection, and counterpart address grouping. |
| `autobyteus-web/docs/settings.md` | Duplicated frontend architecture content included the same Team Communication sidecar-store wording. | Updated | Kept duplicate long-lived doc aligned with `agent_execution_architecture.md`. |
| `autobyteus-web/docs/agent_teams.md` | Team focus docs already described send-target `ConversationTargetAddress` but not message perspective matching. | Updated | Added that Team Messages reuse the same focused address and exact normalized equality. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Server artifact module doc separates Team Communication references from Agent Artifacts. | No change | Existing wording did not expose stale Team Communication participant fields. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Streaming module doc already described team send target normalization. | No change | No stale Team Communication projection shape found. |
| `autobyteus-web/docs/content_rendering.md` and `autobyteus-web/docs/remote_access.md` | Docs mention Team Communication reference rendering/content routes. | No change | Reference route behavior remains accurate; no participant-shape claims. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_artifacts.md` | Frontend reference/model docs | Replaced old `TeamCommunicationMessage` fields with `TeamCommunicationProjection`, `ConversationTargetAddress`, `senderAddress`, and `receiverAddress`; added exact address matching and migration-only old-flat handling. | Prevent frontend docs from teaching removed flat sender/receiver fields or counterpart member-name identity. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Streaming protocol docs | Replaced represented-subteam participant metadata paragraph with address-first Team Communication perspective matching and no old flat runtime output. | Align WebSocket/streaming docs with derived `TEAM_COMMUNICATION_MESSAGE` payloads. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Parsing/projection design docs | Replaced persisted memberKind/path/route/representedSubTeam description with top-level `teamRunId`, message `senderAddress`/`receiverAddress`, exact matching, and migration boundary. | Promote final persistence/API/store contract into design docs. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Feature/reference design docs | Replaced flat participant identity wording with `ConversationTargetAddress` segments and migration boundary. | Keep Team Communication reference-flow docs accurate while preserving artifact/reference separation. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Module behavior docs | Added that Team Communication processor builds address-first sender/receiver values and frontend perspectives match by normalized address. | Clarify `recipient_name` delivery side effects and exact-run route exclusion. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Runtime/module docs | Replaced flat projection-preserves metadata wording with sender/receiver `ConversationTargetAddress` preservation. | Canonical team execution docs now match address-first projection ownership. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Historical hydration docs | Updated projection path wording and replaced flat identity description with address-first historical hydration and migration boundary. | Keep restore/reopen docs aligned with new persisted shape. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture docs | Updated Team Communication sidecar-store bullets to derived live event, address-first projection, and counterpart address grouping. | Frontend contributors need the correct store contract. |
| `autobyteus-web/docs/settings.md` | Frontend architecture duplicate docs | Mirrored the sidecar-store updates from `agent_execution_architecture.md`. | Avoid stale duplicate docs. |
| `autobyteus-web/docs/agent_teams.md` | Focus/routing docs | Added Team Messages exact address equality for focused task-team/task-agent rows. | Connect send-target focus semantics to Team Communication perspective matching. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Address-first Team Communication projection | Projection stores `teamRunId` once; each message stores `senderAddress`, `receiverAddress`, `content`, `messageType`, `createdAt`, and `referenceFiles`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`; `autobyteus-server-ts/docs/modules/run_history.md` |
| Exact focused address matching | The Team Messages perspective compares the focused node's normalized `ConversationTargetAddress` against message sender/receiver addresses; no display-name, suffix, flat route, or task-team-scope fallback is authoritative. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-web/docs/agent_teams.md`; `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-web/docs/settings.md` |
| Runtime no-compatibility boundary | Old flat projection files are transformed by registered app-data migration; normal runtime/API/WebSocket/frontend code reads and writes only current address-first shape. | `requirements.md`, `design-spec.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`; `autobyteus-server-ts/docs/modules/run_history.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Reference ownership remains message-owned | Team Communication `referenceFiles` remain child rows of accepted team-route messages and stay separate from Agent Artifacts/task-delegation references. | `requirements.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| `recipient_name` vs exact-run route distinction | Only accepted team-route `recipient_name` deliveries create Team Communication rows; direct exact-run messages carry runtime metadata but intentionally omit Team Communication projection fields. | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/agent_communication.md`; `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Team Communication message-level `senderRunId`, `receiverRunId`, member names, member paths, and member route keys as durable participant identity | Message-level `senderAddress` and `receiverAddress` `ConversationTargetAddress` values | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`; `autobyteus-server-ts/docs/modules/run_history.md` |
| `representedSubTeam` / `represented_sub_team` participant metadata as current Team Communication identity | `member` / `task_team` / `task_agent` address segments that preserve concrete static nested, task-team, and task-agent scope | `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`; `autobyteus-server-ts/docs/modules/agent_team_execution.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| `taskTeamScope` or route/display fallback matching for focused Team Messages | Exact normalized `ConversationTargetAddress` equality within the selected team run | `autobyteus-web/docs/agent_teams.md`; `autobyteus-web/docs/agent_execution_architecture.md`; `autobyteus-web/docs/settings.md` |
| Runtime read-time compatibility for old flat Team Communication files | Registered app-data migration before normal runtime reads | `autobyteus-web/docs/agent_artifacts.md`; `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md`; `autobyteus-server-ts/docs/modules/run_history.md`; `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete against the latest integrated base and ready for user verification. Repository finalization, ticket archival, push/merge, release, and cleanup are intentionally held pending explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
