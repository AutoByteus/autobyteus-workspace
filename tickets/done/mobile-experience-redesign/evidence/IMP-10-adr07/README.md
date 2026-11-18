# IMP-10 — ADR-07 with the keyboard open, API 35 and API 34 (implementation engineer, autobyteus-277, IR-005)

- Command (each API level, against one held probe stack):
  `node tickets/in-progress/mobile-experience-redesign/evidence/api-e2e/scripts/android-journey.mjs <hold.json> autobyteus-android/app/build/outputs/apk/debug/app-debug.apk tickets/in-progress/mobile-experience-redesign/evidence/IMP-10-adr07/<api35|api34> --only=ADR-01,ADR-07`
- Stack: `pnpm -C autobyteus-web test:e2e:mobile-shell --hold`. It ran after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`, and the phone bundle contains `.\!overflow-clip{overflow:clip!important}`. The stack is probe-owned, with temporary data directories, and is not the user's AutoByteus. It was stopped afterwards and its temporary directory removed.
- Commit: `e3dd8c4677`. The runs happened on its tree before the commit, with one difference: the template comment sat above the root `<section>` rather than above `AgentEventMonitor`. A production build strips template comments, so the bundle under test renders the same markup.
- The APK is unchanged since IR-003; no Android file changed since `9b4066b4df`.
- Environment: macOS, Node v22.23.1.
  - API 35: emulator `autobyteus277_api35`, `sdk_gphone64_arm64`, WebView 124.0.6367.219.
  - API 34: emulator `autobyteus277_api34`, `sdk_gphone64_arm64`, WebView 113.0.5672.136.
- Date: 2026-11-06, 15:26–15:28Z.

## Result: ADR-01 Pass and ADR-07 Pass on both levels

All values are from `android-journey.json`, case ADR-07. Window pixels are device pixels; CSS values are CSS pixels.

| Fact | API 35 | API 34 | Before (API-REV-002) |
| --- | --- | --- | --- |
| WebView with the keyboard open (top, bottom) | 136, 1517 | 128, 1517 | same |
| Keyboard top (`ime.top`) | 1517 | 1517 | same |
| Conversation root `scrollTop` with the composer focused | **0** | **0** | 330 / 327 |
| Run screen section (top, bottom), CSS | 0, 527 | 0, 530 | — |
| Bar (`HEADER`) | 0–56 | 0–56 | composer under the bar |
| Conversation (`mobile-run-conversation`) | 56–527 | 56–530 | first child at −258 / −255 |
| Send bottom, device px | 1455 | 1455 | — |
| Gap from Send to the keyboard (`gapToKeyboard`) | 62 | 62 | keyboard-tall blank |
| Gap after forcing `scrollTop = 0` (`controlGapToKeyboard`) | 62 | 62 | — |
| `noDoublePadding` / `composerAboveKeyboard` | true / true | true / true | — |
| `visualViewport.offsetTop`, `scrollY` | 0, 0 | 0, 0 | — |

The focused gap equals the control gap: focusing the composer moves nothing. The 62 px is the composer's own bottom margin and padding (the IR-003 layout), not a blank.

## Screenshots (checked by eye)

- `api35/ADR-07-keyboard-open.png` and `api34/ADR-07-keyboard-open.png`: the bar ("lead · Idle · in Delivery Team") at the top, the conversation below it, and the composer with the typed text directly above the keyboard.
- `*/ADR-07-control-scrolltop-0.png`: the same layout after the control reset.
- `*/ADR-01-2-pairing.png`, `*/ADR-01-3-run-list.png`: the pairing screen (the payload is collapsed, so no code shows) and the run list.

QR-005: the JSON and the screenshots hold no token, pairing code or credential. `network` lists only GraphQL operation names, and `notes` is empty.

## Component guard

`components/mobile/runScreen/__tests__/MobileRunScreen.spec.ts`, "hosts the conversation in a clipping root (overflow: clip, not hidden)". It checks that `mobile-run-conversation` has `!overflow-clip` and not `overflow-hidden`. Focus scrolling cannot be expressed in happy-dom, so the emulator run covers the behaviour itself. See IMP-11.
