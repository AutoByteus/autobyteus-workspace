# Docs Sync Report — ios-demo-mode-279 (autobyteus-279)

## Scope

- Ticket: `ios-demo-mode-279` (Project Task `autobyteus-279`), `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`: architecture review ARCH-REV-001…004; source review CRR-001 Pass; failure-origin review CRR-002 (Design Impact F-1 → SR-003/SR-004, IR-002); CRR-003 Pass; API/E2E API-REV-001 Fail F-1, API-REV-002 Pass 91%; test-code review CRR-004 Pass.
- Bootstrap base reference: `origin/personal` @ `8430d9ef12`.
- Integrated base reference used for docs sync: `origin/personal` @ `422a2955c5` (autobyteus-5 and autobyteus-560), merged as `0e58926e03` without conflicts. Docs edits started after this merge.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- The iOS app is no longer a pure wrapper. It has Android's start screen and connect flow, the shell bridge, share handling that acts on the kept text, the iPad layout of its own screens, and a bundled demo build of the phone screens. The phone shell gained the iPad layout, DC-007, DC-011 and local icons in every build.
- The long-lived docs said the opposite in several places: "The iOS shell … does not bundle a separate copy of the AutoByteus mobile UI"; the shell bridge, Switch node and the pairing page were "Android" only; the iOS build had no prepare step; the smoke expected "AutoByteus node is unreachable".

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | The phone shell's contract: screens, shell bridge, node names, build and packaging | Updated | See below. |
| `autobyteus-ios/README.md` | The iOS app's ownership, build, tests, release workflow, device checklist | Updated | See below. |
| `docs/ios_mobile_access.md` | The iOS guide: ownership, build, simulator scenarios, App Review notes | Updated | See below. |
| `docs/android_mobile_access.md` | Android's guide | No change | Android is untouched (D5); the shared bridge contract is described once, in `remote_access.md`. |
| `autobyteus-server-ts/docs/features/remote_access.md` | The node's side of Phone Access | No change | The node is untouched; the demo needs no node change and the node's `/mobile` holds no demo code. |
| `docs/privacy/ios-mobile-privacy-policy.md` | What the iOS app collects | No change | The demo collects and sends nothing (no network, a non-persistent store); the app's data handling is otherwise unchanged. |
| `DESIGN.md` | Rules 9, 11, 12 applied by the design | No change | Rule 12 (the iOS gate's prepare step) was followed in `release-ios.yml`. Rule 11's wording for Debug-only test seams is FU-004, for the Solution Designer. |
| `TESTING.md` | Fresh-start build, phone probe | No change | API/E2E ran the Fresh-start build for the touched build inputs (FS-iOS, FS-DOCKER, FS-DESKTOP); the demo probes are named in `remote_access.md`. No command stopped working. |
| `RELEASE.md` | Build-only release run for a release workflow change | No change | It already requires the build-only run for `.github/workflows/release-*.yml` changes; NT-01 follows it. |
| `docs/design-cases.md` | Design cases | No change by delivery (already updated) | Case 24 (a stored value read by its type, not by what its writer meant; CRR-002 F-1) was added in the ticket by the Solution Designer and committed in the delivery checkpoint `7a88198a2b`. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | Correction and new sections | Intro names the iOS demo build; Download on iOS (system share sheet); Switch node and the pairing page in both apps; "Shell bridge (Android and iOS)" with `ShellBridgeHandler.swift`, the iOS `saveFile` and full screen, `leaveDemo`; the node-name rule in both apps and the iOS placeholder-name migration; new sections iPad layout, Your own send and phone Artifacts (DC-007, DC-011), Icons (`icons:build` / `icons:check`), The demo build (iOS); Build and Packaging: the iOS app's `DemoWeb/` and `prepare-demo-web.sh`, the release workflow's prepare step | The code changed all of these (implementation handoff, Reviewed Behavior Implementation Trace) |
| `autobyteus-ios/README.md` | Correction | What the app owns (start screen, demo, bridge, share, iPad, names); the build's prepare step; the smoke's tests; the iPad test's own destination; Can't reach; the release workflow's demo build; device checklist item 10 (the demo on a device) | Same |
| `docs/ios_mobile_access.md` | Correction | Intro and ownership; the build's prepare step; the simulator scenarios (Type an address, Can't reach, the demo); the App Review highlights (the demo for Guideline 2.1(a)) | Same |

## Out-Of-Scope Findings

- None new. The ticket's `follow-ups.md` (FU-001…FU-005) stands as written.
- Not committed: `evidence/apple-review/app-store-connect-review-message.jpg` (the App Store Connect page shows the account holder's name and the provider number; this repository is public). It is kept in the private delivery record. `STATUS.md` and the requirements cite the folder; the two email screenshots there are committed.
