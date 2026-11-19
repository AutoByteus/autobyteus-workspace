# API/E2E Coverage Investigation — ios-demo-mode-279 (autobyteus-279): the iOS app's built-in demo for App Review

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001 approved; REQ-001…014, AC-001…011, BEH-001…009)
- Behavior-defining supplement: the approved UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/ios-demo-mode-279/ui-ux-spec.md` (VIS-001…037)
- Design Spec: `design-spec.md` (SR-002); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`
- Architecture review: `architecture-review-revision-record.md` (ARCH-REV-002 Pass)
- Implementation Handoff: `implementation-handoff.md` (IR-001; reviewed route, Large / High)
- Code Review: `code-review-report.md` (CRR-001 Pass, reviewed range `8430d9ef12..429af9bd66`)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`; round 1
- Trigger: Code Reviewer CRR-001; HEAD `429af9bd66`; base `origin/personal` @ `8430d9ef12` (equal to `origin/personal` at the start)
- Constraint: nothing goes to Apple, TestFlight or App Store Connect without the founder's explicit word (REQ-014); the branch is not pushed by API/E2E

## Current Requirement And Design Basis

The iOS app gains Android's scan-first start screen and connect flow, a built-in demo (the real `/mobile` code compiled into a separate demo build `dist-mobile-demo/public`, bundled as `DemoWeb/`, served by a scheme handler, answered by an in-page demo node, with a content rule list blocking the network), the `autobyteus://demo` route and the scanner's demo code, and the share extension's sheet with the app acting on the kept text once. The phone shell (every build) gains the demo identity, the iPad layout, DC-007, DC-011 and local icons. Saved computers are read as today.

## Supported Scenarios And Real Usage

- From the requirements and the specification: UXJ-001…UXJ-012 (UC-001…UC-005).
- Real-use scenarios added:
  - RU-01: the founder updates the app from the shipped version with a computer saved: it still opens (REQ-013).
  - RU-02: the founder connects a real computer from the new first screen by Type an address, Paste a link and a scanned code (AC-001).
  - RU-03: someone shares from Safari / Photos to AutoByteus; the extension's own sheet shows the message, and the app acts on it once (AC-006).
  - RU-04: on iPad, a run open, the device is rotated (TR-012).
  - RU-05: a large PDF downloaded from a real node in the iOS app (C-03: base64 decoded on the main thread).
- Technically possible but unsupported: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Repository Evidence | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- |
| Build inputs (lockfile, web `package.json`, `nuxt.config.ts`, `scripts/**`, `release-ios.yml`, `project.yml`) | Yes | IMP-05, IMP-06, IMP-12 in the worktree | a fresh clone (no prior `dist/`, Prisma client, generated types) for each affected job: iOS, desktop, the server image's phone web | Fresh-start build |
| Real phone shell (`/mobile`: iPad layout, DC-007, DC-011, local icons) | Yes | web specs, demo probes | real nodes with scripted runtimes | `test:e2e:mobile-shell` |
| iOS shell (start screen, connect flow, scheme, scanner, share handling, demo web view) | Yes | core and UI tests on the implementation's simulators; fake-node smoke | a real node; an update over the shipped app with a saved computer; the extension's own sheet; rotation with a run open; a large download | own simulators, temporary UI tests, a real isolated node |
| Release workflow (`release-ios.yml`) | Yes | IMP-12 (parse, contract check) | the runner | build-only run (needs the branch pushed: delivery and the founder's word) |
| Device, TestFlight | — | — | camera, airplane mode, Camera-app link | only on the founder's word |
| Server, Android | No | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279`, branch `codex/ios-demo-mode-279`
- Testing guideline: `TESTING.md` (Fresh-start build; browser probes; clean env; one heavy run at a time), `RELEASE.md` (build-only release run), `autobyteus-ios/README.md` (XcodeGen, `xcodebuild`, the simulator smoke)
- Changed build-input paths: `pnpm-lock.yaml`, `autobyteus-web/package.json`, `autobyteus-web/nuxt.config.ts`, `autobyteus-web/scripts/**`, `autobyteus-ios/scripts/**`, `autobyteus-ios/project.yml`, `.github/workflows/release-ios.yml` → Fresh-start build required
- Toolchain: Xcode 26.1.1, XcodeGen; own simulators (iPhone 17 Pro Max, iPad Air 11-inch (M3), iOS 26.1), deleted afterwards
- Secrets: none (scripted runtimes; no signing)

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| web unit suite, typecheck, codegen, icons check, build checks | Still Valid | Reuse (IMP-01…05) |
| `tests/e2e/mobile-demo-*-probe.mjs` | Still Valid | Reuse (IMP-07); rerun on the fresh build's demo web |
| `AutoByteusMobileCoreTests`, `AutoByteusMobileUITests` (`DemoUITests`, `DemoIPadUITests`, the smoke) | Still Valid | Reuse (IMP-08…11); rerun in the Fresh-start iOS job on my simulator |
| `test:e2e:mobile-shell` (MSP cases) | Still Valid | Run (AC-011) |

## Planned Cases

| Case ID | Criteria | Kind | Planned Steps |
| --- | --- | --- | --- |
| R-IMP | AC-002…008 (unit, probes, simulator UI tests) | Reused | IMP-01…12 |
| FS-iOS | build inputs, AC-011 (iOS) | Fresh-start | a fresh clone at HEAD; `pnpm install --frozen-lockfile`; the `build-ios` job's steps in order: `prepare-demo-web.sh --build`, `ios-release-contract-check.py`, `generate-project.sh`, the simulator build, the core tests, `ios-simulator-smoke.sh` (my simulator) |
| FS-DESKTOP | build inputs | Fresh-start | a fresh clone; `pnpm install --frozen-lockfile`; `build:electron:mac -- --arm64` as TESTING.md says; the job's verify steps |
| FS-DOCKER | build inputs (`build-mobile-web.mjs`) | Fresh-start | a fresh clone; the server image's build stage commands up to `build:mobile-web` and the copy, on macOS (the Linux image itself is the build-only run's) |
| API-01 | AC-011, AC-007 (real node), AC-008 | Existing Test | `test:e2e:mobile-shell` on isolated nodes (clean env), the worktree's server and phone bundle |
| API-02 | AC-006 | Temporary UI test | on my iPhone simulator: Safari / Photos → Share → the AutoByteus extension: the four messages; then the app acts once |
| API-03 | AC-007, TR-012 | UI test | on my iPad simulator: the demo, a run open, rotate portrait ↔ landscape: the open run stays |
| API-04 | AC-001, REQ-013 | Temporary UI test | a real isolated node (dist, scripted runtime): Type an address, Paste a link, an injected QR; the shipped app (base build) saves the node, the new build installed over it opens it |
| API-05 | C-03 | Temporary UI test | a real node, a large PDF in its workspace: Download in the iOS app; the main thread's responsiveness during the save |
| NT-01 | build-only `release-ios.yml` | Not Tested | needs the branch pushed; delivery, on the right word |
| NT-02 | AC-002 camera, AC-003 airplane mode, AC-009, AC-010 device | Not Tested | only on the founder's word (REQ-014) |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

Decided per case after its result (API-03's rotation check is a candidate for `DemoIPadUITests`).

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; reroute required: `No`
