# Docs Sync Report

## Scope

- Ticket: `application-owned-runtime-orchestration`
- Trigger: Review round `6` and API/E2E validation round `2` are the latest authoritative `Pass` state on `2026-04-19`, so the cumulative package is ready for delivery.
- Bootstrap base reference: `origin/personal` from `tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Integrated base reference used for docs sync: `origin/personal @ 515ed72a82d552fefb6f1356a671bf213bec0cbe`; `git fetch origin --prune` confirmed no new base merge was needed before the refreshed delivery handoff.
- Local protection for the refreshed validated package: a local checkpoint commit preserves the cumulative candidate while finalization remains on user-verification hold.
- Post-integration verification reference: no delivery-stage rerun was required because the tracked base still matched the reviewed + validated base commit and round-6 / round-2 evidence remained authoritative.

## Why Docs Were Updated

- Summary: This ticket replaces the old platform-owned `applicationSession` / singular `runtimeTarget` launch model with application-owned runtime orchestration. Durable project docs now need to teach that the generic host only ensures backend readiness and bootstraps the iframe, application backends own `runtimeControl.startRun(...)` / `postRunInput(...)` and `executionRef`, bundled resources are cataloged as `bundleResources[]` instead of one required launch target, the hosted backend contract is anchored on `transport.backendBaseUrl`, and app business GraphQL schemas/clients stay inside each application workspace.
- Why this should live in long-lived project docs: These are canonical product, platform, SDK, and sample-app authoring contracts. Future readers should learn them from repo docs, not only from this ticket artifact chain.
- Round-6 / round-2 delta note: The later transport and GraphQL Local Fixes restored already-documented contract behavior, so no extra long-lived docs beyond the synced set below were required in the refreshed delivery pass.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `applications/brief-studio/README.md` | Canonical sample-app README had to teach app-owned GraphQL, `executionRef = briefId`, and the “many runs over one business record” pattern. | `Updated` | Now teaches app-owned business identity, launch ownership, and projection ownership. |
| `applications/socratic-math-teacher/README.md` | Canonical teaching-sample README had to document the “one long-lived conversational binding” pattern instead of the placeholder app. | `Updated` | Now teaches app-owned lesson GraphQL, one `lessonId`, and follow-up input via `runtimeControl.postRunInput(...)`. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Canonical host/iframe contract doc had to reflect the current v2 ready/bootstrap envelope. | `Updated` | The filename remains historical, but the content now documents contract version `2`, `backendBaseUrl`, and the session-free host/bootstrap shape. |
| `autobyteus-web/docs/applications.md` | Canonical frontend Applications module doc had to explain backend `ensure-ready`, host launch ownership, and app-owned runtime work. | `Updated` | Now documents bundle resources, host launch states, and app-backend ownership of orchestration. |
| `autobyteus-web/docs/agent_management.md` | Agent defaults doc needed to stop referring to session-owned application launch preparation. | `Updated` | Now states application-authored backend flows may reuse persisted defaults when they start runtime work. |
| `autobyteus-web/docs/agent_teams.md` | Team defaults doc needed the same ownership correction. | `Updated` | Now states app backends may reuse team defaults when they decide to start a run. |
| `autobyteus-application-sdk-contracts/README.md` | Shared contract README had to describe manifest v3, request-context v2, runtime-control, and execution-event envelopes. | `Updated` | Now documents the current exported version constants and orchestration types. |
| `autobyteus-application-frontend-sdk/README.md` | Frontend SDK README had to teach the shared backend-mount helper and `backendBaseUrl` as the authoritative transport base. | `Updated` | Now documents schema-agnostic transport helpers derived from `backendBaseUrl` and the optional notification channel. |
| `autobyteus-application-backend-sdk/README.md` | Backend SDK README had to align with backend definition contract v2 and the app-owned runtime-control boundary. | `Updated` | Now documents `definitionContractVersion: '2'` and `context.runtimeControl`. |
| `autobyteus-server-ts/docs/modules/applications.md` | Server module doc had to describe manifest v3, catalog `bundleResources[]`, and the removal of bundle-level `runtimeTarget`. | `Updated` | Now treats bundle discovery as separate from orchestration. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | The code now has a first-class `application-orchestration` module that needed canonical server documentation. | `Updated` | New long-lived module doc created for runtime control, bindings, event ingress/dispatch, recovery, and startup gating. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Historical module doc needed to stop presenting removed architecture as current truth. | `Updated` | Converted into a historical redirect note that points readers to `application_orchestration.md`. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Gateway doc had to reflect `ensure-ready`, `launchInstanceId`, `backendBaseUrl`, and session-free request context. | `Updated` | Session-era request-context wording was removed. |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Engine doc had to reflect backend definition contract v2 and worker-to-host runtime-control bridging. | `Updated` | Startup-resume notes now reference orchestration recovery and pending execution-event resumption. |
| `autobyteus-server-ts/docs/modules/application_storage.md` | Storage doc had to explain active run-binding/journal tables plus the new global orchestration lookup DB. | `Updated` | Also records that legacy session/publication tables remain only as migration-safe historical compatibility tables. |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Default-launch docs had to stop teaching direct application launch preparation. | `Updated` | Now references application-authored backend orchestration flows. |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Team definition docs had to mirror the same ownership correction. | `Updated` | Now states the host no longer treats one embedded team as the mandatory launch-time target. |
| `autobyteus-server-ts/docs/modules/application_capability.md` | Related-doc links had to move from the removed session doc to the new orchestration doc. | `Updated` | Capability behavior itself did not change. |
| `autobyteus-server-ts/docs/modules/README.md` | The module index had to add the new orchestration doc and demote application sessions to historical status. | `Updated` | Common-pattern summary now refers to application orchestration instead of sessions. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `applications/brief-studio/README.md` | Sample-app teaching update | Documented app-owned GraphQL, app-owned `briefId`, `executionRef = briefId`, many runs over one business record, and durable projection ownership. | Brief Studio is the canonical imported teaching sample for the new model. |
| `applications/socratic-math-teacher/README.md` | Sample-app teaching update | Documented app-owned lesson GraphQL, one `lessonId`, one long-lived conversational binding, and follow-up input via `postRunInput(...)`. | Prevents future readers from learning the old placeholder or host-owned launch model. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Public contract update | Replaced session-era bootstrap content with the current v2 envelope and `backendBaseUrl`-anchored transport surfaces. | Keeps the canonical host/iframe contract truthful. |
| `autobyteus-web/docs/applications.md` | Frontend module behavior update | Documented backend `ensure-ready`, `applicationHostStore`, iframe launch ownership, and the removal of session-owned host flows. | Future frontend work needs the current host/app split. |
| `autobyteus-web/docs/agent_management.md` | Ownership clarification | Replaced session-owned launch-prep wording with application-authored backend runtime-work wording. | Agent defaults are still reused, but by a different owner now. |
| `autobyteus-web/docs/agent_teams.md` | Ownership clarification | Replaced team-runtime launch-draft wording with app-authored backend runtime orchestration wording. | Team-default docs must match the current host/app contract. |
| `autobyteus-application-sdk-contracts/README.md` | Shared contract refresh | Updated the manifest/backend-definition/frontend-SDK version constants and added runtime-control/execution-event coverage. | SDK readers need the current public contract surface. |
| `autobyteus-application-frontend-sdk/README.md` | Frontend SDK example refresh | Updated the sample client to derive GraphQL/query/command/route invokers from `backendBaseUrl` and documented optional notifications. | Prevents new app UIs from copying removed parallel URL sources of truth. |
| `autobyteus-application-backend-sdk/README.md` | Backend SDK example refresh | Updated the example to definition contract v2 and documented `context.runtimeControl`. | Backend authors need the app-owned orchestration surface, not the removed host-owned one. |
| `autobyteus-server-ts/docs/modules/applications.md` | Server module contract update | Updated bundle-manifest docs to manifest v3 + `bundleResources[]`, and removed `runtimeTarget` assumptions. | Keeps bundle discovery docs aligned with the code and schema. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | New canonical module doc | Added a new long-lived server doc for runtime control, run bindings, event ingress/dispatch, recovery, and startup gating. | The new server owner needs a canonical durable explanation. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Historical redirect rewrite | Replaced the removed architecture doc with a redirect note to the new orchestration docs. | Prevents stale docs from remaining authoritative. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Gateway contract update | Added `ensure-ready`, `launchInstanceId`, `backendBaseUrl`, and session-free request-context behavior. | Keeps backend transport docs aligned with the live routes. |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Engine contract update | Updated the backend definition contract version and documented runtime-control bridging plus orchestration startup recovery. | Engine docs must explain how the worker participates in the new architecture. |
| `autobyteus-server-ts/docs/modules/application_storage.md` | Storage ownership update | Documented active run-binding/event-journal tables and the global orchestration lookup DB. | Durable persistence ownership moved significantly in this ticket. |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Launch-default ownership update | Reframed application-owned agent defaults around app-authored backend orchestration. | Removes stale launch-preparation wording. |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Launch-default ownership update | Reframed application-owned team defaults around app-authored backend orchestration. | Removes stale launch-target wording. |
| `autobyteus-server-ts/docs/modules/application_capability.md` | Related-doc sync | Updated cross-links to point at the new orchestration module doc. | Keeps the doc graph internally consistent. |
| `autobyteus-server-ts/docs/modules/README.md` | Module index update | Added `application_orchestration.md` and marked `application_sessions.md` as historical. | Keeps module navigation aligned with the current architecture. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Host launch ownership | The generic Applications host ensures backend readiness and completes the iframe v2 handshake; it does not create a platform-owned live application execution. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-web/docs/applications.md`, `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` |
| App-owned runtime orchestration | Application backends own `context.runtimeControl.*`, choose runtime resources, bind app-owned `executionRef` values, and may reuse bindings through `postRunInput(...)`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-application-backend-sdk/README.md` |
| Hosted backend transport contract | `transport.backendBaseUrl` is the one authoritative hosted backend base; GraphQL/query/command/route URLs derive from it rather than becoming parallel bootstrap fields. | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-report.md` | `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`, `autobyteus-application-frontend-sdk/README.md`, `autobyteus-server-ts/docs/modules/application_backend_gateway.md` |
| Public SDK/version contract shift | The public bundle contract is now manifest v3 / backend-definition v2 / frontend SDK v2 with `launchInstanceId` request context. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-frontend-sdk/README.md`, `autobyteus-application-backend-sdk/README.md` |
| Durable binding and event-journal model | Live application runtime state is now persisted as run bindings plus execution-event journals, with global run-id lookup for ingress routing. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-server-ts/docs/modules/application_storage.md` |
| Startup recovery and gating | Recovery rebuilds lookups, reattaches observers, orphans unavailable bindings, and only then opens live runtime-control/artifact ingress. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-server-ts/docs/modules/application_engine.md` |
| Canonical teaching samples | Brief Studio now teaches many runs over one business record, while Socratic Math Teacher teaches one long-lived conversational binding over one lesson business identity. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md` |
| Historical-doc replacement boundary | `application_sessions.md` is no longer current architecture; it remains only as a redirect to the new orchestration docs. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/application_sessions.md`, `autobyteus-server-ts/docs/modules/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Platform-owned `applicationSession` lifecycle and `applicationSessionId` identity | App-owned run bindings keyed by `executionRef` plus request context `{ applicationId, launchInstanceId? }` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` |
| Bundle-level singular `runtimeTarget` launch contract | `bundleResources[]` catalog discovery plus application-authored `runtimeControl.startRun(...)` selection | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-web/docs/applications.md` |
| Parallel hosted backend URL fields for business APIs | One authoritative `backendBaseUrl` plus derivation in the shared frontend SDK transport helper | `autobyteus-application-frontend-sdk/README.md`, `autobyteus-server-ts/docs/modules/application_backend_gateway.md` |
| Session GraphQL / websocket host surfaces | Backend `ensure-ready` + iframe bootstrap v2 + app-owned backend APIs / notifications | `autobyteus-web/docs/applications.md`, `autobyteus-server-ts/docs/modules/application_backend_gateway.md` |
| `application_sessions.md` as the current server architecture doc | `application_orchestration.md` plus a historical redirect note | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-server-ts/docs/modules/application_sessions.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the current round-6 reviewed + round-2 validated state. Repository archival/finalization remains on hold pending explicit user verification.
