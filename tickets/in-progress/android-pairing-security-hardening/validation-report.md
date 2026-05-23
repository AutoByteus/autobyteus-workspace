# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/review-report.md`
- Current Validation Round: 1
- Trigger: Code review round 2 pass; API/E2E validation requested for Phase One Android pairing / mobile-safe Docker node security hardening.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Latest Authoritative Result

- Result: `Pass`
- Notes: Durable API/E2E/native validation passed. Live Docker + private Tailscale HTTPS + attached Android phone validation also passed for status reachability, pairing, WebView mobile shell loading, paired-device registration, mobile work selection, and mobile-created run dispatch into the Docker node. The final model response failed at provider activation because the validation Docker node had no `DEEPSEEK_API_KEY`; that is an expected environment configuration issue and confirms the request reached the Docker runtime rather than an embedded/local fallback.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review round 2 pass | N/A | None | Pass | Yes | Added durable validation, ran target suites, inspected real Docker runtime, and executed live Android/private HTTPS pairing and mobile-created Docker-node run dispatch. |

## Validation Basis

Validation was derived from the approved requirements/design, especially AC-P1-001 through AC-P1-011, the implementation handoff downstream validation hints, and code review round 2 residual risks. The implementation handoff `Legacy / Compatibility Removal Check` was read and checked against observed source/runtime behavior.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

The standard Docker profile remains a separate explicit profile. No fallback from the mobile-safe profile to privileged flags, host bind mounts, embedded/local Phone Access management, or mobile Tools/Terminal/VNC UI was observed.

