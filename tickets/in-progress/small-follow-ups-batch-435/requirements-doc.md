# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005` (SR-005: API-REV-001 F1/F2 via CRR-003 — REQ-003 reads the desktop window's readable Host-gate refusal (DEC-019); AC-004-1 on API 34 too, full screen lays out under the cutout on API < 35 (DEC-020). SR-004: items 13 and 14 added from the Task's 2026-11-10 comments; REQ-013, REQ-014; DEC-017, DEC-018. SR-002: REQ-005 clarified — New run entry form, the "Opening…" state, the outcome when the node cannot be read at restore; DEC-014, DEC-015; AC-005-5…7. SR-003: a created run's route follows its promotion from draft to node run; reload before the first send shows the list; DEC-016; AC-005-6 precondition, AC-005-8)
- Package identifier: `small-follow-ups-batch-435`
- Request / ticket: Project Task `autobyteus-435` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), description items 1–4 and comments items 5–12
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user in its conversation, 2026-11-10 (SR-001), and `handoff-architecture-design-complete.md` § Approval. No decision below is `Needs user`.
- Exact approved requirements baseline / solution revision: this document at SR-005 (SR-001 approved 2026-11-10; SR-002's, SR-003's, SR-004's and SR-005's REQ-005 clarifications approved by the Solution Designer within the direction, user informed in the conversation on 2026-11-10)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: fourteen small items (twelve defects and clean-ups left by autobyteus-426, -432, -433, -436 and -446: a phone page start requests a wrong local health URL; the Nodes page says "can't reach" for a node that refuses the name; two dead-code files; the phone's full-screen viewer loses the cutout strip, does not survive a reload/process death, and hides the Clipboard sheet's Send under the keyboard; the Android app shows technical HTTP error words and loses a pairing code on Retry; a revoked phone keeps its live connections retrying for ever; a Task closed while its host run is stopped leaves rows until reload; and one key is defined three times); plus (SR-004) a misleading self-delegation refusal (item 13, from autobyteus-455) and the user's request to show the System instructions text in full in Activity (item 14).
- Affected actors or systems: phone user (browser and Android app), desktop owner (Nodes page, run list), the node, the full phone probe.
- Desired outcome: each item is fixed as below, or dropped with evidence (none is dropped at SR-001), with tests; no security rule changes.
- Observable definition of success: the acceptance criteria below pass; the full `test:e2e:mobile-shell` run passes without the FU-003 health exemption and with no 401 from the revoked phone after MSP-13.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Every browser page start (phone included) requests `http://localhost:8000/health` (the server overlays mount outside Electron and run a health check) | No page outside the Electron desktop window requests that health URL at start | The Electron window's start/restart/shutdown overlays and health handling | INV Source Log rows 1–4 |
| BEH-002 | User | SCN-002 | A name refused by a node's Host gate shows "No answer from that address" on its row and after Add | The row and Add say that something answers there but refuses this window, with what to do | Every other cause and its words; probing only from the window; no request from the node while its switch is off | Source Log rows 5–8; Runtime finding (Measured) |
| BEH-003 | Contract | — | `diagnosticFromWebSocketClose` (+ its spec cases) and `utils/dateUtils.ts` have no production caller | Removed | Everything else in `mobileConnectionDiagnostics.ts` | rows 9–10 |
| BEH-004 | User | SCN-004 | Viewer full screen (Android, landscape): the display cutout strip stays empty, the picture ≈ 136 px narrower | In full screen the page also uses the cutout area; Fill uses the full screen width | Outside full screen every screen stays clear of bars, cutout and keyboard (autobyteus-277 REQ-011) | row 11 |
| BEH-005 | User / System | SCN-005 | Reload or process-death restore of an agent/Team run screen (incl. the VNC Viewer) lands on the run list | The same subject's same screen reopens (VNC Viewer included, in full screen when it was) | Org screens' existing route keys; Back order file → view → run → list; a subject that is gone falls back to the list | rows 12–13 |
| BEH-006 | User | SCN-006 | Landscape full screen, keyboard open in the Clipboard sheet: Send is not visible | Send stays visible and tappable while typing | The sheet's Paste/Copy behavior; portrait layout | row 14 |
| BEH-007 | User | SCN-007 | Android overlay for an HTTP error other than 401/403: "AutoByteus returned HTTP 502 … Verify the saved URL …" | Plain words naming the node and what to try; no address | 401/403 overlays; Can't reach screen | row 15 |
| BEH-008 | User | SCN-008 | Retry after a pairing link's first page failed opens the node's plain page (unpaired); the code is lost | Retry loads the pairing link again while the phone has not paired from it | Retry of a saved node's page; the pairing URL is never saved for restore | row 16 |
| BEH-009 | System | SCN-009 | A phone whose credential the node refuses (revoked, unknown) keeps every run stream retrying; each attempt refused (401) | Streams stop when the node closes them for a refused credential, and every live stream closes when the phone's session is removed | Retry after a network loss, a node restart, Phone Access off (resumes when it is turned on again), a network refusal | rows 17–19 |
| BEH-010 | System | SCN-010 | A Task closed/reopened while its host run is stopped leaves its rows until reload | The list's refresh shows the change for a stopped host too, without reading stored trees each refresh | Active-host behavior of autobyteus-446 | row 20 |
| SCN-011 | Contract | Agent (any root) | Delegate a task | `delegate_task` | Address is its own | Refused | Self words | Teammate / own Team: today's words | Supported Normal Scenario (every standalone agent can hit it; 455 DAC-05) | 455 FU-001 | REQ-013 / AC-013-1 |
| SCN-012 | User | User (desktop, phone) | Read the system instructions | Activity → System instructions header | Item collapsed | Expand; read; collapse with the header arrow | Complete text in flow | — | Supported Normal Scenario | User's request and screenshots (Task context 52.jpg, 53.jpg) | REQ-014 / AC-014-* |
| BEH-011 | Contract | — | Task-execution key defined three times | Defined once in `@autobyteus/collaboration-stream-contracts`; no behavior change | Key format `agent:<id>` / `team:<id>` | row 21 |
| BEH-012 | Operational | SCN-004 | Android's one-time full-screen hint holds focus until "Got it" (system behaviour, residual of 432) | Noted in the phone guide | System behaviour unchanged | 432 comment |
| BEH-013 | Contract (agent tool) | SCN-011 | `delegate_task` with the sender's own address is refused (correct) with the teammate words "/x is in your own team; you can't delegate to it. Talk with it using send_message_to." (`collaborator-errors.ts:68-69`, `catalog-delegation.ts:96-98`; 455 evidence DAC-05), which tells the agent to message itself | The self case has its own words: it is the agent's own address, and the agent does the work itself or delegates to another agent or team | The refusal itself, its code `COLLABORATION_SELF_TARGET_REJECTED`, and the teammate / own-team words for a real teammate or own team | SR-004 Source Log |
| BEH-014 | User | SCN-012 | Expanded "System instructions" in Activity (desktop and phone share `components/progress/SystemInstructionActivityItem.vue`) shows its text (≈ 9,700 characters) in a box capped at `max-h-80` (20 rem) with its own scroll (`:53`); the user's screenshots 52.jpg, 53.jpg | Expanded, the complete text shows in the Activity's own scroll, no inner scroll or height cap; the header (with its arrow) collapses it | Collapsed by default; monospace, wrapping, selectable text; what is captured; the header's words, badge and accessibility | SR-004 Source Log |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Phone user | Use runs and the node desktop from the phone | No stray requests; viewer survives restore; Send reachable; plain words; pairing code kept on Retry | No new Android permission |
| Desktop owner | Manage nodes; follow delegated rows | Truthful cause on the Nodes page; rows follow Task closure for stopped hosts | No security rule change; no CORS on refusals |
| Node | Serve clients | Fewer refused requests from revoked phones | Same Host/Origin/credential rules |
| Test suite | Truthful verdicts | Full phone probe passes on its own merits | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A browser page (phone or browser window) starts | SCN-001 |
| UC-002 | The owner probes or adds a node whose name its Host gate refuses | SCN-002 |
| UC-003 | Source hygiene: dead code and the duplicated key | — |
| UC-004 | Phone VNC Viewer in landscape full screen (picture area, Clipboard sheet with keyboard) | SCN-004, SCN-006 |
| UC-005 | A phone page is reloaded or restored by Android after process death | SCN-005 |
| UC-006 | Android app: the node's page answers an HTTP error; Retry after a pairing link's page failed | SCN-007, SCN-008 |
| UC-007 | A phone's credential is refused or its session removed while run streams are open | SCN-009 |
| UC-008 | A Task closes or reopens while its host run is stopped and listed | SCN-010 |
| UC-009 | An agent delegates to its own address | SCN-011 |
| UC-010 | The user reads a run's system instructions in Activity (desktop, phone) | SCN-012 |

