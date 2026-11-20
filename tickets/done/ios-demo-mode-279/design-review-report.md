# Design Review Report — ios-demo-mode-279 (autobyteus-279): the iOS app's built-in demo for App Review

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/requirements-doc.md` (SR-001, Approved by the founder)
- Upstream Investigation Notes: `…/tickets/in-progress/ios-demo-mode-279/investigation-notes.md`
- Upstream Solution Revision Record: `…/tickets/in-progress/ios-demo-mode-279/solution-revision-record.md`
- Reviewed Design Spec: `…/tickets/in-progress/ios-demo-mode-279/design-spec.md` (SR-004; "Persisted Data" and "Revision SR-003/SR-004"; SR-002 sections passed in ARCH-REV-002)
- Supplemental Task Artifacts Reviewed:
  - `evidence/architecture/phone-network-inventory.json`;
  - the approved `ui-ux-spec.md` (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/ios-demo-mode-279/`, reference `78b51f73`);
  - `evidence/demo-verification/verdict.md`;
  - `evidence/apple-review/`;
  - `handoff-architecture-review.md`, `STATUS.md`.
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `…/tickets/in-progress/ios-demo-mode-279/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: Solution Designer SR-004, answering ARCH-REV-003 (AR-004, N-4). Earlier: SR-003, answering the code reviewer's CRR-002 Design Impact F-1 (`code-review-report.md`, CR-001), with `docs/design-cases.md` Case 24. Earlier trigger: SR-002, answering ARCH-REV-001. Reviewed against the skill update of 2026-11-19 (Principle 11: one builder per shown picture; Principle 16: a required collaborator is not optional for tests); neither changes a verdict here
- Prior Review Round Reviewed: 3 (ARCH-REV-003, Fail, AR-004)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: worktree `codex/ios-demo-mode-279` @ `8430d9ef12`; no source changes. The untracked `dist/` output of the inventory run and an existing `autobyteus-web/dist-mobile/public` build were read only.

## Routing Classification Review

- Task size: `Large`. A new web subsystem (the demo node), a second phone build, a native start-screen port, the iOS shell bridge, the demo web view, share handling, the iPad layout and two real-app changes.
- Architectural risk: `High`. A new consumer of the node protocol, a new build artifact, an iOS web-content boundary, real-shell layout changes; and it is critical for App Review.
- Independent Architecture Review required: `Yes`. Design approval is delegated by the founder ("you decide"), not `Pending`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. SR-002 puts the demo's entry on the phone's own startup: plugin 00, then 20, 21 and 30.
- Round 3 (SR-003, persisted `displayName`), opened in the code:
  - The shipped writer is `8430d9ef12:AppShellCoordinator.swift:134` (`displayName: status.serverName`).
  - `ConnectionValidator.swift:30,34` supplies the placeholder. The node's status never sends `serverName`: the web `RemoteAccessStatus` is `phoneAccessEnabled`, `pairingAvailable`, `nodeId`. So every validator-saved shipped entry holds the placeholder.
  - The pairing link writes a real name (`PairingLinkParser.swift:50,110`).
  - The shipped fallback for "no name" was already the host (`8430d9ef12:SavedNodeEntry.swift:56`).
  - The existing migration owner is `DataMigrations/SavedNodeEntryKeysMigration.swift`, run at `AppShellCoordinator.swift:25-26`.
  - The current rule is `NodeConnectionFlow.hasKnownName` (`:128`), and `onPaired` is at `:112-121`.
  - The `Migration Required` decision is correct and evidence-backed.
- Round 4 (SR-004) resolves both statements below. SR-003's two statements that did not match the code (AR-004, now resolved):
  - "a computer whose real name was exactly 'AutoByteus Desktop' shows its host until its page's paired name renames it at the next open (`onPaired`)" (Persisted Data), and Case 24's "the page's paired name then names the entry". The page sends `paired` only right after a pairing exchange: its single caller is `MobilePairingBootstrap.vue:134` inside `pair()`. An already-paired computer opened later never sends it, so a migrated entry is never renamed.
  - "One rule, `SavedNodeEntry.knownName`, … used by both `NodeConnectionFlow.hasKnownName` and `WebShellViewController`'s `hello`". The native labels read `displayName` directly: `NodeRowView.swift:38,57,92`, `RemoveNodeSheet.swift:24,51`, and the connecting screen through `showConnecting(nodeName: next.entry.displayName)` (`NodeConnectionFlow.swift:133`). So a migrated entry shows its host there. Android shows `shownName`, the known name or "AutoByteus node", "never an address" (`NodeRow.kt:48,61,74`, `RemoveNodeSheet.kt:27,39`, `MainActivity.kt:205`, `SavedNodeEntry.kt:29-32`).
- Approved intent: the real phone screens on an in-app sample world, opened by Try demo, the demo QR or `autobyteus://demo` (REQ-002/003). Every action responds, with no error or console error (REQ-005, REQ-012(2)). Everything is bundled and nothing goes over the network (REQ-011, REQ-012(1)). Leave demo forgets everything (REQ-006). The iOS start screen and share handling match Android (REQ-001/007). The iPad layout, DC-007 and DC-011 apply to real use too (REQ-008…010). Saved computers are preserved (REQ-013).
- Scope guardrail confirmed: no Android demo, no server change, nothing to Apple without the founder's word. Preserved: real `/mobile` behavior except DC-007/DC-011/iPad, and Android.
- Existing code the design relies on, opened:
  - `plugins/30.apollo.client.ts:51` (`fetch: globalThis.fetch`, captured when the plugin runs). This matters for ordering (AR-001).
  - The phone's `fetch` callers use absolute node URLs (`mobileNodeSessionStore.ts:139,165`, `authorizedTransport.ts:54`, `windowNodeContextStore.ts:150`).
  - Blob URLs are not fetched (`authorizedResourceUrl.ts:28-35`).
  - The iOS URL scheme `autobyteus` (`Info.plist:23-33`).
  - These match.
