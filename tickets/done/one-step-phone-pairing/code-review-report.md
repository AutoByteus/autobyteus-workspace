# Code Review Report — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 3, re-review after the Local Fix for CR-001). Round 1 was the full `Implementation Review` and round 2 the `API/E2E Failure-Origin Review`. Their sections below still stand, except where a later round updates them.
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md) (`Approved`, SR-013; REQ-001…023, AC-001…016, DEC-001…024)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md) (cited E-IDs only, through the design spec)
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md) (SR-014, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-step-phone-pairing/ui-ux-spec.md` (TR-001…018); [follow-ups.md](follow-ups.md) (FU-001…003)
- Relevant Solution Revision IDs: `SR-014`
- Design Review Report Reviewed As Context: [design-review-report.md](design-review-report.md) (ARCH-REV-003 `Pass`)
- Architecture Review Revision Record Reviewed As Context: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Relevant Architecture Review Revision IDs: `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: [implementation-handoff.md](implementation-handoff.md)
- Implementation Revision Record Reviewed As Context: [implementation-revision-record.md](implementation-revision-record.md)
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: `3`
- Review Scope: `Targeted Delta Review` (round 3). Round 2 was failure-origin; round 1 was `Full Review`.
- Review Scope Evidence (round >1): `git diff --stat 55fdae0a34..a892a3d89a` outside `tickets/` shows four changed files:
  - `ConnectedPhones.vue` (+6/−3): the CR-001 fix;
  - `ConnectedPhones.spec.ts` (new);
  - `mobile-shell-probe.mjs` and `TESTING.md`: API/E2E's changes, which belong to the later test-code review, not this one.
  - The fix stays within CR-001's file and behavior. It touches no spine, shared interface or data shape.
- Trigger: Implementation Engineer IR-002 (fix `c113dae1a7`, head `a892a3d89a`) for CR-001
- Prior Review Round Reviewed: round 2 (CRR-002 `Fail`, CR-001)
- Latest Authoritative Round: `3`
- Relevant Implementation Revision IDs (round 3): `IR-002`; evidence [evidence/IMP-11-phones-list-dates-locale.txt](evidence/IMP-11-phones-list-dates-locale.txt)
- Coverage Investigation Reviewed: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- Execution Coverage Report Reviewed: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)
- API/E2E Revision Record Reviewed: [api-e2e-revision-record.md](api-e2e-revision-record.md)
- Relevant API/E2E Revision IDs: `API-REV-001`
- Delivery Revision Record: N/A
- Failing Scenario IDs: API-17 (REQ-014, AC-012 surface, SCN-008)
- Exact Failing Commands / Execution Mode: `pnpm --silent isolated-app start --build` (packaged worktree build), driven over CDP to Nodes › Phone Setup › Connected phones / History. The host locale is de_DE; the app's UI language is English.
- Failure Evidence Paths: [evidence/API-17-phones-list-locale.txt](evidence/API-17-phones-list-locale.txt), [evidence/API-15-pre-change-phone-upgrade.txt](evidence/API-15-pre-change-phone-upgrade.txt)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review` (round 1); `API/E2E Failure-Origin Review` (round 2)
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. Server, desktop web, `/mobile` and Android all change; new owner routes, a persisted file, a native-to-page bridge and per-OS detection. None of the design's escalation triggers fired (handoff evidence IMP-05, IMP-09, IMP-10; manifest test for no new permission).

## Review Scope

- Changed implementation and behavior reviewed: BEH-001…007 across all four areas. Every source file in `git diff 677f61de0b..55fdae0a34` outside `tickets/`; changed tests read for intent and coverage, not size.
- Files / areas reviewed:
  - Server `remote-access`: `node-network-service`, `network-interface-classifier`, `default-route`, `computer-name`, `ip-address-ranges`, `pairing-url-policy`, `remote-access-pairing-service`, `paired-device-service`, stores `allowed-local-network-store` and `paired-device-store`, `domain/models`, close codes, `api/rest/remote-access.ts`, the route policy; `address-candidate-service.ts` removed.
  - Desktop web: `phoneAccessStore`, `phoneConnectionWays`, `tailscaleServeCommand`, `phoneAccessRemoteNode`, `types/remoteAccess`, `components/settings/phone/*`, `NodeManager`, the en/zh-CN settings catalogs; the old cards, utils and specs removed.
  - `/mobile`: `shellBridge.ts`, `MobilePairingBootstrap`, `MobilePairedShell`, `MobileRemoteAccessShell`, `MobileConnectionSheet`, `mobileNodeSessionStore`.
  - Android: `NodeConnectionFlow`, `NodeReachability`, `ShellBridge`, `AutoByteusWebView`, `MainActivity`, `ConnectionInputResolver`, `QrScanCoordinator`, `ConnectionValidator`, `ConnectionDiagnosticMapper`, `SavedNodeStore`, `ui/{ShellUi,start,connect,sheets}`, build file; `ConnectionScreen.kt` and `AndroidAppShellViewModel.kt` removed.
  - Docs: `remote_access.md`, `GLOSSARY.md`.
- Explicit exclusions: no rendered, emulator, Docker or Linux runs repeated (the handoff's IMP-01…IMP-10 cover the code as reviewed; no code changed after them except `55fdae0a34`, whose spec ran under IMP-06). iOS is out of scope (FU-001).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. One QR per way with a checked address (REQ-001…003, 009, 022, DEC-019); Wi-Fi/LAN asked once per network (REQ-004, DEC-020); Docker and remote nodes (REQ-006/007); the app connects on scan, paste or share (REQ-010, DEC-023); names come from the QR (REQ-011, DEC-016); scan-first list and Switch node (REQ-012/013); node sheet changes (REQ-019); phones list (REQ-014); compatibility (REQ-017).
- Design-spec behavior map verified against the implementation: Yes. I traced DS-001…DS-008 in code, plus the way-composition table for every node kind and the Android entry-form table for every form.
- Design review report and round confirmed: ARCH-REV-003 `Pass`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None blocking. The handoff's small copy choices for states the spec does not draw are noted under Residual Risks.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | `PhonesPanel.onMounted → phoneAccessStore.load` (settings, status `nodeId`, devices) `→ readNetworkFacts` (`GET /network` → `NodeNetworkService.getNodeNetwork`: interfaces → classify → reverse lookup (1 s resolver) → default route → allowed store) `→ composeConnectionWays(kind:'embedded') → checkAddresses` (all candidates in parallel, 2 s, `nodeId` match) `→ readinessFromChecks → recommendedWay → selectedWay`. Then `showCode`: `ensurePhoneAccessOn → writeLocalNetworkAllowed(true)` (only for an un-allowed `local_network`) `→ POST /pairing-sessions {connectionWay, trustedPrivateHttpAcknowledged: httpAcknowledgedFor(...)}` → `PhoneCodeBlock` timer → `markCodeExpired`. A tab change, Close, New code, leaving the page or switching Wi-Fi off goes through `discardCode → DELETE /pairing-sessions/:sessionId`. Turning phone access off clears every code in `onSettingsChanged`. |
| BEH-002 | Confirmed | `recognizeNodeKind` returns `local_container` when the node reports `runsInContainer` and the desktop reaches it at a loopback address. The store then reads the embedded node's `/network` (`requestEmbeddedNode`) and composes the host's facts with the Docker node's port and Serve port. Checks compare with the Docker node's `nodeId`. The allowed answer is written to the embedded node (`keeper:'embedded'`). `blockedReason` gives `docker_unpublished` when candidates exist and none reaches the node. |
| BEH-003 | Confirmed | `kind:'remote'` uses the remote node's own facts plus `wayOfDesktopAddress(targetBaseUrl)` for the address the desktop uses, as the design table classifies it. A remote node in a container yields only the desktop-address way. The allowed answer is kept by the target. `useTypedAddress` checks the typed address by `nodeId` and shows `not_this_node` (DEC-022) on a mismatch; a typed address is acknowledged (DEC-021). |
| BEH-004 | Confirmed | Scan, Paste and Share all go through `NodeConnectionFlow.connect → resolver.resolvePairingLink` (acknowledged) `→ run` (Connecting) `→ ConnectionValidator → openPage(pairing=true)`. Then `MobilePairingBootstrap.onMounted → getShellBridge().hello → pairWithQrText(deviceName) → bridge.paired → flow.onPaired`, which saves the entry under the QR's name. In a browser, one tap calls `pair`. The server maps failure codes to the design's reasons (`pairingFailureFor`). |
| BEH-005 | Confirmed | The QR name comes from `phoneAccessStore.nodeName` (`computerName` for the embedded node, else the registry name). The page session keeps `nodeName`, and `MobilePairedShell` shows it, or the host for an old session. The sheet's Switch node (bridge only) posts `showNodeList`, which opens `MainActivity.showSwitchListOrStart` (SwitchList when the open page is saved). A pick calls `flow.open`. `NodeReachability` checks every row in parallel and cancels when the list closes. The peer list is removed; refresh icon or Retry; "Unpair from <node>". |
| BEH-006 | Confirmed | `ConnectedPhones` shows the way (`connectionWay` from `createDevice` via the session), last seen, Revoke, a quiet Revoke all with confirmation, and History (n). The routes are unchanged. |
| BEH-007 | Confirmed | Payload `{version, serverBaseUrl, pairingCode, expiresAt, serverName}` is unchanged (`RemoteAccessPairingService.createPairingSession`). `paired-device-store.normalizeRecord` reads a missing way as `null`. The page session `nodeName` is optional. `SavedNodeStore` keeps its shape. Status `serverName` is removed as a clean cut (the design's rejection log; DESIGN.md rule 9). |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Expected Outcome | Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001/002 | BEH-001 | User | User at the desktop | QR for the desktop's node (Tailscale / Wi-Fi) | Nodes › Phone Setup | Normal | BEH-001 row | QR for the chosen way, Wi-Fi asked once per network | requirements; IMP-09 | Supported Normal | Use |
| SCN-003 | BEH-002 | User | User | QR for a local Docker node | Docker node window | Normal | BEH-002 row | Host address + port, checked against the Docker node | requirements; store spec | Supported Normal | Use |
| SCN-004 | BEH-003 | User | User | QR for a remote node | Remote node window | Normal | BEH-003 row | Checked ways or typed company address | requirements; composer/store specs | Supported Normal | Use |
| SCN-005 | BEH-004 | User | User on the phone | Scan/paste/share → connected; browser one tap | App Scan / Paste / Share; camera | Normal | BEH-004 row | Run list, no question | requirements; IMP-10 | Supported Normal | Use |
| SCN-006/007 | BEH-005 | User | User | Several nodes by name; switch from the page | App list; node sheet | Normal | BEH-005 row | Named list; Switch node | requirements; IMP-10 | Supported Normal | Use |
| SCN-008 | BEH-006 | User | User | Manage phones | Phone Setup | Normal | BEH-006 row | Tidy list, History | AC-012 spec | Supported Normal | Use |
| SCN-009 | BEH-007 | Contract | Installed apps / saved data | Keep working | App update | Normal | BEH-007 row | No re-pair | REQ-017 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C01 | `showCode` in flight while the user clicks another tab could show a code from the old way under the new tab | SCN-001 | Click a tab within the POST round trip (local, ms) | Needs artificial timing | `phoneAccessStore.showCode/selectWay` | Reject | — | Two supported actions do not make a supported race. No machinery is needed. |
| CR-C02 | Advanced Serve command gated on `kind !== 'remote' && readiness.tailscale.ready`, not "Tailscale detected" | REQ-008, AC-006 | Tailscale running, tailnet address not reaching the node | Would need a firewall blocking the tailnet; the embedded node listens on every interface (Tailscale ready on the real host, IMP-09) | `PhoneWayTab`, store `offersTailscaleServeCommand`; REQ-008 traces UC-001/002 only | Reject | — | No supported scenario shown; hiding the command for remote nodes matches REQ-008's traceability and the design's port rule ("this desktop's nodes"). |
| CR-C03 | A pairing link pasted or shared with a public `http://` host is acknowledged and opened with the bridge for that origin | DEC-023, Android entry-form table | User shares a crafted link into the app | The design approves "acknowledged: Yes" for Paste and Share. A real code is made only by the node's URL policy, which refuses public HTTP. | `ConnectionInputResolver.resolvePairingLink`; design table | Reject | — | The approved design decided this. The bridge carries no credential and acts only on the open origin's main frame. |
| CR-C04 | Cancel on Connecting while a pairing page loads leaves `pendingPairing` set; a later typed-address page that pairs in-page could save it | SCN-005 | Cancel, then type an address, then pair inside that page by paste | Contrived chain of contradictory actions | `NodeConnectionFlow.cancel/opened`, `MainActivity.cancelConnecting` | Reject | — | No coherent goal. Saved-entry opens and every page exit already clear it. |
| CR-C05 | The browser path posts the exchange to the payload's base URL, not explicitly the page's origin (handoff assumption) | DS-005 | Pasting node B's link into node A's browser page | In every supported flow the page is opened at the payload's base URL (QR `mobileUrl`, app `webViewUrl`). The behavior was there before this change. | `mobileNodeSessionStore.pairWithPayload`; `buildMobileUrlFromServerBaseUrl` | Reject | — | Unsupported cross-node paste; unchanged code. |
| CR-C06 | `en`/`zh-CN` `settings.ts` grow 457 → 499 non-empty lines (502 physical) | `>500` source rule | — | Under the limit by the effective-line measure; message catalog payload in the design's named file | line counts below | Reject | — | Passes the hard limit. Optional later: a per-area `phoneAccess` catalog file, like `memorySyncSettings.ts` and `remoteCollaborationSettings.ts`, if the catalog grows further. |
| CR-C07 | `mobile-shell-probe.mjs` MSP-09 still asserts the removed peer list and status `serverName` | REQ-019, design status change | Running the probe | The probe fails until it is updated. It is a durable browser probe, which API/E2E owns. | `tests/e2e/mobile-shell-probe.mjs:166,167,1427`; handoff Known Risks | Reject (as implementation finding) | — | Handed to API/E2E. The implementation already fixed the probes' request bodies; updating the case is coverage work. |
| CR-C09 (round 2) | `ConnectedPhones.vue` formats "Last seen" (`Intl.RelativeTimeFormat(undefined, …)`, line 91) and "Revoked" (`toLocaleDateString(undefined, …)`, line 108) with the OS locale and puts the result inside the app's translated sentence | SCN-008, REQ-014; UI/UX spec texts "Last seen 2 minutes ago", "Revoked Oct 28" (normative) | The user opens Phone Setup on a Mac whose OS language differs from the app's UI language (the user's own Mac is de_DE with the app in English) | `ConnectedPhones.activeDetail/revokedDetail → t('…lastSeen' / '…revokedOn', { when/date })`; the line renders "Last seen jetzt" and "Revoked 7. Nov." | API-17 evidence (renderer `navigator.language` "de"); code lines 91 and 108; sibling convention `NodeConnectionDetails.vue:146` and `UpdateChecksCard.vue:109` format with `resolvedLocale` from `useLocalization()` | Promote | This ticket | CR-001: a bounded implementation defect. Format with `resolvedLocale` and add a spec with a non-English default locale. |
| CR-C08 | Server `exchangePairingCode` now looks up before pruning, so `EXPIRED` is answered once; consumed sessions are kept until expiry | REQ-016, AC-013, design pairing-service row | Phone uses an expired or used code | Matches the design's error table (EXPIRED, CONSUMED, INVALID). `consumedAt` is set before the `await`, so a parallel second exchange still gets `CONSUMED`. | `remote-access-pairing-service.ts`; unit tests "EXPIRED once", "CONSUMED until expiry" | Reject (no defect) | — | Correct per design. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Facts owner on the node, way policy on the desktop, connect sequence in `NodeConnectionFlow`; the old candidates path, cards and `ConnectionScreen` are removed | — |
| Matches approved behavior-defining supplements | Pass (round 3: CR-001 resolved; round 2 Fail) | Phones-list dates now use the app's `resolvedLocale` (IMP-11). TR-001…018 traced: pre-selection, tab discard, timer/expiry, Wi-Fi question → allowed row, Check again note, typed address, header switch, revoke/revoke all, scanner/connecting/can't reach, Switch node, refresh/Retry, browser one tap. Rendered checks IMP-09/IMP-10 | — |
| Data-flow spine clarity | Pass | DS-001…008 each have one driving owner in code (`phoneAccessStore`, `RemoteAccessPairingService`, `NodeConnectionFlow`, `MainActivity` for DS-006, `NodeNetworkService` for DS-008) | — |
| Ownership boundary preservation | Pass | Components call only the store. The composer is pure and imports types only. Routes call services only. `NodeConnectionFlow` owns parse/check/save. `ShellBridge` → activity callbacks only. | — |
| Off-spine concern clarity | Pass | Classifier, default route, computer name, ranges and allowed store serve `NodeNetworkService`. `tailscaleServeCommand` is text only. `shellBridge.ts` is the only page code that touches `window.AutoByteusShell`. | — |
| Existing capability reuse | Pass | Reuses `runs-in-container`, `fetchRemoteAccessStatusFromBaseUrl` (timeout added), `store-utils` JSON helpers, `onSettingsChanged`, the QR service and journeyapps | — |
| Reusable owned structures | Pass | `ip-address-ranges.ts` is shared by the URL policy and the classifier. `toDeviceSummary` is reused in the exchange result (it replaces a hand copy). Web IPv4 helpers are a separate package (FU-003 covers server-addressing). | — |
| Shared-structure tightness | Pass | `NodeNetwork` has no ports or URLs. Session, device and page session each gain one field. `RemoteAccessStatus.serverName` is removed on every side. | — |
| Repeated coordination ownership | Pass | One check policy (`checkAddresses`), one discard path (`discardCode`), one HTTP-acknowledgement rule (`httpAcknowledgedFor`) | — |
| Empty indirection | Pass | No pass-through layers. `NodeEntries`/`NodeStatusCheck` are test seams with production implementations. | — |
| Separation of concerns / file responsibility | Pass | Panel split into four view files; Android screens split by purpose; `ShellBridgeMessages` holds JVM-checkable rules | — |
| Ownership-driven dependency | Pass | `remote-access` imports `server-addressing/runs-in-container` only (allowed); nothing imports back | — |
| Authoritative Boundary Rule | Pass | No caller uses both an owner and one of its internals. Routes never touch the allowed store or the sessions map. The embedded-node requests go through the node's own REST owner. | — |
| File placement | Pass | Matches the design's target mapping | — |
| Flat-vs-over-split layout | Pass | `components/settings/phone/`, `utils/phoneAccess/`, Android `ui/start|connect|sheets` | — |
| Interface boundary clarity | Pass | `/network`, `/network/local-networks/:networkId` (pattern-checked, 400), `DELETE /pairing-sessions/:sessionId` (opaque `pss_`, 204), required `connectionWay` (400 `WAY_INVALID`); bridge with four message types | — |
| Naming and one vocabulary | Pass | "way" / `connectionWay`, `NodeNetwork`, `networkId`, "Shell bridge" used the same everywhere and added to `GLOSSARY.md`. "candidate" survives only for per-way check URLs inside the composer, not as a Phone Access concept. | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | One feature commit plus two small follow-ups | — |
| Dead code removed in touched files | Pass | `getSessionForTests`, `pairWithManualUrl`, `lastStatus`, `AndroidAppShellViewModel`, CaptureActivity launcher, candidate types; grep shows no remaining references | — |
| Test scenarios clear and requirement-aligned | Pass | Server: way required, opaque ID, CONSUMED until expiry, EXPIRED once, discard by ID, discard on disable, legacy rows. Web: per-kind composer, store lifecycle, AC-012 history. Android: flow, resolver, bridge rules, reachability, manifest. | — |
| Test fixtures/helpers reusable and coherent | Pass | — | — |
| No stale/duplicate/compat-only tests in changed scope | Pass | Old card and util specs removed; MSP-09 handed to API/E2E (CR-C07) | — |
| API/E2E readiness | Pass | Handoff lists AC-004/005/013/014, bridge abuse, Linux host and QR-004 timing; probe request bodies already send `connectionWay` | — |

## Source File Size And Structure Audit

| Source File | Non-Empty Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/phoneAccessStore.ts` | 271 | 353 | Pass | Rewrite (529 changed lines), the design's planned Replace | Pass | Pass | Pass | — |
| `autobyteus-android/.../MainActivity.kt` | 232 | 309 | Pass | Rewrite (400), planned: connect logic moved to the flow | Pass (screen switching only) | Pass | Pass | — |
| `autobyteus-web/components/mobile/MobilePairingBootstrap.vue` | 121 | 144 | Pass | 222, the planned spec page | Pass | Pass | Pass | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | 457 | 499 | Pass (CR-C06) | 168 | Catalog | Design-named | Pass | — |
| `autobyteus-web/components/settings/phone/PhoneWayTab.vue` | new | 204 | Pass | new | Pass | Pass | Pass | — |
| `autobyteus-web/utils/phoneAccess/phoneConnectionWays.ts` | new | 168 | Pass | new | Pass | Pass | Pass | — |
| `autobyteus-android/.../ui/ShellUi.kt` | new | 160 | Pass | new | Pass | Pass | Pass | — |
| Other changed source files | — | ≤ 213 | Pass | < 220 | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Status `serverName` and the candidates route removed as a clean cut |
| No legacy old-behavior retention | Pass | Cards, guide commands, URL pre-policy, `ConnectionScreen`, CaptureActivity launcher removed |
| Dead code removed in touched files | Pass | See checks |
| Approved persisted-data decision followed | Pass | New file read with defaults; device way read as `null` when absent; page `nodeName` optional; no migration |
| No version-specific dual reads/writes | Pass | `normalizeRecord` is a tolerant generic reader, not a version branch |
| Transition mechanics match design | Pass | `Not Affected` / `Directly Usable — No Migration` |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (done in this change)
- Why: new routes, network facts, ways, discard rules, vocabulary.
- Files: `autobyteus-server-ts/docs/features/remote_access.md`, `GLOSSARY.md` (updated). Delivery confirms in its docs sync.

## Additional Material Premise Validation

None new or reclassified. ARCH-REV-003's decisions stand: AR-001 bridge origin and main frame; AR-004 default route first; AR-005 opaque session ID; AR-007 Serve port by `createdAt`. Each is confirmed in code: `ShellBridgeMessages.read`, `classifyInterfaces`, `generateSessionId`, `tailscaleServeHttpsPortFor`.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Each DS has one driving owner; the call order matches the spec | None material | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Facts on the node, policy on the desktop, connect sequence in one Android owner; no boundary bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Subject-owned routes with explicit identity shapes; bridge limited to four messages | `PUT /network/local-networks/:networkId` echoes the input rather than the stored state (harmless) | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Planned splits; pure rules apart from I/O | Settings catalogs sit at 499 lines (CR-C06) | A per-area catalog if it grows |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | Tight additive fields; shared ranges file | Web keeps its own IPv4 helpers (separate package) | — |
| 6 | Naming Quality and Local Readability | 9.3 | One vocabulary, glossary updated, comments explain why | The composer's internal "candidates" word sits close to the removed concept | — |
| 7 | API/E2E Readiness | 9.3 | Clear unrun list and scenarios; probes' bodies fixed | MSP-09 stale (CR-C07), left for API/E2E | Update MSP-09 in API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 (round 3; 8.8 in round 2) | Every node kind and entry form traced; API/E2E confirmed Docker, remote, Linux and `file://`; CR-001 fixed with the project's locale pattern | Camera decode and Serve ports can only be checked by the user | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean cuts; no fallbacks | — | — |
| 10 | Cleanup Completeness | 9.5 | Removals per plan with grep evidence | — | — |

## Findings

### CR-001 — Phones list formats dates with the OS locale inside the app's sentences (round 2, Local Fix, implementation)

- Candidate: CR-C09 (promoted). Requirement: REQ-014 (AC-012 surface), UI/UX spec texts "Last seen 2 minutes ago" and "Revoked Oct 28" (normative per the requirements doc).
- Where:
  - `autobyteus-web/components/settings/phone/ConnectedPhones.vue:91`: `new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })`;
  - `autobyteus-web/components/settings/phone/ConnectedPhones.vue:108`: `toLocaleDateString(undefined, { month: 'short', day: 'numeric' })`.
  - Both values are put into `t('…phones.lastSeen', { when })` and `t('…phones.revokedOn', { date })`.
- Observed (API-17): on the user's de_DE Mac with the app in English, the rows read "Last seen jetzt" and "Revoked 7. Nov.". The same happens under zh-CN on any OS with another language.
- Required action:
  - Format both values with the app's locale: `resolvedLocale` from `useLocalization()`, which the file already calls for `t`. This is the pattern in the same Nodes area (`components/settings/nodes/NodeConnectionDetails.vue:146`, `components/settings/UpdateChecksCard.vue:109`).
  - Add a component spec that sets a non-English default locale (or stubs `Intl`/`navigator.language`) and asserts the English and zh-CN texts.
- Review gap: yes, reasonably detectable in round 1. The file already uses `useLocalization()`, and sibling Nodes components format with `resolvedLocale`. Round 1 marked the "Implementation matches approved behavior-defining supplements" check `Pass` without checking where the inserted values get their locale. That check is `Fail` for this file until CR-001 is fixed.
- Classification: `Local Fix` → implementation. After the fix: source review, then API/E2E again (API-17, with the phones-list specs).
- **Status (round 3): Resolved.** Fix `c113dae1a7`:
  - `const { t, resolvedLocale } = useLocalization()`, and `locale = () => String(resolvedLocale.value || 'en')`, the same shape as `UpdateChecksCard.vue:109`.
  - `locale()` is used for both `Intl.RelativeTimeFormat` and `toLocaleDateString`. The formatters run during render, so they follow a language change.
  - The new `ConnectedPhones.spec.ts` stubs a German OS default for both APIs. It asserts the English ("Connects through Tailscale · Last seen 2 minutes ago", "Revoked Oct 28 · Connected through Wi-Fi") and zh-CN ("最近使用 2分钟前", "10月28日 已撤销") rows. IMP-11 shows it fails against the pre-fix file ("Last seen vor 2 Minuten") and passes with the fix (phone specs 9/9).
  - Typecheck is at baseline, and `audit:localization-literals` passes.

## Follow-ups

- Follow-ups this review added:
  - FU-006 (round 2): the same OS-locale formatting inside translated sentences in other areas this ticket does not touch.

## Classification

N/A (round 3 Pass). Round 2 was `Local Fix` (implementation-owned) for CR-001, now resolved.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (implementation review pass; rerun API-17). An informational notice goes to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Not yet run (for API/E2E, per the handoff):
  - real Docker node (AC-004);
  - two machines (AC-005);
  - packaged Electron `file://` status checks (U-003);
  - real Linux host detection (U-001/U-004/U-005);
  - Tailscale Serve `--https` ports (U-006);
  - real camera decode;
  - QR-004 timing with an unreachable candidate;
  - bridge abuse from a sandboxed preview frame.
- `mobile-shell-probe.mjs` MSP-09 must be updated for REQ-019 (no peers) and the QR name (CR-C07).
- Copy for states the spec does not draw (handoff "Important Assumptions": unreadable-scan title, unreadable typed address, WebView update screen, `/mobile` paste-field error, "Last seen"/"Not used yet"). These are plain-words texts in the spec's tone and change no approved behavior. The Solution Designer may confirm them at delivery.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, Targeted Delta Review). CR-001 resolved.
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10 average; every category ≥ 9.3 (row 8 back to 9.3)
- Failure Origin (round 2, kept for history): implementation defect, with a review gap recorded in CR-001
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes:
  - Classification Large / High preserved.
  - Every other API/E2E case passed; this round does not reopen them.
  - The fix is limited to `ConnectedPhones.vue` and its spec.
  - Next: API/E2E reruns API-17. After a passing API/E2E round, the proportional test-code review covers the API/E2E durable changes (`mobile-shell-probe.mjs`, `TESTING.md`) in `api-e2e-test-review-report.md`.
