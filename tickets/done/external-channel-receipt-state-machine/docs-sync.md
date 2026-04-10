# Docs Sync

## Scope

- Ticket: `external-channel-receipt-state-machine`
- Trigger Stage: `9`
- Workflow state source: `tickets/in-progress/external-channel-receipt-state-machine/workflow-state.md`

## Why Docs Were Updated

- Summary:
  - The ticket changed the durable external-channel architecture from a mixed accepted-receipt recovery model to a receipt-owned workflow with authoritative turn binding at the dispatch facade boundary.
  - The long-lived server architecture doc still described the removed accepted-receipt recovery runtime and old reply-routing dependency, so it needed to be updated to match the implemented system.
- Why this change matters to long-lived project understanding:
  - Future engineers need one durable place that explains who owns exact turn capture, when a receipt becomes accepted, how startup recovery works now, and which old paths are gone.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | It is the canonical durable architecture doc for server persistence, runtime topology, and subsystem ownership. | Updated | Replaced the stale accepted-receipt runtime description with the current receipt-owned workflow and facade-owned authoritative turn binding model. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Checked whether the top-level domain index needed a broader discoverability update. | No change | It already describes external-channel messaging ingress, bindings, and reply routing as a maintained domain area. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Persistence and runtime architecture update | Replaced the old accepted-receipt recovery runtime bullets with the receipt-owned `ChannelMessageReceipt` lifecycle, authoritative facade-side turn binding, startup restoration through `ReceiptWorkflowRuntime`, and the explicit rule that no chronology-based turn binding remains. Added a dedicated `External-Channel Messaging Runtime` section that explains the primary spine and ownership boundaries. | Keeps durable architecture docs truthful after the receipt-owned redesign and the no-fallback turn-binding refactor. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Receipt-owned durable workflow | One external inbound message maps to one durable `ChannelMessageReceipt`, and post-accept reply work is owned by `ReceiptWorkflowRuntime` rather than a mixed recovery/watcher path. | `proposed-design.md`, `future-state-runtime-call-stack.md`, `implementation.md`, `code-review.md` | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Authoritative dispatch-to-turn binding | The dispatch facade must obtain exact turn identity before persisting an accepted receipt; same-run dispatch serialization and dispatch-scoped `TURN_STARTED` capture belong at that boundary. | `investigation-notes.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `implementation.md` | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Startup and recovery behavior | Startup resumes unfinished accepted receipts by starting `ReceiptWorkflowRuntime`, and recovery/live observation operate only on already-known turns. | `future-state-runtime-call-stack.md`, `api-e2e-testing.md`, `code-review.md` | `autobyteus-server-ts/docs/ARCHITECTURE.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `AcceptedReceiptRecoveryRuntime` as the durable workflow owner | `ReceiptWorkflowRuntime` plus `ReceiptEffectRunner` as the receipt-owned durable workflow | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Chronology-based or pending-turn live binding | Authoritative facade-side dispatch capture with exact `turnId` before acceptance | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Mixed ownership between ingress, delayed correlation registries, and recovery watchers | Explicit split: ingress owns ingress, facades own dispatch-time capture, receipt runtime owns post-accept workflow | `autobyteus-server-ts/docs/ARCHITECTURE.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale:
  - Durable docs were updated.
- Why existing long-lived docs already remain accurate:
  - Not applicable.

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed:
  - None. The durable server architecture doc now matches the implemented external-channel workflow ownership model.