- Round 2: the Ownership rows now cite the startup chain correctly: `mobileCredentialStorage.save` (`utils/remoteAccess/mobileCredentialStorage.ts:37`) → plugin 21 → `bindSession` → `bindNodeContext`; the manifest fetches; the icon sources.
- Two passages were left from SR-001 and are superseded by the Ownership rows (implementation notes N-1, N-2):
  - the Interfaces snippet and its note ("refused … not `fetch`");
  - the DS-001 arrow chain ("demoBoot (binds the window…)").
- One mechanism detail to fix in implementation (N-3): Nuxt registers every top-level file in `plugins/` automatically. `nuxt.config.ts:119-121` lists only `fontawesome.ts`, and `:266` has an `ignore` list. So `plugins/00.demoBoot.client.ts` would be built into every build unless it is ignored, or placed outside `plugins/` and added to `plugins` only when `AUTOBYTEUS_DEMO_BUILD=1`. The design's build guard test ("`demo/` is absent from the node's `/mobile` build") fails loudly if it is not.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 start screen | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 demo | User | Pass | Pass | Pass (SR-002) | Confirmed | N-1…N-3 |
| BEH-003 demo code / link | User | Pass | Pass | Pass (once AR-001 is fixed) | Confirmed | — |
| BEH-004 share | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 iPad | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 DC-007 / BEH-007 DC-011 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-008 local icons | System | Pass | Pass | Pass (generated subset, API off, resolution test) | Confirmed | — |
| BEH-009 Android | User | Pass | Pass | Pass (unchanged) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose Clear? | Linked? | Complete? | Consistent? | Status Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` + VIS-001…037 | Pass | Pass | Pass | Pass | Pass (Approved; reference `78b51f73`) | — |
| `phone-network-inventory.json` | Pass | Pass | Pass | Pass | Pass | — (R-2 adopted: the bundle's compiled operations are a second oracle) |
| `verdict.md` (rounds 1–7) | Pass | Pass | Pass | Pass | Pass | Verified on the design reference, not this build; the durable sweep (Verification Plan) re-runs it on the build |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | Larger Requirement; triggers listed with responses | — |
| Root cause | Pass | New capability; `No Design Issue Found` | — |
| Refactor decision | Pass | Only the iOS first screen is replaced | — |
| Supported by sections | Pass | — | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming Clear? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Open the demo | Primary | Pass | Pass (Ownership row; the arrow chain is stale, N-2) | Pass | Pass | Pass: plugin 00 (transport → world → session saved) → 20 → 21 binds → 30 captures the demo `fetch` | Pass | Pass |
| DS-002 A demo request | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (page origin, `blob:`, `data:` pass through) |
| DS-003 Scripted turn | Bounded | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 Leave demo | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 Share | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 iPad | Bounded | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Phone session (`mobileNodeSessionStore`) | Pass | Pass | Pass | Pass | The demo session enters through the owner's storage and plugin 21 binds it as for any paired phone; one owner of "demo": the session's `entryId` |
| `demoTransport` (page network) | Pass | Pass | Pass | Pass | Refuses only non-demo network origins |
| `DemoNode` dispatch | Pass | Pass | Pass | Pass | Unknown operation → loud error |
| iOS `ShellBridgeHandler` | Pass | Pass | Pass | Pass | Main frame of the open origin; no credential |
| iOS `AppShellCoordinator` | Pass | Pass | Pass | Pass | Never stores the demo as a saved node |

## Dependency Direction / Forbidden Shortcut Verdict

Pass. Only `demoBoot` imports `demo/`, and only in the demo entry; product files never import `demo/` (an architecture test); `demo/` depends on generated types and contract packages only.

Principle 16: `Pass`. Plugin 00 runs before anything captures the globals. `demoTransport` replaces `globalThis.fetch` and `WebSocket`, a process-wide change at a real boundary. A missing transport fails loudly: requests to `demo.autobyteus.invalid` are blocked by the content rules and DNS. It hides no ownership cycle.

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `DemoNode.graphql` by `operationName`, typed by the generated types | Pass | Pass | Pass | Low | Pass |
| `DemoNode` REST and stream routes | Pass | Pass | Pass | Low | Pass |
| Bridge `leaveDemo` | Pass | Pass | N/A | Low | Pass |
| Demo identity: session `entryId === DEMO_ENTRY_ID` (`utils/remoteAccess/demoSession.ts`) | Pass | Pass | Pass | Low | Pass (R-3 adopted; no status field) |

Empty indirection check: `Pass`. `demoTransport` is a port at a real boundary (the page network). `DemoNode` translates the protocol into world reads. There is no forwarding-only wrapper.

## Existing Capability / Subsystem Reuse Verdict

Pass. Reused: the shipped phone code unchanged, the generated GraphQL types, the stream contract packages, Android's screens as the port source, the existing app-group key and `SavedNodeStore`. The design reference's store patching is correctly not adopted.

## Subsystem / Capability-Area Allocation Verdict

Pass. `autobyteus-web/demo/` is compiled only into the demo build. The phone shell gets the identity UI, the iPad layout, DC-007, DC-011 and icons. iOS gets `Start/`, `Connect/`, `Demo/` and `Shell/`, plus the coordinator.

## Reusable Owned Structures Verdict

Pass. One world owns the demo state, and answers are derived from it.

## Shared Structure / Data Model Tightness Verdict

Pass. Derived consumers: the demo consumes the schema and the contracts, and the type check and contract tests fail on drift (`Pass`). Vocabulary: "demo node", "sample world" (`Pass`; R-3 on the status field).

## File Responsibility Mapping Verdict

Pass. One concern per file. New: `utils/remoteAccess/demoSession.ts`, `plugins/01.localIcons.client.ts`, `scripts/build-icon-bundle.mjs` (placement of the demo plugin: N-3).

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

Pass. `ConnectionViewController.swift` and its notice card, the old share message, and the remote Iconify path (now disabled) are named.

## Legacy / Backward-Compatibility Verdict

Pass. No compatibility path; the demo ships with its app (rule 9).

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate? | Migration Safety | Verdict |
| --- | --- | --- | --- | --- | --- |
| iOS saved computers | Directly Usable | Pass | Pass | N/A | Pass |
| Share handoff key | Directly Usable (consumed once) | Pass | Pass | N/A | Pass |
| Demo state | Not persisted (non-persistent data store; fresh world; the demo session is saved fresh on each boot) | Pass | Pass | N/A | Pass |

## Change / Refactor Safety Verdict

Pass. R-002 is the first check of step 3 with a `Design Impact` escalation. The build-only run of the iOS workflow comes before merge (rule 12).

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Transport | Yes | Fail (stale snippet) | N/A | Pass, with N-1 | The Ownership row governs: page origin, `blob:`, `data:` pass through |
| Demo boot order | Yes | Pass | N/A | Pass | Ownership row: the order, the session and its token |

## Material Premise Validation

### P-001 — The demo opens on the phone's pairing screen, or binds to the page's own origin

- Requirement: REQ-002 (Try demo opens the run list at once), REQ-003, AC-002.
- Basis: User (Try demo, the demo code, `autobyteus://demo`).
- Path: the demo build starts the client plugins in order:
  - 20 `windowNodeBootstrap` binds the window from the node registry;
  - 21 `mobileRemoteAccessBootstrap` → `sessionStore.initializeFromStorage()` (`mobileSessionBootstrap.ts:5-13`);
  - 30 Apollo captures `globalThis.fetch` (`30.apollo.client.ts:51`).
