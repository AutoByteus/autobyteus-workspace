# Requirements Document — remote-node-runtime-sign-in

## Document Status

- Status: Approved
- Current solution revision ID: SR-001 (requirements baseline)
- Package identifier: `remote-node-runtime-sign-in`
- Request / ticket: Project Task "Agent Runtimes: allow account sign-in (Codex and others) for runtimes on a Docker/remote node" (2026-10-21)
- Requested by: `/project_task_manager` (run `project_task_manager_21a48907070a400cb84ae3c055534692`), for the user
- Requirements owner: Solution Designer
- Date: 2026-10-21
- Approved by and reference: Solution Designer within the direction (user informed). The Task sets the direction ("the user can sign it in on a Docker/remote node from the app's Agent Runtimes page, using the node's own browser (seen through VNC) or another workable flow"); no decision below needs the user. Reference: the Solution Designer's conversation note of 2026-10-21 (SR-001) and the handoff file `handoff.md`. The user then confirmed the scope in the Solution Designer conversation on 2026-10-21 (SR-003, UD-001): the feature must work on all nodes, not only the embedded node; "every node with a screen" is "fine for now", and headless-node sign-in is not needed now.
- Exact approved requirements baseline / solution revision: this document at SR-001.
- Behavior-defining supplements: none.

## Answer To The User's Question (summary of evidence E-01, E-02, E-07)

- **Why Sign in is missing on the Docker node.** The first version of Agent Runtimes (ticket `runtime-lifecycle-review`, decision D-3) made remote nodes "status only". It assumed the browser is always on the user's desktop while the runtime runs on the node, so a remote sign-in would need codes shown in the app. The web page hides the button; the node's server would have accepted the sign-in. Docker nodes have their own Chromium, and the image already sends every browser-open on the node to it. With the button hidden, there was no way in.
- **Why some runtimes have in-app sign-in and others don't.** Codex (`codex login`) and Grok (`grok login --oauth`) have their own browser login, and their vendors allow local apps to start it. Claude has the same kind of login, but Anthropic does not allow third-party products to offer claude.ai login without its approval, so by the user's decision (UD-006) the page only shows "Sign in from its command line." Antigravity has no login command (sign-in exists only in its interactive `agy` screen), and Google's position is unclear, so also command line by the user's decision (UD-008). These are vendor and policy reasons, not node reasons.
- **The chat's "An Error Occurred / Reconnecting… n/5".** Confirmed from the node's log: Codex got `401 Unauthorized` from OpenAI six times (one try plus its five retries) at the time of the chat. Codex on that node is not signed in. Signing in fixes it (AC-007). That the chat does not say "not signed in" is follow-up FU-001.

## Problem And Desired Outcome

- Problem: in a window bound to a remote node, the Agent Runtimes page shows runtimes as Not signed in but offers no way to sign them in, so agents on that node cannot use them.
- Affected actors or systems: the user in a remote-node window; the node's server and vendor CLIs; the node's desktop browser.
- Desired outcome: where a runtime has in-app sign-in (Codex, Grok), the user can sign it in on a remote node from the page. The vendor's page opens in the node's own browser, which the user reaches through the app's VNC Viewer. The row then shows Signed in.
- Observable definition of success: on the user's running Docker node, Codex and Grok go from Not signed in to Signed in through the page, and a Codex agent on that node answers without the reconnect errors.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Remote-node window: no Sign in for any runtime | Codex/Grok rows offer Sign in when the node can show a browser on its own desktop; the sign-in runs on the node and opens in that browser | Same operation states, time-out, Cancel and privacy as on the own node | E-01, E-03, E-04, E-08 |
| BEH-002 | User | SCN-003 | Remote note "Status only. Update these runtimes on that node's computer." | On a node that can show a browser, the note says that sign-in opens the browser on that node (VNC Viewer) and that updates happen on the node's computer; on a node that cannot, the note is unchanged | No Update on remote nodes | E-03, E-06 |
| BEH-003 | User | SCN-004 | Remote node: no command-line hint for Claude/Antigravity | On a node that can show a browser, signed-out Claude and Antigravity show "Sign in from its command line on that node." | No Claude or Antigravity Sign in button (UD-006, UD-008) | E-02, E-10 |
| BEH-004 | System | SCN-005 | A node without a desktop: no Sign in (all remote nodes) | Still no Sign in, no hint, unchanged note | — | E-09 |
| BEH-005 | User | SCN-006 | Own node: Sign in for Codex/Grok, hints for Claude/Antigravity, Update | Unchanged | All own-node behavior | E-03 |
| BEH-006 | System | SCN-001 | Codex agents on a signed-out node fail with "Reconnecting… n/5" | After sign-in, new Codex messages on that node work | — | E-07 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User in a remote-node window | Make the node's runtimes usable | Sign in Codex/Grok from the page, finish in the node's browser | No credentials or sign-in URLs pass through AutoByteus |
| Node server | Runs the vendor login on its own machine | Starts and ends the vendor process; reports the account | One operation per runtime; 10-minute time-out |
| Vendors | Own their login | Their own command and page are used | Claude and Antigravity policies respected |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Sign in Codex or Grok on a remote node from Settings → Agent Runtimes, finishing in the node's own browser | SCN-001, SCN-002 |
| UC-002 | Know from the page where sign-in happens on a remote node, including for Claude and Antigravity | SCN-003, SCN-004 |
| UC-003 | A remote node that cannot show a browser stays status only | SCN-005 |

