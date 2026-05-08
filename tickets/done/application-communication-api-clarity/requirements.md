# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — bootstrapped on 2026-05-07 and advanced to design at user request. Scope confirmed: this ticket is only for naming/refactoring/documentation clarity around current application communication APIs; runtime stream implementation remains future/out of scope.

## Goal / Problem Statement

AutoByteus application communication surfaces are architecturally distinct but currently easy to confuse. The framework supports frontend-to-backend request/response APIs (`query`, `command`, `graphql`, `route`), backend-to-frontend live notifications (`publishNotification` / `subscribeNotifications`), backend-to-runtime controls (`context.runtimeControl.*`), and runtime-to-backend event/artifact handlers. However, names and documentation do not make those boundaries obvious enough.

The most confusing current name is `ApplicationNotificationStreamService`. It sounds like a general application event/notification/stream owner, but its actual responsibility is narrower: it fans out **application-backend-published notifications** to currently subscribed application frontends over the platform websocket. It is not the artifact relay owner, not the runtime event owner, and not the future runtime conversation stream owner.

This improvement ticket should clarify the application communication model before adding application runtime streaming/conversation APIs. The result should make it obvious where the future runtime stream belongs and prevent notification streaming from becoming a catch-all transport for unrelated semantics.

## Current Communication Model To Preserve

| Direction / Owner | Current API Surface | Initiated By | Goes Through `runtimeControl`? | Purpose |
| --- | --- | --- | --- | --- |
| App frontend → app backend | `client.query(...)` | App frontend | No, unless the backend handler calls it | Read app-owned state. |
| App frontend → app backend | `client.command(...)` | App frontend | No, unless the backend handler calls it | Mutate app-owned state or trigger app workflow. |
| App frontend → app backend | `client.graphql(...)` | App frontend | No, unless a resolver calls it | GraphQL app API. |
| App frontend → app backend | `client.route(...)` | App frontend | No, unless the route handler calls it | Custom HTTP-like app route. |
| App backend → app frontend | `context.publishNotification(...)` + `client.subscribeNotifications(...)` | App backend publishes; app frontend must subscribe first | No | Live, non-durable app-backend-to-frontend topic/payload push. |
| App backend → runtime | `context.runtimeControl.*` | App backend | Yes | Start, inspect, input to, query artifacts from, or terminate app-bound runtime executions. |
| Runtime/platform → app backend | `eventHandlers.*`, `artifactHandlers.persisted` | Runtime/platform | No direct frontend delivery | Let app backend react to lifecycle/artifact events and optionally notify frontend or update app state. |
| Runtime/platform → app frontend | Not supported yet | N/A | N/A | Future app-safe runtime conversation/streaming subscription; out of scope for this ticket except naming/documentation positioning. |

## Investigation Findings

- The frontend SDK exposes five application client surfaces: `query`, `command`, `graphql`, `route`, and `subscribeNotifications`.
- The backend handler context exposes `publishNotification(...)` and `runtimeControl.*` as separate concerns.
- `ApplicationNotificationStreamService` currently only republishes app backend notifications to websocket subscribers for `/ws/applications/:applicationId/backend/notifications`.
- Current application examples use notifications for app-level frontend refresh/status messages such as `brief.created`, `brief.review_updated`, `lesson.started`, and `lesson.response_received`.
- Published artifacts do not flow directly through `ApplicationNotificationStreamService`. The artifact path is `ApplicationPublishedArtifactRelayService` → app backend `artifactHandlers.persisted(...)`; the app backend may then optionally call `publishNotification(...)` for frontend push.
- Current application orchestration docs already explain artifact relay/query, but there is no single canonical communication matrix tying together frontend APIs, backend notifications, runtime control, event handlers, artifact handlers, and future runtime streaming.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Documentation / Naming Refactor.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, with Naming / Responsibility Ambiguity and future Duplicated Policy risk.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed, but intentionally small and boundary-clarifying.
- Evidence basis: The current `ApplicationNotificationStreamService` name emphasizes transport and can be mistaken for runtime/app event streaming in general. The service actually owns only app-backend-to-frontend notification fan-out. Artifact relay and runtime control are separate owners.
- Requirement or scope impact: Improve naming/docs now so the future runtime conversation stream can be introduced as a distinct capability instead of being hidden inside arbitrary notification topics.