- `MobileRemoteAccessShell` shows the pairing bootstrap unless `sessionStore.isPaired` (`MobileRemoteAccessShell.vue:4`). `isPaired` means a stored session exists (`mobileNodeSessionStore.ts:114`). Without one, `serverBaseUrl` is `window.location.origin` (`:25-29,115`), which would be `autobyteus-demo://app`.
- The design's `demoBoot` binds `windowNodeContextStore` and installs the transport "before the phone shell mounts". It names no session, and no position relative to plugins 20, 21 and 30.
- Reachability: `Reachable` (every demo open).
- Consequence: the pairing screen instead of the run list. Or, if the transport is installed after plugin 30, Apollo keeps the real `fetch` and every GraphQL call goes to the blocked network.
- Review consequence: AR-001, resolved in SR-002.

### P-002 — The demo transport refuses the page's own app-manifest fetch

- Requirement: REQ-005, REQ-012(2), QR-002.
- Basis: System (any navigation in the demo build).
- Path: `nuxt.config.ts:131-132` sets `experimental.appManifest: !isTest`, so it is on in builds. The built phone bundle fetches `_nuxt/builds/meta/<id>.json` and `_nuxt/builds/latest.json` from its own origin (`dist-mobile/public/_nuxt/builds/`, and `fetch(…"builds/meta/…")` in a built chunk). In the demo, that origin is `autobyteus-demo://app`. `demoTransport` refuses every origin except the demo node's (`Promise.reject(new TypeError('Offline'))`).
- Reachability: `Reachable`.
- Consequence: manifest fetch errors in the console, and route-rule resolution without its manifest.
- Review consequence: AR-002, resolved in SR-002.

