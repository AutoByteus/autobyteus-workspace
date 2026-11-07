# Requirements Document — small-follow-ups-batch-426

## Document Status

- Status: `Approved` (round 1: REQ-001…REQ-003, REQ-005…REQ-008, REQ-010…REQ-014, REQ-016, REQ-017, REQ-018, REQ-019; item 4 dropped by DEC-001, item 15 by DEC-011). Round 2 (REQ-009): `Draft` (DEC-002)
- Current solution revision ID: `SR-006`
- Package identifier: `small-follow-ups-batch-426`
- Request / ticket: Project Task `autobyteus-426`, project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), at the user's word of 2026-11-07
- Requirements owner: Solution Designer
- Date: 2026-11-07
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user in its conversation, 2026-11-07 (SR-001); REQ-016's text approved by the user through the Product Team (SR-003)
- Exact approved requirements baseline / solution revision: this document at SR-006, round-1 rows
- Behavior-defining supplements and their approved versions: Product spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` at design commit `0341b3af`, user-approved 2026-11-07 (REQ-016)

## Problem And Desired Outcome

- Problem: eighteen small, non-urgent problems left by autobyteus-277, 407, 415, 403 and 395 on the phone (web shell and Android app), the node server, tests, docs and wording (Task autobyteus-426).
- Affected actors or systems: phone user (web shell `/mobile` and Android app), desktop user (Phone Setup, Runs view, Settings), node server, the team's probes and E2E tests, future designers (design cases).
- Desired outcome: each item fixed or dropped with evidence; tests; finalized on `personal` in two rounds.
- Observable definition of success: the acceptance criteria below pass; the dropped item carries its evidence.

### Rounds

| Round | Items | Why |
| --- | --- | --- |
| 1 | 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 19; 4 and 15 dropped | Local fixes in existing owners; item 16's Product text arrived before round 1 left design (SR-003) |
| 2 | 9 | Adds a new server read that also serves the desktop and phone polls |

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current (evidence) | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | An unpaired or just-unpaired phone page keeps retrying `ws://localhost:8000/ws/agent-package-definitions` | The phone opens the feed only while paired, to the paired node with its credential | A paired phone keeps receiving definition changes; the desktop and browser windows unchanged | E-01 |
| BEH-002 | User | SCN-002, SCN-003 | Revoked phone: stays "Connected" with "Couldn’t load your runs."; Phone Access off: the same | Revoked: the session is rejected like a 401 and the phone shows pairing. Off: the phone stays paired, shows that Phone Access is off on the node, and works again after Retry/Check once it is on | 401 and auth-code rule unchanged; network failures still "Can’t reach" | E-02 |
| BEH-003 | User | SCN-004 | After Android kills the app in the background, it reopens the node's start page (run list) | It reopens the page that was open (same node, same `/mobile` URL) | Cold start still opens the last used node; shared pairing links still win; rotation unchanged | E-03 |
| BEH-004 | User | — | (Dropped) The reported path no longer exists since 395 | — | — | E-04, DEC-001 |
| BEH-005 | User | SCN-005 | In Control mode, phone ↔ node desktop copy/paste does nothing in the Android app | Paste sends text the user gives to the node desktop's clipboard; Copy puts the node desktop's last copied text on the phone | View only unchanged; no clipboard access without a user action; desktop browser tile unchanged | E-05 |
| BEH-006 | Operational | SCN-006 | A 4429 refusal writes no node log line | One metadata-only line per refusal | No device ID, credential or address in the line; the refusal itself unchanged | E-06 |
| BEH-007 | User | SCN-007 | HTML previews without a workspace file show "Navigation blocked" in the Android app | They load inside the page, sandboxed | Other origins open in the system browser; other non-http(s) navigations blocked; blob main-frame navigations blocked; the preview gets no `AutoByteusShell` | E-07 |
| BEH-008 | User / Contract | SCN-008 | A typed workspace path that is not an existing absolute directory is registered; a run there fails at its first message | A newly entered path that is not an existing absolute directory is refused with a clear error under the field | Already registered paths (including ones whose folder is now missing) keep loading and restoring as today; stored registry unchanged | E-08 |
| BEH-009 | User | SCN-009 | Delegated rows of a run that is not open keep their first-read state | (Round 2) | | E-09 |
| BEH-010 | Operational | — | Probe B04 fails on the base | B04 asserts the members line by the seeding rule and passes | The seeding rule unchanged | E-10 |
| BEH-011 | Operational | — | NVP-05 aborts after its backend restart | Probes that restart their backend wait for the dev server and pass | Dev server config unchanged unless proven needed | E-11 |
| BEH-012 | Doc | — | Two docs name a removed component | They name `CollaborationMessageReferenceViewer` and describe it correctly | | E-12 |
| BEH-013 | Doc | — | Two 277 design lessons unrecorded | Recorded in `docs/design-cases.md` | Existing cases' numbering | E-13 |
| BEH-014 | Operational | — | Four server E2E tests fail on the base | They pass against the current product; AR-14's label prints the last row | Product behavior unchanged (unless R-01 shows a product bug) | E-14 |
| BEH-015 | User | SCN-010 | Raw request error on an older node | Dropped (DEC-011) | | E-15 |
| BEH-016 | User | SCN-011 | "this computer" in a remote node's window | The node named, per the Product spec | Embedded and Docker nodes' text; layout and flow | E-16 |
| BEH-019 | User | SCN-014 | On a read-only conversation (desktop and phone), a tap on a file link that cannot be opened shows nothing: the status line sits inside the composer's `v-if="!readOnly"` block | The same status line shows on read-only conversations too | Opening works as today; the composer stays hidden on read-only conversations; the status text and its place unchanged | E-19 |
| BEH-017 | User | SCN-012 | Some dates, times and numbers use the OS locale, also inside translated sentences | All shown dates, times and numbers in the web app use the app's UI locale | Values themselves (time zone handling, precision) unchanged | E-17 |
| BEH-018 | User | SCN-013 | Public and link-local addresses are listed as "Private/LAN address" in Memory Sync / Remote Collaboration | Public addresses are listed as public; link-local addresses are not listed; one shared IPv4 range owner | LAN, Tailscale-range, configured, current-node and Docker-host candidates unchanged | E-18 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Phone user | Use the phone without confusing states | Right screen after revoke/off/process death; previews; clipboard | No new Android permission; existing paired phones and saved nodes keep working |
| Desktop user | Correct workspace and address lists | Clear refusal of bad paths; honest address labels | No change to stored data |
| Node operator | See refused viewers | A log line | Metadata only |
| Team | Green probes and E2E; current docs and design cases | Tests follow the code | DESIGN.md rule 11 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Phone page keeps its package-definitions feed on the paired node only | SCN-001 |
| UC-002 | Phone reacts to a revoked device and to Phone Access off | SCN-002, SCN-003 |
| UC-003 | Android app reopens the open page after process death | SCN-004 |
| UC-005 | Phone copy/paste with the node desktop in Control mode | SCN-005 |
| UC-006 | Node logs a refused viewer | SCN-006 |
| UC-007 | HTML preview inside a node page in the Android app | SCN-007 |
| UC-008 | Entering a workspace path on phone or desktop | SCN-008 |
| UC-010 | Team probes and server E2E tests pass on the current product (items 10, 11, 14) | — |
| UC-012 | Docs and design cases current (items 12, 13) | — |
| UC-017 | Dates, times and numbers shown in the app's language | SCN-012 |
| UC-018 | Node address lists for Memory Sync and Remote Collaboration | SCN-013 |
| UC-016 | Phone Setup in a remote node's window, worded for that node | SCN-011 |
| UC-019 | Opening a file link in a read-only conversation (desktop and phone) | SCN-014 |
| UC-009 | Round 2 (item 9) | SCN-009 |

