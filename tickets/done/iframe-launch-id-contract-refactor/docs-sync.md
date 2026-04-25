# Docs Sync Report

## Scope

- Ticket: `iframe-launch-id-contract-refactor`
- Trigger: Round-3 code-review pass after API/E2E validation and durable-validation re-review.
- Bootstrap base reference: `origin/personal` at `cef8446452af13de1f97cf5c061c11a03443e944`.
- Integrated base reference used for docs sync: `origin/personal` at `9304b791cc8090f703ed343f93726ea927985698`.
- Post-integration verification reference: ticket branch `codex/iframe-launch-id-contract-refactor` at `6eacbf00446c72d0f1d19b885ec6f2006de25d56`.

## Why Docs Were Updated

- Summary: Long-lived application bundle, frontend SDK, backend SDK, server module, and web host docs now describe iframe/bootstrap contract v3, `iframeLaunchId` as ephemeral iframe bootstrap correlation, frontend SDK compatibility version `"3"`, and backend request context narrowed to `{ applicationId }`.
- Why this should live in long-lived project docs: This is a public app-author and host/runtime contract change. Future bundle authors, SDK maintainers, web host maintainers, and server gateway/orchestration owners need one durable description that does not preserve the retired `launchInstanceId`/v2 mental model.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/README.md` | Shared manifest, request-context, and iframe/bootstrap contract owner. | Updated | Documents frontend SDK contract v3, iframe contract v3 symbols, request context `{ applicationId }`, and `iframeLaunchId` semantics. |
| `autobyteus-application-frontend-sdk/README.md` | Hosted startup and app-client authoring guidance. | Updated | Replaces request-context launch-instance language with `bootstrap.iframeLaunchId` and app-info request context `{ applicationId }`. |
| `autobyteus-application-backend-sdk/README.md` | Backend authoring sample request-context usage. | Updated | Removes stale sample output of `context.requestContext.launchInstanceId`. |
| `autobyteus-web/docs/applications.md` | Generic host route, iframe, and author-facing frontend docs. | Updated | Describes `iframeLaunchId`, v3 launch hints, top-level bootstrap id, and request context `{ applicationId }`. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v3.md` | Dedicated iframe/bootstrap contract reference. | Updated | Renamed from the retired v1 path and rewritten for v3 query hints and payload shape. |
| `autobyteus-server-ts/docs/modules/applications.md` | Bundle manifest and backend bundle compatibility documentation. | Updated | Records frontend SDK compatibility version `"3"` for app and backend bundle manifests and links to v3 iframe doc. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Backend gateway authority and request-context docs. | Updated | Records route `applicationId` authority and app request context `{ applicationId }`; removes launch-instance header/query propagation docs. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Related-doc references for application runtime ownership. | Updated | Points readers at the v3 iframe contract doc. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Historical session redirect that mentions current bootstrap context. | Updated | Clarifies current host/bootstrap request context is `{ applicationId }`, not a session id, and links to v3 iframe docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/README.md` | Shared contract reference | Updated contract constants/types from v2 to v3, manifest frontend SDK requirement from `"2"` to `"3"`, and request context from `{ applicationId, launchInstanceId? }` to `{ applicationId }`. | Shared contracts are the source of truth for app authors and package validators. |
| `autobyteus-application-frontend-sdk/README.md` | SDK author guidance | Documents `bootstrap.iframeLaunchId` as iframe-only correlation and app-client request context as `{ applicationId }`. | Prevents app UI code from treating iframe bootstrap correlation as business identity. |
| `autobyteus-application-backend-sdk/README.md` | Backend sample cleanup | Removes `launchInstanceId` from the GraphQL sample response. | Backend handlers no longer receive iframe launch identity in request context. |
| `autobyteus-web/docs/applications.md` | Web host architecture docs | Renames host-launch language to `iframeLaunchId`, documents v3 query hints and bootstrap payload, and points to the v3 contract doc. | Web host maintainers need current route/iframe bootstrap behavior and user journey semantics. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v3.md` | Contract doc rename/rewrite | Replaces the old v1/v2 payload description with v3 hints and payload shape. | The old file name/content would preserve obsolete contract truth. |
| `autobyteus-server-ts/docs/modules/applications.md` | Server bundle compatibility docs | Updates frontend SDK compatibility values to `"3"` and v3 doc links. | Package admission now rejects retired v2 frontend SDK compatibility. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | Gateway authority docs | Removes `x-autobyteus-launch-instance-id`/query propagation and records app-only request context. | Gateway no longer carries iframe bootstrap correlation into business request context. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Related-doc link update | Points to `application-bundle-iframe-contract-v3.md`. | Keeps cross-module navigation current. |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Historical redirect update | Replaces `{ applicationId, launchInstanceId? }` with `{ applicationId }` and links to v3. | Historical docs should not teach retired session/launch-instance concepts as current behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Iframe bootstrap correlation naming | `iframeLaunchId` is per route-entry/reload iframe bootstrap correlation only; it is not a durable app instance, session, run, or business identity. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/applications.md`, `autobyteus-web/docs/application-bundle-iframe-contract-v3.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-frontend-sdk/README.md` |
| Backend request context boundary | Normal backend query/command/GraphQL/route/event/artifact handling receives durable `{ applicationId }` only. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/application_backend_gateway.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-application-backend-sdk/README.md` |
| Clean-cut contract replacement | Frontend SDK compatibility is `"3"`; retired v2/`launchInstanceId` public shapes are rejected rather than accepted through aliases. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-web/docs/application-bundle-iframe-contract-v3.md` |
| Real generated package boundary | Brief Studio generated/importable package uses generated vendor frontend SDK `ApplicationClient` plus backend mount transport under the v3 contract. | `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-web/docs/application-bundle-iframe-contract-v3.md`, `autobyteus-application-frontend-sdk/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `launchInstanceId` / `autobyteusLaunchInstanceId` iframe bootstrap terminology | `iframeLaunchId` / `autobyteusIframeLaunchId` | `autobyteus-web/docs/application-bundle-iframe-contract-v3.md`, `autobyteus-web/docs/applications.md` |
| Bootstrap `launch { launchInstanceId }` and `requestContext.launchInstanceId` | Top-level `iframeLaunchId` plus request context `{ applicationId }` | `autobyteus-web/docs/application-bundle-iframe-contract-v3.md`, `autobyteus-application-sdk-contracts/README.md` |
| `x-autobyteus-launch-instance-id` and `launchInstanceId` backend gateway query/header propagation | No backend iframe-correlation propagation; route `:applicationId` remains authoritative | `autobyteus-server-ts/docs/modules/application_backend_gateway.md` |
| Frontend SDK compatibility version `"2"` for current app bundles | Frontend SDK compatibility version `"3"` | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-application-sdk-contracts/README.md` |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` current-contract doc path | `autobyteus-web/docs/application-bundle-iframe-contract-v3.md` | `autobyteus-web/docs/applications.md`, `autobyteus-server-ts/docs/modules/*.md`, `autobyteus-application-sdk-contracts/README.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A - docs were updated`
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync was checked after merging latest `origin/personal` into the ticket branch. No additional docs edits were needed after that merge beyond this delivery-owned report.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
