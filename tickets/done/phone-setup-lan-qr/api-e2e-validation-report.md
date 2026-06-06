# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/code-review-report.md`
- Current Validation Round: 1
- Trigger: Code-review pass from `code_reviewer` for Phone Setup Local LAN/private HTTP QR restoration on 2026-06-06.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

Round rules:
- Scenario IDs are stable for this validation report.
- New scenario IDs should be added only for newly discovered coverage in later rounds.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass after implementation | N/A | No | Pass, with validation-code re-review required before delivery | Yes | Added one Android parser durable validation test during API/E2E; route returns to `code_reviewer` before delivery. |

## Validation Basis

Validation was derived from:

- `REQ-001` through `REQ-009` and `AC-001` through `AC-010` in the requirements doc.
- Design spines DS-001 through DS-005, especially backend authority (`RemoteAccessPairingService`), frontend/store acknowledgement and remote-node verification, and Android/mobile QR consumption.
- Implementation handoff `Legacy / Compatibility Removal Check`: no compatibility wrappers introduced, no old HTTPS-only behavior retained in scope, and stale HTTPS-only policy exports removed.
- Code review residual risks: browser/Electron CORS/mixed-content behavior for private HTTP status probing, Android/client generated HTTP QR compatibility, and conservative rejection of public-looking HTTP hostnames.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Validation Surfaces / Modes

- Backend API/service/policy durable tests through Vitest.
- Backend REST E2E route tests through Fastify injection.
- Frontend URL-policy/store/component durable tests through Nuxt/Vitest.
- Android mobile URL/parser durable JVM tests through Gradle.
- Browser executable probe against a real compiled Fastify remote-access route harness with CORS enabled, reached over the host LAN IP from both an HTTP frontend origin and a `file://` renderer-origin analogue.
- Source build/type validation for `autobyteus-server-ts` through `tsc -p tsconfig.build.json --noEmit` plus temporary probe compilation to ignored `dist`.

## Platform / Runtime Targets

- Host: macOS worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr`.
- Branch: `codex/phone-setup-lan-qr`.
- Node/PNPM project test runners as configured in the repository.
- Android SDK: `/Users/normy/Library/Android/sdk` for Gradle JVM unit tests.
- Browser/network probe LAN endpoint: `http://192.168.2.158:<ephemeral-port>` with a separate local HTTP frontend origin and a `file://` page.

## Lifecycle / Upgrade / Restart / Migration Checks

- No installer, updater, schema migration, restart, or long-running process-lifecycle change is in scope.
- Pairing session TTL/session lifecycle and single-use exchange behavior were covered by existing backend service/E2E tests rerun in this round.
- Temporary browser-network harness startup/shutdown was validated; temporary servers and compile outputs were cleaned up.

## Coverage Matrix

| Scenario ID | Requirement / AC | Surface | Validation | Result |
| --- | --- | --- | --- | --- |
| VAL-001 | REQ-001, REQ-002, REQ-003, AC-001 | Frontend policy/store/component | Nuxt/Vitest tests verify private HTTP is valid with warning/ack and QR action blocked until ack. | Pass |
| VAL-002 | REQ-004, AC-003 | Backend API/service | Fastify route and service tests verify acknowledged private HTTP creates canonical HTTP `serverBaseUrl` and `/mobile?pairing=...` QR text. | Pass |
| VAL-003 | REQ-007, AC-002 | Backend/frontend | Tests verify HTTPS/Tailscale normalization and QR creation remain intact. | Pass |
| VAL-004 | REQ-005, AC-004, AC-006 | Backend/frontend | Policy, store, component, and browser probe verify invalid schemes/public HTTP/local-only URLs fail closed with specific errors. | Pass |
| VAL-005 | REQ-006, AC-005 | Frontend store + browser network | Store tests verify same-`serverInstanceId` remote-node gate for HTTPS/private HTTP; browser probe verifies real browser can fetch `/rest/remote-access/status` over private HTTP with CORS from HTTP and `file://` origins. | Pass |
| VAL-006 | REQ-008, AC-007 | Frontend store/component/docs | Tests verify allowed candidate defaulting and warning UI; docs/copy are in implementation diff. | Pass |
| VAL-007 | AC-008 | Android/mobile client | Added/reran Android parser durable test for generated private HTTP QR URL; Android JVM tests verify HTTP normalizer/parser/diagnostic/navigation paths. | Pass |
| VAL-008 | REQ-009, AC-009, AC-010 | Durable validation coverage | Existing backend/frontend tests rerun; added Android generated HTTP QR parser test during API/E2E. | Pass |