## Platform / Runtime Targets

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/validation-evidence/runtime-environment.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/validation-evidence/android-adb-device.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/validation-evidence/live-android-network-before-serve.log`

Observed targets:

- Host: macOS 26.2 arm64, Node v22.21.1, pnpm 10.28.2, Docker 29.0.1, Java 21.0.10, Gradle 8.13.
- Android: attached `dfd6c5c0`, Xiaomi 2109119DG / Android 12 SDK 31 / arm64-v8a.
- Tailscale host: `100.127.30.107`, MagicDNS `normys-macbook-pro.tail0347f8.ts.net`.
- Tailscale phone: `100.75.247.102`; initially not usable from shell until the phone Tailscale app was foregrounded/connected.

## Validation Surfaces / Modes

- Real Docker runtime inspection through the public launcher and through a current-branch validation image/container.
- Private HTTPS mapping through Tailscale Serve to the localhost-bound Docker backend.
- Physical Android app/WebView flow through ADB against the private HTTPS Docker endpoint.
- PowerShell launcher syntax parse through Docker-hosted `pwsh` because local `pwsh` is unavailable.
- Fastify API/E2E route validation for node-admin claim behavior, status identity, pairing sessions/exchanges, and route scoping.
- Web Pinia/component Vitest validation for remote Docker claim states, advertised URL matching/mismatch, Android-facing URL rejection, NodeManager/PhoneAccessCard, and mobile Tools removal.
- Electron Vitest validation for main-process node-admin claim custody and IPC exposure.
- Android JVM unit tests for current-branch pairing-link parsing.
- Static/source guards for stale copy, mobile Tools/Terminal/VNC source reachability, localization boundary, and whitespace.

## Coverage Matrix

| Scenario ID | Requirements / AC | Validation Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| VAL-P1-001 | R-P1-001 through R-P1-006; AC-P1-001 through AC-P1-003 | Real Docker launcher/runtime inspection | Pass | `docker-runtime-validation-summary.txt`, Docker inspect JSON |
| VAL-P1-002 | R-P1-008A, R-P1-008E | Real launcher `admin-claim show` / `rotate` plus Docker inspect | Pass | `docker-admin-claim-show.log`, `docker-admin-claim-rotate.log`, `docker-inspect-after-rotate.json` |
| VAL-P1-003 | R-P1-008 through R-P1-008D; AC-P1-005, AC-P1-006, AC-P1-006A | API/E2E and route/unit tests | Pass | `server-targeted-tests.log` |
| VAL-P1-004 | R-P1-010 through R-P1-010C; AC-P1-007, AC-P1-007A | Web store/component tests and live HTTPS `serverInstanceId` compare | Pass | `web-targeted-tests.log`, `live-final-private-https-status-compare.log` |
| VAL-P1-005 | R-P1-008B | Electron claim custody / IPC tests | Pass | `electron-targeted-tests.log`, `electron-transpile.log` |
| VAL-P1-006 | R-P1-011, R-P1-012; AC-P1-008, AC-P1-009 | Server pairing exchange, mobile Docker-origin binding, Android parser, physical Android pairing over Tailscale HTTPS | Pass | `server-targeted-tests.log`, `web-targeted-tests.log`, `android-unit-tests.log`, `live-android-pair-tap.log` |
| VAL-P1-007 | R-P1-013; AC-P1-010 | Web mobile tests and source guard | Pass | `web-targeted-tests.log`, `guards-and-diff-check.log` |
| VAL-P1-008 | PowerShell launcher parity | PowerShell parse in Docker `linux/amd64` | Pass | `powershell-parse.log` |
| VAL-P1-009 | AC-P1-008, AC-P1-009 live run path | Physical Android mobile work selection and mobile-created run dispatch against Docker node | Pass for Docker-node dispatch; provider completion not expected | `live-android-create-run-deepseek.log`, `live-android-visible-send-deepseek.log` |

## Test Scope

In scope this round:

- Mobile-safe Docker runtime flags, mounts, port binding, env, launcher state permissions, and claim rotation.
- Claim-backed Phone Access owner route behavior for non-loopback remote callers.
- Claim not granting general API/GraphQL/protected REST authority.
- Status identity persistence used for same-node URL verification.
- Remote Docker advertised URL validation success and fail-closed cases.
- Mobile session transport binding to the paired Docker advertised origin.
- Android pairing URL parsing for Docker advertised HTTPS origin.
- Physical Android WebView pairing/open over private HTTPS to the current Docker-node backend.
- Mobile Tools/Terminal/VNC removal from standard mobile UI source/test surfaces.

## Tests Implemented Or Updated

Repository-resident durable validation added/updated during API/E2E:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`
  - Updated revoked-device remote behavior to require node-admin claim rather than the old local-only expectation.
  - Added missing/wrong/valid node-admin claim coverage on remote owner routes.
  - Added status `serverInstanceId` persistence, Docker QR payload, pairing exchange, paired-device list, and claim route-scope denial for protected REST/GraphQL.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/autobyteus-web/stores/__tests__/phoneAccessStore.spec.ts`
  - Added remote Docker loopback/container-local advertised URL rejection.
  - Added same-node mismatch fail-closed behavior before QR POST.
  - Added invalid claim state handling without fallback to embedded/local management.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/autobyteus-web/utils/remoteAccess/__tests__/mobileSessionBootstrap.spec.ts`
  - Added mobile transport binding to paired Docker node origin instead of embedded host origin.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/autobyteus-android/app/src/test/java/org/autobyteus/mobile/connection/PairingLinkParserTest.kt`
  - Added Android parser coverage for a Docker-node advertised HTTPS pairing URL.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/autobyteus-server-ts/tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/autobyteus-web/stores/__tests__/phoneAccessStore.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/autobyteus-web/utils/remoteAccess/__tests__/mobileSessionBootstrap.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/autobyteus-android/app/src/test/java/org/autobyteus/mobile/connection/PairingLinkParserTest.kt`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes, required before delivery.`
- Post-validation code review artifact: Pending.

## Other Validation Artifacts

Evidence directory:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/validation-evidence/`

Key files:

- `docker-runtime-validation-summary.txt`
- `docker-launcher-new-container.log`
- `docker-admin-claim-show.log`
- `docker-admin-claim-rotate.log`
- `docker-inspect-before-rotate.json`
- `docker-inspect-after-rotate.json`
- `powershell-parse.log`
- `server-targeted-tests.log`
- `web-targeted-tests.log`
- `electron-targeted-tests.log`
- `electron-transpile.log`
- `server-build-typecheck.log`
- `android-unit-tests.log`
- `android-assemble-debug.log`
- `guards-and-diff-check.log`
- `live-current-docker-security-and-api.log`
- `live-tailscale-serve-docker-switch.log`
- `live-final-private-https-status-compare.log`
- `live-android-existing-app-pairing-after-ts-window.xml`
- `live-android-pair-tap.log`
- `live-android-after-pair-tap-window.xml`
- `live-android-create-run-deepseek.log`
- `live-android-visible-send-deepseek.log`
- `live-validation-cleanup.log`

