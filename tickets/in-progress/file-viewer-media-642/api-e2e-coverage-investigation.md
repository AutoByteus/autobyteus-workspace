# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001…REQ-004, AC-001…AC-004; DEC-001…DEC-008, DEC-007 and DEC-008 from this round's questions)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001…SR-006)
- Design Spec: `design-spec.md` (D-1…D-4)
- Supplemental Task Artifacts: `handoff-architecture-design-complete.md`, `follow-ups.md`
- Design Review Report / Architecture Review Revision Record: `design-review-report.md`, `architecture-review-revision-record.md` (the Architecture Reviewer's uncommitted edits, left as found)
- Implementation Handoff: `implementation-handoff.md` (IMP-01…IMP-15; Downstream Coverage Hints)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-003 Pass, then CRR-004 on IR-004 and CRR-005 on IR-005, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1. The code moved during the round, from `af2b65c2c0` (IR-003) to `38f318021c` (IR-004, the iOS audio session, DEC-007) and `339b8d0ddb` (IR-005, chat code blocks, DEC-008), both decided on my evidence questions. Each part ran on the head that last changed it.
- Trigger: `/code_reviewer` CRR-003 Pass on IR-003; branch `codex/file-viewer-media-642`, base `5c0db3a801`; Large / High
- Prior Investigation Reviewed: None (first round)

## Current Requirement And Design Basis

- REQ-001 / AC-001: a message reference is served by range like the other file routes, `no-store` kept. Its video or audio streams on the desktop, plays natively in the apps and downloads in a phone browser. Text, PDF and image are as today; a deleted reference shows its message.
- REQ-002 / AC-002: in both apps a node audio file plays in the native player as video does (574): by range, the credential in the header only, the cache reused. The player shows the name and controls; on iOS a symbol and the name while AVKit's controls are hidden. Types a player does not list keep the page path. DEC-007: the iOS player uses the `.playback` session while it shows.
- REQ-003 / AC-003: the Files tab's viewer is at least 400 px. It is stacked below tree 150 + 1 + viewer 400, and split above with the divider bounded.
- REQ-004 / AC-004: the listed types are highlighted in the file viewer (Monaco). DEC-008: in chat, message code blocks are highlighted by language name (Prism); `FileDisplay.vue` is removed.

## Supported Scenarios And Real Usage

- Designer scenarios covered: UC-001…UC-004.
- Real-use scenarios added:
  - a media reference opened while the Team goes on sending messages (CR-002);
  - audio over a slower link with link latency (574's lesson): found F-1 on iOS;
  - each way to leave the iOS player (Back, a swipe down, AVKit's Close);
  - the app's audio session (found DEC-007's question);
  - the chat's real Prism surface (found DEC-008's question);
  - a zero-byte reference (held).

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Coverage Consequence |
| --- | --- | --- |
| D-1 reference route by range | Changed | real node: every status and byte range per reference type |
| D-1b reference viewer streams media | Changed | desktop window (requests and play), both apps (native player, requests), phone browser (whole probe's MSP-92) |
| D-2 native audio and the media rename | Changed | both apps on a real throttled node: start, seek, reopen, latency, types per app, credential scans, cache folder, node removal |
| DEC-007 iOS audio session (IR-004) | Changed | the session mode while the player shows and each close path, from the simulator log |
| D-3 Files layout | Changed | rendered widths at 1440×900 and 1280×800, a 700 px panel, the divider's limits |
| D-4 / DEC-008 highlighting | Changed | each type in the viewer (Monaco tokens); each fence name in a message on the desktop and phone (Prism tokens) |
| Preserved: 574's video, NA-8, browser and older-app paths | Preserved | 574's real-node classes on 642's code; the whole phone probe |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Material Risk Not Exercised By Repository Evidence | Broader Validation |
| --- | --- | --- | --- |
| Server route | Yes | the real route set behind a proxy | real node |
| Web viewer / players | Yes | a live Team, real files, the desktop element's ranged reads | desktop window, phone bundle |
| Native apps | Yes | a real node, pairing, a throttled link, latency, real timings | emulator, simulator |
| Desktop Files tab | Yes | rendered widths, the drag | desktop window |
| Highlighting | Yes | the rendered engines and the chat's real surface | desktop window, phone bundle |

## Project Execution Discovery

| Instruction / Configuration Path | Commands, Setup, Or Constraints Learned |
| --- | --- |
| `TESTING.md` | clean env; own emulator (`-port 5646`) and own simulators, deleted after; never touch others' devices; one heavy run at a time; no secret in evidence |
| `implementation-handoff.md` | `pnpm -C autobyteus-server-ts prebuild`; `prepare-demo-web.sh --build` overwrites `dist/public`, so rebuild `build:mobile-web` after it; the contracts packages' `dist/` must be built for the web build |

| Component | Start / Setup | Readiness | Stop |
| --- | --- | --- | --- |
| Real node + proxy (`native-video-node.mjs`) | `--origin-host=10.0.2.2` (Android) or the LAN address with `--listen-host` (iOS) | `NATIVE_VIDEO_NODE_READY` | `POST /stop` |
| Android emulator | own AVD `api642_media`, `-port 5646 -no-window -gpu host` | `sys.boot_completed` | `emu kill`; AVD deleted |
| iOS simulators | own `api642-iphone`, `api642-r2` (iPhone 17, iOS 26.1) | `bootstatus -b` | `simctl delete` |
| Phone probe | `node tests/e2e/mobile-shell-probe.mjs [--cases=…]` | its own nodes | itself |

## Existing Durable Coverage Inventory

| Path / Test | Validity Decision | Action |
| --- | --- | --- |
| server reference reader, route, reply tests (IMP-01) | Valid | keep |
| web viewer, composable, bridge, layout, language-table specs (IMP-02…IMP-05, IMP-11, IMP-13, IMP-15) | Valid | keep |
| Android JVM and instrumented media tests (IMP-06, IMP-07) | Valid (stand-in server) | keep |
| iOS Core and fake-node UI tests (IMP-08, IMP-09, IMP-12, IMP-14) | Valid (stand-in node); no slower-link seek | keep; F-1 needs a case |
| MSP-92 (phone browser reference video), MSP-108…110 (618) | Valid | rerun (whole probe) |
| 574's `NativeVideoRealNodeUITests` | Valid | rerun on 642's code (video unchanged) |

## Planned Cases

| Case ID | Criteria | Kind | Steps |
| --- | --- | --- | --- |
| SRV-1 | AC-001 server | Temporary script | `ac001-server.mjs` through the stack's `/fetch` |
| AND-* | AC-001, AC-002, CR-002 | Temporary drivers (adb, raw CDP) | references, audio, latency, types, video, scans, removal |
| IOS-* | AC-001, AC-002, CR-002, DEC-007 | Durable UI test `NativeMediaRealNodeUITests` + 574's class | as in the report |
| MSP-111…114 | AC-003, AC-004, AC-001 desktop | Durable probe cases (`mobile-file-viewer-media-cases.mjs`) | desktop window and phone |
| WS-1 | regression | Existing | whole `test:e2e:mobile-shell` |
| SI-1, SE-1 | AC-001 server, regression | Existing | server integration and E2E |
| U-1 | unit | Reused | IMP-05, IMP-06, IMP-08, IMP-14, IMP-15, and the reviewer's re-runs |

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| IOS-* | `autobyteus-ios/AutoByteusMobileUITests/NativeMediaRealNodeUITests.swift` | audio and references in the iOS app on a real node, including F-1's slower-link seek and CR-002 |
| MSP-111…114 | `autobyteus-web/tests/e2e/mobile-file-viewer-media-cases.mjs` (registered in `mobile-shell-probe.mjs`) | the rendered layout, both highlighting surfaces, the desktop's ranged reference reads |
| stack | `autobyteus-web/tests/e2e/native-video-node.mjs` | audio files, a Team with references, `/team-message`, `/touch?file=`, Ogg/WebM |

## Durable Coverage To Update

| Path | Change |
| --- | --- |
| `autobyteus-ios/scripts/ios-simulator-smoke.sh` | skips `NativeMediaRealNodeUITests` (it needs a real node) |
| `autobyteus-ios/README.md` | how to run it |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Sound heard, the Ring/Silent switch, a lock (iOS) | a simulator has no switch or speaker | Medium | the physical-iPhone check before release (DEC-007) |
| Audio from a media message | needs a generating model (574 DEC-006's reasoning) | Low | — |
| Physical phones | none | Medium | before release |

## Ambiguities Or Reroute Triggers

- **AC-002 iOS audio heard:** taken to the Solution Designer and decided as DEC-007 (the `.playback` session, IR-004).
- **AC-004 chat preview:** `FileDisplay.vue` is not mounted anywhere. Taken to the Solution Designer and decided as DEC-008 (message code blocks; `FileDisplay.vue` removed, IR-005).

## Investigation Decision

- Proceed to execution: Yes (executed; results in `api-e2e-execution-coverage-report.md`).
