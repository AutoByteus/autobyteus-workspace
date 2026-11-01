# Docs Sync Report

## Scope

- Ticket: `large-runs-load-less` (Project Task `autobyteus-358`), SR-008 / IR-007 / API-REV-005 / CRR-010
- Trigger: API/E2E's integrated-head recheck API-REV-005 (Pass), which went to delivery without another test review (CRR-010); reviewed route, after the DR-001 integration Local Fix
- Bootstrap base reference: `origin/personal` @ `efd28d5c4a`
- Integrated base reference used for docs sync: `origin/personal` @ `92fffca77a`, merged by implementation as `bd79cb1601` (IR-007)
- Post-integration verification reference: delivery's clean-clone run (`evidence/DEL-*.log`)

## Why Docs Were Updated

- Summary: the change updated six docs for its new behavior:
  - the root view has no message log (`live_sequence_id`, `last_message_change_sequence`);
  - the Team tab loads each participant's stored messages on open (`CollaborationParticipantMessages`);
  - the focused member loads at open and the others when opened;
  - the startup scan no longer depends on log size;
  - a damaged log is reported with its reason;
  - long unbroken tokens render in proportion.

  Delivery found two diagrams and a section heading that still named a `TeamCommunicationStore`, which does not exist in the code. They now name the owner the change documents.
- Why this should live in long-lived project docs: the Team tab's message owner and the view's shape are what a reader looks for when a run loads slowly or a Team tab is empty.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | The view's fields; conflicted in DR-001 | Updated (by the change and by implementation's merge in IR-007; verified) | Carries both this ticket's fields (no `messages`) and the base's `CONNECTED`, `TEAM_RUN_LIFECYCLE` and `ERROR` details |
| `autobyteus-server-ts/docs/modules/run_history.md`, `docs/features/artifact_file_serving_design.md` | Stored message reads, scan, damaged log | Updated (by the change; verified) | — |
| `autobyteus-web/docs/agent_artifacts.md`, `agent_execution_architecture.md`, `settings.md` | The Team tab owner, loading on open | Updated (by the change; verified) | `CollaborationParticipantMessages` bullets |
| `autobyteus-web/docs/agent_execution_architecture.md` (diagram ~line 69/76) and `autobyteus-web/docs/settings.md` (diagram ~line 758/765, section heading ~line 2081) | They still named a `TeamCommunicationStore` | Updated (by delivery) | No such store exists in the code (only a test name). The node and the heading now name `CollaborationParticipantMessages` |
| Search for `messages` in view or snapshot wording, and for `listCommunicationMessages`, across non-ticket `*.md` | Other descriptions of the old view message log | No change | The remaining `{agent_id, messages}` hits are agent memory snapshots, a different thing |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| Six docs listed above | By the change | View without a message log; participant messages on open; scan; damaged log; long tokens | REQ-001…REQ-005 |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` | Delivery | The diagram node, its edge and the section heading name `CollaborationParticipantMessages` instead of the nonexistent `TeamCommunicationStore` | REQ-002 (the Team tab's owner) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The run view's message log (`messages`) | `CollaborationParticipantMessages`, loaded per participant on open | protocol doc, `run_history.md`, web docs |
| `baseChangeSequence`-only merge | Merge by message ID; `liveSequenceId` with `baseChangeSequence` | protocol doc, web docs |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: the clean-clone proof (AC-008), verification and finalization; no release unless asked
