# Docs Sync Report

## Scope

- Ticket: `team-context-files-ui-disappear`
- Trigger: Delivery docs sync after code review and API/E2E validation passed for the team context-file UI disappearance bug.
- Bootstrap base reference: `origin/personal` at `d0bf457a43aa66a00b895e30d78f461bb496b58c` (`chore(release): bump workspace release version to 1.3.51`).
- Integrated base reference used for docs sync: `origin/personal` at `d0bf457a43aa66a00b895e30d78f461bb496b58c`, refreshed with `git fetch origin personal` on 2026-06-11. The ticket branch `codex/team-context-files-ui-disappear` was already at the same commit before delivery-owned edits, so no merge/rebase was needed.
- Post-integration verification reference: No new base commits were integrated. Delivery kept the API/E2E pass as the authoritative executable evidence and ran `git diff --check` after docs/artifact updates as the delivery whitespace guard.

## Why Docs Were Updated

- Summary: Durable backend/frontend protocol docs still described team member input as flowing through `EXTERNAL_USER_MESSAGE`. The implemented and reviewed contract now projects backend `MEMBER_INPUT` events as `MEMBER_INPUT_MESSAGE`, with `EXTERNAL_USER_MESSAGE` reserved for true external-channel ingress.
- Why this should live in long-lived project docs: Future backend/frontend protocol work depends on the semantic boundary between internal team/member accepted-input echoes and external-channel user messages. Keeping the old doc text would direct maintainers back toward the exact boundary confusion that caused attachment metadata to be lost.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Server module notes documented team member input WebSocket projection. | `Updated` | Replaced the old `MEMBER_INPUT -> EXTERNAL_USER_MESSAGE` description with `MEMBER_INPUT_MESSAGE` and clarified external-channel separation. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Protocol design doc described the team member-input event contract. | `Updated` | Updated the protocol narrative to say backend `MEMBER_INPUT` events forward as `MEMBER_INPUT_MESSAGE` with context-file locators derived from canonical references. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend dispatch table documented handler ownership for WebSocket event types. | `Updated` | Split the table into true `EXTERNAL_USER_MESSAGE` handling and `MEMBER_INPUT_MESSAGE` handling. |
| `autobyteus-web/docs/settings.md` | Duplicate frontend architecture/settings dispatch table also documented handler ownership. | `Updated` | Kept the duplicate long-lived table aligned with `agent_execution_architecture.md`. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team communication/member-input module text describes leaf member-input events. | `No change` | Existing text already says leaf member input is a separate member-input event and does not claim `EXTERNAL_USER_MESSAGE`. |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Context-file serving/pipeline doc was checked for stale protocol claims. | `No change` | Existing route/storage guidance remains accurate and does not describe the old WebSocket message type. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_streaming.md` | Protocol semantics correction | Team member input now documents `MEMBER_INPUT_MESSAGE` and explicitly reserves `EXTERNAL_USER_MESSAGE` for true external-channel ingress. | Prevents backend maintainers from reusing the external-channel boundary for internal member accepted-input echoes. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Protocol narrative correction | Backend `MEMBER_INPUT` events now forward as `MEMBER_INPUT_MESSAGE`, carrying identity and canonical context-file locators; normal team/member echoes do not use `EXTERNAL_USER_MESSAGE`. | Promotes the reviewed protocol split into the durable WebSocket design doc. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend dispatch table update | Added `MEMBER_INPUT_MESSAGE -> memberInputMessageHandler.handleMemberInputMessage`; narrowed `EXTERNAL_USER_MESSAGE` to true external-channel ingress. | Keeps frontend event routing docs aligned with the implemented handler split and attachment-preservation invariant. |
| `autobyteus-web/docs/settings.md` | Frontend dispatch table update | Same dispatch-table update as the architecture doc. | This doc duplicates the active architecture table and needed the same long-lived protocol truth. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Internal team/member accepted-input echo boundary | Backend `MEMBER_INPUT` events are internal accepted-input echoes and project to `MEMBER_INPUT_MESSAGE`, not true external-channel user messages. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `code-review-report.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| Frontend attachment-preservation invariant | Deduped member-input echoes preserve existing non-empty `UserMessage.contextFilePaths` when an incoming lower-fidelity echo omits attachments; incoming non-empty context-file locators still update the row. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| External-channel separation | `EXTERNAL_USER_MESSAGE` remains available for true external-channel ingress and should not be treated as the normal team/member laptop-send echo path. | `design-spec.md`, `implementation-handoff.md`, `code-review-report.md` | `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `TeamRunEventSourceType.MEMBER_INPUT -> EXTERNAL_USER_MESSAGE` as the normal internal team/member input echo | `TeamRunEventSourceType.MEMBER_INPUT -> MEMBER_INPUT_MESSAGE` plus `memberInputMessageHandler.handleMemberInputMessage` | `autobyteus-server-ts/docs/modules/agent_streaming.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |
| External-user-message handler as the recipient of normal team/member local-send echoes | A semantic member-input handler that can preserve richer local context-file state during dedupe reconciliation | `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A — docs were updated.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest tracked `origin/personal` state. Delivery can proceed to pre-verification handoff; repository finalization, ticket archival, push/merge, release, deployment, and cleanup remain held until explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