Raw launcher claim secrets and pairing payload secrets were redacted from persisted evidence logs. Temporary raw files under `/tmp` were removed during cleanup.

## Temporary Validation Methods / Scaffolding

- A current-branch validation image was built with `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/validation-evidence/Dockerfile.remote-server.validation` because the public image did not contain the branch changes and `docker/Dockerfile.remote-server` did not build the current monorepo as-is without copying `patches` and workspace packages. This Dockerfile is evidence-only validation scaffolding, not production source.
- Staged `autobyteus-server-ts/mobile-web` from the current `autobyteus-web` mobile build so the validation container served current mobile web code.
- Temporarily repointed Tailscale Serve from `http://127.0.0.1:29695` to the validation Docker backend `http://127.0.0.1:<validation-port>`, then restored it to `http://127.0.0.1:29695`.
- Used a temporary Docker container `autobyteus-live-validation-android-pairing` and named volumes for the live current-branch Docker-node validation.

Cleanup confirmed:

- Removed live validation Docker container and named volumes.
- Removed temporary validation image `autobyteus-server:android-pairing-live-validation`.
- Removed generated `autobyteus-server-ts/mobile-web` from the source tree.
- Restored Tailscale Serve to `https://normys-macbook-pro.tail0347f8.ts.net/ -> http://127.0.0.1:29695`.

## Dependencies Mocked Or Emulated

- Web advertised URL checks used mocked `fetch`/API service responses for matching and mismatched `serverInstanceId` cases.
- API/E2E non-loopback requests used Fastify inject remote-address simulation rather than a separate network namespace.
- The live Android path used the installed signed Android app already present on the phone (`org.autobyteus.mobile` versionName `1.3.26`) because installing the locally built debug APK failed with signature mismatch. Current-branch Android parser behavior was separately covered by JVM tests and `app:assembleDebug` passed.
- Full LLM completion was not required for this validation. Mobile-created run dispatch reached the Docker node and failed because the selected DeepSeek provider key was not configured in the validation container.

## Lifecycle / Upgrade / Restart / Migration Checks

- Docker launcher `admin-claim rotate` was executed against a real mobile-safe container; rotation recreated the launcher-managed container with a new claim ID/hash and without raw claim secret in container env.
- `serverInstanceId` persistence was exercised by resetting the server identity service singleton and re-reading status from the same app data directory in API/E2E.
- Live validation confirmed the same `serverInstanceId` through local Docker HTTP and private Tailscale HTTPS.

## Passed

Commands and results:

