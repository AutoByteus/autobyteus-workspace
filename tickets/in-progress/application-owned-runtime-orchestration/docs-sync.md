# Docs Sync Report

## Scope

- Ticket: `application-owned-runtime-orchestration`
- Trigger: Review round `9` and API/E2E validation round `4` are the latest authoritative `Pass` state on `2026-04-19`, so the cumulative package is ready for delivery.
- Bootstrap base reference: `origin/personal` from `tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Integrated base reference used for docs sync: `origin/personal @ ea1892dbbe6cb12118bdb6d91cfc63564f12c4e7`
- Delivery safety checkpoint before integration: local checkpoint commit `a7c19d4d` (`chore(checkpoint): preserve application-owned-runtime-orchestration round-4 validated package`)
- Delivery integration result: merged the advanced `origin/personal` base into the ticket branch, producing integrated branch head `a0f0124b`
- Post-integration verification reference: `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/integration/application-backend/brief-studio-imported-package.integration.test.ts tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts tests/unit/application-backend/app-owned-graphql-executors.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/publish-artifact-tool.test.ts` passed after the merge (`7` files, `17` tests).

## Why Docs Were Updated

- Summary: This ticket replaces the old platform-owned `applicationSession` / singular `runtimeTarget` launch model with application-owned runtime orchestration. Durable project docs now need to teach that the generic host only ensures backend readiness and bootstraps the iframe, application backends own `runtimeControl.startRun(...)` / `postRunInput(...)`, the hosted backend contract is anchored on `transport.backendBaseUrl`, and app business GraphQL schemas/clients stay inside each application workspace.
- Current cumulative-state expansion: the later round-6/round-7 implementation state also replaced the shared/public `executionRef` handoff with opaque `bindingIntentId`, added app-owned pending binding-intent reconciliation plus `getRunBindingByIntentId(...)`, and updated the teaching samples to document those direct-launch ownership rules.
- Why this should live in long-lived project docs: These are canonical product, platform, SDK, and sample-app authoring contracts. Future readers should learn them from repo docs, not only from this ticket artifact chain.
- Packaged-client delta note: the round-9 / round-4 packaged-client vendoring repair restored already-intended packaged behavior and durable validation, but it did not require additional long-lived user-facing docs beyond the synchronized cumulative docs below.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `applications/brief-studio/README.md` | Canonical sample-app README had to teach app-owned GraphQL plus the direct-launch correlation model for the “many runs over one business record” pattern. | `Updated` | Now teaches app-owned `briefId`, pending `bindingIntentId` handoff before direct launch, and many run bindings over one brief record. |
| `applications/socratic-math-teacher/README.md` | Canonical teaching-sample README had to document the “one long-lived conversational binding” pattern instead of the placeholder app. | `Updated` | Now teaches app-owned lesson GraphQL, one `lessonId`, and follow-up input via `runtimeControl.postRunInput(...)`. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Canonical host/iframe contract doc had to reflect the current v2 ready/bootstrap envelope. | `Updated` | The filename remains historical, but the content now documents contract version `2`, `backendBaseUrl`, and the session-free host/bootstrap shape. |
| `autobyteus-web/docs/applications.md` | Canonical frontend Applications module doc had to explain backend `ensure-ready`, host launch ownership, and app-owned pending binding-intent/runtime work. | `Updated` | Now documents bundle resources, host launch states, business-identity ownership, and app-backend orchestration responsibilities. |
| `autobyteus-web/docs/agent_management.md` | Agent defaults doc needed to stop referring to session-owned application launch preparation. | `Updated` | Now states application-authored backend flows may reuse persisted defaults when they start runtime work. |
| `autobyteus-web/docs/agent_teams.md` | Team defaults doc needed the same ownership correction. | `Updated` | Now states app backends may reuse team defaults when they decide to start a run. |
| `autobyteus-application-sdk-contracts/README.md` | Shared contract README had to describe manifest v3, request-context v2, runtime-control, and execution-event envelopes. | `Updated` | Now documents the current exported version constants and orchestration-facing contract surface. |
| `autobyteus-application-frontend-sdk/README.md` | Frontend SDK README had to teach the shared backend-mount helper and `backendBaseUrl` as the authoritative transport base. | `Updated` | Now documents schema-agnostic transport helpers derived from `backendBaseUrl` and the optional notification channel. |
| `autobyteus-application-backend-sdk/README.md` | Backend SDK README had to align with backend definition contract v2 and the app-owned runtime-control boundary. | `Updated` | Now documents `definitionContractVersion: '2'` and `context.runtimeControl`. |
| `autobyteus-server-ts/docs/modules/applications.md` | Server module doc had to describe manifest v3, catalog `bundleResources[]`, and the removal of bundle-level `runtimeTarget`. | `Updated` | Now treats bundle discovery as separate from orchestration. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | The code now has a first-class `application-orchestration` module that needed canonical server documentation. | `Updated` | Documents `bindingIntentId`, `getRunBindingByIntentId(...)`, durable bindings/journals, recovery, and startup gating. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Historical module doc needed to stop presenting removed architecture as current truth. | `Updated` | Converted into a historical redirect note that points readers to `application_orchestration.md` and records pending-intent reconciliation as part of the replacement model. |
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
| `applications/brief-studio/README.md` | Sample-app teaching update | Documented app-owned GraphQL, app-owned `briefId`, pending `bindingIntentId` handoff before each direct launch, many runs over one business record, and durable projection ownership. | Brief Studio is the canonical imported teaching sample for the new model. |
| `applications/socratic-math-teacher/README.md` | Sample-app teaching update | Documented app-owned lesson GraphQL, one `lessonId`, one long-lived conversational binding, and follow-up input via `postRunInput(...)`. | Prevents future readers from learning the old placeholder or host-owned launch model. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Public contract update | Replaced session-era bootstrap content with the current v2 envelope and `backendBaseUrl`-anchored transport surfaces. | Keeps the canonical host/iframe contract truthful. |
| `autobyteus-web/docs/applications.md` | Frontend module behavior update | Documented backend `ensure-ready`, `applicationHostStore`, iframe launch ownership, and the app-owned business-identity/pending-intent boundary. | Future frontend work needs the current host/app split. |
| `autobyteus-web/docs/agent_management.md` | Ownership clarification | Replaced session-owned launch-prep wording with application-authored backend runtime-work wording. | Agent defaults are still reused, but by a different owner now. |
| `autobyteus-web/docs/agent_teams.md` | Ownership clarification | Replaced team-runtime launch-draft wording with app-authored backend runtime orchestration wording. | Team-default docs must match the current host/app contract. |
| `autobyteus-application-sdk-contracts/README.md` | Shared contract refresh | Updated the manifest/backend-definition/frontend-SDK version constants and the orchestration-facing public contract surface. | SDK readers need the current public contract surface. |
| `autobyteus-application-frontend-sdk/README.md` | Frontend SDK example refresh | Updated the sample client to derive GraphQL/query/command/route invokers from `backendBaseUrl` and documented optional notifications. | Prevents new app UIs from copying removed parallel URL sources of truth. |
| `autobyteus-application-backend-sdk/README.md` | Backend SDK example refresh | Updated the example to definition contract v2 and documented `context.runtimeControl`. | Backend authors need the app-owned orchestration surface, not the removed host-owned one. |
| `autobyteus-server-ts/docs/modules/applications.md` | Server module contract update | Updated bundle-manifest docs to manifest v3 + `bundleResources[]`, and removed `runtimeTarget` assumptions. | Keeps bundle discovery docs aligned with the code and schema. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Canonical module update | Documented runtime control, durable bindings, `bindingIntentId` handoff, `getRunBindingByIntentId(...)`, event ingress/dispatch, recovery, and startup gating. | The new server owner needs a canonical durable explanation. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Historical redirect rewrite | Replaced the removed architecture doc with a redirect note to the new orchestration docs and replacement ownership model. | Prevents stale docs from remaining authoritative. |
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
| App-owned runtime orchestration | Application backends own `context.runtimeControl.*`, choose runtime resources, persist app-owned pending binding intents, call direct `startRun(...)` / `postRunInput(...)`, and reconcile authoritative binding ownership via `bindingIntentId`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-application-backend-sdk/README.md` |
| Hosted backend transport contract | `transport.backendBaseUrl` is the one authoritative hosted backend base; GraphQL/query/command/route URLs derive from it rather than becoming parallel bootstrap fields. | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-report.md` | `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`, `autobyteus-application-frontend-sdk/README.md`, `autobyteus-server-ts/docs/modules/application_backend_gateway.md` |
| Public SDK/version contract shift | The public bundle contract is now manifest v3 / backend-definition v2 / frontend SDK v2 with `launchInstanceId` request context and orchestration-facing runtime-control types. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-frontend-sdk/README.md`, `autobyteus-application-backend-sdk/README.md` |
| Durable binding and event-journal model | Live application runtime state is now persisted as run bindings plus execution-event journals, with global run-id lookup for ingress routing and intent-based reconciliation for direct launches. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-server-ts/docs/modules/application_storage.md` |
| Startup recovery and gating | Recovery rebuilds lookups, reattaches observers, orphans unavailable bindings, and only then opens live runtime-control/artifact ingress. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-server-ts/docs/modules/application_engine.md` |
| Canonical teaching samples | Brief Studio now teaches many runs over one brief business record with pending binding intents, while Socratic Math Teacher teaches one long-lived conversational binding over one lesson business identity. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md` |
| Historical-doc replacement boundary | `application_sessions.md` is no longer current architecture; it remains only as a redirect to the new orchestration docs. | `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/application_sessions.md`, `autobyteus-server-ts/docs/modules/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Platform-owned `applicationSession` lifecycle and `applicationSessionId` identity | App-owned run bindings plus request context `{ applicationId, launchInstanceId? }` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` |
| Public/shared `executionRef` runtime-control handoff for direct launches | App-owned business identity plus opaque `bindingIntentId` reconciliation through `getRunBindingByIntentId(...)` | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `applications/brief-studio/README.md` |
| Bundle-level singular `runtimeTarget` launch contract | `bundleResources[]` catalog discovery plus application-authored `runtimeControl.startRun(...)` selection | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-web/docs/applications.md` |
| Parallel hosted backend URL fields for business APIs | One authoritative `backendBaseUrl` plus derivation in the shared frontend SDK transport helper | `autobyteus-application-frontend-sdk/README.md`, `autobyteus-server-ts/docs/modules/application_backend_gateway.md` |
| `application_sessions.md` as the current server architecture doc | `application_orchestration.md` plus a historical redirect note | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-server-ts/docs/modules/application_sessions.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the current round-9 reviewed + round-4 validated integrated state. Repository archival/finalization remains on hold pending explicit user verification.
