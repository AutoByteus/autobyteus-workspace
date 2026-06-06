# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/design-review-report.md`

## What Changed

- Restored trusted Local LAN/private HTTP Phone Access QR creation alongside existing Tailscale/private HTTPS.
- Added backend-authoritative pairing URL policy under `RemoteAccessPairingService.createPairingSession`:
  - HTTPS is allowed except phone-unreachable local-only hosts.
  - HTTP is allowed only for deterministic private/local hosts and only when `trustedPrivateHttpAcknowledged` is true.
  - Public-looking HTTP and local-only/loopback/container-local phone targets are rejected with specific error codes.
- Added frontend phone access pairing URL policy mirror and removed scattered HTTPS-only eligibility logic from the component/store/remote-node helper.
- Added explicit private HTTP acknowledgement state in the Pinia store and UI checkbox/warning copy.
- Changed default candidate selection to prefer HTTPS first and then allowed private HTTP, without making candidate `kind` authoritative.
- Preserved canonical `serverBaseUrl` without `/mobile` and existing `/mobile?pairing=...` derivation.
- Preserved remote-node same-`serverInstanceId` verification for both HTTPS and private HTTP advertised URLs.
- Cleared URL-bound transient state on selected URL changes: acknowledgement, remote verification, info, and active QR/pairing state.
- Updated English/Chinese settings copy plus durable web/server docs to describe Tailscale HTTPS as recommended and Local LAN/private HTTP as supported with cleartext acknowledgement.
- Replaced stale HTTPS-only tests with backend/frontend policy, store, component, and route coverage for HTTPS, private HTTP success/ack, public HTTP rejection, local-only rejection, and remote-node HTTP verification.

## Key Files Or Areas

- Backend policy/service/API:
  - `autobyteus-server-ts/src/remote-access/services/pairing-url-policy.ts`
  - `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts`
  - `autobyteus-server-ts/src/api/rest/remote-access.ts`
  - `autobyteus-server-ts/src/remote-access/domain/models.ts`
  - `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts`
- Frontend policy/store/UI:
  - `autobyteus-web/utils/phoneAccessPairingUrlPolicy.ts`
  - `autobyteus-web/utils/phoneAccessRemoteNode.ts`
  - `autobyteus-web/stores/phoneAccessStore.ts`
  - `autobyteus-web/components/settings/PhoneAccessCard.vue`
- Copy/docs:
  - `autobyteus-web/localization/messages/en/settings.ts`
  - `autobyteus-web/localization/messages/zh-CN/settings.ts`
  - `autobyteus-web/docs/remote_access.md`
  - `autobyteus-server-ts/docs/features/remote_access.md`
- Tests:
  - `autobyteus-server-ts/tests/unit/remote-access/pairing-url-policy.test.ts`
  - `autobyteus-server-ts/tests/unit/remote-access/pairing-auth-service.test.ts`
  - `autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`
  - `autobyteus-web/utils/__tests__/phoneAccessPairingUrlPolicy.spec.ts`
  - `autobyteus-web/stores/__tests__/phoneAccessStore.spec.ts`
  - `autobyteus-web/components/settings/__tests__/PhoneAccessCard.spec.ts`

## Important Assumptions

- Deterministic private/local host classification is the intended scope. Public-looking private DNS names over HTTP remain rejected and should use HTTPS unless a future explicit advanced override is designed.
- Android already owns post-scan HTTP acknowledgement behavior; this implementation keeps payload shape compatible and adds owner-side desktop/web acknowledgement before QR creation.
- `trustedPrivateHttpAcknowledged` is only an explicit cleartext/trusted-network acknowledgement. Backend URL policy still independently classifies and rejects unsafe HTTP and phone-unreachable hosts.
- Candidate `kind` remains discovery metadata only. Backend does not receive or trust it for URL admission.

## Known Risks