### Out Of Scope

- Update on remote nodes (D-3's reason still holds: Docker runtimes live in the image and an update is lost when the container is re-created, E-06).
- In-app sign-in for Claude or Antigravity on any node (UD-006, UD-008).
- Device-code or URL/code display in the app for nodes without a desktop (DEC-002; follow-up FU-002).
- Opening the VNC Viewer from the Settings page, or a VNC view inside Settings.
- Changing the chat's error text for runtime authentication failures (FU-001).
- Changes to the Docker image, its browser bridge or compose files.
- Who may call a node's GraphQL API (remote-access policy unchanged).

### Non-Goals

- Detecting whether the user can actually see the node's desktop (for example whether a VNC host is configured). The page tells the user where the browser opens.

### Preserved Behavior Boundary

- BEH-005: all own-node behavior of `runtime-lifecycle-review` (its REQ-001…REQ-006, AC-001…AC-009, AC-011), including the privacy rule (no sign-in URL, code, token or account detail reaches the page, the API, logs or storage).
- Remote nodes keep the same rows and statuses (that ticket's AC-010), with no Update.

### Prerequisites

None. The server already accepts sign-in on any node and the Docker image already opens browser requests in its Chromium (E-04, E-05, E-08).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | In a remote-node window, when the node can show a browser on its own desktop (REQ-002), a signed-out Codex or Grok row offers **Sign in**. Pressing it starts that runtime's own login on the node. The vendor's page opens in the node's browser. The row shows "Finish signing in to <Runtime> in the browser on that node (VNC Viewer)." with **Cancel**. It ends at Signed in, or after 10 minutes at "Sign-in didn't finish. Try again.". Signing-in, Cancel, retry and announcement behave as on the own node. | BEH-001, BEH-006 | Must | The Task's goal | Task; DEC-001, DEC-004 |
| REQ-002 | Each node reports whether its runtimes' logins can open a browser on that node's own desktop. A node from the AutoByteus server Docker image (VNC desktop with Chromium) reports yes. A node without a desktop display reports no. The own node is always treated as yes. | BEH-001, BEH-004 | Must | A Sign in that cannot open a browser only waits 10 minutes (E-09) | DEC-002, DEC-003 |
| REQ-003 | The remote note reads "Sign-in opens the browser on that node; finish it in the VNC Viewer. Update these runtimes on that node's computer." when the node can show a browser, and keeps "Status only. Update these runtimes on that node's computer." when it cannot. | BEH-002 | Must | Tell the user where to finish | DEC-004 |
| REQ-004 | In a remote-node window whose node can show a browser, a signed-out Claude or Antigravity row shows "Sign in from its command line on that node." with no button. | BEH-003 | Should | Explains on the page why these two have no button and where to sign in | DEC-005 |
| REQ-005 | Remote-node windows still offer no Update and no blocked-update line. | BEH-002 | Must | D-3 reason holds (E-06) | DEC-006 |
| REQ-006 | Own-node behavior is unchanged. | BEH-005 | Must | Preserve shipped behavior | Preserved boundary |
| REQ-007 | All new copy exists in English and Simplified Chinese. The user and server docs for Agent Runtimes describe remote sign-in. | BEH-001…BEH-004 | Must | Existing localization and docs rules | Existing page |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, SCN-001 | Window bound to a Docker node; Codex installed and signed out; user presses Sign in on Codex | Codex's sign-in page opens in the node's Chromium (visible in the VNC Viewer); row shows "Signing in…", the remote waiting text and Cancel; after the user finishes in that browser the row shows Signed in and "Codex is signed in." is announced | Cancel → back to Sign in; 10 minutes without finishing → "Sign-in didn't finish. Try again." | Real Docker node: page opening via a throwaway node (no account); Signed in with the user's account on his running node |
| AC-002 | REQ-001, REQ-002 | BEH-001, SCN-002 | Same, for Grok | xAI's sign-in page opens in the node's Chromium; same states; ends Signed in | Same as AC-001 | Same as AC-001 |
| AC-003 | REQ-003 | BEH-002, SCN-003 | Open the page in a window bound to a Docker node | Note: "Sign-in opens the browser on that node; finish it in the VNC Viewer. Update these runtimes on that node's computer."; no Update button, no blocked-update line | — | Browser probe + unit tests |
| AC-004 | REQ-004 | BEH-003, SCN-004 | Same window; Claude and Antigravity signed out | Each shows "Not signed in" and "Sign in from its command line on that node."; no button | — | Browser probe + unit tests |
| AC-005 | REQ-002, REQ-003 | BEH-004, SCN-005 | Window bound to a node that reports it cannot show a browser | Same as today: note "Status only. Update these runtimes on that node's computer.", no Sign in, no hint, no Update | — | Unit tests + server test of the node fact without a display |
| AC-006 | REQ-006 | BEH-005, SCN-006 | Own-node window | Unchanged: Sign in for Codex/Grok, "Finish signing in to <Runtime> in your browser.", hint "Sign in from its command line." for Claude/Antigravity, Update | — | Existing unit tests and settings probe stay green |
| AC-007 | REQ-001 | BEH-006, SCN-001 | After AC-001 on the user's Docker node | A new message to a Codex agent on that node gets an answer, with no "Reconnecting… n/5" error | — | User's running node, real account |
| AC-008 | REQ-007 | all | Switch the app to Simplified Chinese | All new texts translated; docs describe remote sign-in | — | Unit test of catalogs; docs review |
| AC-009 | REQ-001 | BEH-001 | During and after a remote sign-in | No sign-in URL, code, token or account detail in the page, GraphQL responses, server logs or AutoByteus storage | — | Probe scan as in the earlier ticket |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Evidence / Decision | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User in a Docker-node window | Make Codex usable on that node | Settings → Agent Runtimes, Codex Sign in | Codex signed out | Press Sign in → go to the workspace's VNC Viewer → finish in the node's Chromium → back on the page | Signed in; Codex agents on the node work | Cancel; time-out; closing the vendor tab → time-out | Supported Normal Scenario | Task; E-08 | REQ-001, AC-001, AC-007 |
| SCN-002 | User | Same | Make Grok usable | Grok Sign in | Grok signed out | Same as SCN-001 | Signed in | Same | Supported Normal Scenario | Task; E-08 | REQ-001, AC-002 |
| SCN-003 | User | Same | Know where sign-in and updates happen | Opening the page | — | Read the note | Understands sign-in opens on the node | — | Supported Normal Scenario | E-03 | REQ-003, AC-003 |
| SCN-004 | User | Same | Sign in Claude or Antigravity | Opening the page | Signed out | Read the hint; sign in from the node's command line (the app's Terminal, or the node's own terminal) | Signed in after Check again | — | Supported Normal Scenario | E-02, E-10, UD-006, UD-008 | REQ-004, AC-004 |
| SCN-005 | User | User in a window bound to a remote AutoByteus server without a desktop | See status | Opening the page | Node has no display | Read the page | Status only, as today | — | Supported Explicit Edge Scenario (any reachable AutoByteus node may be registered, Nodes page) | E-09 | REQ-002, AC-005 |
| SCN-006 | User | User in the own-node window | Unchanged behavior | Opening the page | — | As shipped | As shipped | As shipped | Supported Normal Scenario | earlier ticket | REQ-006, AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes (copy and visibility on an approved page; no new layout)
- Linked UI/UX or interaction supplement: N/A — not applicable (no Product Design requested). The layout of the shipped page (`runtime-lifecycle-review` UI/UX spec VIS-001…023) stays; the remote row uses the own-node row's controls.
- Product ticket record, design repository, user-confirmation, visual baseline: N/A — not applicable.
- Normative details: texts in REQ-001, REQ-003, REQ-004 (English); Chinese translations follow the existing catalog style.
- Product decisions that need the user: none.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | AC-009 | Privacy | No sign-in URL, code, token or account detail leaves the vendor process to AutoByteus surfaces | Remote and own node | Probe scan |
| QR-002 | REQ-002 | Reliability | Reading the node fact starts no process and does not slow the page's 2 s/10 s polling | All nodes | Unit tests |
| QR-003 | AC-008 | Accessibility | New texts follow the existing row semantics (status role, live-region announcement, button labels) | Remote rows | Unit tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: No AutoByteus data. Vendor credentials are written by the vendor CLI in the node's home (on Docker nodes the `/root` volume, which survives container re-creation).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `codex login`, `grok login --oauth` | Open the node's browser; loopback callback | E-08 | Completion with a real account checked at verification |
| AutoByteus server Docker image | `BROWSER` bridge to the VNC Chromium | E-05 | — |
| Vendor terms | Codex local use allowed; Claude/Antigravity not offered | earlier E-R09/E-R21 | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/SD-probe-remote-signin.sh` | Reproduction on a throwaway Docker node | AC-001, AC-002 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user reaches the node's desktop through the workspace's VNC Viewer (the node's `AUTOBYTEUS_VNC_SERVER_HOSTS` is set, as the shipped compose does) | Where the user finishes sign-in | Verified on the user's node (E-06) | Holds for the user's node |

## User Decisions

- **UD-001** (2026-10-21, Solution Designer conversation): Sign in must not be limited to the embedded node ("this feature should be available for all node. not just embeded node"). Offered scope: every node that can open a browser on its own screen (all Docker nodes, other desktops, own node); headless servers stay status only. User: "thats fine for now. no need for the follow up. … if there is a need of follow up, then thats would be fine" → no change to REQ/AC; FU-002 not pursued now.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | How does sign-in on a remote node work? | Core of the Task | (a) the vendor's own browser login on the node, opening in the node's browser; (b) device code with URL and code shown in the app | (a) works today on Docker nodes (E-08), is the flow the Task names, keeps the privacy rule (nothing shown in the app) and reuses the shipped operation. (b) would need new UI and break the privacy rule. **(a).** | Solution Designer | Decided |
| DEC-002 | What happens on a remote node that has no desktop? | A button there would wait 10 minutes and fail (E-09) | Hide Sign in / show it anyway / device code | Hide it and keep today's status-only page. Confirmed by the user 2026-10-21 (UD-001): "thats fine for now. no need for the follow up"; device-code sign-in for headless nodes is not pursued now (FU-002 withdrawn). | Solution Designer; confirmed by User | Decided |
| DEC-003 | Is the own node also subject to the "can show a browser" fact? | Regression risk | Use the fact everywhere / own node always yes | The own node is the desktop the user is looking at; its sign-in already works. Always yes, so own-node behavior cannot regress. | Solution Designer | Decided |
| DEC-004 | Remote copy | The user must know to finish in the VNC Viewer | Texts in REQ-001, REQ-003 | Name the place ("the browser on that node", "VNC Viewer", the workspace tab's name) in short plain sentences like the page's other copy. | Solution Designer | Decided |
| DEC-005 | Claude/Antigravity hint on remote nodes | Today remote rows give no hint, which leaves the "why no button" question open | Show "Sign in from its command line on that node." / nothing | The reason for no button is the same on every node. The node's command line exists (the app's Terminal, E-10). Show the hint on nodes that can show a browser. On those nodes the vendor page also opens there. | Solution Designer | Decided |
| DEC-006 | Update on remote nodes | Not requested | Keep hidden | Docker runtimes live in the image; an update is lost on container re-creation (E-06). Keep hidden. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-006 | AC-001, AC-002, AC-007, AC-009 | SCN-001, SCN-002 | E-04, E-08 |
| REQ-002 | UC-001, UC-003 | BEH-001, BEH-004 | AC-001, AC-002, AC-005 | SCN-001, SCN-005 | E-05, E-09 |
| REQ-003 | UC-002 | BEH-002 | AC-003, AC-005 | SCN-003 | E-03 |
| REQ-004 | UC-002 | BEH-003 | AC-004 | SCN-004 | E-02, E-10 |
| REQ-005 | UC-002 | BEH-002 | AC-003 | SCN-003 | E-06 |
| REQ-006 | — | BEH-005 | AC-006 | SCN-006 | earlier ticket |
| REQ-007 | UC-001, UC-002 | all | AC-008 | all | — |

## Architecture Phase Input

- Approved scenarios: SCN-001…SCN-006.
- Constraints: privacy rule; one operation per runtime; own node unchanged; no Docker image change.
- Deferred to design: how the node decides "can show a browser"; where the fact is exposed; how the client combines it with own node.
- Facts to verify: the Electron embedded server's environment does not matter (DEC-003).
- Risks: R-01, R-02 (real-account completion).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: Yes
- Desired and preserved behavior are explicit: Yes
- Scope and non-goals are clear: Yes
- Requirements and acceptance criteria are testable and traceable: Yes
- Applicable scenarios are covered with validity and evidence: Yes
- Product design and supplemental evidence is integrated consistently: N/A
- Applicable UI/UX approval and final visual-reference basis are recorded: N/A
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: Yes
- Content ready for approval: Yes
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: Yes (Solution Designer within the direction, user informed)
- Exact requirements and supplement approval basis recorded: Yes (SR-001)
- Approved requirements package ready for architecture design: Yes
- Remaining blocker: none