## Recommendations / Working Direction

- Treat this as a **communication-boundary clarity** ticket, not the runtime streaming ticket.
- Add or update canonical documentation that explains all current application communication paths in one table.
- Rename internal implementation surfaces where practical from generic “application notification stream” wording to **backend notification** wording.
- Preserve public app developer behavior unless the implementing team deliberately chooses a clean-cut public rename and updates all first-party apps/packages/tests. Do not add long-lived compatibility wrappers just to keep two names authoritative.
- Keep `publishNotification` / `subscribeNotifications` documented as live, non-durable, backend-published frontend notifications.
- Keep artifact relay documented as runtime/platform → app backend first, with optional backend → frontend notification second.
- Explicitly reserve runtime streaming/conversation as a separate future semantic capability, not a subtopic convention over arbitrary notifications.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

The desired behavior is simple, but the change spans SDK contracts/docs, server gateway naming, tests, first-party app examples, and documentation. It should remain much smaller than the application-runtime-streaming platform feature.

## In-Scope Use Cases

- **UC-001 — Developer communication model clarity:** A developer can look at one document/table and understand which API to use for frontend requests, backend pushes, runtime controls, runtime events, and artifacts.
- **UC-002 — Notification semantics clarity:** A developer understands that `publishNotification` only pushes app-backend-published messages to currently subscribed app frontends and is not durable replay.
- **UC-003 — Artifact path clarity:** A developer understands that artifacts arrive at the app backend through `artifactHandlers.persisted` and are query-reconciled through `runtimeControl`, with optional frontend notification only if the app backend publishes one.
- **UC-004 — Runtime control clarity:** A developer understands that frontend APIs do not inherently go through `runtimeControl`; backend handlers may choose to call `runtimeControl.*`.
- **UC-005 — Future streaming placement clarity:** A designer or implementer of runtime streaming can see that future `subscribeRuntimeConversation` / `subscribeRuntimeStream` belongs beside, not inside, backend notifications.
- **UC-006 — Code naming clarity:** Maintainers reading the server gateway code can distinguish backend-to-frontend notification fan-out from artifact relay and future runtime streams.

## Out of Scope

- Implementing application runtime streaming/conversation subscription.
- Changing artifact persistence, artifact relay semantics, or lifecycle event journal semantics.
- Redesigning `runtimeControl.*`.
- Adding durable notification replay for `publishNotification` / `subscribeNotifications`.
- Changing generic agent/team runtime websocket services.
- Redesigning first-party application UX.

## Functional Requirements

- **FR-001:** The repository must contain a canonical application communication model document or section that lists current application communication mechanisms, initiator, direction, runtime-control involvement, durability/live semantics, and intended use.
- **FR-002:** Documentation must explicitly state that `publishNotification` / `subscribeNotifications` is backend-to-frontend live push and requires the frontend to have an active subscription to receive live messages.
- **FR-003:** Documentation must explicitly state that backend notifications are not durable/replayed and that applications should recover durable state through app queries/GraphQL/routes or runtime artifact queries.
- **FR-004:** Documentation must explicitly state that artifact publication reaches the app backend through `artifactHandlers.persisted` via `ApplicationPublishedArtifactRelayService`, and only reaches the app frontend if the app backend publishes a notification or the frontend later queries state.
- **FR-005:** Documentation must explicitly state that `query`, `command`, `graphql`, and `route` do not go through `runtimeControl` unless the invoked backend handler/resolver calls `context.runtimeControl.*`.
- **FR-006:** Internal server implementation naming should be tightened so the current notification stream owner reads as backend-published frontend notifications, not general application/runtime streaming. Recommended target naming: `ApplicationBackendNotificationStreamService` and corresponding file/test/import names.
- **FR-007:** Public SDK/API naming must have one authoritative name per concept. If the implementing team changes public names, it must update first-party apps, generated/vendor SDKs, docs, tests, and avoid long-lived dual-name wrappers. If public names stay unchanged, docs must explain their exact semantics clearly.
- **FR-008:** Tests that mention the notification stream service must be updated to the clarified naming or assertions so future readers see the backend-to-frontend responsibility.
- **FR-009:** First-party app examples/docs should use notification names and comments that make clear they are app backend frontend refresh/status hints, not runtime streams.
- **FR-010:** The documentation must include an explicit placeholder/positioning note for future app runtime conversation/streaming subscriptions as a separate semantic capability.