## Test Scope

Commands and executable probes are recorded in `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/validation-evidence.log`.

Primary checks:

- `git diff --check`
- `pnpm -C autobyteus-server-ts test run tests/unit/remote-access/pairing-url-policy.test.ts tests/unit/remote-access/pairing-auth-service.test.ts tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- `pnpm -C autobyteus-web test:nuxt run utils/__tests__/phoneAccessPairingUrlPolicy.spec.ts stores/__tests__/phoneAccessStore.spec.ts components/settings/__tests__/PhoneAccessCard.spec.ts`
- `ANDROID_HOME=/Users/normy/Library/Android/sdk bash -lc 'cd autobyteus-android && ./gradlew testDebugUnitTest --tests org.autobyteus.mobile.connection.NodeUrlNormalizerTest --tests org.autobyteus.mobile.connection.PairingLinkParserTest --tests org.autobyteus.mobile.connection.ConnectionDiagnosticMapperTest --tests org.autobyteus.mobile.web.TrustedNavigationPolicyTest --tests org.autobyteus.mobile.web.FileChooserRequestPolicyTest'`
- `ANDROID_HOME=/Users/normy/Library/Android/sdk bash -lc 'cd autobyteus-android && ./gradlew testDebugUnitTest --tests org.autobyteus.mobile.connection.PairingLinkParserTest'` after adding the generated private HTTP QR parser test.
- Browser executable probe from an HTTP frontend origin and `file://` renderer origin to a real Fastify remote-access route harness over private LAN HTTP.
- Final `git diff --check` after the API/E2E validation addition.

## Validation Setup / Environment

- Used the provided task worktree and branch.
- Reused dependencies already installed by implementation; no lockfile changes observed.
- Android Gradle first failed because `ANDROID_HOME` was not exported in the shell environment; reran successfully with `ANDROID_HOME=/Users/normy/Library/Android/sdk`.
- Attempted Browser plugin `browser-client` bootstrap first. The `iab` browser id was unavailable in this session, so browser validation used the available frontend tab browser-control tools against local `http://` and `file://` targets.
- Browser probe compiled current server source to ignored `autobyteus-server-ts/dist`, started a temporary Fastify app with `@fastify/cors`, `registerRemoteAccessPolicyPlugin`, and `registerRemoteAccessRoutes`, then removed the temporary script/page and ignored `dist` output afterward.

## Tests Implemented Or Updated

Added one repository-resident durable validation test during this API/E2E round:

- `autobyteus-android/app/src/test/java/org/autobyteus/mobile/connection/PairingLinkParserTest.kt`
  - New test: `parsesGeneratedPrivateHttpPairingUrlAndLeavesAcknowledgementPending`.
  - Purpose: prove a generated `http://192.168.1.25:29695/mobile?pairing=...` QR/link is parsed into the stable HTTP mobile URL and intentionally leaves Android HTTP acknowledgement pending before WebView load.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/autobyteus-android/app/src/test/java/org/autobyteus/mobile/connection/PairingLinkParserTest.kt`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes — this handoff returns to code_reviewer before delivery.`
- Post-validation code review artifact: Pending next `code_reviewer` pass.

## Other Validation Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/validation-evidence.log`

## Temporary Validation Methods / Scaffolding

- Temporary `/tmp/phone-access-runtime-probe.mjs` started a compiled current Fastify remote-access route harness over LAN HTTP.
- Temporary `/tmp/phone-access-file-probe.html` represented the packaged Electron `file://` renderer origin for browser fetch behavior.
- Ignored `autobyteus-server-ts/dist` was created only for the runtime probe.
- All temporary probe files/servers and ignored compile output were removed after validation.