### Out Of Scope

- iOS app; switching nodes from the web shell (391/395 follow-ups).
- DNS rebinding, loopback-origin allowance and other security rows of 403/417 (their own Tasks); the HTML preview's own isolation (417, done) and autobyteus-416.
- Clipboard sync without a user action; clipboard in View only; clipboard for the desktop app's VNC tile.
- Changing the run-settings seeding rule (item 10 follows it, DEC-006).
- Cleaning up existing registered workspaces whose folder is missing (DEC-004).
- Number/date formatting in the Electron main process, server logs or exported files.

### Non-Goals

- No new Android permission; no stored-data change; no new GraphQL type in round 1 beyond one new candidate kind value (DEC-008).

### Preserved Behavior Boundary

BEH-001…BEH-018 "Preserved" column. Cross-cutting: phones paired before this change and saved nodes keep working with no re-pairing (REQ-002 rejects only a revoked credential).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Behaviors | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | On `/mobile` (and the mobile build) the agent package definitions feed is open only while the phone has a paired session, to the paired node with the phone credential; it closes when the session ends (unpair, rejection). Desktop and browser windows keep it as today. | BEH-001 | Normal | Item 1 lead, second option scoped to "not paired" | N/A | Task item 1; E-01; DEC-003 |
| REQ-002 | A read refused with `REMOTE_ACCESS_DEVICE_REVOKED` (HTTP 403) rejects the phone's session exactly as the 401 rule does, at the same points (the phone's check on opening, Retry and Check; the quiet history poll and live streams keep today's behavior), and the pairing screen shows. A read refused with `PHONE_ACCESS_DISABLED` keeps the session; the run list's bar is not "Connected" and its banner says "`<node>` is reachable, but Phone access is off." with Check; when Phone Access is on again, Check/Retry loads the runs with no re-pairing. | BEH-002 | Normal | Revoked credentials never work again; a disabled node keeps its devices (E-02) | N/A | Task item 2; DEC-005 |
| REQ-003 | When the Android system ends the app's process in the background and the user returns, the app reopens the node and `/mobile` page that were open. A saved page that the navigation policy would not allow for that node, or a node no longer saved, is not opened (the ordinary start applies). | BEH-003 | Normal | Item 3 lead | N/A (standard Activity saved state) | Task item 3; E-03 |
| REQ-005 | In Control mode with a connected node desktop, the phone view offers Paste and Copy. Paste: the user gives text (with the phone's own paste) and it is put on the node desktop's clipboard. Copy: the text last copied on the node desktop is put on the phone's clipboard by a tap; when the phone does not allow that, the text is shown selectable so the user can copy it with the system menu. Nothing is read from or written to the phone's clipboard without the user's tap. | BEH-005 | Normal | Item 5 lead | U-01: programmatic copy unmeasured; the selectable fallback always works | Task item 5; E-05; DEC-007 |
| REQ-006 | Each 4429 refusal writes one node log line with only: refusal reason, mode, viewer kind, open stream count and the limit that refused it. | BEH-006 | Low | Item 6 lead | N/A | Task item 6; E-06 |
| REQ-007 | Inside the Android app's WebView, a subframe navigation to a `blob:` URL whose origin is the open node's origin loads in place. Main-frame `blob:` navigations, `blob:` of other origins and all other non-http(s) schemes stay blocked; other origins still open in the system browser. The preview frame gets no `AutoByteusShell` object and stays sandboxed (no `allow-same-origin`). | BEH-007 | Normal | Item 7 lead | N/A | Task item 7; E-07 |
| REQ-008 | Registering a workspace path that is not yet registered requires an existing absolute directory; a relative path, a missing path or a file is refused with a clear message saying which (shown under the path field on phone and desktop). An already registered path is accepted as today, whether or not its folder still exists. | BEH-008 | Normal | Item 8 lead; existing bad paths: DEC-004 | N/A | Task item 8; E-08 |
| REQ-010 | Probe `fresh-run-auto-approval-probe.mjs` B04 asserts the members line by the seeding rule (seeded members count as customized) and passes. | BEH-010 | Low | Tests follow the code (DESIGN.md rule 11) | N/A | Task item 10; DEC-006 |
| REQ-011 | Probes that restart their backend under `nuxt dev` (`node-vocabulary-probe.mjs` NVP-05 and any other that restarts) wait until the dev server answers again before navigating, and pass. | BEH-011 | Low | E-11: the dev server recovers by itself; the proxy premise is wrong | Measured by the probe run | Task item 11; DEC-009 |
| REQ-012 | `autobyteus-web/docs/agent_artifacts.md` and `content_rendering.md` name `components/workspace/collaboration/CollaborationMessageReferenceViewer.vue` and describe what it does today. | BEH-012 | Low | | N/A | Task item 12 |
| REQ-013 | `docs/design-cases.md` records (a) in Case 5: a premise about another surface's behavior taken on trust (277 CRR-003 F-01); (b) a new case: a refresh designed without measuring its payload (277 ARCH-REV-003 AR-009, E-38); each with only the lesson a future design needs. | BEH-013 | Low | DESIGN.md owner: Solution Designer | N/A | Task item 13 |
| REQ-014 | The four server E2E tests pass against the current product: removal message, `lastActivityAt` field, the runtime kinds list (incl. `deepseek_harness`), AR-14; AR-14's failure label prints the last row read. AR-14 waits for the automatic re-check to finish before its next check. | BEH-014 | Low | Tests follow the code | R-01 | Task item 14; E-14 |
| REQ-019 | On a read-only conversation (desktop and phone), the "file cannot be opened" status shows exactly as it does on a writable one (same text, same place above where the composer would be); the composer stays hidden. | BEH-019 | Low | Item 19 (Task comment, 2026-11-07) | N/A | Task comment (427 FU-001); E-19 |
| REQ-017 | Every date, time and number the web app shows uses the app's UI locale (`useLocalization().resolvedLocale`), not the OS locale; a guard test fails when a new OS-locale formatting call is added. | BEH-017 | Normal | Item 17 lead, widened to numbers (DEC-010) | N/A | Task item 17; E-17 |
| REQ-018 | One owner holds the IPv4 range checks used by Phone Access and by the node address lists. In the Memory Sync and Remote Collaboration address lists, public addresses have their own kind and label ("Public address (`<interface>`)"), listed after private and Tailscale-range addresses; link-local addresses (169.254/16, fe80::/10) are not listed. | BEH-018 | Low | Item 18 lead | N/A | Task item 18; DEC-008 |
| REQ-009 | (Round 2) Live states of delegated rows under runs that are not open. | BEH-009 | — | | | Task item 9 |
| REQ-015 | Dropped (DEC-011): a node older than the desktop is outside DESIGN.md rule 9's supported case; the 395 release notes tell users to update their nodes. | BEH-015 | — | | | Task item 15; DEC-011 |
| REQ-016 | In the Phone Setup panel of a node of kind `remote`, every line that said "this computer" for the node names it instead ({{name}} = its name in the desktop's list) and "this computer" means only the desktop, exactly as the approved Product spec `phone-setup-remote-node-wording/ui-ux-spec.md` gives: status lines (ready/not ready) per way, the notes after Check again, the no-address message, the Wi-Fi-allowed note, and How it works. Kinds `embedded` and `local_container` keep today's text exactly. Text only: no layout, style, control or flow change. | BEH-016 | Low | Item 16; the user approved the Product text | N/A | Task item 16; Product spec (user "approved", 2026-11-07) |

## Acceptance Criteria

| AC ID | REQ | Scenario | Precondition / Trigger | Observable Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Phone page open, not paired, for 30 s; then pair; then unpair | No WebSocket attempt to `localhost:8000` or any address while unpaired; after pairing one feed socket to the paired node with `access_token`; after unpair it closes and is not retried | Desktop window still opens the feed | Browser probe (console/network) + spec |
| AC-002 | REQ-002 | SCN-002 | Paired phone; node revokes it; phone checks (open, Retry, Check) | Pairing screen shows; stored session removed; feed closed | 401 path unchanged | Probe on an isolated node + spec |
| AC-003 | REQ-002 | SCN-003 | Paired phone; Phone Access turned off; phone checks | Bar not "Connected"; banner "`<node>` is reachable, but Phone access is off." with Check; session kept; after turning it on, Check loads the runs | Network down still shows "Can’t reach `<node>`.", also when the previous check found Phone Access off (off → unreachable); off → reachable shows Connected | Probe + spec |
| AC-004 | REQ-003 | SCN-004 | Android app on a run's Files screen; app in background; `adb shell am kill org.autobyteus.mobile`; reopen from recents | The same node opens on the same Files screen URL | Saved URL not allowed or node removed → ordinary start | Emulator check + unit test of the restore decision |
| AC-005 | REQ-005 | SCN-005 | Android app, Control mode connected | Paste: text pasted in the Paste box appears on the node desktop when pasted there; Copy: text copied on the node desktop is on the phone clipboard after tapping Copy, or is shown selectable | No Paste/Copy in View only or when not connected; no clipboard read on open | Emulator check + component spec |
| AC-006 | REQ-006 | SCN-006 | A 5th stream node-wide, and a 3rd from one phone | One log line each with reason, mode, viewer kind, open count, limit; no device ID, credential, address | | Server spec of the route |
| AC-007 | REQ-007 | SCN-007 | Android app, a node page opens an HTML preview of non-workspace content | The preview shows inside the page; `window.AutoByteusShell` undefined inside it; frame sandbox has no `allow-same-origin` | Main-frame `blob:`, foreign-origin `blob:`, `file:`, `javascript:` stay blocked; another origin opens externally | Policy unit tests + emulator check |
| AC-008 | REQ-008 | SCN-008 | Phone "Open a folder by path", and the desktop New chat with a typed folder (browser or remote-node window): `/definitely/not/a/folder`, `/etc/hosts`, `relative/dir`, an existing absolute folder | The first three are refused, nothing registered; the phone shows the reason under its field; the desktop's launch error shows the reason instead of "The selected workspace could not be opened."; the folder registers | A registered path whose folder was deleted still loads in the workspace list and history restore. A historical run whose workspace was removed and whose folder is gone opens without a workspace instead of re-registering the missing folder (DEC-004) | Server E2E + web spec |
| AC-010 | REQ-010 | — | Run probe B04 | Passes | | Probe run |
| AC-011 | REQ-011 | — | Run node-vocabulary-probe | NVP-05 passes | | Probe run |
| AC-012 | REQ-012 | — | Read docs | No `TeamCommunicationReferenceViewer`; description matches the component | | Docs review |
| AC-013 | REQ-013 | — | Read `docs/design-cases.md` | Case 5 extended; new case for payload; short lessons | | Docs review |
| AC-014 | REQ-014 | — | Run the four tests | Pass; AR-14 label shows the last row on failure | | Server E2E run |
| AC-016 | REQ-016 | SCN-011 | Phone Setup in a remote node's window, each state of the spec (Tailscale/VPN/Wi-Fi ready and not ready, after Check again, no address, allowed note, How it works open); and an embedded and a Docker node's window | Remote: each string equals the spec's (VIS-001…009); embedded/Docker: unchanged; the VPN not-ready line wraps without clipping at the panel's narrow width | | Component spec per kind + rendered check (desktop width and narrow) |
| AC-019 | REQ-019 | SCN-014 | Read-only conversation (a finished run on desktop; the phone's read-only run screen); tap a file link that cannot be opened | The status line with the same text appears; no composer | On a writable conversation unchanged; an openable link opens as today | Component spec (readOnly true/false) + a phone probe step |
| AC-017 | REQ-017 | SCN-012 | App language English, OS/browser locale `de-DE` (and the reverse) | The named surfaces show dates/times/numbers in the app language's format; guard test passes and fails on a planted OS-locale call | | Spec with a non-English OS locale + guard |
| AC-018 | REQ-018 | SCN-013 | Node with private, Tailscale-range, public and link-local addresses (stubbed interfaces) | Lists show private as LAN, 100.64/10 as tailnet-like, public as public, no link-local; Phone Access classification unchanged | | Server unit tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Start | Steps | Outcome | Alternate | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Phone page | Keep definitions current | Page load / pairing / unpair | Unpaired or paired | Page opens; pairs; later unpairs | Feed only while paired | | Supported Normal | E-01 | REQ-001/AC-001 |
| SCN-002 | User | Desktop user revokes a phone | Lost phone cut off | Revoke in Phone Setup | Phone paired | Phone reads | Pairing screen | | Supported Normal (Phone Setup revoke) | E-02 | REQ-002/AC-002 |
| SCN-003 | User | Desktop user turns Phone Access off | Pause phones | Switch off | Phone paired | Phone reads; switch on; Check | Off notice, then runs | | Supported Normal | E-02 | REQ-002/AC-003 |
| SCN-004 | System | Android | Memory pressure | App in background | Page open | Process killed; user returns | Same page | Node removed meanwhile | Supported Normal | E-03 | REQ-003/AC-004 |
| SCN-005 | User | Phone user | Move text | Paste/Copy tap | Control connected | Paste/Copy | Text moved | Copy fallback | Supported Normal | E-05 | REQ-005/AC-005 |
| SCN-006 | Operational | Node operator | Diagnose refusals | 4429 | Streams at limit | Viewer refused | Log line | | Supported Normal | E-06 | REQ-006/AC-006 |
| SCN-007 | User | Phone user | Preview an HTML artifact | Open preview | Android app on a node | Preview | Shows sandboxed | | Supported Normal | E-07 | REQ-007/AC-007 |
| SCN-008 | User | Phone/desktop user | Open a folder by path | Type a path | | Submit | Refused or registered | Existing registration | Supported Normal | E-08 | REQ-008/AC-008 |
| SCN-012 | User | User with app language ≠ OS language | Read dates | Any view | | | App-language formats | | Supported Normal (app language setting) | E-17 | REQ-017/AC-017 |
| SCN-013 | User | Desktop user | Pick an address for Memory Sync / Remote Collaboration | Open settings | Node with several interfaces | | Honest labels | | Supported Normal | E-18 | REQ-018/AC-018 |
| SCN-011 | User | Desktop user | Connect a phone to a node on another computer | Nodes › Phone Setup in that node's window | Remote node | Open the panel; tabs; Check again | Lines name the node; "this computer" = the desktop | Embedded/Docker unchanged | Supported Normal (395 Phone Setup for every node) | E-16; Product spec | REQ-016/AC-016 |
| SCN-014 | User | Desktop or phone user | Open a file a message names | Tap a file link | Read-only conversation | Tap | File opens, or the status says why not | | Supported Normal (file links on every conversation since 427) | E-19 | REQ-019/AC-019 |
| SCN-009 | | | Round 2 | | | | | | | | |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (REQ-002, REQ-005, REQ-008 messages; REQ-016 Product text)
- Linked UI/UX supplement: REQ-016 — `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (Product-owned; request: `product-design-request.md`)
- Runnable UI reference / design repository: `/Users/normy/autobyteus_org/autobyteus-web-design`, default branch `personal` at `0341b3af` (states via localStorage `autobyteus.prototype.phonePairing` = `remote_unreachable|remote_lan|remote_tailscale|remote_vpn|remote_nothing`); runbook section "phone-setup-remote-node-wording"
- Product ticket record: `…/tickets/done/phone-setup-remote-node-wording/product-ticket.md` (closed, merged)
- Design repository revisions: base `34677c88`; `83b765f4` (reference), `2041ce2e` (spec, screenshots), `0341b3af` (integration)
- UI/UX user confirmation: the user's "approved", 2026-11-07, in the Product UI/UX Designer's conversation (DEC-A wording, DEC-B extension to How it works and the allowed note)
- Approved visual-reference baseline: `…/visual-references/VIS-001…VIS-009` (1059×738 @2×); the node name "Office Mac" is illustrative
- Product open points settled by the Solution Designer: (1) the remote node keeps its own Wi-Fi/LAN allowed answer (`utils/phoneAccess/phoneConnectionWays.ts:157`, `keeper: 'target'` for `remote`; Read) — "{{name}} remembers it" is true; (2) "Ready" keeps its meaning (the desktop reached the node's address); (3) key names and the zh-CN text are engineering's, translating the approved English; (4) narrow-width render check in AC-016
- Normative details for round 1: REQ-002 reuses the product's existing sentence and banner; REQ-005 puts one "Clipboard" bar button next to Keyboard in Control mode (the phone bar has no room for two more), in the view's existing bar-button style; it opens the phone's existing bottom sheet with two parts: Paste (a text box the user pastes into with the system menu, and "Send to desktop") and Copy (the node desktop's last copied text, read-only and selectable, with "Copy"; disabled with a hint until the desktop has copied something) (DEC-007); REQ-008 messages: "Enter a full path, starting with /." (relative; Windows: a drive path), "No folder at this path." (missing), "This path is a file, not a folder." (file) — in the existing field-error place, localized like the field's other texts.
- Product decisions that need the user: none.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Constraint | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003, REQ-005, REQ-007 | Security / Compatibility | No new Android permission (Task) | Android manifest | Manifest diff empty |
| QR-002 | REQ-006 | Privacy | Log line carries no device ID, credential or address | Server | Spec |
| QR-003 | REQ-002, REQ-008, REQ-018 | Compatibility | Existing paired phones, saved nodes, registered workspaces keep working; no stored-data change | All | Probes/specs |
| QR-004 | REQ-007 | Security | Preview isolation of 417 preserved | WebView | AC-007 |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (read-only checks; Android saved instance state is process-transient system state, not app data)
- Data that must be preserved: workspace registry, saved nodes, phone credentials, run history
- Acceptable loss: none
- Unknowns: none

## External Contracts And Dependencies

| Contract / Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Android `Activity` saved state | Bundle kept across process death | Android docs, A-03 | Small size only (a URL) |
| Android WebView `shouldOverrideUrlLoading` | Called for subframes with `isForMainFrame` | E-07, A-04 | — |
| noVNC 1.7.0 | `clipboardPasteFrom`, `clipboard` event | E-05 | U-01 |
| Vite 7 dev proxy | Has a default error handler | E-11 | — |

## Supplemental Artifacts

| Artifact | Purpose | REQ | Status | Approval |
| --- | --- | --- | --- | --- |
| `product-design-request.md` | Product text request (item 15 later dropped) | REQ-016 | Done | — |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` | Approved remote-node wording | REQ-016 / AC-016 | Approved (design `0341b3af`) | The user's "approved", 2026-11-07 |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Revoked credentials are never reactivated (a revoked device must pair again) | REQ-002 | Server: revocation is final; re-pairing makes a new device | Confirmed (Read: `remote-access-auth-service.ts`, revoked check before settings) |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Item 4 (QR cancel clears typed address)? | Scope | E-04: the path no longer exists since 395 | Drop with evidence; nothing to fix | Solution Designer | Decided |
| DEC-002 | Order and rounds | Efficiency, review size | Product text needed for 15/16; 9 needs a new server read | Round 1 now; round 2 = item 9. Item 16 joined round 1 when its approved Product text arrived before round 1 left design (SR-003); item 15 dropped (DEC-011) | Solution Designer | Decided |
| DEC-003 | Item 1: bind to the paired node or not open on `/mobile`? | Feature value | The feed already rebinds to the paired node after pairing (E-01) | Open only while paired: keeps live definition updates on the phone and removes the retries | Solution Designer | Decided |
| DEC-004 | Item 8: what happens to an existing bad path? | No stored-data change (Task) | Restore and activation use the same mutation (E-08) | Already registered paths are accepted unchanged and keep listing; a run there still fails as today at activation. Only new registrations are checked, on every path that registers (user entry, launch, restore). The one visible effect outside user entry: a historical run whose workspace was removed and whose folder is gone opens without a workspace (its files could not be shown anyway) instead of re-registering a missing folder | Solution Designer | Decided |
| DEC-005 | Item 2: texts | Product voice | Existing sentences (E-02) | Reuse "`<node>` is reachable, but Phone access is off."; revoked uses the ordinary pairing screen like 401 (no new text) | Solution Designer | Decided |
| DEC-006 | Item 10: update B04 or revisit the rule? | Product rule | `035b208d53` made seeded rows count deliberately | Follow the rule (tests follow the code); revisiting is a product change outside this Task | Solution Designer | Decided |
| DEC-007 | Item 5: how Paste and Copy work | UX, permission | No permission; `http://` origins lack `navigator.clipboard`; noVNC API | Web-only: Paste box (system paste into a field) → `clipboardPasteFrom`; Copy button enabled when the node desktop sent text; tries programmatic copy, else shows the text selectable. No bridge/permission | Solution Designer | Decided |
| DEC-008 | Item 18: public and link-local | Honest labels; compatibility | Remote Collaboration tries URLs in order | Public: new kind `public`, labelled, after private/tailnet; link-local: not listed (not routable between machines) | Solution Designer | Decided |
| DEC-009 | Item 11: proxy handler or probe wait? | Premise contradicted (E-11) | Vite already handles proxy errors | Probe-side wait for the dev server after a backend restart | Solution Designer | Decided |
| DEC-010 | Item 17: numbers too? | Mixed formats in sentences | Numbers inside translated sentences (E-17) | Include numbers; one guard covers all OS-locale calls | Solution Designer | Decided |
| DEC-011 | Item 15: keep or drop? | DESIGN.md rule 9 (the user's rule): a desktop and a node of different versions are not designed for — "no version checks …, no fallback for a client or server that does not know a new route"; reviewers do not raise it. Item 15 is exactly that case (Phone Setup on a node without `/rest/remote-access/network`). Rule 9's one exception is the frozen node-update contract C1 (`/rest/node-update`), which a Docker node answers in every version | (A) Drop item 15 per rule 9; the 395 release notes already tell users to update their nodes. (B) Keep it only through C1: when the window's node is a Docker node and C1 reports an update, Phone Setup shows the Product's "Update `<node>`" text instead of loading (no new version check; non-Docker remote nodes keep the raw error). (C) Keep it as asked, as a stated exception to rule 9 | Recommend (A): rule 9 exists so the product does not grow per-version handling; the case is temporary (it disappears once nodes update, and Docker nodes can update automatically since autobyteus-356). (B) is the only shape that stays inside the rules if the user still wants it. **Decided: (A), drop item 15.** The user, 2026-11-07, asked "only small ui update or?" and then: "i trust your judgement …"; the Solution Designer chose (A) for the reasons above | Solution Designer (at the user's word) | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-003 | SCN-002, SCN-003 |
| REQ-003 | UC-003 | BEH-003 | AC-004 | SCN-004 |
| REQ-005 | UC-005 | BEH-005 | AC-005 | SCN-005 |
| REQ-006 | UC-006 | BEH-006 | AC-006 | SCN-006 |
| REQ-007 | UC-007 | BEH-007 | AC-007 | SCN-007 |
| REQ-008 | UC-008 | BEH-008 | AC-008 | SCN-008 |
| REQ-010, REQ-011, REQ-014 | UC-010 | BEH-010, 011, 014 | AC-010, 011, 014 | — |
| REQ-012, REQ-013 | UC-012 | BEH-012, 013 | AC-012, 013 | — |
| REQ-016 | UC-016 | BEH-016 | AC-016 | SCN-011 | Product spec `phone-setup-remote-node-wording` VIS-001…009 |
| REQ-019 | UC-019 | BEH-019 | AC-019 | SCN-014 | |
| REQ-017 | UC-017 | BEH-017 | AC-017 | SCN-012 |
| REQ-018 | UC-018 | BEH-018 | AC-018 | SCN-013 |

## Architecture Phase Input

- Approved scenarios: SCN-001…SCN-008, SCN-012, SCN-013 (round 1).
- Constraints: QR-001…QR-004; DEC-004 (registered paths unchanged).
- Deferred to design: where the paired-only condition lives; the restore decision's owner on Android; the blob rule's owner; where the "new registration" check lives; the shared IPv4 owner and placement; the localization formatter and guard shape; AR-14's wait condition.
- Verify: R-01 (AR-14 cause) by reproduction at implementation start.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes` (REQ-016, SR-003)
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes` (UI section: the user's "approved", VIS-001…009)
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes` (round 1)
- Remaining content blocker: none for round 1; round 2 (item 9) not yet written

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed, SR-001; REQ-016 text by the user, SR-003)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes` (round 1)
- Remaining blocker: none for round 1