## Acceptance Criteria

- **AC-001:** Given a new contributor reads the updated docs, when asked how app frontend/backend/runtime/artifact communication works, then they can identify the correct current API path for each communication direction without inspecting source code.
- **AC-002:** Given an app backend calls `context.publishNotification(...)`, when the app frontend has called `client.subscribeNotifications(...)`, then docs/tests describe this as live backend-to-frontend notification fan-out over `/ws/applications/:applicationId/backend/notifications`.
- **AC-003:** Given no frontend notification subscription is active, when the app backend publishes a notification, then docs make clear there is no durable replay guarantee from the notification stream.
- **AC-004:** Given a runtime publishes an artifact, when the app backend has `artifactHandlers.persisted`, then docs show the backend handler receives the artifact event independently from frontend notifications.
- **AC-005:** Given a frontend invokes `client.command(...)`, when the command handler starts a run, then docs explain the frontend command itself did not go through `runtimeControl`; the backend handler did.
- **AC-006:** Given maintainers inspect the server gateway notification code, then service/file/test names or nearby documentation identify the owner as backend-published application frontend notifications rather than generic application streaming.
- **AC-007:** Given future runtime streaming work begins, then the updated docs show where a separate runtime conversation/stream subscription would fit without overloading notification topics.
- **AC-008:** Given repository tests run for the touched packages, then notification stream, backend gateway, frontend SDK, and first-party app integration tests pass or are updated with equivalent coverage.

## Constraints / Dependencies

- Must preserve the existing application communication behavior.
- Must not implement runtime streaming in this ticket.
- Must not alter artifact relay/query semantics.
- Must not create two long-term public names for the same SDK concept.
- Must keep application iframe host transport wiring valid for currently packaged apps.
- Must update generated/dist/vendor artifacts only according to the repository’s established package build process; do not hand-edit generated files if the repo expects them to be produced by scripts.

## Assumptions

- `origin/personal` is the intended base branch unless the user/team later redirects the ticket.
- Current public SDK method names (`publishNotification`, `subscribeNotifications`) may remain acceptable if docs and internal service naming clarify their exact semantics.
- The future runtime streaming ticket will introduce a separate runtime conversation/streaming API; this ticket only prepares conceptual and naming clarity.

## Risks / Open Questions

- Should the public type `ApplicationNotificationMessage` also be renamed to a backend-notification-specific name, or is that too broad for this small ticket?
- Should `subscribeNotifications` remain the public app SDK method name, or should a clean-cut public rename be designed separately?
- Which docs page should become canonical: existing `application_orchestration.md`, application backend gateway docs, a new application communication model doc, or all three with one canonical source and cross-links?
- How much generated/vendor package output should be committed by the implementing team versus regenerated only during package release?

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 | UC-006 |
| --- | --- | --- | --- | --- | --- | --- |
| FR-001 | Yes | Yes | Yes | Yes | Yes | Yes |
| FR-002 | Yes | Yes | No | No | No | No |
| FR-003 | Yes | Yes | Yes | No | No | No |
| FR-004 | Yes | No | Yes | No | No | No |
| FR-005 | Yes | No | No | Yes | No | No |
| FR-006 | No | Yes | No | No | No | Yes |
| FR-007 | Yes | Yes | Yes | Yes | Yes | Yes |
| FR-008 | No | Yes | No | No | No | Yes |
| FR-009 | Yes | Yes | Yes | No | No | No |
| FR-010 | Yes | No | No | No | Yes | No |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves the communication model is understandable. |
| AC-002 | Proves notification subscription semantics are clear. |
| AC-003 | Proves non-durable notification behavior is explicit. |
| AC-004 | Proves artifact path is not confused with frontend notification stream. |
| AC-005 | Proves runtime-control involvement is understood correctly. |
| AC-006 | Proves internal naming clarity improves maintainability. |
| AC-007 | Proves future runtime streaming has a distinct conceptual slot. |
| AC-008 | Proves touched code/docs/tests remain valid. |

## Approval Status

Pending user approval. Suggested ticket name: `application-communication-api-clarity`.
