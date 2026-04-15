# Docs Sync Report

## Scope

- Ticket: `application-bundle-agent-architecture-analysis`
- Trigger: `Authoritative delivery package accepted on 2026-04-15 after code review round 19 passed and validation round 11 passed in the canonical implementation worktree`

## Why Docs Were Updated

- Summary: the final implemented slice now includes the full application-platform owner split, the app-author SDK packages, the repo-root `applications/` model, the Brief Studio teaching sample plus packaging mirror, the imported-package transport/storage/root-precedence refinements, and the app-first live-session shell / workspace execution-handoff ownership model.
- Why this should live in long-lived project docs: these behaviors define the durable application author contract, runtime/storage ownership boundaries, built-in-vs-imported discovery rules, the app-shell vs host-launch vs retained-execution ownership split, and the canonical teaching path for future application bundles.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/applications.md` | Verify bundle/module docs match manifest v2, backend bundle manifests, the repo-root applications container, and built-in root precedence rules | `Updated` | Documents the shared `applications/` root, the Brief Studio sample, and built-in-root authority under duplicate/additional-root scenarios. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Verify session/publication docs match durable storage, journal append, async dispatch behavior, and retained execution inspection semantics | `Updated` | Keeps the durable session/publication authority, retry semantics, and retained execution model truthful. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Verify backend transport docs match the real REST/WS gateway boundary after imported-package fixes | `Updated` | Documents the route-param length increase for long canonical application ids. |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Verify worker lifecycle/engine docs match the final implementation | `Updated` | Keeps engine startup/invocation ownership aligned with the current worker host. |
| `autobyteus-server-ts/docs/modules/application_storage.md` | Verify storage docs match `platform.sqlite` / `app.sqlite` ownership plus compacted storage-key behavior | `Updated` | Clarifies canonical public `applicationId` vs internal compacted storage key for oversized ids. |
| `autobyteus-server-ts/docs/modules/application_capability.md` | Verify related-doc references remain correct after the repo-root applications model and new module docs | `Updated` | Cross-repo related-doc references were corrected. |
| `autobyteus-server-ts/docs/modules/README.md` | Keep the module index aligned with the new application subsystem docs | `Updated` | Includes backend gateway, engine, and storage docs in the canonical module index. |
| `autobyteus-web/docs/applications.md` | Verify frontend Applications docs match the app-first shell / surface / execution ownership model, durable sessions, iframe transport, and SDK layering | `Updated` | Documents the app-first shell owner, the authoritative host launch owner, and the explicit workspace execution handoff as implemented. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Verify the iframe bootstrap contract matches the final payload and author guidance | `Updated` | Keeps the bootstrap payload, backend URLs, and SDK-layer guidance aligned with the current implementation. |
| `autobyteus-application-sdk-contracts/README.md` | Verify the shared contract package has canonical usage/reference docs | `Updated` | Documents manifest/backend/request/event/engine contracts and points readers to Brief Studio. |
| `autobyteus-application-frontend-sdk/README.md` | Verify the frontend SDK package has canonical usage/reference docs | `Updated` | Documents `createApplicationClient(...)` and points readers to the Brief Studio UI example. |
| `autobyteus-application-backend-sdk/README.md` | Verify the backend SDK package has canonical usage/reference docs | `Updated` | Documents `defineApplication(...)`, handler context, and the Brief Studio backend example. |
| `applications/brief-studio/README.md` | Verify the canonical teaching sample is documented as the repo-local runnable root plus packaging mirror workflow | `Updated` | Documents repo-local runnable root, packaging mirror, app-owned boundaries, and atomic projection/idempotency ownership. |
| `applications/brief-studio/dist/importable-package/applications/brief-studio/README.md` | Check whether the generated packaging-mirror note needed extra durable explanation | `No change` | Existing note remains sufficient; the canonical durable explanation lives in `applications/brief-studio/README.md`. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/applications.md` | Server module/runtime documentation | Documented the repo-root `applications/` model, the Brief Studio sample, built-in-root precedence, duplicate-root skipping, and protected built-in-root rules. | The final implementation now depends on those discovery/identity rules and they should be explicit. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Server module/runtime documentation | Documented durable session state, normalized publication journal append, async at-least-once dispatch, startup resume behavior, and the backend-authoritative retained execution inspection model. | The old in-memory-only session description would no longer be truthful, and the retained execution view now depends on that durable session authority. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Server module/runtime documentation | Documented the app-scoped REST/WS gateway boundary and the shared route-param max-length behavior for long canonical ids. | The imported-package transport fix is durable runtime behavior. |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Server module/runtime documentation | Documented worker lifecycle ownership, startup states, exposure validation, invocation ownership, and operational artifacts. | The application engine is a durable runtime owner. |
| `autobyteus-server-ts/docs/modules/application_storage.md` | Server module/runtime documentation | Documented `platform.sqlite` vs `app.sqlite`, migration guards, storage layout, and clarified canonical id vs internal compacted storage key. | The oversized-id storage behavior is durable runtime knowledge. |
| `autobyteus-server-ts/docs/modules/application_capability.md` | Documentation maintenance / discoverability | Corrected related-doc links after the repo-root applications model and new module docs landed. | Readers need working canonical references. |
| `autobyteus-server-ts/docs/modules/README.md` | Documentation index update | Added the new application subsystem docs to the module index and noted the explicit owner split. | Readers need a discoverable entrypoint into the new canonical docs. |
| `autobyteus-web/docs/applications.md` | Frontend/runtime documentation | Documented `ApplicationShell.vue` as the app-first live-session shell owner, `ApplicationSurface.vue` as the authoritative host launch owner, the explicit workspace execution-link handoff, durable backend-authoritative sessions, app-scoped backend transport URLs, and the public SDK surface split. | The Applications page now uses a clearer owner split and richer contract than the older doc described. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Public contract documentation | Updated the exact bootstrap payload, documented backend transport URLs, and added SDK-layer usage guidance/examples. | App authors need one truthful bootstrap reference matching the current host implementation. |
| `autobyteus-application-sdk-contracts/README.md` | Package/API documentation | Added canonical docs for shared manifest/backend/request/event/engine contracts and linked to Brief Studio. | The shared contracts package is part of the durable app-author surface. |
| `autobyteus-application-frontend-sdk/README.md` | Package/API documentation | Added canonical docs for `createApplicationClient(...)` and the iframe-side backend transport contract, with Brief Studio references. | The frontend SDK is part of the durable app-author surface. |
| `autobyteus-application-backend-sdk/README.md` | Package/API documentation | Added canonical docs for `defineApplication(...)`, handler/storage semantics, and idempotent event handling, with Brief Studio references. | The backend SDK is part of the durable app-author surface. |
| `applications/brief-studio/README.md` | Teaching-sample documentation | Documented the repo-local runnable root, packaging mirror, build flow, app-owned boundaries, and atomic projection/idempotency teaching pattern. | Brief Studio is now the canonical teaching sample for future app authors. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Bundle manifest v2 + backend bundle manifest | Application bundles now declare both UI and backend bundle contracts, and backend runtime assets must stay self-contained under `backend/` | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-application-sdk-contracts/README.md` |
| Platform-owned backend gateway + app engine | App-owned queries/commands/routes/graphql/notifications flow through one platform-owned gateway and worker-host boundary | `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/application_backend_gateway.md`, `autobyteus-server-ts/docs/modules/application_engine.md`, `autobyteus-web/docs/applications.md` |
| App-first live-session shell and workspace execution handoff | `ApplicationShell.vue` owns live-session shell policy, `ApplicationSurface.vue` owns host launch/bootstrap, `ApplicationExecutionWorkspace.vue` owns retained inspection, and full execution monitoring crosses through one explicit workspace execution-link boundary | `implementation-handoff.md`, `review-report.md`, `validation-report.md` | `autobyteus-web/docs/applications.md`, `autobyteus-server-ts/docs/modules/application_sessions.md` |
| Protected app storage boundary | `platform.sqlite` is reserved for platform-owned state; app migrations run only against `app.sqlite`; oversized ids compact only at the internal storage-key layer | `design-spec.md`, `implementation-handoff.md`, `validation-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/application_storage.md`, `autobyteus-application-backend-sdk/README.md` |
| Durable publication authority and retry semantics | Retained projection and journal append happen before async ordered at-least-once dispatch to app-owned event handlers | `design-spec.md`, `implementation-handoff.md`, `validation-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/application_sessions.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-backend-sdk/README.md` |
| Repo-root applications container ownership | The repo-local `applications/` container is authoritative for built-in app identity; same-path additional roots are skipped/rejected instead of creating competing package identities | `implementation-handoff.md`, `review-report.md`, `validation-report.md` | `autobyteus-server-ts/docs/modules/applications.md`, `applications/brief-studio/README.md` |
| Brief Studio teaching workflow | The canonical sample is a repo-local runnable root with a packaging-only import mirror, and it keeps platform-owned vs app-owned boundaries explicit | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `applications/brief-studio/README.md`, `autobyteus-server-ts/docs/modules/applications.md`, SDK package READMEs |
| Atomic app-owned projection owner | Brief Studio teaches one singular app-owned owner for `brief_id` correlation, `eventId` claim, and atomic projection under at-least-once semantics | `design-spec.md`, `design-review-report.md`, `implementation-handoff.md` | `applications/brief-studio/README.md`, `autobyteus-application-backend-sdk/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Application bundle docs framed as UI assets + embedded runtime target only | Bundle docs now describe paired frontend manifest + backend bundle manifest + repo-root applications model | `autobyteus-server-ts/docs/modules/applications.md` |
| In-memory-only application-session authority description | Durable platform-owned session index/projection/journal state in `platform.sqlite` | `autobyteus-server-ts/docs/modules/application_sessions.md`, `autobyteus-server-ts/docs/modules/application_storage.md` |
| Raw iframe bootstrap treated as the whole app-author API | Shared contracts plus frontend/backend SDK packages layered on top of the bootstrap contract | `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-frontend-sdk/README.md`, `autobyteus-application-backend-sdk/README.md` |
| Split built-in sample vs external teaching-sample path model | Repo-root `applications/brief-studio/` runnable sample plus packaging mirror under `dist/importable-package/` | `applications/brief-studio/README.md`, `autobyteus-server-ts/docs/modules/applications.md` |
| Full encoded `applicationId` always reused directly as the on-disk app-data directory key | Deterministic internal compacted storage key for oversized ids while public canonical `applicationId` remains unchanged | `autobyteus-server-ts/docs/modules/application_storage.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: docs sync is complete in the canonical implementation worktree. The round-19 Local Fix required additional long-lived doc alignment updates in `autobyteus-web/docs/applications.md` and `autobyteus-server-ts/docs/modules/application_sessions.md`, and no further long-lived doc edits were required after the round-11 validation refresh because the docs now remain accurate. User verification was later received on 2026-04-15, the ticket has now been archived under `tickets/done/`, and git finalization is proceeding with no release/version step required.