### Out Of Scope

- Any change to the Host gate, Origin rule, credential rules, route permissions, CORS (autobyteus-403, -416, -437).
- A node-side address check (it would send a cross-node request from a node whose switch may be off; one-nodes-tab DEC-709 (b)).
- Ending the phone's session from a stream close (the session still ends only on a check: open, Retry, Check; autobyteus-426 E-27).
- The Settings "Server" monitor's health URL in browser windows (FU-001).
- Run-list refresh for Team/Org hosts (446 digest covers agent hosts only).
- The 401/403 Android overlay words; the Can't reach screen words.
- Other phone screens' layouts in landscape.

### Non-Goals

- No exact Host-gate diagnosis in a browser window (an opaque answer cannot say whether the name or the page's origin is refused).
- No guarantee that a restored page keeps a VNC session (the viewer reconnects).

### Preserved Behavior Boundary

- BEH-001 … BEH-012 "Intentionally Preserved" column; autobyteus-277 REQ-011 outside full screen; autobyteus-426 E-27 (session ends only on a check); autobyteus-434 reconnect for retryable closes; autobyteus-446 active-host digest rule; autobyteus-433 "never an address" on the phone.

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Outside the Electron desktop window no page start, and no server overlay, requests the browser health URL. The Electron window's overlays behave as today. | BEH-001 | Medium | Item 1; the stated cause (plugin) is not the requester | N/A (Read) | Task item 1; DEC-001 |
| REQ-002 | `diagnosticFromWebSocketClose` and its spec cases, and `autobyteus-web/utils/dateUtils.ts`, are removed. | BEH-003 | Low | Items 3, 4 | N/A | DEC-003 |
| REQ-003 | (SR-005) The window's probe of an address says why a node that refuses the name is not reached: (a) when the window can read the answer and it is the node's Host-gate refusal (403 `REMOTE_ACCESS_HOST_REFUSED`; the desktop window reads it), the cause uses the existing words of the server-checked flows ("The node at this address doesn’t accept the name {{host}}. Add {{host}} to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address."); (b) when the window cannot read the answer (a browser window; the readable request fails without a timeout), it asks the same address once more without reading it (an opaque request), and an answer gives the "answers but doesn't accept requests from this page" cause; (c) otherwise the cause stays as today. No CORS header, server endpoint or node-side request is added. | BEH-002 | Medium | Item 2 | Measured: Chromium page (browser windows) — refused name → opaque answer, closed port → failure; packaged Electron window (API-13) — the 403 and its code are readable (`type: basic`) | Task item 2; DEC-002, DEC-019 (SR-005) |
| REQ-004 | In the Android app's viewer full screen, the page also lays out in the display cutout area (the picture and its stage fill the screen width); leaving full screen restores today's insets. | BEH-004 | Low | Item 5 | Platform behaviour (Android cutout modes); checked on the emulator | Comment 1 item 5; DEC-011 |
| REQ-005 | A phone page's route names the open agent run or Team subject, whether it was opened from the run list or created with New run, so a reload, or Android's restore after it ended the app, reopens the same subject on the same screen (run, messages, files, activity, artifacts, VNC Viewer; full screen when it was). While the subject is being reopened the screen says it is opening. A subject that no longer appears in the run list, once the list (and, for a delegated row, its host's rows) has been read, falls back to the list; when the node cannot be read at that moment, the list shows with its connection state. | BEH-005 | Medium | Item 6 | N/A (Read) | Comment 1 item 6; DEC-004, DEC-014, DEC-015 (SR-002) |
| REQ-006 | In landscape full screen with the keyboard open in the Clipboard sheet, the paste field's Send button is visible and tappable without lowering the keyboard. | BEH-006 | Low | Item 7 | Measured viewport 915×151 (432 API-08) | Comment 1 item 7; DEC-005 |
| REQ-007 | The Android overlay for an HTTP error other than 401/403 says, in plain words, which node did not open and what to try; it shows no address and no "HTTP"/"URL"/"/mobile" wording. | BEH-007 | Low | Item 8 | N/A | Comment 2 item 8; DEC-006 |
| REQ-008 | Android: while a pairing link's page has not reported "paired", Retry on its overlay loads the pairing link again; after pairing, or for a saved node, Retry loads the node's page as today. The pairing link is not saved for restore. | BEH-008 | Medium | Item 9 | N/A | Comment 2 item 9; DEC-007 |
| REQ-009 | The phone guide notes that Android's one-time full-screen hint must be dismissed ("Got it") before the viewer takes touches. | BEH-012 | Low | 432 residual | N/A | Comment 1; DEC-012 |
| REQ-010 | (a) Every web client live stream (agent run, Team run, collaboration, Org, file explorer) stops retrying when the node closes it for a refused credential: close code 4401, or 4403 with a credential-ending refusal code (`REMOTE_ACCESS_DEVICE_REVOKED`, `NODE_CREDENTIAL_REVOKED`, `NODE_CREDENTIAL_INVALID`, `PEER_UNPAIRED`). Closes for `PHONE_ACCESS_DISABLED` and `NODE_NETWORK_REFUSED` stay retryable, as do all other closes, with each owner's existing final codes kept. (b) When the phone's session is removed (credential refused at a check, revoked, or Unpair), every live stream and stream recovery the page holds is closed. (c) After a phone is revoked (MSP-13), it sends no further refused request in the later cases of the full phone probe. | BEH-009 | High (446: "schedule soon") | Item 10 | N/A (Read; archived runtime) | Comments 3–4 item 10; DEC-008 |
| REQ-011 | The run list's refresh also follows a Task closed or reopened while its listed host run is stopped: the node answers a closed-set digest for an inactive host from data in memory (no stored tree read), and the list re-reads a stopped host's view when that digest changed, at most once per digest value. | BEH-010 | Low | Item 11 | N/A (Read) | Comment 4 item 11; DEC-009 |
| REQ-012 | The task-execution key is exported from `@autobyteus/collaboration-stream-contracts` and the server's and web's own definitions are removed; no behavior change. | BEH-011 | Low | Item 12 | N/A | Comment 4 item 12; DEC-010 |
| REQ-013 | `delegate_task` to the sender's own address is refused with its own words, e.g. "/x is your own address; you can't delegate to yourself. Do the work yourself, or delegate it to another agent or agent team."; a teammate or the sender's own Team keeps today's words; the code stays `COLLABORATION_SELF_TARGET_REJECTED`. | BEH-013 | Low | Item 13 (autobyteus-455 FU-001) | N/A | Task comment 2026-11-10 item 13; DEC-017 |
| REQ-014 | When the System instructions item is expanded in Activity (desktop and phone), its complete text shows in the Activity's page flow with no maximum height and no inner scroll; the header's arrow collapses it again. Text stays monospace, wrapped, selectable; nothing about what is captured changes. | BEH-014 | Medium (the user's request) | Item 14 | N/A (≈ 10,000 characters of plain text in one element) | Task comment 2026-11-10 item 14 (user's words); DEC-018 |

## Acceptance Criteria

| AC ID | Related REQ | Related Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001-1 | REQ-001 | SCN-001 | Phone `/mobile` start (paired or not), and a browser window start | No request to any `/health` URL is made at page start | — | Full phone probe without the FU-003 exemption: no `localhost:8000/health` failed request; unit test of the overlay mount condition |
| AC-001-2 | REQ-001 | SCN-001 | Electron window start, server starting/restarting/error | Overlays show and health is checked as today | — | Existing web specs (ServerLoading, serverStore) stay green |
| AC-002-1 | REQ-002 | — | Source | Neither symbol/file exists; web tests and type check pass | — | grep + suites |
| AC-003-1 | REQ-003 | SCN-002 | Desktop (Electron) window; a node row or a typed address whose name the node's Host gate refuses | Row and Add show "The node at this address doesn’t accept the name <host>. Add <host> to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address.", not "No answer" or "isn't an AutoByteus node" | Nothing answers (closed port, host down): today's cause; timeout: today's cause; another 403 or non-JSON answer: today's "isn't an AutoByteus node" | Unit tests of the probe (fake fetch: readable 403 with the code; readable 403 without it); API/E2E in the packaged app against a real node with a refused name (API-13) |
| AC-003-2 | REQ-003 | SCN-002 | Browser window (not `file://`) | The cause says something answers but does not accept requests from this page, with the ALLOWED_ORIGINS / ALLOWED_HOSTS hint | — | Unit test |
| AC-003-3 | REQ-003 | SCN-002 | Any | No server, CORS, Host or Origin rule change; the second request is made only after a non-timeout failure of the first | — | Code review; unit test (no second request after success or timeout) |
| AC-004-1 | REQ-004 | SCN-004 | Android emulators with a cutout: API 35 and API 34 (Android 14; covers 28–34), viewer full screen, both landscape directions | The page fills the screen width (Fill picture as wide as the screen) | Leaving full screen: insets as before on both | Emulator measurement (page viewport width vs screen width) on API 35 (API-07) and API 34 (API-18); unit test of the controller per API range |
| AC-004-2 | REQ-004 | — | Any non-full-screen screen | Root padding unchanged (bars, cutout, keyboard) | — | Existing `SystemBarInsetsTest` stays green |
| AC-005-1 | REQ-005 | SCN-005 | Phone browser: an agent run's VNC Viewer (and messages, files) open; reload | The same run's same screen shows after reload | Run gone from the list: the list shows | Web unit tests of navigation/restore; phone probe case |
| AC-005-2 | REQ-005 | SCN-005 | Android: viewer in full screen; app ended in the background (`am kill`); reopened | The same run's viewer reopens in full screen (landscape) | — | Emulator check (432 API-07 procedure) |
| AC-005-3 | REQ-005 | SCN-005 | A Team run (and a Team member) screen; reload | Same Team subject and screen | A child row that cannot be found after expanding its parent: the list | Unit tests |
| AC-005-4 | REQ-005 | SCN-005 | Org screens; Back order | Unchanged | — | Existing specs |
| AC-005-5 | REQ-005 | SCN-005 | Phone page restored with a route naming a row while the node is unreachable or Phone Access is off (the first history read fails) | The run list shows with its connection state (Not reachable / Phone Access off) | — | Web unit test of the restore |
| AC-005-6 | REQ-005 | SCN-005 | New run → Create run on the phone; the first message is sent (the node run exists); messages or the VNC Viewer open (before or after that send); reload | The created run's same screen shows after reload; the route names the node's run ID, not the draft's | — | Web unit test that follows a draft through promotion (route `row` before and after; a view pushed before the send; Back to an entry pushed before the send), restore test |
| AC-005-8 | REQ-005 | SCN-005 | New run → Create run; reload before the first message is sent | The run list shows (a draft is not kept across a reload and has no node run to reopen) | — | Web unit test |
| AC-005-7 | REQ-005 | SCN-005 | Restore in progress (route names a row, subject not yet open) | The screen shows "Opening…"; it never shows the list first and then jumps | A delegated row whose host's rows are still being read keeps "Opening…" until that read settles | Web unit test |
| AC-006-1 | REQ-006 | SCN-006 | Emulator, landscape full screen, Control, Clipboard, paste field focused, keyboard open | Send is inside the visible viewport and a tap on it sends (node clipboard changes) | — | Emulator check with real taps (432 API-08 R1 procedure) |
| AC-006-2 | REQ-006 | — | Portrait | Sheet works as today | — | Existing spec |
| AC-007-1 | REQ-007 | SCN-007 | Android, the node's page answers 502 | Overlay names the node and what to try; no address, no "HTTP"/"URL"/"/mobile" | 401/403 unchanged | Unit test of `ConnectionDiagnosticMapper` |
| AC-008-1 | REQ-008 | SCN-008 | Android, pairing link, node down at first load; node back; Retry | The pairing page opens and pairs (the code is used) | After pairing, Retry loads the node's page | Unit test of the flow's retry URL; emulator check (433 API-11 procedure) |
| AC-009-1 | REQ-009 | — | Docs | The guide has the note | — | Docs review |
| AC-010-1 | REQ-010 | SCN-009 | A stream closed with 4401, or 4403 + a credential-ending code | That stream's owner does not reconnect | 4403 `PHONE_ACCESS_DISABLED`/`NODE_NETWORK_REFUSED`, 1006, 1001: reconnect as today | Unit tests per owner (agent, Team, collaboration, Org, file explorer) |
| AC-010-2 | REQ-010 | SCN-009 | Phone session removed (check refused, Unpair) | All the page's live streams and recoveries are closed; no further request with or without a credential | Re-pair and open a run: its stream opens again | Unit test of the teardown; probe |
| AC-010-3 | REQ-010 | SCN-009 | Full `test:e2e:mobile-shell` | Verdict `Pass`; zero 401 from the revoked phone after MSP-13 (new probe check), MSP-18 (Phone Access off → on) still passes | — | Probe run |
| AC-011-1 | REQ-011 | SCN-010 | Listed stopped host with a delegated task row; its Task set DONE (or reopened) | Within one refresh (5 s) the row leaves (or returns) on desktop and phone lists | — | Server unit test (digest for inactive host without tree read); web store test; API/E2E |
| AC-011-2 | REQ-011 | SCN-010 | A digest that differs from the re-read view | At most one re-read per digest value | — | Web store test |
| AC-012-1 | REQ-012 | — | Source | One definition (contracts); server and web import it; suites green | — | grep + suites |
| AC-013-1 | REQ-013 | SCN-011 | A standalone run (and a Team member) calls `delegate_task` with its own address | Refused with the self words; no placement, no Task link | A teammate's address / own Team's address: today's words | Server unit test (`refusal-texts-vocabulary.test.ts`, delegation placement test) |
| AC-014-1 | REQ-014 | SCN-012 | Activity (desktop) and phone Activity; a System instructions item of ≈ 10,000 characters; tap/click the header | The whole text is in the page: the text element has no max height and no own vertical scroll (its height equals its content); the Activity scrolls through it | Tap the header again: collapsed | Web unit test (no `max-h-*`/`overflow-auto` on the text; full content present); a rendered check on the phone page and the desktop panel (screenshots) |
| AC-014-2 | REQ-014 | SCN-012 | Long unbroken line in the text | Wraps inside the item; no horizontal page overflow | — | Unit/render check |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger / Entry Surface | Starting Condition | Steps / Event Sequence | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Browser | Page start | Open `/mobile` or a browser window | Any | App mounts | No health request outside Electron | — | Supported Normal Scenario | 426 API-04 | REQ-001 / AC-001-* |
| SCN-002 | User | Desktop owner | See why a node is not reached | Nodes page open; Add | Node refuses the name (AUTOBYTEUS_ALLOWED_HOSTS missing) | Window probes the row/address | Cause "answers but refuses this window" | Nothing answers: today's cause | Supported Normal Scenario (autobyteus-416 users meet it with `.local` or Tailscale names) | 426 FU-004 | REQ-003 / AC-003-* |
| SCN-004 | User | Phone user | Use the full screen for the desktop picture | Viewer → full screen (Android) | Cutout device, landscape | Full screen on | Picture area uses the cutout strip | Leave full screen: insets back | Supported Normal Scenario | 432 FU-001 | REQ-004 |
| SCN-005 | User / System | Phone user / Android | Come back to the same place | Reload; Android restores the page after process death | A run screen of an agent/Team run open | Page starts with the route | Same subject and screen | Subject gone: list | Supported Normal Scenario | 432 FU-002 | REQ-005 |
| SCN-006 | User | Phone user | Send text to the desktop clipboard | Full screen strip → Clipboard | Landscape, keyboard open | Type, tap Send | Sent | — | Supported Normal Scenario | 432 FU-003 | REQ-006 |
| SCN-007 | User | Phone user | Understand a failed page | Open a node | Node answers 5xx | Overlay | Plain words | — | Supported Normal Scenario | 433 FU-001 | REQ-007 |
| SCN-008 | User | Phone user | Pair after a failed first load | Scan a QR; node down | Overlay; node back; Retry | Pairing page; paired | — | Supported Explicit Edge Scenario (Retry is the overlay's supported action) | 433 FU-003 | REQ-008 |
| SCN-009 | System | Node / phone | Stop wasted retries | Revoke (Nodes › Phone Setup), credential refused, Unpair | Phone streams open | Node closes sockets; phone check removes session | No further refused requests | Phone Access off: resumes when on | Supported Normal Scenario | 436 FU-003, 446 FU-003 | REQ-010 |
| SCN-010 | System | Task Manager / owner | Rows follow Task closure | Task DONE/reopen | Host run stopped, listed | List refresh | Rows leave/return | — | Supported Normal Scenario | 446 FU-001 | REQ-011 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (copy and small layout changes within existing screens)
- Linked UI/UX or interaction supplement: N/A — not applicable (no Product Design request)
- Normative details: words in DEC-002 and DEC-006; layout outcome in REQ-006; restore outcome in REQ-005.
- Product decisions that need the user: None.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003, REQ-010 | Security | No change to Host/Origin/credential/CORS behavior; no new request destination | All | Code review; server security suites unchanged |
| QR-002 | REQ-011 | Performance | No stored tree or log read per refresh for inactive hosts | Run list poll | Server unit test (store spy) |
| QR-003 | REQ-007, REQ-005 | Privacy | No address shown on the phone (433); the route carries run IDs only (already true for Orgs) | Phone | Unit test; review |
| QR-004 | REQ-004 | Compatibility | No new Android permission; min SDK 26 behaviour defined | Android | Manifest diff; unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (Android's saved page URL: old URLs keep opening; they restore as today)

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Fetch `no-cors` | Opaque resolve on answer; reject on no answer | Measured | Electron same engine; API/E2E re-checks |
| Android cutout modes | Lay out into the cutout while full screen | Platform | Emulator only |
| Node close codes (437) | 4401/4403 + refusal code | Code | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| None behavior-defining | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The Task's dispatch carries the user's word to start the batch | Task said it waits for the user's word | Task status IN_PROGRESS, accepted assignment | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Item 1: where to stop the health request? | Lead names the plugin, which already skips browsers | (a) plugin; (b) mount the server overlays only in the Electron window | The requester is `ServerLoading`'s mount (Read). The overlays describe the embedded server, which only Electron runs; browsers set RUNNING at once. (b) fixes phone and browser windows with one condition. **(b).** | Solution Designer | Decided |
| DEC-002 | Item 2: how, and in which words? | Lead: "have the window ask its own node"; one-nodes-tab DEC-709 (b) forbids a node with the switch off (the default) from asking another node | (a) node-side check (works only with the switch on); (b) window-only opaque second request (Measured feasible); (c) CORS on refusals (forbidden without a security decision) | (b) works in every state, adds no destination and changes no rule. An opaque answer proves something answered and refused this window, not exactly *why* (a proxy error page or a non-AutoByteus server also answers without CORS), so the words must stay true. Desktop (`file://`, admitted by every node's Origin rule): en "Something answers at {{host}}, but it refuses this window. If it is an AutoByteus node, add {{host}} to AUTOBYTEUS_ALLOWED_HOSTS on that node, or use its IP address." Browser window: en "Something answers at {{host}}, but it doesn't accept requests from this page. If it is an AutoByteus node, allow this page's address (AUTOBYTEUS_ALLOWED_ORIGINS) or the name {{host}} (AUTOBYTEUS_ALLOWED_HOSTS) on it." zh-CN translated alike. **(b).** | Solution Designer | Decided (desktop part superseded by DEC-019, SR-005) |
| DEC-003 | Item 3: remove or wire? | Wiring would make a stream close show a phone diagnostic | Streams show no diagnostic today; the session ends on a check (E-27) | Wiring adds behavior nobody asked for; item 10 handles the closes. **Remove.** | Solution Designer | Decided |
| DEC-004 | Item 6: what the route carries; re-enter full screen? | Restore must reopen the subject | Row keys are stable IDs (`agent:<id>`, `team:<id>/…`); Org keys already restore | One route key naming the opened run-list row (agent and Team subjects); restore by the same open action as a tap. Full screen: the route already says `full=1`, and Android keeps landscape across process death, so re-entering matches what the user left. **Row key; re-enter full screen.** | Solution Designer | Decided |
| DEC-005 | Item 7: layout | 151 px tall viewport | (a) scroll to Send on focus; (b) Send beside the field in a short viewport | With ≈ 60 px of scroll area the field and a Send below cannot both show; beside the field they can. **(b), and keep the field's row in view on focus.** | Solution Designer | Decided |
| DEC-006 | Item 8 words | Plain words, node name, no address | — | Title "Can’t open <node>", message "<node> answered, but its page didn’t open (error <code>).", action "Check that AutoByteus is running on the computer, then tap Retry." **As written.** | Solution Designer | Decided |
| DEC-007 | Item 9: reload the link or say "scan again"? | Code lost today | The first page never ran the exchange, so the code is unused | Reloading keeps the user's QR working. If the code expired meanwhile, the pairing page already says so. **Reload the pairing link while pending.** | Solution Designer | Decided |
| DEC-008 | Item 10: which closes are final? | Lead says "treat 4403 as final"; 4403 also carries Phone Access off and network refusal | Phone Access off closes every phone socket with 4403 and today resumes when turned on | A refused *credential* cannot recover without pairing again; Phone Access and network can change back. Final: 4401; 4403 with `REMOTE_ACCESS_DEVICE_REVOKED`, `NODE_CREDENTIAL_REVOKED`, `NODE_CREDENTIAL_INVALID`, `PEER_UNPAIRED`. Plus close every stream on session removal. **As written.** | Solution Designer | Decided |
| DEC-009 | Item 11: how to read a stopped host's closed set cheaply | 446 FU: "without reading every stored tree" | The node keeps a per-root closed index in memory (`closedTaskExecutionsIn`) | Answer its digest for inactive hosts; the list re-reads the stored view only when that digest changed, once per value (a stale index entry cannot cause a loop). **As written.** | Solution Designer | Decided |
| DEC-010 | Item 12: export name | — | — | Export `taskExecutionReferenceKey` (the server's name, most importers). **As written.** | Solution Designer | Decided |
| DEC-011 | Item 5: also outside full screen? | 277 keeps screens clear of the cutout | — | Only full screen; that is where the picture should use the screen. **Full screen only.** | Solution Designer | Decided |
| DEC-012 | 432 residual hint | "the team may note it in the guide" | — | A one-line note costs nothing and saves a confused first use. **Note it.** | Solution Designer | Decided |
| DEC-013 | One ticket or split? | 12 items, each local | Items share no code except stream lifecycle (10) | Keep one ticket (the Task's batch); none is dropped. | Solution Designer | Decided |
| DEC-014 | (SR-002, ARCH-REV-001 AR-002 / MP-003) Item 6: the node cannot be read when the page is restored (unreachable, Phone Access off) — wait or show the list? | REQ-005 said only "a subject that no longer appears" falls back | (a) keep the restore pending until a later read succeeds; (b) show the list with its connection state | Under (a) the screen would wait on a read that may never come: the list's poll and its Retry run only on the list, so the phone would sit on "Opening…" with no way forward. Under (b) the user sees the same "Not reachable" / "Phone Access off" state and Retry as on any start while the node is away, and reopens the run when it is back. **(b).** | Solution Designer | Decided |
| DEC-016 | (SR-003, CRR-001 CR-001) Item 6: a run created on the phone is a draft (`temp-*`) until its first message; what does the route name, and what does a reload show before and after the first send? | The route wrote the draft ID; drafts are memory-only and never listed (`runListProjection.ts:89-91`) | (a) keep the draft ID; (b) the route follows the draft's promotion to the node's run ID, as the desktop chat route already does (`useChatRouteRunSync.ts`, D-13); before the send, reload shows the list (or New run) | The desktop already keeps its route equal to the displayed run across promotion; the phone should behave the same. Before the first send nothing exists on the node, so a reload has nothing to reopen; the list is the existing "subject not listed" outcome, and New run would imply the draft was kept, which it is not. **(b); before the send, the list.** | Solution Designer | Decided |
| DEC-017 | (SR-004) Item 13 words and where the self case is told apart | Teammate words tell an agent to message itself | All three run indexes expose `agentAddressOf(senderAgentRunId)` | Tell self from own team by comparing the address with the sender's own address before the own-team check; words per the Task's example, plus the alternative (delegate to someone else), keeping the house style of the other refusal texts. Same code. **As REQ-013.** | Solution Designer | Decided |
| DEC-018 | (SR-004) Item 14: other items, extra controls? | The Task asks to check other Activity items using the same box | Only `SystemInstructionActivityItem.vue:53` has a capped, vertically scrolling text box; tool items wrap with horizontal overflow only (`ToolActivityItem.vue:51,91`), compaction items have none | Change the one box. The user collapses with the header arrow, as he said; no second collapse control or sticky header (not asked; keeps it small). The text element loses `tabindex="0"`, which existed only to scroll the box by keyboard. **As written.** | Solution Designer | Decided |
| DEC-019 | (SR-005, CRR-003 CR-003 / API-REV-001 F2) Item 2 in the desktop window: the window can read the Host gate's refusal | DEC-002 assumed it could not (measured in plain Chromium, not Electron); API-13 shows the packaged `file://` window reads the 403 (`type: basic`) and its code, so it showed "isn't an AutoByteus node" | (a) the existing `host_refused` words (exact cause, same as the server-checked flows, autobyteus-426 REQ-020); (b) `window_refused`'s words | The window knows the exact cause, so it says it exactly, with the words the user already sees when the node checks an address. `window_refused` stays for windows that cannot read the answer (browser windows), with the page words; its desktop variant can no longer occur and is removed. **(a).** | Solution Designer | Decided |
| DEC-020 | (SR-005, CRR-003 CR-002 / API-REV-001 F1) Item 5 on Android 9–14: how the window lays out under the cutout in full screen | On API ≤ 34 the decor fits system windows, so the content frame starts after the cutout even with `shortEdges` (API-18); API 35 forces edge-to-edge | (1) full screen turns the decor's fitting off and back on; (2) the app goes edge-to-edge on every API (then the app pads bars, cutout and keyboard on every screen on API 26–34) | (1) changes only full screen, which this item is about (DEC-011); outside full screen API 26–34 keep exactly today's layout (autobyteus-277 REQ-011 unchanged). (2) would change every screen on six Android versions for one screen's need. **(1), on API < 35 only (API 35 is already edge-to-edge and must not be touched).** | Solution Designer | Decided |
| DEC-015 | (SR-002, AR-002) Item 6: what shows while the subject is being reopened? | The view screens render only with an open subject; the list must not flash first | (a) blank; (b) the list, then jump; (c) "Opening…" as the run screen already shows for a tap | (c) reuses the existing pending-open state and wording; nothing new to learn. **(c).** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001-1, AC-001-2 | SCN-001 | INV rows 1–4 |
| REQ-002 | UC-003 | BEH-003 | AC-002-1 | — | rows 9–10 |
| REQ-003 | UC-002 | BEH-002 | AC-003-1…3 | SCN-002 | rows 5–8; Measured |
| REQ-004 | UC-004 | BEH-004 | AC-004-1, AC-004-2 | SCN-004 | row 11 |
| REQ-005 | UC-005 | BEH-005 | AC-005-1…8 | SCN-005 | rows 12–13; ARCH-REV-001 MP-001…003; CRR-001 CR-001 |
| REQ-006 | UC-004 | BEH-006 | AC-006-1, AC-006-2 | SCN-006 | row 14 |
| REQ-007 | UC-006 | BEH-007 | AC-007-1 | SCN-007 | row 15 |
| REQ-008 | UC-006 | BEH-008 | AC-008-1 | SCN-008 | row 16 |
| REQ-009 | UC-004 | BEH-012 | AC-009-1 | SCN-004 | 432 comment |
| REQ-010 | UC-007 | BEH-009 | AC-010-1…3 | SCN-009 | rows 17–19 |
| REQ-011 | UC-008 | BEH-010 | AC-011-1, AC-011-2 | SCN-010 | row 20 |
| REQ-012 | UC-003 | BEH-011 | AC-012-1 | — | row 21 |
| REQ-013 | UC-009 | BEH-013 | AC-013-1 | SCN-011 | SR-004 |
| REQ-014 | UC-010 | BEH-014 | AC-014-1, AC-014-2 | SCN-012 | SR-004; screenshots |

## Architecture Phase Input

- Approved scenario IDs: SCN-001 … SCN-010.
- Constraints: QR-001 … QR-004; preserved boundary above.
- Decisions deferred to architecture: exact route key name; teardown owner placement; close classification placement; Android cutout mechanism per API level.
- Technical facts to verify: `agentRunCollaborationStatuses` consumers of a non-null digest for inactive hosts; restore timing after the first history load.
- Known risks: RSK-001 … RSK-003 (investigation notes).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed in the conversation, 2026-11-10)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-001)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
