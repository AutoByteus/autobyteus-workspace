# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | `SR-002`; `ARCH-REV-*` N/A; `CRR-*` N/A; `API-REV-*` N/A; `DR-*` N/A | Implemented; local checks pass; ready for direct API/E2E |
| IR-002 | Solution Designer, `solution-handoff.md` "SR-003 Revision" (from CRR-001 F-001 / API-REV-001), round 2 | CRR-001 F-001 | `Design Impact` | `SR-003`; `CRR-001`; `API-REV-001` | Not implemented: DS-006's premise check failed on WebView 124 (HTTP error comes before `onPageStarted`); returned to Solution Designer. Code unchanged at `ba3ba5b23e` |

## Revision Entries

### IR-001 — Show a node's name, never its address, on the phone

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/solution-handoff.md`, round 1 (direct implementation route: Medium / Low).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation commit `ba3ba5b23e` on `codex/phone-node-name-privacy`; checks IMP-01…IMP-08 in `implementation-handoff.md`.
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A` (not selected)
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation of the design spec.
- Approved behavior or requirement IDs affected: BEH-001…BEH-008; REQ-001…REQ-008; AC-001…AC-008 at the unit level (AC-009 and AC-010 on the emulator remain with API/E2E).
- Implementation delta:
  - Web: new `utils/remoteAccess/nodeName.ts` (`UNNAMED_NODE_NAME`, `nodeNameOrDefault`); `ShellHello.nodeName`; `MobilePairedShell` names the node `nodeNameOrDefault(appNodeName, session.nodeName)` from one `hello` on mount; the connection sheet's address line and `serverBaseUrl` prop are gone; `MobilePairingBootstrap` uses the rule and reports `session.nodeName ?? ''`; both `hostOf` helpers removed.
  - Android: `SavedNodeEntry.knownName` / `shownName` / `UNNAMED_NODE_NAME`; every UI reader moved to `shownName`; `NodeConnectionFlow` tracks `openEntry`, names an unnamed open entry on `paired`, passes `""` for an unusable typed address; the bridge's `hello` reply carries `nodeName = entry.knownName.orEmpty()`; `ConnectionDiagnosticMapper` gains `pageLoadFailed(nodeName)`, `linkBlocked()`, `noAppForLink()`, `noFilePicker()`, loses `webViewLoadFailed`, `unsafeNavigationBlocked` and the URL/detail parameters; `AutoByteusWebView.onExternalUrl(url)` became `onOpenedOutside()`; the toast reads "Opening outside AutoByteus".
  - Tests: reproduction test flipped (IMP-01), new and changed web and Android unit tests, the probe's MSP-09 asserts no address in the sheet.
- Changed files or areas: see `implementation-handoff.md` Key Files Or Areas.
- Local validation and result: IMP-01…IMP-08, all Pass (see the handoff's Checks Run).
- Next recipient or routing: direct API/E2E (handoff rule for Small/Medium + Low).
- Remaining limitations or risks: see the handoff's Known Risks (emulator not run here; bridge entry not refreshed after an in-page rename; a page could pair with another node's link).

### IR-002 — SR-003 premise check fails for HTTP errors (Design Impact returned)

- Triggering role, report path, and round: Solution Designer, `solution-handoff.md` section "SR-003 Revision", round 2 (from code review `code-review-report.md` CRR-001 F-001, API/E2E API-REV-001 API-08/08b).
- Triggering finding IDs: CRR-001 F-001
- Classification: `Design Impact`
- Prior authoritative result: IR-001 (`ba3ba5b23e`)
- Current authoritative result: unchanged code (`ba3ba5b23e`); no SR-003 change implemented.
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this revision is recorded: the design (DS-006) required confirming the WebView callback order on the emulator first and returning a Design Impact if it differs. It differs.
- Approved behavior or requirement IDs affected: BEH-006; REQ-006; AC-007; DEC-009.
- Implementation delta: none kept. A temporary log in `AutoByteusWebView.Client` and a temporary instrumented test (`TmpLoadOrderProbeTest`) were used and removed (`grep ABX433TMP|TmpLoadOrder` finds nothing).
- Changed files or areas: `evidence/IMP-09-sr003-load-order-premise.log` only.
- Local validation and result: IMP-09 on an own read-only emulator (`codex_api35_arm64`, API 35, WebView 124.0.6367.219), 2 runs with the same order:
  - network failure (closed port): `onPageStarted → onReceivedError(main) → onPageFinished` (matches);
  - HTTP 502, first load and reload: `onReceivedHttpError(main) → onPageStarted → onPageFinished` (differs: "onPageStarted clears the mark" would erase the HTTP failure, and `onPageLoaded()` would show the 502 page);
  - success: `onPageStarted → onPageFinished`; a sub-resource HTTP error (favicon, `main=false`) comes after `onPageFinished`.
- Next recipient or routing: Solution Designer (Design Impact).
- Remaining limitations or risks: the emulator and the test servers were stopped; the other agent's emulator (`emulator-5554`) was not touched.
