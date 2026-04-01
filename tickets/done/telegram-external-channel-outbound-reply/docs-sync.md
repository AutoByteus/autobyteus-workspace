# Docs Sync

## Scope

- Ticket: `telegram-external-channel-outbound-reply`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/telegram-external-channel-outbound-reply/workflow-state.md`

## Why Docs Were Updated

- Summary:
  - The ticket changes durable server behavior around external-channel persistence, accepted-receipt lifecycle, and reply recovery, so the long-lived architecture docs needed to reflect that every file-backed external-channel artifact now lives under one top-level `<appDataDir>/external-channel/` folder and that accepted receipts survive restart until publication completes.
  - The final storage-surface refinement collapsed the remaining split app-data layout without reintroducing any legacy compatibility path.
- Why this change matters to long-lived project understanding:
  - Future engineers need to know that bindings are not profile-driven SQL entities anymore, that accepted receipts remain unfinished work until callback publication, and that reply publication depends on accepted runtime `turnId` values being bound before callback work can be emitted.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Persistence behavior and app-data ownership are the canonical durable docs for storage decisions. | Updated | Added the external-channel persistence exception, accepted-receipt lifecycle note, startup recovery note, and reply-routing dependency note. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Domain-area index should mention external-channel behavior now that the feature is explicitly maintained. | Updated | Added external-channel messaging ingress/bindings/reply routing to the overview domain list. |
| `autobyteus-server-ts/docs/modules/README.md` | Checked whether the repo already had a canonical external-channel module doc location. | No change | No existing external-channel module doc exists; architecture/overview updates were sufficient for this ticket. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Persistence and runtime clarification | Documented that file-backed external-channel artifacts live under `<appDataDir>/external-channel/`, that accepted receipts remain unfinished until callback publication, and that startup restores unfinished accepted receipts through the recovery runtime. | Prevents future engineers from assuming `channel_bindings` still belongs to SQL persistence, that bindings still live at the app-data root, or that reply routing is still owned by live in-memory bridge state alone. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Domain index update | Added external-channel messaging ingress, bindings, and reply routing to the top-level domain-area list. | Makes the capability discoverable in long-lived project docs. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| External-channel file-backed storage contract | Bindings, file-profile receipts, file-profile delivery events, and the callback outbox all live under one top-level `<appDataDir>/external-channel/` folder. | `requirements.md`, `proposed-design.md`, `api-e2e-testing.md` | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Accepted receipt recovery contract | Accepted receipts remain durable unfinished work until callback publication completes, and startup restores them through the accepted-receipt recovery runtime. | `requirements.md`, `proposed-design.md`, `future-state-runtime-call-stack.md`, `api-e2e-testing.md` | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| External-channel reply routing dependency | Outbound callback work depends on accepted runtime `turnId` values being bound to persisted receipts. | `investigation-notes.md`, `future-state-runtime-call-stack.md`, `api-e2e-testing.md` | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Capability discoverability | External-channel ingress/binding/reply behavior is a maintained domain area in the TS server. | `requirements.md`, `handoff-summary.md` | `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| SQL-backed `channel_bindings` as an implied binding store | One file-backed external-channel folder under `<appDataDir>/external-channel/` | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Split app-data storage between root binding file and `memory/persistence/external-channel/**` | One top-level `<appDataDir>/external-channel/` folder as the only file-backed storage location | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Facade-owned best-effort reply arming | Accepted-receipt recovery runtime plus observation-only bridges | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| Generic latest-source receipt lookups and the empty `ChannelSourceContextProvider` layer | Turn-scoped receipt lookup through `getSourceByAgentRunTurn(agentRunId, turnId)` | Internal runtime boundary only; no additional long-lived docs change required because existing docs already describe turn-correlated reply routing. |

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
  - None for this ticket; the long-lived docs now match the unified `server-data/external-channel/` ownership surface.
