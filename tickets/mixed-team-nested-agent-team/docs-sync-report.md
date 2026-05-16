# Docs Sync Report

## Delivery Round 12 Latest-Base Blocker

- Current docs-sync status: `Blocked / needs recheck after integration`
- Reason: supplemental API/E2E Round 12 passed at `bc2cb3c3`, but delivery's latest-base refresh found `origin/personal @ 29c872bbae3f20a492701443b62a0e13a8924966` ahead of the ticket branch with source/docs/test merge conflicts.
- The docs sync content below records the pre-refresh Round 11/12 candidate. It must be rechecked after implementation resolves the conflicts and the integrated branch passes review/validation.
- Blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/delivery-round12-integration-blocker.md`

## Scope

- Ticket: `mixed-team-nested-agent-team`
- Trigger: Delivery docs sync after code review Round 22 and API/E2E Round 11 for the current structured live command identity implementation.
- Bootstrap base reference: `origin/personal @ be56cab9b41b850c92690d79a8dfa70c52c369a0`
- Integrated base reference used for docs sync: `origin/personal @ a51d3abd8bb620bb984c9c9f24209e4d32eb167b`
- Current integrated ticket-branch reference: `bc2cb3c3fdff7eb89157d43fa0018bf0caf89ea4`
- Handoff state current with latest tracked remote base: `Yes` (`git rev-list --left-right --count origin/personal...HEAD` => `0 13`).
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/mixed-team-nested-agent-team/delivery-round11-post-refresh-checks.log`

## Why Docs Were Updated

