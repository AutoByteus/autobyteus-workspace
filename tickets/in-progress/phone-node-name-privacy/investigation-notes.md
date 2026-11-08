# Investigation Notes

## Investigation Meta

- Package identifier: `phone-node-name-privacy` (Project Task `autobyteus-433`)
- Request / ticket: autobyteus-433, "Phone privacy: show the node's name, not its network address (machine name and tailnet name), in the connected page header and wherever a screenshot could leak it"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy`, branch `codex/phone-node-name-privacy`
- Resolved base remote / branch / revision: `origin/personal` (the remote's default branch, `refs/remotes/origin/HEAD`), `eebbc2b8eed0e83cd3627298d8a7abec19c7d02f`, fetched 2026-11-08
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from a freshly fetched `origin/personal`; ticket folder `tickets/in-progress/phone-node-name-privacy/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md` (2026-11-08). Design gate: see `design-spec.md`.
- Investigation status: Complete for requirements and design

## Initial Request And Clarifications

- Original request (Task description, condensed from the user's words, 2026-11-08): on the phone's first page the nodes show by name ("AutoByteus Desktop", "docker-8001"), but inside the desktop node the header shows the Tailscale-style address (machine name plus tailnet name) instead of the name. "Sometimes I take a screenshot and share it publicly ... I feel it is actually exposing my privacy."
- Clarifications received (Task comment, the user's decision, 2026-11-08): "there's no need to show the detailed address ... users don't understand that address as well". So no "Details" action that shows the address in the normal phone UI; the node's name and the connection state only. Plain-language troubleshooting messages replace messages that print the address. If the team finds a real need for the address in a support case, it asks the user first.
- User-supplied facts and constraints: no change to pairing, credentials, or the Host and Origin rules (autobyteus-403, 416); no new Android permission; tests on the emulator and an isolated node; test names only in tests and screenshots; release only on the user's word.
- Initial ambiguity: which surfaces print the address (the PM listed leads: the connection sheet, errors, "Other ways to connect", the desktop Phone Setup page and QR text, the Nodes page, shared logs); where the header's name comes from.
- Privacy note: the two context screenshots show the user's real machine and tailnet names. These notes and every ticket document use placeholders (`<machine>.<tailnet>.ts.net`) instead.

## Product And Domain Understanding

- Product area: the Android app (`autobyteus-android`, a native node list and connect screens around a WebView) and the node-served phone page `/mobile` (`autobyteus-web/components/mobile/`) that the WebView shows once a node is open.
- Affected actors or systems: the phone user; the Android app; the `/mobile` page served by each node; the bridge between them (`window.AutoByteusShell`).
- Existing user or operational purpose: the user pairs a phone with a node by scanning the desktop's QR, then works with the node's runs from the phone.
- Relevant terminology: *node* (an AutoByteus server the phone connects to); *entry* (the app's saved record of a node: `SavedNodeEntry`); *session* (the page's paired record in WebView `localStorage`: `MobileNodeSession`); *QR name* (`serverName` in the pairing payload).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-08 | User | Task autobyteus-433 and its two context screenshots (`.../context/ctx_211d9a5ccc33__30.jpg`, `ctx_fdcbd4748a1a__31.jpg`) | The report | First page shows names; the connected page's header shows `<machine>.<tailnet>.t…`, "Connected", a drop-down arrow | — |
| 2026-11-08 | Code | `autobyteus-web/components/mobile/MobilePairedShell.vue:129-130, 162-164` | Where the header's name comes from | `nodeName = session?.nodeName \|\| hostOf(serverBaseUrl)`: no session name means the address's host | Root cause |
| 2026-11-08 | Code | `autobyteus-web/types/remoteAccess.ts:57-68` | Session shape | "`nodeName` is the node's name from the QR (absent for sessions paired before it was kept: the page shows the host)" | — |
| 2026-11-08 | Code | `git show d92d94472f~1:autobyteus-web/types/remoteAccess.ts` | Was `nodeName` kept before autobyteus-395? | The pre-395 `MobileNodeSession` had no `nodeName` | — |
| 2026-11-08 | Code | `git show d92d94472f~1:autobyteus-android/.../ConnectionValidator.kt:57`; `git show d92d94472f~1:autobyteus-server-ts/src/api/rest/remote-access.ts:39` | Where the app's "AutoByteus Desktop" came from | Before 395 the public status answer carried `serverName: "AutoByteus Desktop"` and the app named its entries from it | Explains the user's first page |
| 2026-11-08 | Code | `autobyteus-web/components/mobile/runList/MobileRunList.vue:5-31` | The header and the offline banner | Header shows `nodeName` and the connection label; banner "Can't reach {nodeName}." | — |
| 2026-11-08 | Code | `autobyteus-web/components/mobile/connection/MobileConnectionSheet.vue:7-8` | The connection sheet (the drop-down) | Prints the full `serverBaseUrl` (`data-testid="mobile-connection-url"`) under the name, always | Leak 2 |
| 2026-11-08 | Code | `autobyteus-web/components/mobile/MobilePairingBootstrap.vue:111-114, 147-149` | Pairing page name | Falls back to the payload address's host when the QR has no name | Leak 3 (rare: the server always sets a name, `remote-access-pairing-service.ts:98`) |
| 2026-11-08 | Code | `autobyteus-web/utils/remoteAccess/mobileConnectionDiagnostics.ts` | Web diagnostics text | No address in any title, message or action | No change needed for the address |
| 2026-11-08 | Code | `autobyteus-web/utils/remoteAccess/shellBridge.ts`; `autobyteus-android/.../web/ShellBridge.kt` | What the page can ask the app | `hello` answers `{type:"shell", nodeCount, deviceName}`; no node name; bridge only for the open node's origin, main frame | Name source for the page |
| 2026-11-08 | Code | `autobyteus-android/.../connection/SavedNodeEntry.kt:35` | App entry naming | `displayName = name ?: normalized.host`: an entry with no name stores its host as its name | Leak 4 |
| 2026-11-08 | Code | `autobyteus-android/.../shell/ConnectionInputResolver.kt`, `NodeConnectionFlow.kt:56-64, 86-94` | Typed address | A typed address is saved when it answers, named by its host; `onPaired` renames only a pending QR entry, never a saved typed one; a typed address that cannot be used shows "Can't reach <typed text>" | Leak 4, 5 |
| 2026-11-08 | Code | `autobyteus-android/.../MainActivity.kt` (`showConnecting`, `showCantReach`, `openPage`'s "Connected to", `openRemoveSheet`), `ui/start/NodeRow.kt`, `ui/sheets/RemoveNodeSheet.kt` | Where the entry's name shows | Node list rows, Switch node, Connecting, Connected, Can't reach, the ⋮ sheet title and its confirmation, accessibility labels | All follow the entry's `displayName` |
| 2026-11-08 | Code | `autobyteus-android/.../web/AutoByteusWebView.kt:70, 96, 111, 131, 141`; `MainActivity.kt:208` | In-page overlays and toasts | Same-origin path outside the allow-list → overlay "Navigation blocked … : <url>"; download or external link → toast "Opening outside AutoByteus: <url>"; no app for it → "No installed app can open <url>"; main-frame load error → overlay with WebView's error description | Leak 6: a download from the node is a node URL |
| 2026-11-08 | Code | `autobyteus-android/.../connection/ConnectionDiagnosticMapper.kt:78-95` | Exception text | `fromException` puts the exception's message in the diagnostic ("Details: Unable to resolve host \"<host>\"…" for `UnknownHostException`) | Today only the kind reaches the screen (`cantReachReasonFor`); the text is a latent leak; the old app showed it (the PM's "Unable to resolve host …") |
| 2026-11-08 | Code | `grep Log\. autobyteus-android/app/src/main` | Shared logs | The app logs only file-picker counts; never an address | No change |
| 2026-11-08 | Code | `autobyteus-web/stores/phoneAccessStore.ts:102-104, 247` | The desktop's QR name | The desktop's own node is named by its computer name (`readComputerName`: macOS ComputerName); any other node by its Nodes-page name | A new pairing names the desktop by its computer name (approved in 395) |
| 2026-11-08 | Code | `autobyteus-server-ts/src/api/rest/remote-access.ts:25-38` | Public status | Answers `phoneAccessEnabled`, `pairingAvailable`, `nodeId`; no name since autobyteus-290 | The app cannot learn a typed node's name before pairing |
| 2026-11-08 | Code | `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts:80-85` | Existing test of the behavior | "a session paired before the name was kept shows the address's host" asserts the leak | The fix replaces this test |
| 2026-11-08 | Code | `grep` of `autobyteus-ios` for displayed base URL or host | iOS shell | No view interpolates an address | Out of scope (Android is the reported app) |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open a saved node in the Android app | App opens the entry's `/mobile`; the page reads its stored session; the header shows `session.nodeName`, else the address's host | A session paired before 395 (or any without a name) shows `<machine>.<tailnet>.ts.net` | `MobilePairedShell.vue:130`; the user's screenshot | High (Read; the existing test asserts it) |
| BEH-002 | User | Tap the header | The connection sheet shows the name, then the full base URL, then the state | The address is always on screen in the sheet | `MobileConnectionSheet.vue:8` | High (Read) |
| BEH-003 | User | App first page / Switch node | Rows show each entry's `displayName` | Name from the QR (or pre-395 status name); a typed address's entry shows its host | `NodeRow.kt`, `SavedNodeEntry.kt:35` | High (Read) |
| BEH-004 | User | Connect to a node | "Connecting to <displayName>", "Connected to <displayName>", "Can't reach <displayName>" (typed failure: the typed text) | Same naming as BEH-003 | `MainActivity.kt`, `NodeConnectionFlow.kt` | High (Read) |
| BEH-005 | User | A typed-address node's page pairs (paste a link on the page) | The page tells the app `paired(name)`; the app ignores it for an already-saved entry | The entry keeps its host as its name | `NodeConnectionFlow.onPaired` | High (Read) |
| BEH-006 | User / System | A download or external link from the page; a blocked same-origin navigation; a page load failure | Toast "Opening outside AutoByteus: <url>"; overlay "Navigation blocked: <url>"; overlay with the WebView's error text | A node URL (with the address) can appear on screen | `AutoByteusWebView.kt`, `MainActivity.kt:208` | High (Read) |
| BEH-007 | System | Status check fails with an exception | The diagnostic message carries the exception text (host included for `UnknownHostException`) | Not shown on screen today; only the reason kind is used | `ConnectionDiagnosticMapper.fromException` | High (Read) |
| BEH-008 | User | Pairing page with a QR that has no name | Name falls back to the address's host | Rare: current desktops always send a name | `MobilePairingBootstrap.vue:113` | High (Read) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `MobilePairedShell.vue` | Owns the page's `nodeName` for the header, banner, sheet | One place decides the page's name | Name precedence: app name → session name → plain fallback |
| `MobileConnectionSheet.vue` | Already calls `bridge.hello()` on mount for the node count | The bridge is already in use from the page | Share one hello result instead of a second call |
| `shellBridge.ts` / `ShellBridge.kt` | `hello` reply has `nodeCount`, `deviceName` | Adding the open entry's name is additive | Old app ↔ new page and new app ↔ old page must both work |
| `SavedNodeEntry.displayName` | Stored name, or the host when no name | Existing saved entries may hold a host as their name | Display-time rule, no data migration |
| `NodeConnectionFlow.onPaired` | Renames only the pending QR entry | Typed entries never get a name | Extend to the saved open entry that has no name |
| `ConnectionDiagnosticMapper` | All Android diagnostic texts | Texts that print a URL or exception detail | Remove the URL/detail parameters |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records: app `SharedPreferences` `saved_nodes` (`entries` JSON array, field `displayName`); page `localStorage` session (`nodeName` optional).
- Readers/writers: `SavedNodeStore`; `mobileCredentialStorage`.
- Evidence paths: `SavedNodeStore.kt:65-80`; `mobileCredentialStorage.ts`.

### Structural Surfaces

- The bridge's `hello` reply (page ↔ app message contract, both ends in this repository, shipped separately: the APK and the node-served `/mobile` bundle).
- No server API, route, Host/Origin rule, pairing or credential surface is involved.

### Potential Structural Impacts To Investigate

- API or external-contract change: the bridge `hello` reply gains an optional field (additive).
- Persistence schema or invariant change: none (no stored field changes; the "a name equal to the host is no name" rule is applied on read for display).
- Security or privacy boundary change: the page learns the app's name for the node it already is; the bridge's origin/main-frame rule is unchanged.
- Concurrency or lifecycle change: the page's name may change once the `hello` answer arrives (≤ 1.5 s).
- Deployment: the APK and the node's `/mobile` bundle are artifacts of one release (`DESIGN.md` rule 9); no mixed-version design.
- Confirmed absent: server, pairing, credential, Host/Origin changes.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| The user's phone (screenshot 31) | Open a node paired before 395 | Header shows the address's host | Reproduced (by the user, on a real phone) | BEH-001 | Task context file `ctx_fdcbd4748a1a__31.jpg` (private; not copied into the repository) |
| Existing unit test `MobileRemoteAccessShell.spec.ts` "a session paired before the name was kept shows the address's host" | Session without `nodeName` | Asserts the header text equals the host | Read (the test is part of the delivered 395 suite) | The implementation flips this test first | `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts:80-85` |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: the existing test above (change its expectation to the new rule and see it fail), command `cd autobyteus-web && pnpm exec vitest run components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| The user (Task, 2026-11-08) | Screenshots shared publicly must not show his machine or tailnet name | Direct report with screenshots | Name only, everywhere on the phone by default | — |
| The user (Task comment, 2026-11-08) | No address even on purpose in the normal phone UI; plain-language troubleshooting | Direct decision | No "Details" action | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| androidx.webkit web messages | `WebViewCompat.addWebMessageListener` | The bridge reply is a string message; the page parses JSON | `ShellBridge.kt` | None |
| Android `Toast` | Platform | A toast shows over any screen for ~2–3.5 s | `MainActivity.kt:208` | None |

