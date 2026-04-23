# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement
Define one authoritative long-term ownership model for hosted application lifecycle UX so the supported AutoByteus host experience owns all user-visible configure / enter / bootstrap / loading / failure states, while hosted application bundles own only post-bootstrap business UI. The current immersive route now hides app pre-bootstrap UI correctly, but raw bundle entry and duplicated bundle startup code still expose app-authored lifecycle placeholders and leave the long-term ownership boundary incomplete.

## Investigation Findings
- The supported `/applications/:id` experience already has the correct visible host-side owners for the normal product journey:
  - `ApplicationShell.vue` owns setup gating, entry, immersive-mode presentation, and host-launch loading/error before a `launchInstanceId` exists.
  - `ApplicationSurface.vue` owns the post-launch iframe/bootstrap reveal gate once a `launchInstanceId` exists.
- The raw bundle asset route (`/rest/application-bundles/:applicationId/assets/*`) currently serves the bundle `ui/index.html` as a plain static file. That means direct entry currently bypasses the product host shell and any platform-owned direct-open policy.
- The current bundle contract and SDK do not yet provide one authoritative bundle-side startup owner:
  - `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` defines the ready/bootstrap handshake and transport payload only.
  - `@autobyteus/application-frontend-sdk` owns transport helpers only; it does not own launch-hint parsing, direct-open policy, ready/bootstrap orchestration, or framework startup UI.
- In-repo sample apps currently duplicate bundle startup logic and visible lifecycle UX:
  - both Brief Studio and Socratic Math Teacher parse launch hints themselves,
  - both implement the ready/bootstrap message loop themselves, and
  - both render visible `status-banner` placeholder UX in bundle HTML/runtime.
- The finished immersive-flow ticket proved that host-side reveal gating is sufficient for the supported embedded route, but its round-5 API/E2E report also confirmed that direct live-bundle entry still shows app-authored placeholder copy when opened outside the host shell.
- The reviewed v2 iframe/bootstrap contract and backend gateway transport are already sufficient for this lifecycle-ownership follow-up; the current problem is ownership and entry policy, not missing protocol fields.

## Recommendations
- Keep the current supported host-route visible lifecycle ownership intact:
  - `ApplicationShell.vue` remains the authoritative owner for setup / entry / host-launch loading/failure before `launchInstanceId`.
  - `ApplicationSurface.vue` remains the authoritative owner for the supported post-launch iframe/bootstrap reveal gate.
- Add a platform-owned raw-entry policy at the application bundle entry boundary so direct opening of bundle entry HTML without valid host launch context is intentionally unsupported instead of exposing app-authored placeholder UI.
- Add a framework-owned bundle startup boundary in `@autobyteus/application-frontend-sdk` so hosted applications stop implementing their own launch-hint parsing, ready/bootstrap wiring, and visible startup/failure/direct-open UX.
- Treat naked raw bundle entry as an unsupported product surface in this ticket. If a developer preview harness is needed later, it should be introduced as a dedicated follow-up surface rather than preserved implicitly through raw asset entry.
- Update teaching samples and authoring docs so hosted applications provide business UI plus a post-bootstrap mount/reveal handoff only; they must not be expected to author user-visible pre-bootstrap loading/waiting/failure/direct-open UX.
- Preserve the existing reviewed v2 ready/bootstrap protocol and backend gateway transport semantics in this ticket.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases
- Define the authoritative visible lifecycle owners for the supported `/applications/:id` host journey.
- Define the authoritative platform/framework behavior for direct/raw bundle entry outside the supported host shell.
- Define the authoritative bundle-side startup owner for launch-hint parsing, ready/bootstrap wiring, and post-bootstrap app reveal handoff.
- Remove the current teaching expectation that each hosted application bundle must ship its own visible bootstrap/loading/failure placeholder UX.
- Define the migration path for in-repo sample apps and the authoring/docs pattern that currently normalize duplicated startup logic and visible status banners.
- Preserve the current reviewed iframe/bootstrap payload and backend transport contract unless an explicit new requirement states otherwise.

## Out of Scope
- Reworking Brief Studio or Socratic Math Teacher business workflows after bootstrap.
- Reopening or regressing the already-landed immersive-flow route ownership work.
- Designing a full developer preview harness or alternate standalone-app product route in this ticket.
- Changing application business schemas, runtime-control behavior, GraphQL domain models, or application backend orchestration semantics beyond lifecycle/startup ownership.
- Broad application catalog or applications-page UX redesign unrelated to lifecycle ownership.

## Functional Requirements
- `REQ-HALO-001`: The supported AutoByteus host journey (`/applications/:id`) shall have one authoritative visible lifecycle model in which platform host surfaces own configure, enter, launch/bootstrap loading, bootstrap failure, retry, and app reveal states before post-bootstrap business UI is shown.
- `REQ-HALO-002`: `ApplicationShell.vue` and `ApplicationSurface.vue` shall remain the authoritative visible lifecycle owners for the supported host journey, with `ApplicationShell.vue` owning pre-`launchInstanceId` route/launch states and `ApplicationSurface.vue` owning post-`launchInstanceId` iframe/bootstrap reveal states.
- `REQ-HALO-003`: The platform/framework shall define one authoritative bundle startup boundary that owns launch-hint parsing, ready/bootstrap handshake orchestration, framework-managed startup/failure/direct-open UX, and handoff to post-bootstrap business UI.
- `REQ-HALO-004`: Direct/raw entry to an application bundle entry HTML without valid host launch context shall be treated as an unsupported surface in this ticket and shall render platform/framework-owned unsupported-entry behavior instead of app-authored placeholder UI or immediate business-homepage exposure.
- `REQ-HALO-005`: Hosted application bundles shall not be required to implement or ship user-visible pre-bootstrap loading, waiting, failure, or direct-open UX as part of the standard authoring pattern.
- `REQ-HALO-006`: Hosted application business code shall start only after the authoritative startup boundary has accepted a valid bootstrap payload and revealed the business surface for the current launch instance.
- `REQ-HALO-007`: The current reviewed v2 ready/bootstrap contract, request-context semantics, and backend gateway transport shape shall remain unchanged in this ticket unless a separate explicit requirement approves protocol redesign.
- `REQ-HALO-008`: The sample-app and authoring documentation set shall be updated so the recommended pattern teaches framework-owned startup ownership and post-bootstrap business UI ownership rather than app-authored lifecycle placeholder UX.
- `REQ-HALO-009`: The migration plan shall name the removal/decommission path for the current duplicated sample-app startup logic and visible `status-banner`-style placeholder pattern.

