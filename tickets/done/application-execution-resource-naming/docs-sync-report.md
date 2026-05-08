# Docs Sync Report

## Scope

- Ticket: `application-execution-resource-naming`
- Trigger: Delivery resumed after code review Round 7 pass and API/E2E validation Round 4 pass for the live Brief Studio VAL-011 fix.
- Bootstrap base reference: `origin/personal` at `7738faa4956cd9925825e24baae77bb1a47a81a4` (`chore(release): bump workspace release version to 1.3.0`).
- Integrated base reference used for docs sync: latest fetched `origin/personal` at `bb7a0d23f1895a3c85ff2c9bd7067adb1a843938`; the ticket branch `codex/application-execution-resource-naming` was checkpointed locally and rebased onto that base for user testing.
- Post-integration verification reference: `origin/personal` remained at `bb7a0d23f1895a3c85ff2c9bd7067adb1a843938` during the Round 4 delivery refresh; the ticket branch was already rebased on it. Delivery reran the requested macOS Electron build after the VAL-011 fix; it passed and refreshed the DMG/ZIP artifacts under `autobyteus-web/electron-dist`.

## Why Docs Were Updated

- Summary: The final implementation is a clean-cut rename from application runtime resources to application execution resources, with `owner` -> `source`, and a clarified no-migration policy for old execution-resource persisted shapes. Long-lived docs were already updated for that durable behavior. The Round 7/VAL-011 frontend prop-binding fix itself has no additional long-lived docs impact because it restores the documented setup gate rather than changing product behavior or public contracts.
- Why this should live in long-lived project docs: Application authors, SDK consumers, server maintainers, and frontend maintainers rely on the SDK READMEs and application/server/web docs to understand manifest setup fields, runtime-control methods, REST setup endpoints, host launch setup behavior, and the absence of an automatic compatibility migration path for old execution-resource shapes.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/README.md` | Public SDK contract names and manifest field names changed. | Updated | Delivery added explicit clean-break/no-platform-migration guidance for old runtime-resource/owner shapes. |
| `autobyteus-application-backend-sdk/README.md` | Backend app authors call runtime-control APIs that changed names. | Updated | Delivery added explicit clean-break/no-platform-migration guidance for app code/manifests. |
| `autobyteus-server-ts/docs/modules/applications.md` | Canonical server application bundle discovery and manifest docs. | Updated | Already documents bundle resources plus manifest-declared `executionResourceSlots[]`; delivery reviewed for stale names. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Canonical orchestration/runtime-control docs for resource listing, setup persistence, run launch, and stale-state behavior. | Updated | Delivery updated stale-state docs to say old `resourceRef`/`owner` JSON is reset/dropped, not migrated. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | REST setup endpoint names changed. | Updated | Documents `available-execution-resources` and `execution-resource-configurations`; delivery reviewed for stale names. |
| `autobyteus-server-ts/docs/modules/application_communication_model.md` | Runtime-control taxonomy lists renamed backend methods. | Updated | Documents `listAvailableExecutionResources(...)`; delivery reviewed for stale names. |
| `autobyteus-web/docs/applications.md` | Frontend host/setup architecture changed component and setup vocabulary. | Updated | Delivery updated frontend setup docs to say stale old execution-resource refs reset to setup/reconfigure state rather than migrate. |
| `applications/brief-studio/README.md` | First-party application sample manifest/setup behavior changed. | Updated | Documents required `executionResourceSlots[]` setup. |
| `applications/socratic-math-teacher/README.md` | First-party application sample manifest/setup behavior changed. | Updated | Documents required `executionResourceSlots[]` setup. |
| `docs/custom-application-development.md` | External app author guide was checked for stale runtime-resource field names. | No change | No stale runtime-resource/old manifest field terminology found in the checked execution-resource scope. |
| `README.md` | Repo-level overview/release docs checked for affected terminology. | No change | No stale runtime-resource/old manifest field terminology found. |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` / setup UI docs | Round 7 fixed a parent/child prop binding that crashed the documented setup route. | No change | The fix restores documented setup behavior; no user-facing contract or durable documentation changed. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/README.md` | Public contract docs | Added clean-break guidance for `ApplicationExecutionResource*`, `source`, `executionResourceRef`, manifest fields, and runtime-control methods; states old names/shapes are not aliases and are not platform-migrated. | External SDK consumers need the new names and no-migration expectation. |
| `autobyteus-application-backend-sdk/README.md` | Backend author docs | Added clean-break guidance for backend app code/manifests and old `resourceRef`/`owner` shapes. | Backend authors need current API names and reconfiguration expectations. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Server architecture docs | Updated persistence/setup section to state old execution-resource JSON keys are reset/dropped instead of migrated; clarified that any legacy flat launch-default normalization is separate and does not permit old execution-resource refs. | Orchestration docs are the durable source for run launch and setup persistence semantics. |
| `autobyteus-web/docs/applications.md` | Frontend architecture docs | Updated setup docs to state stale saved refs using old `resourceRef`/`owner` shapes reset to host setup/reconfigure state. | Frontend maintainers need to understand the no-migration host gate behavior. |
| `applications/brief-studio/README.md` | First-party app docs | Updated setup summary to `executionResourceSlots[]`. | Sample app docs must match packaged manifest. |
| `applications/socratic-math-teacher/README.md` | First-party app docs | Updated setup summary to `executionResourceSlots[]`. | Sample app docs must match packaged manifest. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | API docs | Updated REST setup endpoint names during implementation; delivery reviewed. | API maintainers need current route names. |
| `autobyteus-server-ts/docs/modules/application_communication_model.md` | Communication taxonomy | Updated runtime-control method examples during implementation; delivery reviewed. | Prevents confusion between backend notifications, request/response, and runtime control. |
| `autobyteus-server-ts/docs/modules/applications.md` | Server architecture docs | Updated manifest/catalog language during implementation; delivery reviewed. | Server maintainers need canonical bundle/setup vocabulary. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Execution resource terminology | App-selectable agents/teams are execution resources, not generic runtime resources. | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | SDK READMEs, server application/orchestration docs, web application docs |
| `source` discriminator | `bundle` and `shared` describe execution-resource source/scope, replacing the old public `owner` discriminator. | `design-spec.md`, `implementation-handoff.md`, validation report | SDK README, server orchestration docs |
| No platform migration for old execution-resource shapes | Old `owner`/`resourceRef` execution-resource JSON is stale state. Saved setup resets to not-configured/reconfigure; old run-binding summaries drop rather than convert or expose. | `solution-design-rework-no-migration.md`, `review-report.md`, `api-e2e-validation-report.md` | SDK/backend SDK README, server orchestration docs, web application docs |
| Host-managed setup boundary | Applications declare setup slots; host setup persists concrete execution-resource selections before backend launch. | `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/applications.md`, `autobyteus-web/docs/applications.md` |
| Runtime-control method names | Backend handlers use `listAvailableExecutionResources(...)` and `getConfiguredExecutionResource(...)`. | `implementation-handoff.md`, validation report | Backend SDK README, communication model docs, orchestration docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `ApplicationRuntimeResource*` public contracts and `runtime-resources` artifacts | `ApplicationExecutionResource*` contracts and `execution-resources` artifacts | `autobyteus-application-sdk-contracts/README.md` |
| Manifest fields `resourceSlots`, `allowedResourceKinds`, `allowedResourceOwners`, `defaultResourceRef` | `executionResourceSlots`, `allowedExecutionResourceKinds`, `allowedExecutionResourceSources`, `defaultExecutionResourceRef` | SDK README, server application docs, first-party app READMEs |
| Runtime-control methods `listAvailableResources(...)`, `getConfiguredResource(...)` | `listAvailableExecutionResources(...)`, `getConfiguredExecutionResource(...)` | Backend SDK README, server communication/orchestration docs |
| Web component `ApplicationResourceSlotEditor.vue` | `ApplicationExecutionResourceSlotEditor.vue` | `autobyteus-web/docs/applications.md` |
| Public ref discriminator `owner` | `source` | SDK README and server orchestration docs |
| Private old-shape migration helpers/tests | No migration; stale setup reset/drop and stale run-binding drop behavior | `autobyteus-server-ts/docs/modules/application_orchestration.md`, `autobyteus-web/docs/applications.md`, ticket validation report |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A — docs were updated`
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Release/reconfiguration notes remain required because old public SDK/manifest/runtime-control names are intentionally removed rather than aliased and no platform migration is provided for old execution-resource persisted shapes. The Round 7/VAL-011 setup-panel prop-binding fix required no additional release-note entry. Ticket-local release notes remain at `tickets/done/application-execution-resource-naming/release-notes.md`.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
