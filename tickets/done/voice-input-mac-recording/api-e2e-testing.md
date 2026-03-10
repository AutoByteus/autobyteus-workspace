# API / E2E Testing

## Stage 7 Status

- Current status: `Blocked pending live packaged-app verification`
- Date: `2026-03-10`

## Executed Verification

| Verification ID | Coverage | Command / Method | Result | Notes |
| --- | --- | --- | --- | --- |
| `AV-001` | `R-001`, `R-004`, `AC-001`, `AC-003`, `AC-005` | `cross-env NUXT_TEST=true vitest --config vitest.config.mts run stores/__tests__/voiceInputStore.spec.ts` | Passed | Store-level regression suite passes, including new cases for suspended `AudioContext` resume and actionable failure when the context never reaches `running`. |
| `AV-002` | `R-005`, `AC-004` | Static inspection of `autobyteus-web/build/entitlements.mac.plist` | Passed | The macOS entitlements file now includes `com.apple.security.device.audio-input`. |
| `AV-003` | packaged-app validation readiness | `pnpm build:electron:mac` from the ticket worktree | Passed with caveat | After wiring the worktree package `node_modules` to the main workspace dependency trees, the Apple Silicon macOS artifacts were produced at `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.34.dmg`, `...zip`, and `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`. The build was unsigned because `APPLE_SIGNING_IDENTITY` was not set, and the long-running builder process was interrupted after the artifacts were already written. |
| `AV-004` | `R-001`, `R-002`, `R-003`, `R-005`, `AC-001`, `AC-002`, `AC-004`, `AC-005` | Install and run the newly built Apple Silicon macOS app on an affected machine, then rerun `Settings -> Extensions -> Voice Input -> Test Voice Input` | Passed | On `2026-03-10`, the user installed the locally built Apple Silicon app and confirmed that `Test Voice Input` works on the previously failing Mac. |
| `AV-005` | `R-007`, `R-008`, `AC-006`, `AC-007` | `cross-env NUXT_TEST=true vitest --config vitest.config.mts run stores/__tests__/voiceInputStore.spec.ts` | Passed | The store suite now verifies automatic failure when no capture frames arrive and explicit reset of a stuck settings-level test state. |
| `AV-006` | `R-007`, `AC-006` | `cross-env NUXT_TEST=true vitest --config vitest.config.mts run components/settings/__tests__/VoiceInputExtensionCard.spec.ts` | Passed | The settings card suite passes after adding the `Reset Test` recovery action. |
| `AV-007` | Ticket completion acceptance | User verification in conversation | Passed | The user explicitly confirmed the ticket is done once the frontend reset path exists for wedged Voice Input test state. |

## Gate Decision

- Stage 7 gate: `Pass`
- Result:
  - packaged-app validation passed on the affected Mac using the new local Apple Silicon build;
  - the recovery-focused watchdog/reset pass is covered by targeted automated tests and explicit user acceptance.
