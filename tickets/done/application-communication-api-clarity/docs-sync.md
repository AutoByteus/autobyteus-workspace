# Docs Sync

## Scope

- Ticket: `application-communication-api-clarity`
- Trigger Stage: `9`
- Workflow state source: `tickets/application-communication-api-clarity/workflow-state.md`

## Why Docs Were Updated

- Summary: This ticket's primary deliverable includes documentation changes. The internal service rename required updating all doc references, and a new canonical communication model document was created.
- Why this change matters to long-lived project understanding: Without the canonical communication model document, developers must infer communication boundaries from scattered source code and individual module docs. The updated naming and cross-links establish clear, single-source-of-truth documentation.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `docs/modules/application_backend_gateway.md` | Contains old service name references | Updated | Renamed `ApplicationNotificationStreamService` → `ApplicationBackendNotificationStreamService`, renamed file path, added cross-link to canonical communication model doc |
| `docs/modules/application_orchestration.md` | Contains artifact relay/runtime control documentation relevant to communication boundaries | Updated | Added cross-link to canonical communication model doc in artifact relay section and Related Docs |
| `docs/modules/README.md` | Module index must list new canonical doc | Updated | Added `Application Communication Model` entry |
| `docs/modules/application_engine.md` | Adjacent module, checked for old-name references | No change | No references to the renamed service |
| `docs/modules/applications.md` | Adjacent module, checked for old-name references | No change | No references to the renamed service |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `docs/modules/application_communication_model.md` | New document (C-007) | Canonical communication taxonomy covering 5 mechanisms: request/response, backend notifications, runtime control, artifact relay, future runtime streaming. Includes communication matrix, boundary rules, concrete examples, and internal ownership summary. | FR-001 requires a canonical communication model document. |
| `docs/modules/application_backend_gateway.md` | Rename + cross-link (C-008) | Renamed service references to `ApplicationBackendNotificationStreamService` and file path to `application-backend-notification-stream-service.ts`. Added cross-link to `application_communication_model.md` in Engine Handoff section and Related Docs. | FR-006 requires renamed internal naming. FR-001 requires cross-linking. |
| `docs/modules/application_orchestration.md` | Cross-link (C-009) | Added cross-link note in artifact relay section and `application_communication_model.md` in Related Docs. | FR-004 and FR-001 require clear artifact relay documentation and canonical doc cross-linking. |
| `docs/modules/README.md` | Index entry (C-010) | Added `Application Communication Model` row to Module Index table. | New module doc must be discoverable from the index. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Application communication taxonomy | 5 communication mechanisms, their directions, initiators, `runtimeControl` involvement, and durability semantics | `design-spec.md`, `requirements.md`, `future-state-runtime-call-stack.md` | `docs/modules/application_communication_model.md` |
| Backend notification naming clarity | The notification stream service owns backend-published frontend notification fan-out, not general streaming | `investigation-notes.md`, `design-spec.md` | `docs/modules/application_backend_gateway.md` |
| Future runtime streaming positioning | Runtime streaming/conversation is a separate future API, not a notification topic convention | `requirements.md` (FR-010) | `docs/modules/application_communication_model.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `ApplicationNotificationStreamService` (class name) | `ApplicationBackendNotificationStreamService` | `docs/modules/application_backend_gateway.md`, `docs/modules/application_communication_model.md` |
| `application-notification-stream-service.ts` (file) | `application-backend-notification-stream-service.ts` | `docs/modules/application_backend_gateway.md` |
| `getApplicationNotificationStreamService()` (accessor) | `getApplicationBackendNotificationStreamService()` | Source code (no doc change needed for internal accessor) |

## Final Result

- Result: `Updated`
- Follow-up needed: None. All docs are current and consistent with the implemented changes.
