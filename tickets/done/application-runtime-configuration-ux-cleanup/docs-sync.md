# Docs Sync Report

## Scope

- Ticket: `application-runtime-configuration-ux-cleanup`
- Trigger: authoritative review round `4` (`Pass`) plus API/E2E round `2` (`Pass`) on `2026-04-24`, followed by a delivery refresh that confirmed the ticket branch already matched the latest tracked base.
- Bootstrap base reference: `origin/personal`
- Integrated base reference used for docs sync: `origin/personal @ c6bcd55ccb56651748bcb8752b08b65ab23a79bc`
- Post-integration verification reference: no delivery-stage rerun was required because the tracked base did not advance beyond `c6bcd55ccb56651748bcb8752b08b65ab23a79bc`; the authoritative verification remains review round `4` (`Pass`) plus API/E2E round `2` (`Pass`) on that same branch head.

## Why Docs Were Updated

- Summary: promoted the final application UX/runtime-configuration cleanup into long-lived docs by replacing the old flat launch-defaults narrative with the implemented presentation-safe catalog/detail split, explicit technical-details disclosure, and kind-aware `launchProfile` setup flow.
- Why this should live in long-lived project docs: these are durable host/application boundary rules and authoring contracts. Future readers need one canonical explanation for how application setup is modeled, where internal metadata is allowed to surface, and how app backends consume the saved configuration.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/applications.md` | The frontend Applications module doc still referenced the removed `ApplicationLaunchDefaultsFields.vue` owner and the old flat launch-defaults model. | `Updated` | Now documents the presentation-safe catalog projection, detail-only `technicalDetails`, explicit technical-details toggle, `launchProfile` editors, and immersive configure-panel reuse. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | The server orchestration doc owns persisted application setup semantics and still described flat saved launch defaults. | `Updated` | Now documents kind-aware `launchProfile` persistence, legacy row migration, `INVALID_SAVED_CONFIGURATION`, and the configuration-service authority boundary. |
| `applications/brief-studio/README.md` | The sample-app README still described flat launch defaults before entry. | `Updated` | Now describes the setup-first gate and saved team `launchProfile` behavior. |
| `applications/socratic-math-teacher/README.md` | Same setup-contract refresh was needed for the second touched bundled application. | `Updated` | Now describes the setup-first gate and saved team `launchProfile` behavior. |
| `autobyteus-server-ts/docs/modules/applications.md` | Rechecked because the ticket changes the frontend-facing application information hierarchy and setup semantics. | `No change` | Existing bundle discovery, built-in/source-root, and runtime handoff guidance remained accurate. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Rechecked because the route/setup UX changed while the iframe bootstrap path remained in scope. | `No change` | The iframe launch hints and bootstrap payload contract were unchanged by this ticket. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/applications.md` | Frontend architecture and UX contract refresh | Replaced the old flat catalog/setup narrative with the implemented list/detail split, hidden-by-default technical metadata, setup-first gate, and `launchProfile` editor ownership. | Prevents future frontend work from reintroducing leaked internal identifiers or reviving the removed flat editor path. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Persisted setup contract refresh | Documented `launchProfile` persistence for agent vs team resources, one-time legacy migration behavior, invalid-saved-config surfacing, and the `ApplicationResourceConfigurationService` ownership boundary. | Keeps the backend docs aligned with the actual REST/runtime configuration behavior validated in review and API/E2E. |
| `applications/brief-studio/README.md` | Sample-app authoring contract refresh | Reframed the pre-entry setup description around the setup-first gate and saved team `launchProfile` instead of flat launch defaults. | Matches the app’s current manifest and launch-service behavior. |
| `applications/socratic-math-teacher/README.md` | Sample-app authoring contract refresh | Reframed the pre-entry setup description around the setup-first gate and saved team `launchProfile` instead of flat launch defaults. | Matches the app’s current manifest and launch-service behavior. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Presentation-safe catalog vs detail-only internal metadata | The default application catalog/setup path should expose user-facing summary fields only; `localApplicationId`, `packageId`, `writable`, and `bundleResources` live under explicit `technicalDetails`. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-web/docs/applications.md` |
| Kind-aware saved application setup | Application setup now persists `launchProfile`, not flat `launchDefaults`; agent and team resources have different saved shapes. | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-report.md` | `autobyteus-web/docs/applications.md`, `autobyteus-server-ts/docs/modules/application_orchestration.md` |
| Team launch-profile behavior | Team-backed application slots can save shared runtime/model/workspace defaults plus per-member runtime/model overrides. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-web/docs/applications.md`, `autobyteus-server-ts/docs/modules/application_orchestration.md`, `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md` |
| Legacy migration and stale-config surfacing | Legacy `launch_defaults_json` rows are rewritten forward, and malformed/stale saved setup now surfaces as `INVALID_SAVED_CONFIGURATION` / HTTP `400` instead of silently proceeding. | `implementation-handoff.md`, `review-report.md`, `api-e2e-report.md` | `autobyteus-server-ts/docs/modules/application_orchestration.md` |
| Setup-first route and immersive configure reuse | Pre-entry setup and immersive configure remain one authoritative setup owner, while technical details stay hidden until explicitly opened. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-web/docs/applications.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `ApplicationLaunchDefaultsFields.vue` as the slot-specific setup owner | `components/applications/setup/*` launch-profile editors chosen by `ApplicationResourceSlotEditor.vue` | `autobyteus-web/docs/applications.md` |
| Flat application `launchDefaults` persistence contract | Kind-aware `launchProfile` persistence with read/write migration from legacy rows | `autobyteus-server-ts/docs/modules/application_orchestration.md` |
| Default display of internal package/bootstrap metadata on application surfaces | Explicit `technicalDetails` disclosure behind the normal friendly application path | `autobyteus-web/docs/applications.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the latest integrated branch state. Delivery can continue to handoff preparation and user-verification hold.