### P-003 — The phone screens request icons from the Iconify API

- Requirement: REQ-011, REQ-012(1), AC-003.
- Basis: User (open a conversation with thinking, the Messages tab, or a team reference).
- Path: `ThinkSegment.vue:4,7` (`mdi:`) inside `AIMessage.vue`; `utils/teamCommunication/referenceFilePresentation.ts:16-…` (`vscode-icons:`), used by `MobileMessages.vue` and `MobileTeamReferenceViewer.vue`; `ArtifactItem.vue:8-22` (`svg-spinners:`, `vscode-icons:`). The design registers Heroicons only.
- Reachability: `Reachable`.
- Consequence: icon requests to `api.iconify.design`. In the demo they are blocked, so icons are missing; in the real app they still go to a third party.
- Review consequence: AR-003, resolved in SR-002.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond the findings. The R-002 premise is explicitly the first implementation check.

## Persisted-Data Transition Verdict — Round 3 (`displayName`)

| Stored Subject | Decision | Evidence | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| iOS saved computers' `displayName` | Migration Required (placeholder → host) | Pass: every writer and the value it writes is traced; the status never carries `serverName` | Pass: a stored second meaning (Principles 5, 15); no runtime recognition of the literal | Pass: owner in `DataMigrations/` after the key migration and before `SavedNodeStore`; write order backup → entries → marker (N-4, stated in SR-004); restore-and-rerun; old literal only there; deterministic and idempotent | Pass | After it, `shownName` shows "AutoByteus node" and `hello` sends `""` (AR-004 resolved) |

