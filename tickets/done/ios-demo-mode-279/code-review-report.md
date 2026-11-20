# Code Review Report — ios-demo-mode-279 (autobyteus-279): the iOS app's built-in demo for App Review

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001; the founder's approval and delegation)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: the Product `ui-ux-spec.md` (Approved; VIS-001…VIS-037), by the sections the code cites
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Relevant Solution / Architecture Review Revision IDs: SR-002 / ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001; 15 assumptions)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review` of `8430d9ef12..429af9bd66` (21 commits). I read the spine and every security- or behavior-critical file; the demo's sample content and per-subject GraphQL answers were read by structure and are covered by their type check (IMP-02), the compiled-operation check (IMP-06) and the probes (IMP-07).
- Skill basis: design principles as updated on 2026-11-17 (The Approach: spine first; Principle 13's empty indirection check; Principle 16; a required collaborator is a required parameter).

## Routing Classification Review

- `Large` / `High` confirmed: a new contract consumer (the demo node), a new build artifact, an iOS web-content boundary with no network, iPad layout of the real shell, App Review-critical. Route: `Implementation Review`.

## Review Scope

- Web demo node: `demo/demoTransport.ts`, `demo/demoXmlHttpRequest.ts`, `demo/demoBoot.ts`, `demo/plugins/00.demoBoot.client.ts`, `demo/DemoNode.ts`, `demo/demoIdentity.ts`; `demo/graphql`, `rest`, `streams`, `world`, `runtime.ts` by structure; `scripts/build-mobile-web.mjs`, `scripts/mobile-build-checks.mjs`, `nuxt.config.ts`.
- Web shell (real app too): `utils/remoteAccess/{demoSession,shellBridge}.ts`, `MobilePairedShell.vue`, `MobileBottomSheet.vue`, `useMobileSplitLayout.ts`, `AgentConversationFeed.vue` + `useOwnSendFollow.ts` (DC-007), `ArtifactContentViewer.vue` / `MobileArtifacts.vue` (DC-011), `plugins/01.localIcons.client.ts`, `scripts/build-icon-bundle.mjs`.
- iOS: `Demo/DemoSchemeHandler.swift`, `Demo/DemoWebViewController.swift`, `Shell/ShellBridgeHandler.swift`, `Shell/ShellFileSaver.swift`, `AppShellCoordinator.swift`, `AutoByteusMobileCore/{NodeConnectionFlow,SharedText}.swift`; the start, connect and sheet screens by structure; `project.yml`, `scripts/prepare-demo-web.sh`, `scripts/ios-simulator-smoke.sh`, `.github/workflows/release-ios.yml`.
- No recorded check was rerun; none of the code they cover changed after they ran (`c572234f0f` only adds a type cast; `df18856ea4` only moves a test class).

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`.