- Remote-node private HTTP status verification still needs validation in the target Electron/browser context because CORS or mixed-content constraints can differ from unit/integration mocks.
- Conservative HTTP hostname classification may reject some valid private DNS setups that look public; this is the accepted deferred risk from the reviewed design.
- Browser/PWA users pairing over HTTP rely on the new desktop-side acknowledgement copy; Android still has its native acknowledgement path after scan/open.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix + Behavior Change
- Reviewed root-cause classification: Boundary Or Ownership Issue + Duplicated Policy Or Coordination
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now, small targeted policy extraction
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Backend policy was extracted under the remote-access service boundary and is called only by `RemoteAccessPairingService.createPairingSession`; REST only maps request fields and delegates. Frontend policy was extracted to a narrow utility and the component now reads store decisions instead of scheme-checking directly.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None
- Legacy old-behavior retained in scope: No
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: Yes
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): Yes
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: Yes
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): Yes
- Notes: Removed active `REMOTE_ACCESS_HTTPS_REQUIRED` use from pairing flow and removed frontend `normalizeHttpsPhoneAccessCandidate` / `validatePhoneAccessAdvertisedUrl` policy exports. Changed implementation source files are all under 500 effective non-empty lines; largest are `phoneAccessStore.ts` at 271 and `PhoneAccessCard.vue` at 255.

## Environment Or Dependency Notes

- `pnpm install` was run because this worktree initially had no `node_modules`; lockfile did not change.
- `pnpm -C autobyteus-web exec nuxi prepare` generated `.nuxt` test/type metadata; `.nuxt` is ignored.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` was run before source typechecking; generated Prisma output is under `node_modules`.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

- `pnpm install` — Passed.
- `git diff --check` — Passed.
- `pnpm -C autobyteus-server-ts test run tests/unit/remote-access/pairing-url-policy.test.ts tests/unit/remote-access/pairing-auth-service.test.ts tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts` — Passed, 3 files / 28 tests.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — Passed for server source build typecheck.
- `pnpm -C autobyteus-web exec nuxi prepare` — Passed.
- `pnpm -C autobyteus-web test:nuxt run utils/__tests__/phoneAccessPairingUrlPolicy.spec.ts stores/__tests__/phoneAccessStore.spec.ts components/settings/__tests__/PhoneAccessCard.spec.ts` — Passed, 3 files / 35 tests.

Additional attempted broad checks:

- `pnpm -C autobyteus-server-ts typecheck` — Failed before changed-code checking due existing project config issue: `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 for many test files outside `src`.
- `pnpm -C autobyteus-web exec nuxi typecheck` — Failed on numerous existing unrelated project type errors; after fixing the one PhoneAccessCard test typing issue found by this broad run, the rerun log had no `phoneAccess`, `PhoneAccessCard`, `remoteAccess`, or `pairing` matches.

## Downstream Validation Hints / Suggested Scenarios

- Embedded node with discovered `http://192.168.x.x:29695`: verify warning and acknowledgement appear, Create QR enables after acknowledgement, and returned QR payload uses canonical HTTP base with `/mobile?pairing=...`.
- Embedded node with `https://desktop.tailnet.ts.net/mobile`: verify no HTTP acknowledgement is required and canonical base remains `https://desktop.tailnet.ts.net`.
- Remote-node window with `http://192.168.x.x:29695/mobile`: verify acknowledgement plus same-`serverInstanceId` status probe before QR creation in the real Electron/browser environment.
- Rejection UX/API: `http://example.com`, `http://127.0.0.1`, `http://host.docker.internal`, `http://0.0.0.0`, and unsupported schemes.
- Change selected URL after a QR is shown: verify active QR disappears and acknowledgement/verification do not carry over.
- Android scan/open of generated HTTP LAN QR: verify existing Android cleartext acknowledgement and pairing exchange remain compatible.

## API / E2E / Executable Validation Still Required

- Full API/E2E validation remains required by `api_e2e_engineer`, especially real remote-node HTTP verification behavior in Electron/browser and Android/browser scan/open scenarios.
