# Docs Sync Report

## Scope

- Ticket: `custom-application-developer-journey`
- Trigger: API/E2E validation passed and routed to delivery on 2026-04-26; user verified completion and requested finalization without a release.
- Bootstrap base reference: `origin/personal @ 81f6c823a16f54de77f426b1bc3a7be50e6c843d`
- Integrated base reference used for docs sync: `origin/personal @ 0ac7baf03b32d7b98bd53c5d39d3356eff09d7e9`
- Post-integration verification reference: `codex/custom-application-developer-journey @ e9e1cf20a5e8d74154ca0f10475bb7ffc77ececa`, after local checkpoint `7b27498153c87b68b5d47f5f4761ed2d7302d8e4`, two merges from `origin/personal`, and delivery reruns of `pnpm --filter @autobyteus/application-devkit build && pnpm --filter @autobyteus/application-devkit test` passing (`8` top-level subtests / `12` TAP tests) after each base advancement.

## Why Docs Were Updated

- Summary: Durable project docs now describe the external custom application Milestone 1 developer journey: `@autobyteus/application-devkit`, canonical editable `src/**` source roots, generated `dist/importable-package/applications/<app-id>/` package output, iframe contract v3 dev bootstrap, package validation, external SDK package names, local application id rules, and the prebuilt-import safety boundary.
- Why this should live in long-lived project docs: The change creates a new external authoring workflow and a new workspace package. Future developers should not need ticket-only artifacts to understand the source/output model, production bundle contract compatibility, or the difference between import-time safety and launch-time backend execution.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md` | Repo entrypoint and workspace package list needed to discover the new devkit and guide. | `Updated` | Added application SDK/devkit packages to workspace projects and a custom application development guide entry. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/docs/custom-application-development.md` | Canonical external developer journey for this milestone. | `Updated` | Added by implementation; delivery reviewed against integrated state. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-devkit/README.md` | Package-local CLI docs for the new devkit. | `Updated` | Added by implementation; covers quickstart, commands, real-backend identity, and safety boundary. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-devkit/templates/basic/README.md` | Starter project README generated for external authors. | `Updated` | Added by implementation; tells authors to import `dist/importable-package`, not the source root. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-sdk-contracts/README.md` | Shared contract package docs needed to point new apps to the devkit/source-output model. | `Updated` | Implementation added external custom application guide section. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-frontend-sdk/README.md` | Frontend startup docs needed to make `startHostedApplication(...)` the shared dev/production startup path. | `Updated` | Implementation added external guide section and dev bootstrap wording. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-backend-sdk/README.md` | Backend SDK docs needed to clarify source `src/backend` vs generated runtime `backend/`. | `Updated` | Implementation added external guide section. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/applications.md` | Authoritative production bundle/import contract docs. | `Updated` | Delivery added external authoring flow and related-doc link while preserving production contract wording. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/application-bundle-iframe-contract-v3.md` | Authoritative iframe/bootstrap contract docs for bundled app frontend startup. | `Updated` | Delivery added local dev bootstrap section and related-doc link. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/applications.md` | Frontend Applications module doc already owns `startHostedApplication(...)` startup behavior. | `No change` | Existing production iframe/startup contract remains accurate; devkit-specific details live in the iframe contract doc and external guide. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/en/applications.ts` | Touched developer/user-facing copy for stale contract vocabulary. | `Updated` | Implementation changed stale v1 bootstrap wording to iframe contract v3 wording. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/zh-CN/applications.ts` | Touched developer/user-facing copy for stale contract vocabulary. | `Updated` | Implementation changed stale v1 bootstrap wording to iframe contract v3 wording. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md` | Repo entrypoint / discoverability | Added application SDK/devkit packages to the workspace project list and linked the custom application development guide. | Makes the new package and external authoring flow discoverable from the root README. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/docs/custom-application-development.md` | New durable developer guide | Documents installable package names, canonical layout, create/pack/validate/dev commands, iframe v3 launch hints, real-backend identity rule, and trust boundary. | Establishes the canonical Milestone 1 external developer journey. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-devkit/README.md` | New package README | Documents devkit quickstart, CLI commands, source/output model, real-backend dev identity, and safety boundary. | Gives authors package-local instructions for the new CLI. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-devkit/templates/basic/README.md` | Starter README | Documents starter layout, commands, and import target. | Ensures generated starter projects carry the correct source-root vs import-root guidance. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-sdk-contracts/README.md` | SDK discoverability | Added external custom application guide section. | Points contract consumers to the devkit and canonical external layout. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-frontend-sdk/README.md` | SDK startup guidance | Added external guide section emphasizing unchanged `startHostedApplication(...)` startup. | Prevents external authors from creating a parallel dev-only startup path. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-application-backend-sdk/README.md` | SDK packaging guidance | Added external guide section explaining `src/backend` input and generated runtime `backend/` output. | Clarifies backend source/output separation for package authors. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/applications.md` | Production contract / external authoring bridge | Added `External Authoring Flow` and related-doc link. | Connects the production bundle contract to the new devkit-generated package flow. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/application-bundle-iframe-contract-v3.md` | Runtime contract / dev-mode bridge | Added local dev bootstrap section for `autobyteus-app dev`. | Documents that devkit local dev exercises the same iframe contract v3 startup path. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/en/applications.ts` | User-facing contract vocabulary | Replaced stale v1 bootstrap copy with iframe contract v3 wording. | Aligns active copy with the current contract. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/localization/messages/zh-CN/applications.ts` | User-facing contract vocabulary | Replaced stale v1 bootstrap copy with iframe contract v3 wording. | Aligns active copy with the current contract. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| External source/output model | External authors edit `src/**` and generate `dist/importable-package/applications/<app-id>/`; runtime `ui/` and `backend/` folders remain generated package internals. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `docs/custom-application-development.md`; `README.md`; `autobyteus-server-ts/docs/modules/applications.md` |
| Devkit CLI author journey | `autobyteus-app create`, `pack`, `validate`, and `dev` are the reusable author-facing commands for Milestone 1. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `docs/custom-application-development.md`; `autobyteus-application-devkit/README.md`; starter README |
| Iframe contract v3 dev bootstrap | Local dev bootstrap appends v3 launch hints and posts v3 bootstrap so `startHostedApplication(...)` is unchanged across dev and production. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `docs/custom-application-development.md`; `autobyteus-web/docs/application-bundle-iframe-contract-v3.md`; frontend SDK README |
| Import safety boundary | AutoByteus user import validates prebuilt package files and does not run app install/build/lifecycle scripts, but backend code still runs later in the worker runtime when launched. | `requirements.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `docs/custom-application-development.md`; `autobyteus-application-devkit/README.md`; `autobyteus-server-ts/docs/modules/applications.md` |
| Local application id rule | Local ids must start with a letter/number and use only letters, numbers, underscores, or hyphens because the id becomes the generated application folder name. | `review-report.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `docs/custom-application-development.md`; `autobyteus-application-devkit/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| External default authoring around root-level `frontend-src/`, `backend-src`, generated `ui/`, or generated `backend/` | Devkit source roots under `src/**` and generated package output under `dist/importable-package/applications/<app-id>/` | `docs/custom-application-development.md`; `README.md`; `autobyteus-server-ts/docs/modules/applications.md` |
| Stale `v1 ready/bootstrap handshake` copy in touched application UI text | Iframe contract v3 terminology | `autobyteus-web/localization/messages/en/applications.ts`; `autobyteus-web/localization/messages/zh-CN/applications.ts`; `autobyteus-web/docs/application-bundle-iframe-contract-v3.md` |
| Per-sample copied package/build scripts as the external-author default | Reusable `@autobyteus/application-devkit` CLI | `docs/custom-application-development.md`; `autobyteus-application-devkit/README.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A — docs updated`
- Rationale: `N/A`

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed on the integrated branch state after latest-base refreshes. The user verified completion on 2026-04-26 and requested finalization without a release. Finalization proceeds with ticket archival and repository merge; no release/version/tag/deployment is required.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
