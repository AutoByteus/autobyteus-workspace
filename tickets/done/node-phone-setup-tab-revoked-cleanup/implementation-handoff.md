# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/design-review-report.md`

## What Changed

- Split paired-phone device listing at the backend service/API boundary:
  - `GET /remote-access/devices` now returns active devices only.
  - `GET /remote-access/devices/revoked` returns revoked/history devices.
  - `PairedDeviceService` now exposes `listActiveDeviceSummaries()` / `listRevokedDeviceSummaries()` and the retained credential lookup is now `findDeviceByCredential()`.
- Hardened Phone Access URL identity:
  - Web and server `normalizeNodeBaseUrl()` strip reserved `/mobile`, `/rest`, `/graphql`, and `/ws` surfaces while preserving optional deployment base paths.
  - `RemoteAccessPairingService` enforces HTTPS after normalization and derives `mobileUrl` by appending `/mobile` without dropping base paths.
- Split frontend phone device state:
  - `phoneAccessStore` owns `activeDevices`, `revokedDevices`, `selectedUrlValidation`, and refreshes both device endpoints after revoke/revoke-all.
  - Store-level QR creation blocks HTTP before POST.
  - Round 5 behavior is implemented: discovered HTTP interface candidates such as `http://100.x.y.z:29695` and LAN HTTP URLs are not auto-selected as QR targets. If an HTTPS candidate is available it may be selected; if candidates are HTTP-only the target remains empty.
- Added the Phone Setup tab and guide:
  - `NodeManager` has explicit Manage Nodes / Phone Setup / Docker Guide panels.
  - Phone Access controls moved out of Manage Nodes and into Phone Setup for embedded/server-node windows.
  - Remote-node windows show an unavailable-controls note while still showing the setup guide.
- Implemented the round 6 authoritative manual/user-controlled Tailscale flow:
  - `PhoneSetupGuideCard` is simplified to macOS Tailscale.app instructions and copyable direct app-executable Serve commands only.
  - Removed the generic `tailscale ...` command cards, `/usr/local/bin/tailscale` wrapper guidance, and bundled `InstallTailscaleCLI.scpt` guidance from the UI/docs/tests.
  - No `TailscaleServeUrlDetector`, `tailscale_serve_https` candidate, process execution, `status --json`, or local Tailscale-state inspection path was added.
  - The guide tells users to run Serve/status themselves, copy the HTTPS MagicDNS URL, append `/mobile`, paste into Phone Access, then create the QR.
- Updated `PhoneAccessCard`:
  - Manual Tailscale Serve HTTPS URL entry is the primary post-Serve QR path.
  - Discovered candidates are labeled as diagnostics; HTTP candidates remain selectable but blocked with the HTTPS-required message.
  - Active and Revoked/History sub-views are separate; active rows have revoke actions and revoked rows are non-actionable.
- Updated English and zh-CN localization, Remote Access docs, Settings docs, Android docs, and targeted tests.
- Current repository state also includes broader durable docs updates and a route-level E2E test file for Phone Access running-route behavior. I did not run API/E2E validation as implementation engineer; code review should account for the repository-resident durable validation now present.

## Key Files Or Areas

- Server remote access:
  - `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts`
  - `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts`
  - `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts`
  - `autobyteus-server-ts/src/remote-access/services/url-normalization.ts`
  - `autobyteus-server-ts/src/api/rest/remote-access.ts`
  - `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts`
  - `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts`
- Web phone setup and controls:
  - `autobyteus-web/stores/phoneAccessStore.ts`
  - `autobyteus-web/components/settings/PhoneAccessCard.vue`
  - `autobyteus-web/components/settings/PhoneSetupGuideCard.vue`
  - `autobyteus-web/utils/phoneSetupGuideCommands.ts`
  - `autobyteus-web/components/settings/NodeManager.vue`
  - `autobyteus-web/components/settings/NodeManagerTabs.vue`
  - `autobyteus-web/utils/nodeEndpoints.ts`