- Summary: Long-lived docs now match the final integrated no-legacy command API: team command targets are explicit route/path selectors only, scalar member-name/member-id aliases are invalid command targets, team approvals must round-trip the structured source/member route/path emitted by the backend, and frontend status/approval behavior remains coarse/structured. Prior nested mixed-team docs for recursive topology, clean rosters, representative communication, restore, projections, and UI focus remain current.
- Why this should live in long-lived project docs: These route/path-only command and approval contracts are durable API boundaries. Keeping them only in ticket artifacts would risk future clients or UI code reintroducing scalar command aliases, focused-member approval fallbacks, or removed lifecycle status assumptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Authoritative WebSocket command/status protocol for team stream clients. | Updated | Documents path/route-only command selectors, scalar alias invalid-target behavior, and approval route/path requirements. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Module summary for WebSocket fanout, command parsing, approval routing, and emitted member-input events. | Updated | Records scalar command rejection, no name/id approval mapping, and display aliases as non-routing metadata. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Backend execution and command identity module doc. | Updated | Records `TeamMemberSelector` path/route-only semantics, nested launch config route/path matching, and no bare-name fallback. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend stream/status/approval architecture. | Updated | Records structured `ToolApprovalTarget` authority and the ban on focus/scalar/invocation fallback target reconstruction. |
| `autobyteus-web/docs/agent_teams.md` | Frontend nested team launch/reopen/display contract. | Updated | Records canonical offline fallback for subteam/group tiles without leaf runtime context. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Recursive restore/projection doc. | No change | Prior docs already cover recursive `memberTree`, projection dedupe, represented-subteam communication, and child top-level history exclusion. |
| `autobyteus-server-ts/docs/design/streaming_parsing_architecture.md` | Event processing/projection doc. | No change | Prior docs already cover nested source-path prefixing and representative-aware Team Communication projection. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Artifact vs Team Communication reference doc. | No change | Prior docs already cover message-owned, path-aware, representative-aware Team Communication reference projection. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Backend protocol contract | Replaced scalar alias fallback wording with explicit `target_member_path` / `target_member_route_key` selector authority and invalid-target scalar alias rejection; approvals likewise reject scalar name/id fields. | Aligns protocol docs with Round 22 clean-cut command identity implementation and Round 11 validation. |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Backend streaming module contract | Clarified team `SEND_MESSAGE` selector parsing from path/route only, rejected scalar aliases, and route/path-only approval targets. | Prevents stream-edge command parsing regressions. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Backend team execution contract | Removed bare-name selector/fallback description; documented route/path launch-config matching and path/route-only `TeamMemberSelector` command identity. | Keeps domain/backend command truth aligned with implemented no-compatibility selector policy. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend approval/status contract | Documented structured `ToolApprovalTarget` authority and no focus/scalar/invocation fallback target reconstruction. | Prevents regression of structured-only team approval dispatch. |
| `autobyteus-web/docs/agent_teams.md` | Frontend recursive display contract | Documented canonical offline fallback for subteam/group tiles without leaf runtime context. | Prevents regression to removed initialization-only statuses. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Clean-cut team command identity | Team commands are addressed by explicit member path or route key. Scalar command target aliases such as `target_member_name`, `target_agent_name`, command-side `agent_name`, and command-side `agent_id` are rejected with invalid-target errors. | `command-api-clean-cut-design-rework-note.md`, `review-report.md`, `api-e2e-validation-report.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_team_execution.md` |
| Structured approval authority | Team tool approval/denial must use backend-emitted source/member route/path identity and cannot be reconstructed from focused member state, scalar names, or invocation id fallbacks. | `review-report.md`, `api-e2e-validation-report.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_execution_architecture.md` |
| Canonical live external-message identity | `EXTERNAL_USER_MESSAGE` for team streams carries canonical member/source path/route identity; display/correlation aliases are not command authority. | `api-e2e-validation-report.md`, `implementation-handoff.md` | `agent_streaming.md`, `agent_websocket_streaming_protocol.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Runtime status clean cut | Frontend/server stream statuses are coarse (`offline`, `idle`, `running`, `error`); removed lifecycle tokens are not status API values. | `review-report.md`, `api-e2e-validation-report.md` | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_execution_architecture.md`, `agent_teams.md` |
| Nested team backend selection and recursive context | Definitions containing an `agent_team` member launch through the mixed/nested path, preserve recursive member-tree metadata, and reopen with route-keyed context. | `requirements-doc.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Representative communication rosters | Parent-to-representative, child-internal, and child-to-parent communication use clean model-facing recipient names and represented-subteam metadata, not hidden reply aliases. | `upward-nested-team-reporting-design-rework-note.md`, `round5-live-transcript-projection-presentation-design-rework-note.md`, `api-e2e-validation-report.md` | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `target_member_name` / `target_agent_name` / command-side `agent_name` / command-side `agent_id` as command target authority | Path/route selector fields (`target_member_path`, `target_member_route_key`, and camelCase equivalents); scalar aliases are invalid-target guards only. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `agent_team_execution.md` |
| Approval target reconstruction from focused member, scalar names, `agent_id`, or invocation-id fallback | Backend-emitted structured `ToolApprovalTarget` / source-member path or route key. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `autobyteus-web/docs/agent_execution_architecture.md` |
| Detailed/legacy runtime lifecycle statuses in frontend status API (`uninitialized`, `bootstrapping`, `awaiting_llm_response`, `tool_denied`, `shutdown_complete`, etc.) | Coarse status enum: `offline`, `idle`, `running`, `error`; subteam/group no-context tiles use `offline`. | `agent_websocket_streaming_protocol.md`, `agent_streaming.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/agent_teams.md` |
| Flat mixed-team execution over only per-member `AgentRun`s | Mixed top-level member handles where agent members own `AgentRun`s and subteam members own child `TeamRun`s. | `agent_team_execution.md` |
| Hidden reply alias / raw descriptor labels in model-facing roster text/schema | Explicit clean allowed recipient names and represented-subteam metadata while descriptors remain routing authority. | `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |
| Flat team metadata as restore truth | Recursive `TeamRunMetadata.memberTree`; flat leaf projections only for projection/search consumers. | `run_history.md`, `agent_team_execution.md`, `autobyteus-web/docs/agent_teams.md` |

## No-Impact Decision

- Docs impact: `N/A — docs updated`
- Rationale: Round 11 confirmed durable API/UX contracts that required explicit long-lived documentation.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs were synchronized after confirming `origin/personal` was current for the ticket branch and passing delivery post-refresh checks. Delivery remains on user-verification hold before archiving, final commit, push, merge, cleanup, release, or deployment work.

## Blocked Or Escalated Follow-Up

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A — docs sync completed`