## Dependencies Mocked Or Emulated

- Browser probe emulated the surrounding app shell with a minimal HTTP page and a minimal `file://` page, while using the real compiled remote-access routes, route policy plugin, settings/pairing services, and CORS plugin.
- No database or external service dependency was required for the targeted remote-access route harness beyond temporary app data storage.
- Android validation used JVM unit tests; no physical Android camera QR scan or emulator instrumentation run was performed in this round.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First validation round. |

## Scenarios Checked

- Embedded/local private HTTP QR eligibility with cleartext warning/acknowledgement.
- Backend acknowledged private HTTP pairing session creation and canonical payload/mobile URL derivation.
- Backend rejection of trusted private HTTP without acknowledgement.
- Backend/frontend rejection of public HTTP and local-only/loopback/container hosts.
- Existing HTTPS/Tailscale QR creation and canonical base path normalization.
- Remote-node same-server verification logic at store level and real browser/private HTTP status fetch reachability.
- Android parser/normalizer compatibility with generated HTTP QR links and acknowledgement-pending behavior.
- Active QR/ack/verification stale-state clearing through store tests.

## Passed

- `git diff --check` — passed initially and after API/E2E validation addition.
- Backend targeted Vitest — 3 files / 28 tests passed.
- Server build typecheck — passed.
- Frontend targeted Nuxt/Vitest — 3 files / 35 tests passed.
- Android targeted JVM test suite — passed after exporting `ANDROID_HOME`.
- Android generated private HTTP QR parser test rerun — passed.
- Browser/private LAN HTTP executable probe — passed from HTTP frontend origin and `file://` renderer-origin analogue.

## Failed

No unresolved validation failures.

Resolved setup issue:

- Android Gradle command initially failed because the shell did not export `ANDROID_HOME`. This was an environment setup issue, not an implementation failure. Rerun with `ANDROID_HOME=/Users/normy/Library/Android/sdk` passed.

## Not Tested / Out Of Scope

- Physical Android camera scan on a device was not performed. The QR/link input path was covered by Android JVM parser tests, including the generated private HTTP QR/link form added in this round.
- Full packaged Electron app launch was not performed. Browser validation covered the relevant network behavior from `file://` and local HTTP renderer origins against real compiled remote-access routes.
- HTTPS-hosted web UI fetching an HTTP LAN status endpoint was not treated as an acceptance target. Standard browser mixed-content/private-network constraints may apply to that deployment shape; the supported desktop/Electron file-origin and local HTTP development-origin probes passed.
- Public-looking private DNS hostnames over HTTP remain intentionally rejected per the reviewed design tradeoff.

## Blocked

None.

## Cleanup Performed

- Stopped the temporary browser/network probe server.
- Removed `/tmp/phone-access-runtime-probe.mjs`.
- Removed `/tmp/phone-access-file-probe.html`.
- Removed ignored `autobyteus-server-ts/dist` probe compilation output.
- Closed temporary browser tabs.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

No failure classification is needed because validation passed. The only workflow routing requirement is code-review re-entry because repository-resident durable validation was added during API/E2E.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- Evidence log: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/validation-evidence.log`
- Browser probe evidence includes successful private LAN HTTP `/rest/remote-access/status`, `PUT /rest/remote-access/settings`, and `POST /rest/remote-access/pairing-sessions` from an HTTP frontend origin and successful status/pairing from a `file://` renderer-origin analogue.
- The browser probe observed correct backend errors for no-ack private HTTP (`REMOTE_ACCESS_PAIRING_HTTP_ACK_REQUIRED`), public HTTP (`REMOTE_ACCESS_PAIRING_HTTP_PRIVATE_REQUIRED`), and local-only URL (`REMOTE_ACCESS_PAIRING_URL_LOCAL_ONLY`).
- The added Android parser test directly covers a generated private HTTP QR/link shape and verifies Android still requires user acknowledgement before loading cleartext HTTP.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E and executable validation passed. Because API/E2E added repository-resident durable Android validation, delivery must not proceed until the updated validation code receives a narrow `code_reviewer` pass.