- `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace` — passed: 7 tests, 1 skipped (`pwsh` local skip).
- `bash -n scripts/public/docker/autobyteus-docker.sh` — passed.
- `docker run --rm --platform linux/amd64 ... mcr.microsoft.com/powershell:latest pwsh ...` — passed; `PWSH_PARSE_OK`.
- Real Docker mobile-safe launcher runtime validation — passed; no `SYS_ADMIN`, no `seccomp=unconfined`, no host bind mounts, localhost-bound 8000/5900/6080/9223, claim ID/hash/scope only in env, state mode `0600`, rotate changed claim ID/hash, container/volumes cleaned.
- Current-branch validation Docker image build using temporary validation Dockerfile — passed.
- Live current-branch Docker container inspection — passed; no dangerous caps/security options, named-volume-only mounts, localhost-bound ports, claim ID/hash/scope env, no raw claim secret in env.
- Live Docker Phone Access API over mapped port — passed; wrong claim rejected, valid node-admin claim enabled Phone Access and listed devices.
- Live private HTTPS status via Tailscale Serve — passed from host and Android shell; `serverInstanceId` matched local Docker status.
- Live Android private HTTPS pairing — passed: pairing link opened mobile shell, unpaired stale local session, tapped `Pair this phone`, server listed paired device with `clientFacingBaseUrl` `https://normys-macbook-pro.tail0347f8.ts.net`.
- Live Android mobile work selection — passed: mobile UI listed Docker-served work catalog, selected Memory Compactor and Temp Workspace.
- Live Android mobile-created run dispatch — passed for Docker-node execution path: mobile-created run reached Docker node and produced run history `memory_compactor_memory_compaction_specialist_5073`; model response failed only because `DEEPSEEK_API_KEY` was not configured in the validation Docker node.
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts tests/unit/remote-access/server-instance-identity-service.test.ts tests/unit/remote-access/route-policy.test.ts tests/unit/remote-access/remote-node-admin-service.test.ts tests/unit/remote-access/redact-sensitive-url.test.ts` — passed: 5 files, 18 tests.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/phoneAccessStore.spec.ts components/settings/__tests__/PhoneAccessCard.spec.ts components/settings/__tests__/NodeManager.spec.ts utils/__tests__/dockerNodeLauncherCommands.spec.ts utils/__tests__/mobileFeatureGates.spec.ts utils/remoteAccess/__tests__/mobileSessionBootstrap.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts` — passed: 9 files, 69 tests.
- `pnpm -C autobyteus-web exec vitest --config ./electron/vitest.config.ts run electron/__tests__/nodeAdminClaimStore.spec.ts electron/__tests__/register-node-admin-claim-ipc-handlers.spec.ts electron/__tests__/preload.spec.ts electron/__tests__/nodeRegistryStore.spec.ts` — passed: 4 files, 12 tests.
- `pnpm -C autobyteus-web run transpile-electron` — passed.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `ANDROID_HOME=$HOME/Library/Android/sdk ANDROID_SDK_ROOT=$HOME/Library/Android/sdk ./autobyteus-android/gradlew -p autobyteus-android app:testDebugUnitTest` — passed.
- `ANDROID_HOME=$HOME/Library/Android/sdk ANDROID_SDK_ROOT=$HOME/Library/Android/sdk ./autobyteus-android/gradlew -p autobyteus-android app:assembleDebug` — passed.
- `pnpm -C autobyteus-web run guard:localization-boundary` — passed.
- `rg -n "phoneSetupUnavailable" autobyteus-web/localization/messages autobyteus-web/components autobyteus-web/stores` — no matches.
- Mobile Tools/Terminal/VNC source guard over mobile-specific source surfaces — no matches; `MobileTools.vue` absent.
- `git diff --check` — passed before live validation artifact/report updates.

## Failed

None.

## Not Tested / Out Of Scope

- Physical camera scan of the QR was not executed; the equivalent pairing URL flow was launched through Android `ACTION_SEND` and then paired through the WebView UI.
- Current locally built Android debug APK was not installed on the phone because the device already had a differently signed `org.autobyteus.mobile` package. The existing installed package was used for live Android shell/WebView testing; current-branch native parser and APK build were validated with JVM tests and `assembleDebug`.
- Successful LLM model completion was not required and was not achieved because the validation Docker node lacked `DEEPSEEK_API_KEY` for the selected DeepSeek model. This is recorded as environment configuration, not an implementation failure.

## Blocked

No blocker remains for repository validation or validation-code review.

## Cleanup Performed

- Restored Tailscale Serve to the pre-validation backend: `https://normys-macbook-pro.tail0347f8.ts.net/ -> http://127.0.0.1:29695`.
- Removed live validation Docker container `autobyteus-live-validation-android-pairing`.
- Removed live validation named volumes `autobyteus-live-validation-android-pairing-workspace`, `autobyteus-live-validation-android-pairing-data`, and `autobyteus-live-validation-android-pairing-root-home`.
- Removed temporary validation image `autobyteus-server:android-pairing-live-validation`.
- Removed generated `autobyteus-server-ts/mobile-web` from the source tree.
- Removed temporary raw claim/pairing files under `/tmp`.

## Classification

- No implementation failure found.
- No design-impact, requirement-gap, or unclear reroute found.
- Repository-resident durable validation changed during API/E2E; route back to `code_reviewer` for narrow validation-code re-review before delivery.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

The validation changed repository-resident durable tests. Because durable validation was added/updated after the prior code review, this package must return through `code_reviewer` before `delivery_engineer`.