### P-004 — A computer the shipped app saved, opened after the update

- Requirement: REQ-013, REQ-001 ("the same as Android"), AC-001; the founder's own case (CRR-002 F-1).
- Basis: User. The founder updates the app; it opens his saved computer at launch (`AppShellCoordinator.start` → `flow.open(saved)`).
- Path after SR-003:
  - The migration sets `displayName` to the host, so `knownName` is nil and `hello.nodeName` is `""`.
  - The page shows `nodeNameOrDefault("", session.nodeName)` (`MobilePairedShell.vue:167-174`), its own pairing name ("Test Node 279" in API-04): correct.
  - No `paired` is sent (only `MobilePairingBootstrap.vue:134`, after an exchange), so `onPaired` never runs.
  - The native start screen's Your nodes row, the More and Remove sheet, and "Connecting to …" show `displayName`: the host, for example "192.168.2.158".
- Reachability: `Reachable` (every updated phone with a computer saved by the shipped app).
- Consequence:
  - The founder's computer is listed by its address, where Android shows "AutoByteus node" and never an address.
  - The design's accepted effect ("renamed at the next open") and Case 24 promise a rename that never comes, so API-04b's expectation is built on it.
- Review consequence: AR-004, resolved in SR-004. `knownName` and `shownName` follow Android's rule exactly (`SavedNodeEntry.kt:27-34`): the flow and `hello` use `knownName`, and every native label uses `shownName` (`NodeRowView.swift:38,57,92`, `RemoveNodeSheet.swift:24,51`, `NodeConnectionFlow.swift:134,143`). The design no longer promises a rename on open; API-04b's expectations are restated.

## Review Decision

`Pass`

## Findings

None open. AR-001…AR-003 were resolved in ARCH-REV-002, and AR-004 in ARCH-REV-004. N-4 is stated in the design. The rulings hold.

Implementation notes. The design text governs as described here, and no design revision is needed:
- N-1…N-3: as handed over in ARCH-REV-002: the Ownership rows govern the transport and the boot order, and the demo plugin is registered only in the demo build.
- N-5: in Persisted Data, the "Reader after this change" bullets (`hasKnownName` at `:128`; "renames such an entry with the page's paired name … as Android does") and "the rewrite and the marker happen in one `UserDefaults` write pass" are from SR-003. The SR-004 "Names, one rule as on Android" section and the stated write order (backup → entries → marker) govern. `hasKnownName` is removed, `onPaired` names an entry only after a pairing exchange, and the three writes happen in that order.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (`/implementation_engineer`).

## Residual Risks

- R-002 (widened by R-1) is unverified until step 3's first check.
- R-003: Apple's prior approval for demo modes goes with the resubmission, on the founder's word.
- R-004: app size; measure at step 1 (the icon subset keeps `vscode-icons` small).
- The sweep evidence (`verdict.md`) is on the design reference; the build is verified by the durable sweep and the Solution Designer's own sweep before anything goes to Apple (REQ-012, REQ-014).

## Latest Authoritative Result

- Review Decision: `Pass` (round 4, SR-004)
- Material-Premise Gate: `Pass` (P-001…P-004 Reachable; each is handled by the design)
- Notes:
  - The SR-003 `displayName` migration and the SR-004 known-name and shown-name rule are ready for implementation, together with the ARCH-REV-002 rulings.
  - Verification: the migration's unit tests (rewrite, keep, idempotent, restore after interruption); the `shownName` unit test and the no-`.displayName` check; API-04a/b with the restated expectations; a new pairing and a typed address.
  - Nothing goes to Apple, TestFlight or App Store Connect without the founder's explicit word.