- Durable copy/tests:
  - `autobyteus-android/README.md`
  - `docs/android_mobile_access.md`
  - `autobyteus-server-ts/docs/features/remote_access.md`
  - `autobyteus-web/localization/messages/en/settings.ts`
  - `autobyteus-web/localization/messages/zh-CN/settings.ts`
  - `autobyteus-web/docs/remote_access.md`
  - `autobyteus-web/docs/settings.md`
  - New/updated targeted unit/component tests under `autobyteus-server-ts/tests/unit/remote-access`, `autobyteus-web/components/settings/__tests__`, `autobyteus-web/stores/__tests__`, and `autobyteus-web/utils/__tests__`.
  - Repository-resident route-level E2E file present in current state: `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`.

## Important Assumptions

- Round 6 did not change AR-001/AR-002, active/revoked device boundaries, base-vs-mobile URL identity, or HTTPS-only pairing-session enforcement.
- The product flow is manual/user-controlled: AutoByteus shows instructions/copyable commands; the user runs Tailscale Serve/status outside AutoByteus; the user pastes the HTTPS MagicDNS `/mobile` URL into Phone Access.
- `/mobile`, `/rest`, `/graphql`, and `/ws` are reserved AutoByteus app/API surfaces for node URL normalization. Deployment base paths before those segments are preserved.
- Revoked device records remain retained in persistence for auth diagnostics/history and are not deleted by this change.
- HTTP remains acceptable for existing lower-level node endpoint normalization in general, but new desktop-created Phone Access pairing sessions require HTTPS in both frontend and backend.
- The Tailscale guide is instructional only; it does not automate privileged installation, account login, Serve setup, status checks, process execution, or Tailscale lifecycle management.

## Known Risks

- A deployment that intentionally uses a literal `/mobile` path segment as its external base path would now be normalized to the prefix before `/mobile`; this matches the reviewed design because `/mobile` is an AutoByteus shell route.
- HTTP LAN/tailnet-IP candidates may appear in the diagnostics list but cannot create a new QR; users must paste the Tailscale Serve HTTPS MagicDNS `/mobile` URL.
- Full browser/API/E2E validation of actual QR pairing and Tailscale Serve behavior remains downstream work.
- macOS app-direct commands assume the standard `/Applications/Tailscale.app` location validated in review/user testing; Tailscale packaging can change, so durable docs keep official links nearby.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix + Feature + UX Cleanup
- Reviewed root-cause classification: Missing Invariant + File Placement Or Responsibility Drift + Shared Structure Looseness; round 6 also rejects local Tailscale auto-detection as a boundary/process-execution risk.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now for the main work; no new backend boundary for the round 6 manual-only guide correction.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes:
  - Active/revoked state is enforced by `PairedDeviceService` methods and separate REST endpoints.
  - URL base/mobile identity is centralized in existing web/server normalizers plus a backend mobile URL builder.
  - Phone setup content stays inside `PhoneSetupGuideCard` / `phoneSetupGuideCommands.ts`; operational URL validation stays inside `phoneAccessStore` / `PhoneAccessCard`.
  - No auto-detection service, Tailscale process runner, `status --json` parser, or `tailscale_serve_https` candidate exists in the implementation.
  - No requirement/design gap was found during implementation continuation.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Removed `PhoneAccessCard` use of all-purpose `store.devices`; the all-purpose device state was replaced by active/revoked store state.
  - Removed the Docker-guide catch-all `v-else`; `NodeManager` now uses explicit tab panel branches.
  - Removed misleading active-list revoked timestamp/action-disable behavior by moving revoked rows to the history view.
  - Removed wrapper/installer/generic CLI guide branches from `phoneSetupGuideCommands.ts` per round 6/user correction.
  - Effective non-empty source line counts after round 6: `PhoneSetupGuideCard.vue` 147, `phoneSetupGuideCommands.ts` 67, `PhoneAccessCard.vue` 233, `phoneAccessStore.ts` 184.

## Environment Or Dependency Notes

- Local checks used available worktree dependency material. Dependency directories are ignored workspace artifacts and are not intended as repository changes.
- Running Nuxt tests generated ignored local artifacts (`autobyteus-web/.nuxt`, `.nuxtrc`); these are not tracked changes.
- Server tests/build generated ignored shared-package `dist` output; these are not tracked changes.

## Local Implementation Checks Run

Record only implementation-scoped checks here. API/E2E validation was not run as an implementation sign-off.

Passing checks after the round 6 correction:

1. `pnpm -C autobyteus-server-ts test tests/unit/remote-access/pairing-auth-service.test.ts tests/unit/remote-access/url-normalization.test.ts tests/unit/remote-access/route-policy.test.ts`
   - Result: Passed, 3 files / 16 tests.
2. `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
   - Result: Passed.
3. `pnpm -C autobyteus-web test:nuxt utils/__tests__/nodeEndpoints.spec.ts utils/__tests__/phoneSetupGuideCommands.spec.ts stores/__tests__/phoneAccessStore.spec.ts components/settings/__tests__/PhoneSetupGuideCard.spec.ts components/settings/__tests__/PhoneAccessCard.spec.ts components/settings/__tests__/NodeManager.spec.ts`
   - Result: Passed, 6 files / 29 tests.
4. `pnpm -C autobyteus-web guard:web-boundary`
   - Result: Passed.
5. `pnpm -C autobyteus-web guard:localization-boundary`
   - Result: Passed.
6. `pnpm -C autobyteus-web audit:localization-literals`
   - Result: Passed with zero unresolved findings. The typeless package JSON warning remains informational/baseline.
7. `git diff --check`
   - Result: Passed.

Attempted but not treated as pass gates due existing/baseline tool issues from earlier rounds:

- `pnpm -C autobyteus-server-ts typecheck` failed because `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 for many existing test files outside rootDir.
- `pnpm -C autobyteus-web exec vue-tsc --noEmit --skipLibCheck` failed because `vue-tsc` is not installed in this package.
- `pnpm -C autobyteus-web exec tsc -p tsconfig.json --noEmit` failed with broad existing Nuxt/test type-resolution and baseline type errors outside this change; targeted Nuxt tests and localization/web guards passed.

## Downstream Validation Hints / Suggested Scenarios

- API behavior:
  - Seed retained device records with active + revoked entries; verify `GET /rest/remote-access/devices` returns only active and `GET /rest/remote-access/devices/revoked` returns only revoked from loopback.
  - Verify non-loopback/mobile callers cannot access `/rest/remote-access/devices/revoked`.
  - Verify revoked credentials still reject as `REMOTE_ACCESS_DEVICE_REVOKED`.
- URL identity:
  - Pairing session input `https://desktop.tailnet.ts.net/mobile?pairing=old` should store payload/session `serverBaseUrl = https://desktop.tailnet.ts.net` and return `mobileUrl = https://desktop.tailnet.ts.net/mobile?pairing=...`.
  - Pairing session input `https://gateway.example.com/autobyteus/mobile` should preserve `serverBaseUrl = https://gateway.example.com/autobyteus`.
  - HTTP input should not create a pairing session and should surface HTTPS-required feedback.
- UI behavior:
  - Settings → Nodes should show Manage Nodes, Phone Setup, Docker Guide.
  - Manage Nodes should no longer show Phone Access controls.
  - Phone Setup should show guide + controls on embedded/server-node windows, and guide + unavailable note on remote-node windows.
  - Active device view should show revoke actions; Revoked/History should show non-actionable revoked rows only.
  - Phone Setup guide should show macOS Tailscale.app direct Serve commands only, with no wrapper/installer/generic CLI path.
  - Phone Access should leave the QR target empty for HTTP-only candidates, make manual HTTPS MagicDNS `/mobile` entry primary, allow manual HTTPS QR creation, and block selected HTTP candidates with the HTTPS-required message.
  - The Tailscale Serve HTTPS QR URL should be shown as `https://<machine>.<tailnet>.ts.net/mobile` without `:29695`; HTTP `:29695` candidates should read as diagnostics.

## API / E2E / Executable Validation Still Required

- Full API/E2E validation of the route behavior and Phone Setup tab in a running app remains required by `api_e2e_engineer`.
- Realistic pairing validation with a served HTTPS URL, QR scanning/opening, mobile pairing exchange, and post-pair REST/GraphQL/WebSocket access remains downstream validation.
- Browser-level visual/interaction checks for copy buttons, tab switching, manual URL normalization, macOS guide copy, MagicDNS guidance, HTTP-candidate diagnostics, and revoked-history display are still recommended downstream.
- The route-level E2E file present under `autobyteus-server-ts/tests/e2e/remote-access/` should be code-reviewed before downstream validation treats it as durable coverage.