## Acceptance Criteria
- `AC-HALO-001`: A reviewer can identify one coherent visible lifecycle model for the supported host journey and can name the authoritative owner before and after `launchInstanceId` handoff without ambiguity.
- `AC-HALO-002`: A reviewer can identify one authoritative bundle-side startup owner and can verify that hosted applications are no longer expected to implement raw launch-hint parsing, ready/bootstrap handshake wiring, or visible startup/direct-open placeholder UX themselves.
- `AC-HALO-003`: The requirements explicitly state that naked raw bundle entry is unsupported in this ticket and is platform/framework-owned rather than app-authored.
- `AC-HALO-004`: The requirements explicitly preserve the existing reviewed v2 ready/bootstrap contract and do not require a new app-ready or backend protocol for this lifecycle ticket.
- `AC-HALO-005`: The requirements explicitly distinguish post-bootstrap business UI ownership from pre-bootstrap lifecycle UX ownership.
- `AC-HALO-006`: The migration/removal path explicitly names the current duplicated startup logic and visible `status-banner` teaching pattern as removable legacy scope.

## Constraints / Dependencies
- The immersive-flow baseline already on `personal` is a prerequisite and must remain the supported host-route visible lifecycle owner for the embedded path.
- The raw bundle asset route in `autobyteus-server-ts/src/api/rest/application-bundles.ts` is currently the authoritative transport entry for bundle `ui/` assets, including `ui/index.html`.
- The current v2 iframe/bootstrap contract documented in `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` remains the reviewed contract for launch hints and bootstrap payload delivery.
- `@autobyteus/application-frontend-sdk` is already vendored into sample application `ui/vendor/` roots by the current package-build scripts, so bundle-side startup ownership should extend that existing framework distribution path rather than introduce a second startup package path.
- This ticket may touch frontend host docs, backend bundle-entry policy, frontend SDK startup guidance/helpers, sample app entrypoints, and sample application build/package guidance.

## Assumptions
- The preferred product policy for naked raw bundle entry is “unsupported by default” rather than “implicitly usable developer preview.”
- A future explicit preview harness, if needed, is better introduced as its own surface than retained through raw static asset behavior.
- Hosted application authors should focus on post-bootstrap business UI and should not have to design or duplicate framework startup UX.
- Preserving the existing reviewed v2 bootstrap contract is preferable unless investigation later uncovers a concrete blocker.

## Risks / Open Questions
- Existing imported or external bundles that keep the old startup pattern will need migration to gain the new framework-owned bundle-side startup behavior; this ticket should still define a clean default entry policy even before every bundle migrates.
- The framework-owned startup surface will need a neutral styling/localization policy that works across applications without turning the SDK into an app-specific theming layer.
- If the product later requires a first-class developer preview harness, that should be handled as a separate follow-up design instead of expanding this ticket’s lifecycle-ownership scope.

## Requirement-To-Use-Case Coverage
- `REQ-HALO-001` -> Supported host-route lifecycle ownership stays coherent end to end.
- `REQ-HALO-002` -> Explicit host-route owner split across `ApplicationShell.vue` and `ApplicationSurface.vue`.
- `REQ-HALO-003` -> Bundle-side startup ownership stops being app-by-app duplicated code.
- `REQ-HALO-004` -> Direct/raw bundle entry receives intentional unsupported behavior.
- `REQ-HALO-005` -> Hosted apps stop carrying visible pre-bootstrap UX responsibility.
- `REQ-HALO-006` -> Business code begins only after valid bootstrap acceptance/reveal.
- `REQ-HALO-007` -> Protocol scope remains controlled and explicit.
- `REQ-HALO-008` -> Docs and teaching pattern align with the new ownership model.
- `REQ-HALO-009` -> Migration/removal path is part of scope, not optional cleanup.

## Acceptance-Criteria-To-Scenario Intent
- `AC-HALO-001` -> Verifies supported host-route visible lifecycle ownership is explicit and complete.
- `AC-HALO-002` -> Verifies bundle startup ownership is centralized and no longer app-authored.
- `AC-HALO-003` -> Verifies direct/raw entry policy is intentional and platform/framework-owned.
- `AC-HALO-004` -> Verifies the ticket does not silently redesign the reviewed v2 contract.
- `AC-HALO-005` -> Verifies post-bootstrap business UI ownership is clearly separated from lifecycle UX ownership.
- `AC-HALO-006` -> Verifies duplicated startup/status-banner teaching patterns are named for removal.

## Approval Status
User approved the design-ready requirements basis on 2026-04-23. The authoritative design spec was produced afterward in the same dedicated worktree and is ready for architecture review.
