# Docs Sync

## Scope

- Ticket: `hosted-application-lifecycle-ownership`
- Trigger: `Final delivery archival after explicit user verification and the post-verification latest-base refresh against advanced origin/personal`
- Bootstrap base reference: `origin/personal @ 76bbc1a033336288a53e251d9603a2486a60e55e`
- Integrated base reference used for docs sync: `origin/personal @ e2667adcd4d64ef3205834a872a67627c013d12b` (`git fetch origin personal --prune` on 2026-04-23 showed the tracked base had advanced; checkpoint commit 48de018398375f41b794f2b4b8c453eb4c1b1717 preserved the reviewed candidate, and merge commit e36a5f2060c2b7a53afe7525f47d3bd5dae3fea8 integrated the latest base before archival`)
- Post-integration verification reference:
  - `pnpm --dir autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/application-backend/brief-studio-team-config.integration.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/agent-team-execution/team-run-runtime-context-support.test.ts tests/unit/agent-team-execution/team-run.test.ts` — `Passed`
  - `pnpm --dir autobyteus-web test:nuxt --run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationLaunchDefaultsFields.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts` — `Passed`
  - `pnpm --dir autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/application-backend/brief-studio-team-config.integration.test.ts` — `Passed` after removing the duplicate `memoryDir` object key surfaced in `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-run-backend-factory.ts`

## Why Docs Were Updated

- Summary:
  - The authoritative iframe/bootstrap contract moved out of the host-local web types into `@autobyteus/application-sdk-contracts`.
  - Bundle-local startup ownership moved into `startHostedApplication(...)` in `@autobyteus/application-frontend-sdk`.
  - Direct raw bundle entry is now intentionally framework-owned unsupported-entry UX instead of app-authored placeholder behavior.
  - The in-repo sample-application docs now teach the reviewed authoring pattern: app code begins after bootstrap handoff and does not own pre-bootstrap waiting/failure/direct-open UX.
  - The later immersive Host Controls UX regression fix, the Brief Studio business-flow proof, and the authoritative round-4 qwen/autobyteus host-route rerun did not require additional durable doc edits beyond those already-updated docs; they confirmed the current long-lived docs remain accurate for the final integrated state.
- Why this should live in long-lived project docs:
  - Future host maintainers and application authors need one durable source of truth for supported host-route ownership, shared contract ownership, and the new startup boundary. Leaving that knowledge only in ticket artifacts would preserve obsolete guidance around host-local contract files and app-authored startup banners.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/applications.md` | This is the durable owner for the supported Applications host-route lifecycle and author-facing startup boundary. | `Updated` | Added the shared contract owner, the bundle-local `startHostedApplication(...)` owner, and the intentional unsupported raw-entry policy. Later Host Controls UX and round-4 host-route reruns did not require further doc edits here. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | The host/iframe bootstrap contract moved to a shared package and the author-facing example changed. | `Updated` | Now points to `autobyteus-application-sdk-contracts` as the authoritative contract owner and shows the startup-boundary usage pattern. |
| `autobyteus-application-frontend-sdk/README.md` | The frontend SDK gained a new public startup owner and lifecycle responsibilities. | `Updated` | README now documents `startHostedApplication(...)`, framework-owned startup states, and the correct app-author handoff boundary. |
| `autobyteus-application-sdk-contracts/README.md` | The shared contracts package now owns the iframe/bootstrap contract. | `Updated` | README now enumerates the iframe/bootstrap contract constants, payloads, helpers, and validators. |
| `applications/brief-studio/README.md` | The teaching sample changed from app-owned startup UX to framework-owned startup plus post-bootstrap business UI. | `Updated` | README now reflects the new authoring pattern and removed startup-banner ownership. The later business-flow proof and round-4 host-route rerun confirmed the documented pattern remains truthful. |
| `applications/socratic-math-teacher/README.md` | The second teaching sample changed to the same reviewed startup ownership pattern. | `Updated` | README now reflects the new framework-owned startup boundary and post-bootstrap-only business UI ownership. |
| `autobyteus-server-ts/docs/modules/applications.md` | Server-side applications docs were checked to confirm whether the new lifecycle ownership changed the server asset-serving ownership boundary. | `No change` | The server doc remains accurate because it still owns discovery/catalog/asset serving only; bundle-local startup ownership is intentionally documented elsewhere. |
| `autobyteus-server-ts/docs/modules/application_backend_gateway.md` | The gateway doc was checked to confirm whether backend transport ownership changed. | `No change` | The gateway doc already stays accurate because `launchInstanceId` remains optional correlation context and backend transport ownership did not move in this ticket. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/applications.md` | Ownership / lifecycle contract | Added the shared iframe-contract owner, documented `startHostedApplication(...)` as the bundle-local startup owner, and recorded the intentional unsupported raw-entry behavior. | This is the durable product/runtime owner doc for hosted applications. |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | Shared contract ownership + example update | Repointed the authoritative contract owner to `autobyteus-application-sdk-contracts` and replaced the old transport-helper example with the new startup-boundary example. | Readers need the correct cross-package ownership and the correct public integration pattern. |
| `autobyteus-application-frontend-sdk/README.md` | Public package API guidance | Documented `startHostedApplication(...)`, the framework-owned startup states, unsupported direct entry, and the intended `onBootstrapped(...)` business-UI boundary. | The public SDK README is the durable author-facing owner for startup behavior. |
| `autobyteus-application-sdk-contracts/README.md` | Public package inventory | Added the iframe/bootstrap contract constants, payload types, launch hints, and validators/builders to the contract package README. | The shared package now owns these structures and needs durable package-level documentation. |
| `applications/brief-studio/README.md` | Teaching-sample authoring guidance | Added framework-owned startup and post-bootstrap-only business-UI ownership notes. | The sample README should teach the reviewed pattern, not the removed app-owned startup pattern. |
| `applications/socratic-math-teacher/README.md` | Teaching-sample authoring guidance | Added framework-owned startup and post-bootstrap-only business-UI ownership notes. | The second sample should reinforce the same reviewed authoring pattern. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Shared iframe/bootstrap contract ownership | The host/iframe contract is no longer a host-local web type file; the shared owner is `@autobyteus/application-sdk-contracts`. | `investigation-notes.md`, `design-spec.md`, `implementation-handoff.md` | `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-web/docs/applications.md` |
| Framework-owned hosted-application startup boundary | `startHostedApplication(...)` owns launch-hint parsing, ready/bootstrap wiring, unsupported entry, local startup, and startup-failure containment until app handoff completes. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `autobyteus-application-frontend-sdk/README.md`, `autobyteus-web/docs/applications.md`, `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` |
| Sample-app authoring pattern | In-repo app bundles should mount business UI only after valid bootstrap handoff instead of authoring pre-bootstrap banners or direct-open placeholder UX. | `investigation-notes.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-report.md` | `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` and `autobyteus-web/types/application/ApplicationHostTransport.ts` as the durable contract owner | `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`, `autobyteus-application-sdk-contracts/README.md`, `autobyteus-web/docs/applications.md` |
| Sample-app `status-banner` / manual launch-hint parsing / manual ready-bootstrap wiring | `startHostedApplication(...)` in `@autobyteus/application-frontend-sdk` | `autobyteus-application-frontend-sdk/README.md`, `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md` |
| Accidental raw bundle direct-open placeholder/business UI | Framework-owned unsupported-entry surface | `autobyteus-web/docs/applications.md`, `autobyteus-application-frontend-sdk/README.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale:
  - Durable docs were updated in scope; the latest validation reruns simply confirmed no further doc deltas were needed.

## Final Result

- Result: `Updated`
- Next owner: `delivery_engineer`
- Notes:
  - Durable docs remain synchronized to the reviewed and validated hosted-application lifecycle ownership model.
  - API/E2E round 4 confirmed no additional long-lived doc edits were needed after the immersive Host Controls UX fix, the Brief Studio business-flow proof, and the final authoritative hosted qwen/autobyteus rerun.
  - Explicit user verification was received on 2026-04-23, the ticket was archived to `tickets/done/hosted-application-lifecycle-ownership/`, and no additional durable doc edits were needed after the latest-base integration refresh.