## Persisted Data And State Facts

- Affected stored subject: none written differently by this change, except a typed-address entry that gets its QR name when its page pairs (an existing write path: `saveEntry`).
- Location and representative shape: `saved_nodes` → `entries` = `[{id, displayName, baseUrl, mobileUrl, scheme, host, port, httpAcknowledged, createdAt…, updatedAt…}]`.
- Current readers and writers: `SavedNodeStore`.
- Required semantics to preserve: entry IDs (origins), the selected entry, the page's credentials.
- Acceptable loss: none.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated` (the Task says the Product Team "may be needed for the text"; the user then gave the wording direction himself in the Task comment).
- The few new texts reuse the existing wording and the user's own example; no Product Design handoff.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RISK-001 | Risk | The APK and the node's `/mobile` bundle are separate artifacts of one release | Until both are updated the user may still see the old header | Not designed for (`DESIGN.md` rule 9: one release, no mixed-version design); the delivery note tells the user both the app and the node must be updated | Accepted |
| RISK-002 | Risk | Two unnamed nodes both show the plain label | The user cannot tell them apart in the list | Only typed addresses that never paired are unnamed; pairing names them (REQ-005) | Accepted (DEC-004) |
| UNK-001 | Unknown | Whether the WebView's error description can contain the host | It is shown on the load-failure overlay | Replaced by plain words with the node name (REQ-006), so it no longer matters | Resolved by design |

## Architecture Investigation Findings

- The page's name is decided once in `MobilePairedShell.vue` and passed as a prop to `MobileRunList` (header, banner, aria label) and `MobileConnectionSheet` (title, "Unpair from …"). The post-pair "Connected to …" uses the same computed name.
- `MobileConnectionSheet` calls `getShellBridge().hello()` on every mount. `MobilePairingBootstrap` calls it on mount in the app. A second consumer (the shell's name) makes a shared, once-per-page `hello` the natural owner: `utils/remoteAccess/shellBridge.ts` is the boundary module; a small composable in `composables/mobile/` can own the reactive, cached answer.
- `ShellBridge.Actions` in the app is implemented by `MainActivity.bridgeActions`; the bridge is constructed per open entry (`ShellBridge(entry, bridgeActions)`), so the reply can read the open entry's name without new plumbing. Its doc says "carries no credential and no entry data"; a name the page already shows is not a credential, but the sentence must be updated.
- Every Android surface that shows a node's name reads `SavedNodeEntry.displayName` directly (`NodeRow`, `RemoveNodeSheet`, `SheetFrame` title via `RemoveNodeSheet`, `MainActivity.showConnecting/openPage`, `NodeConnectionFlow.run`). One derived property on the entry (the shown name) changes them all at one owner.
- `NodeConnectionFlow.onPaired` already holds the rule "the QR had no name when `displayName == host`"; the shown-name rule is the same fact and should be one function.
- `ConnectionDiagnosticMapper` builds every diagnostic; the URL-bearing ones (`unsafeNavigationBlocked(url)`, `webViewLoadFailed(description)`, `httpNeedsAcknowledgement(url)`, `fromException` detail) are called from `AutoByteusWebView`, `WebFileChooserCoordinator`, `ConnectionInputResolver`, `ConnectionValidator`.
- The external-URL toast is built in `MainActivity.openPage` (`onExternalUrl`).
- Project rules read: `DESIGN.md` (see design spec).

## Requirement Implications

- The header leak is a fallback, not a missing name in the app: the app knows a good name ("AutoByteus Desktop"), the page does not. The page must take the app's name (same as the first page) and never fall back to the address.
- The sheet's address line is unconditional and must go (the user's decision rules out keeping it behind a Details action).
- Typed-address entries and a few overlays/toasts are smaller, real leaks on the same screens; they are in scope because the done-when names the first page, the node switcher and connection errors.
- The desktop's Phone Setup and Nodes pages show addresses on the owner's own computer where he chooses the way to connect; the QR must carry the address for pairing, which the Task forbids changing. They stay out of scope.

## Notes For Architecture Design

- Approved scenarios: SCN-001…SCN-006 in `requirements-doc.md`.
- Constraints: no change to pairing, credentials, Host/Origin rules, the bridge's origin and main-frame rule, entry IDs; no new permission; no mixed-version design (`DESIGN.md` rule 9).
- Open technical questions answered in `design-spec.md`: where the shared `hello` lives; the entry's shown-name owner; the diagnostic signatures.