| Spine / Behavior | Status | Implementation path |
| --- | --- | --- |
| DS-001 Open the demo (REQ-002, 006) | Confirmed | Try demo, the scanner's demo code or `autobyteus://demo` → `AppShellCoordinator.openDemo()` (cancels a connect, drops a pending pairing) → `DemoWebViewController`: content rule list compiled first (no list, no demo), `.nonPersistent()` data store per open, `DemoSchemeHandler` at `autobyteus-demo://app` → the demo build's first plugin (`enforce: 'pre'`) → `bootDemo` (transport, fresh world, demo session through `mobileCredentialStorage`) → plugin 21 binds it as a paired phone → the run list. |
| DS-002 A demo request (REQ-003, QR-001) | Confirmed | `fetch`/`WebSocket`/`XMLHttpRequest` (assumption 1) → the demo origin (`https://demo.autobyteus.invalid`) to `DemoNode`; the page origin, `blob:`, `data:` native; anything else refused. `DemoNode` accepts only the demo token; unknown operations, routes and streams are loud. The iOS rule list blocks `http(s)`/`ws(s)` as a second guard; navigation is limited to the demo scheme. |
| DS-003 A scripted turn (REQ-005) | Confirmed (by structure and IMP-07) | `demo/runtime.ts` streams through the stream contracts; probes report 0 findings and 0 errors at three sizes. |
| DS-004 Leave demo (REQ-006) | Confirmed | The demo sheet → `shellBridge.leaveDemo()` → the main-frame, origin-checked handler → `onLeave` → start screen; the web view and its store go with it; a cold launch never reopens the demo (`start()` opens a saved node or the start screen). |
| DS-005 Share (REQ-007) | Confirmed | Extension keeps text → `consumePendingShare()` once → `SharedTextAction.classify` (demo link, pairing link, other text, nothing) → `NodeConnectionFlow` (Android's sequence). A share while in the demo replaces the root, leaving the demo. |
| DS-006 iPad (REQ-008) | Confirmed | `useMobileSplitLayout` (viewport ≥ 1024 px) → a 380 px list pane and a right pane that is the containing block of the fixed screens; sheets as 512 px cards from 768 px; native sheets as form sheets (assumption 12). |
| REQ-009 DC-007 | Confirmed | `useOwnSendFollow`: a new last message of type `user` while the feed shows the latest → `followLatest` (the existing jump-to-latest steps, now shared). |
| REQ-010 DC-011 | Confirmed | `previewOnly` hides the Edit/Preview switch; the viewer is already read only and opens in preview when the type supports it. |
| REQ-011 icons | Confirmed | The local bundle is registered before render; the Iconify API module fetches nothing and logs a missing name; `icons:check` covers the source and mapping tables. |
| REQ-013 preserved | Confirmed | Saved computers read through the existing store after the autobyteus-290 migration; the node's `/mobile` build checks it holds no demo code (`findDemoCode`). |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario | Related | Kind | Actor | Goal | Entry | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RS-01 | UXJ-001, REQ-002 | User | App Reviewer | Open the demo | Try demo / demo QR / Camera link | Supported Normal | Use |
| RS-02 | UXJ-002…009, REQ-004/005 | User | App Reviewer | Use every phone feature on sample data | Demo screens | Supported Normal | Use |
| RS-03 | QR-001, REQ-003 | Contract | Any page script in the demo | Reach the network or a real node | fetch / XHR / WebSocket / subresource / navigation | Supported Explicit Edge (security contract) | Use |
| RS-04 | UXJ-011, REQ-007 | User | Owner | Share a link or text to AutoByteus | Share extension | Supported Normal | Use |
| RS-05 | UXJ-010, REQ-008 | User | Owner on iPad | Use the app in portrait and landscape | Rotation | Supported Normal | Use |
| RS-06 | REQ-013 | User | Existing owner after the update | Open a saved computer | App start | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- |
| C-01 | `#if DEBUG` launch-environment hooks for UI tests (`AUTOBYTEUS_UI_TEST_SCANNED_CODE`, `…_SHARED_TEXT`, `…_NETWORK_PROBE`) against DESIGN.md rule 11 (handoff point 4) | DESIGN.md rule 11 | `QRCodeScannerViewController.swift:46`, `AppShellCoordinator.swift:52`, `DemoWebViewController.swift:74` | Reject (deviation, reason holds) | Absent from release binaries; each covers a path XCUITest cannot otherwise reach (no simulator camera, the share host, the web view's loads); none changes the release path; the existing `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS` is the same form. The rule's wording does not address compile-time test seams: recorded as FU-004 for the rule's owner. |
| C-02 | `autobyteus://…?input=` now follows the share rule (a pairing link connects at once) instead of the old form's prefill-and-Connect | REQ-002 "other links keep their path", REQ-007 | `AppShellCoordinator.handleIncomingURL` | Reject | No producer of `?input=` links exists in the repository; opening a custom-scheme link from Safari asks the user first; the result equals the approved share handling (REQ-007, D6), and the old form no longer exists. |
| C-03 | iOS `saveFile` decodes base64 and writes on the main thread | — (no requirement on timing) | `ShellFileSaver.swift:13-18` | Reject (residual) | No approved behavior or measured consequence; Android moved this off the main thread for large PDFs (autobyteus-472 R-2). Noted for API/E2E: a large PDF Download from a real node on iOS. |
| C-04 | In the demo, URLs whose origin is `"null"` (non-special schemes such as `file:`) match `location.origin` of `autobyteus-demo://app` and go to the real `fetch` | QR-001 | `demoTransport.ts:110`, `demoXmlHttpRequest.ts:30` | Reject | No network address has a null origin; `http(s)`/`ws(s)` are refused by the transport and blocked by the rule list; navigation is limited to the demo scheme. |
| C-05 | DC-007 follows any new `user` message, including one the owner sent from another device | REQ-009 | `useOwnSendFollow.ts:14-17` | Reject | Still the owner's own send; other activity keeps "Jump to latest". |
| C-06 | `isDemoSession` marks a real session whose `entryId` is `'demo'` as the demo | R-3 | `demoSession.ts` | Reject | Real entry ids are generated; contrived. |
| C-07 | `DemoNode`, `DemoSocket`, `DemoXMLHttpRequest`, the scheme handler: new types — empty indirection? | Principle 13 | — | Reject | Each sits at a real boundary (the page's network, the app's web content) and translates or decides; none only forwards. |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Design health preserved | Pass | Matches SR-002 (AR-001…AR-003, R-1…R-3 applied) |
| Behavior-defining supplements | Pass | Copy and breakpoints follow the spec; assumptions 7, 8 and 12 recorded |
| Spine clarity | Pass | DS-001…DS-006 traced above |
| Ownership / boundaries | Pass | Demo state has one owner (`DemoWorld`); one marker of "the demo" (`DEMO_ENTRY_ID`); demo code only behind the demo plugin (`demoImportBoundary.spec.ts`, `findDemoCode`) |
| Off-spine concerns | Pass | Icons, split layout and own-send follow are small composables or plugins |
| Capability reuse | Pass | The phone's own session storage, stores, contracts and generated types; Android's flow ported as `NodeConnectionFlow` |
| Shared-structure tightness | Pass | Answers typed with generated results; stream messages by the contract packages |
| Repeated coordination / empty indirection (Principle 13) | Pass | C-07 |
| Visible dependencies (Principle 16) | Pass | `DemoNode` passed to the transport; coordinator builds its collaborators; no new global lookup of an owner (the transport replaces page globals by design, at the boundary) |
| Dependency direction | Pass | Only the demo plugin imports `demo/`; the shell reads `demoSession.ts` |
| Naming / vocabulary | Pass | "demo", "demo node", "demo session" used consistently |
| Dead code / legacy | Pass | `ConnectionViewController.swift` removed; the old share message replaced; the Iconify remote path replaced; FU-002 records dead GraphQL documents outside the changed modules |
| Tests requirement-aligned | Pass — deviation recorded, reason holds | Unit and contract tests, probes at three sizes, XCUITests on iPhone and iPad; Debug hooks C-01 |
| API/E2E readiness | Pass | Build-only workflow run, fresh-start build, the phone probe, share UI, rotation with a run open and device checks are named |

## Source File Size And Structure Audit

`AgentConversationFeed.vue` is 499 non-empty lines (500 before: not grown, not over). Every other changed source file is ≤ 309 (`AppShellCoordinator.swift` 284). No file was taken over 500. `Pass`.

## Legacy / Backward-Compatibility Verdict

`Pass`. Saved computers: `Directly Usable — No Migration`; the demo persists nothing. No compatibility path.

## Docs-Impact Verdict

`Yes`, for delivery: the iOS README / release notes (new start screen, demo, the prepare step), `remote_access.md` (iPad layout, DC-007, DC-011, local icons) as the handoff lists; App Review notes are the Product package's.

## Review Scorecard (Mandatory)

- Overall: `9.4/10`

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Six spines map to clear owners | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One demo state owner; one demo marker; boundary checks in the build | — | — |
| 3 | API / Interface Clarity | 9.4 | Bridge contract shared with Android plus `leaveDemo`; typed handler table | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Per-subject demo files; iOS split into Start, Connect, Demo, Shell | `AgentConversationFeed.vue` at 499 | Next feed change should extract |
| 5 | Shared-Structure Tightness | 9.4 | Generated types and contract schemas | — | — |
| 6 | Naming Quality | 9.5 | — | — | — |
| 7 | API/E2E Readiness | 9.3 | Probes, XCUITests, build checks | Build-only workflow run, fresh-start build, device checks pending | API/E2E, delivery |
| 8 | Runtime Correctness | 9.3 | Two independent no-network guards; loud unknowns; non-persistent store | iOS `saveFile` on the main thread (C-03) | Measure a large PDF |
| 9 | No Legacy Retention | 9.5 | Old form and share message removed | — | — |
| 10 | Cleanup Completeness | 9.4 | FU-002 records dead documents elsewhere | — | — |

## Findings

None.

## Follow-ups

- Added: FU-004 (DESIGN.md rule 11 and compile-time Debug-only test seams).

## Classification / Recommended Recipient

- Pass → API/E2E engineer; informational notice to the implementation engineer.

## Residual Risks

- The build-only run of `release-ios.yml` and the fresh-start build have not run (they need the branch pushed or a fresh clone).
- Device-only checks (real camera, the Camera app link, airplane mode, TestFlight) wait for the founder's word (REQ-014).
- C-03: a large PDF Download from a real node on iOS decodes on the main thread.
- R-004: DemoWeb is 13 MB.

## API/E2E Failure-Origin Review (Round 2, CRR-002)

### Review Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Trigger: API/E2E engineer, API-REV-001 (Fail, 88%): F-1. HEAD `49e69c9887` (no product code changed since `429af9bd66`; API/E2E test fix `4352ec81fa` goes to the later test review)
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`
- Failing Scenario: an update over the shipped app (`8430d9ef12`) with a computer it saved (AC-001, REQ-013, Preserved Behavior Boundary)
- Failure Evidence Paths: `evidence/api-e2e/ios/API-04a-shots/shipped-app-paired.png`, `ios/API-04b-update-shots/update-opened.png`; the decoded saved entry `{"displayName":"AutoByteus Desktop", …}`
- Review Scope: `N/A` (failure-origin)

### Scenario Basis

| Failure | Approved behavior | Trigger | Path | Validity |
| --- | --- | --- | --- | --- |
| F-1 | REQ-013: existing saved computers keep working after the update; the real `/mobile` experience unchanged except DC-007, DC-011, iPad | The founder updates the app; it opens his saved computer at launch | `AppShellCoordinator.start` → `flow.open(saved)` → `WebShellViewController` → bridge `hello` with `nodeName: entry.displayName` (`WebShellViewController.swift:45`) → `MobilePairedShell` takes it as the node's name (`:168`) → node button "AutoByteus Desktop" | Supported Normal Scenario (the founder's own case) |

### Origin Findings

#### CR-001 — A computer saved by the shipped app shows "AutoByteus Desktop" instead of the node's name (F-1; Design Impact, with an implementation part)

Two causes, both needed for the symptom:

1. **Persisted data: the stored name carries a second meaning.** The shipped app saved `displayName: status.serverName` (`8430d9ef12:ConnectionViewController.swift:134`). `ConnectionValidator` fills `serverName` with the literal "AutoByteus Desktop" when the node's status gives none (`ConnectionValidator.swift:30,34`). For entries the shipped app saved, "AutoByteus Desktop" therefore means "no name known". The new code reads it as a real name: `NodeConnectionFlow.hasKnownName` treats any name other than the host as known (`NodeConnectionFlow.swift:128`), so `onPaired` never replaces it, and `hello` hands it to the page.
   - The design's persisted-data decision, "Saved computers on iOS: `Directly Usable — No Migration`" (`design-spec.md:160`), missed this.
   - This is a stored value with a wrong meaning (Principle 5, Principle 15). The fix belongs in a data-transition decision, not a runtime branch that recognises the old placeholder.
   - So this part is a `Design Impact` for the Solution Designer.
2. **Implementation: the iOS `hello` does not follow the ported contract.** Android sends `nodeName = entry.knownName.orEmpty()`, "the open entry's known name, `""` when it has none: never its address" (`ShellBridge.kt:64,161`). iOS sends `entry.displayName` unconditionally (`WebShellViewController.swift:45`), so a typed-address entry (whose name is its host) hands the page its address. That is the "Type an address uses the address" behavior API/E2E saw.
   - This part is a bounded implementation correction.
   - Send the known name or `""`, with "known" decided by the same rule as `hasKnownName`, in one place.

- Review gap: partial. In round 1 I accepted the design's persisted-data decision without tracing what the shipped app wrote into `displayName`, and did not compare the iOS `hello` field with Android's contract line by line (Principle 1: "Compare 'mirrors X' rule by rule").
- Recommended direction (for the Solution Designer to decide):
  - A one-time data migration in the existing iOS migration owner (`AutoByteusMobileCore/DataMigrations`, next to `SavedNodeEntryKeysMigration`, run before the store's first read). It rewrites a saved entry's `displayName` equal to the shipped placeholder to "no known name" in the new code's terms (the host, as new entries without a name use), with a completion marker.
  - The `hello` correction above, so the page then shows its own paired name, and `onPaired` names the entry from the page as Android does.
  - Also check whether `ConnectionValidator`'s "AutoByteus Desktop" default is still read anywhere after this change; if not, remove it (Principle 7).
  - Not recommended: a runtime check for the placeholder string in the bridge or the flow (a version-specific fallback in current code, Principle 5/8).

### Classification And Routing

- CR-001: `Design Impact` (the persisted-data transition decision for saved computers), owner Solution Designer. The `hello` contract correction is implementation work done in the same revision.
- After the design revision and the implementation: source review (targeted), then API/E2E reruns the update-over-shipped-app journey (API-04a/b), a new pairing (QR, Paste a link), and a typed address. Then the test review covers `4352ec81fa` and any new tests.

## Implementation Review Round 3 (CRR-003): Targeted Delta Review of IR-002

- Trigger: implementation engineer, IR-002, code `930477c533` (documents `4ad317c20d`), through SR-003/SR-004 (ARCH-REV-004 Pass, N-5 applied).
- Review Scope: `Targeted Delta Review`. `49e69c9887..930477c533` is one commit, iOS only: the new migration, the name rule on `SavedNodeEntry`, its readers (`NodeConnectionFlow`, `hello`, `NodeRowView`, `RemoveNodeSheet`), and `serverName` removed from `RemoteAccessStatus`. These are CR-001's files and behavior; there is no web change.
- CR-001: **Resolved.**
  - **Migration** (`SavedNodeDisplayNamePlaceholderMigration`):
    - Runs once in the existing migration owner, after `SavedNodeEntryKeysMigration` and before the store is created.
    - Rewrites only `displayName == "AutoByteus Desktop"` to the entry's stored `host`. The shipped entries carry `host`, as `IMP-15` and the shipped `SavedNodeEntry` show.
    - Keeps every other field as stored.
    - Write order: backup, rewrite, marker. An interrupted start restores from the backup and reruns; the next start after the marker drops the backup.
    - The placeholder literal lives only here. There is no runtime recognition of the old string (Principles 5, 8).
  - **One name rule, as on Android:** `knownName` (nil for an empty name or one equal to the host, case-insensitively) and `shownName` (the known name, else "AutoByteus node", never an address).
    - `hello` sends `knownName ?? ""`, matching `ShellBridge.kt:64,161`.
    - `onPaired` renames when `knownName` is nil.
    - The native screens read `shownName`.
  - **Cleanup:** `RemoteAccessStatus.serverName` and its "AutoByteus Desktop" default are removed. Their only reader was the never-shown diagnostic text (handoff assumption 16; Principle 7).
- Tests:
  - migration: 7 cases (rewrite and keep, other fields kept, a second start, interruption after backup and after rewrite, none saved, after the key migration);
  - `shownName` never shows an address: 3;
  - `NativeNodeNameReadsTests`: no native `.displayName` read outside the flow's write;
  - flow rename: 2;
  - stale assertions updated.
- Checks: IMP-13 core 56 Pass; IMP-14 iPhone smoke 8, none skipped; IMP-15 the real app over the shipped app's entries (the placeholder became the host, "Test Node 279" kept, native screens read "AutoByteus node").
- Residual: after the update an old entry shows "AutoByteus node" natively until the page reports `paired` with its name (Android's rule); the page itself shows its own name (`hello` sends ""). API/E2E's API-04a/b rerun will show it.
- Rechecked category: Runtime Correctness 9.4 (restored); the others carry forward (9.4/10). Material-Premise Gate: `Pass` (the persisted-data decision is revised to a migration, SR-003).
- New findings: none.

## Latest Authoritative Result

- Review Decision: `Pass` (implementation review, round 3, CRR-003, Targeted Delta Review of IR-002)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10, every category ≥ 9.3
- Recommended Recipient: API/E2E engineer
- Notes: API/E2E reruns API-04a/b (update over the shipped app), a new pairing (QR, Paste a link) and a typed address on a real isolated node. Then the test review covers `4352ec81fa` and later test changes.
