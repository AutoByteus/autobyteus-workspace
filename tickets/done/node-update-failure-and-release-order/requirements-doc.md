# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `node-update-failure-and-release-order` (autobyteus-412)
- Request / ticket: Project Task `autobyteus-412` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. Two follow-ups of the node update flow, found around autobyteus-405 (S1) and beta v1.5.12-beta.5: FU-003 (a stale "Automatic update failed" on the node card) and FU-004 (the desktop release becomes available before its server packages).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-07
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's conversation message of 2026-11-07 that informs the user of DEC-001 to DEC-006 (SR-001).
- Exact approved requirements baseline / solution revision: this document at SR-001.
- Behavior-defining supplements and their approved versions: None.

## Problem And Desired Outcome

- Problem:
  1. **FU-003.** The desktop keeps one record per node of its last automatic update attempt. It changes an entry only while that entry is `PENDING`. Once an attempt at version V ends `AUTO_FAILED`, nothing changes it until the desktop itself moves to a newer version. The node card therefore keeps showing "Automatic update failed" with the node's reason after the node was updated to V another way: the card's own "Update to V" button, `autobyteus-docker update`, or a new image. The same entry also hides the card's own success notice for V (`autoReported`). Reproduced on the user's desktop on 2026-11-07: both Docker nodes run `1.5.12-beta.7`, and their beta.7 update succeeded at 12:42. The record still says `AUTO_FAILED` for beta.7, with "No server package was published for 1.5.12-beta.7 (linux-arm64)".
  2. **FU-004.** A tag push starts the release workflows independently. Desktop Release uploads the desktop files with the `latest*.yml` updater files, and electron-updater offers the version as soon as those files exist. Server Docker Release uploads the signed server packages later, and sometimes much later: beta.5 got them 14–15 min after the updater files, beta.7 25–26 min after, and only beta.6 had them first. A desktop that updates itself in that window then asks its nodes for V 2 minutes after it starts. The node accepts the request, finds no package and refuses with `NO_PACKAGE_FOR_VERSION`. The desktop records `AUTO_FAILED` and, by the one-attempt-per-version rule, never asks for V again. This happened on the user's desktop at beta.5 and again at beta.7: the attempt at 12:05:28, the arm64 package at 12:12:48.
- Affected actors or systems: the desktop user with Docker nodes and "Update automatically" on; the desktop main process's automatic node updates; the Nodes page node card; the release workflows (Desktop Release, Server Docker Release); the release operator (Delivery Engineer) following RELEASE.md.
- Desired outcome: a desktop version is offered to desktops only once the server packages its automatic node updates need are on the release. The node card never keeps an automatic-update failure for a version the node already runs.
- Observable definition of success: for a new tag, the release's `latest*.yml` files appear only after the six server package files. A node card whose node runs the failed version, or a newer one, shows no "Automatic update failed".

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | An `AUTO_FAILED` entry for V stays until an automatic attempt at a newer desktop version replaces it, even when the node already runs V (`reconcileNodeAutoUpdate` returns null for any non-`PENDING` entry) | An `AUTO_FAILED` entry for V is cleared once the desktop learns that the node runs V or a newer version | A failure for V stays while the node still runs an older version; one automatic attempt per version per node; no downgrade | investigation-notes.md SRC-03, RUN-01, RUN-02 |
| BEH-002 | User | SCN-001, SCN-002 | The card shows "Automatic update failed" with the reason. It also hides the card's own result notice for V, because an ended automatic entry for V exists | The card shows no automatic-update failure for a version the node runs or has passed. Its own notices show as they would with no automatic outcome | The card's switch, explanation, "Updated automatically to V" and a still-valid failure are unchanged | SRC-04, SRC-05 |
| BEH-003 | Operational | SCN-003 | Desktop Release publishes the updater files as soon as its builds finish, whether or not the server packages exist (no dependency between the workflows) | Desktop Release publishes the `latest*.yml` updater files only after both architectures' server packages (archive, description, signature) are on the release. When they do not appear within a bounded time, the job fails with a message naming what is missing, and the updater files are not published | The four workflows still start on the tag push; the 23 assets are unchanged; the Server Docker Release's own wait for the release is unchanged; the build-only run (`pnpm release:test`) publishes nothing | SRC-06, SRC-07, MEAS-01 |
| BEH-004 | System | SCN-003 | Desktops on the release's channel see V as soon as the updater files exist (electron-updater reads the newest release's `latest*.yml`) | Desktops see V only after its server packages exist. Until then a check finds the release still without updater files, as it already does today between release creation and the desktop upload: a background check stays quiet, and a manual check says the update is still being prepared | The existing `release-preparing` handling and wording | SRC-08, SRC-09 |
| BEH-005 | Operational | SCN-004 | RELEASE.md describes the four workflows as independent and has no recovery for "packages missing" | RELEASE.md says that Desktop Release publishes the updater files only after the server packages, and how to recover when the server package job failed or was late (rerun it, then rerun the desktop publish job) | Tag rules ("Never move or delete a published tag"), triage and the rest of the recovery | SRC-10 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user with nodes | Know truthfully whether the nodes follow the desktop | No stale failure; nodes updated automatically after a release | Automatic updates stay opt-in and off by default (autobyteus-356) |
| Desktop main process | Updates nodes to the desktop's version | Never asks for a version whose packages are not published yet, on the normal release path | One attempt per version per node for real failures |
| Release operator | Publishes complete releases | A clear failure and a recovery path when the packages are missing | Never move or delete a published tag; release only on the user's word |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The desktop clears a node's automatic-update failure once the node runs the failed version or newer | SCN-001, SCN-002 |
| UC-002 | The Nodes page node card shows the corrected state | SCN-001, SCN-002 |
| UC-003 | A tag's Desktop Release makes the desktop available only after the server packages are on the release | SCN-003 |
| UC-004 | RELEASE.md describes the ordering and its recovery | SCN-004 |

### Out Of Scope

- Retrying an automatic node update that the node refused with `NO_PACKAGE_FOR_VERSION` (DEC-002: not worth it once UC-003 holds).
- Holding back the desktop installers (`.dmg`, `.zip`, `.exe`, AppImages) or the Android APK until the packages exist; DEC-003.
- Notification Center rows for node outcomes (autobyteus-356 FU-001), duplicated generated notes (356 FU-007), any other open 356 follow-up.
- The node starter's update gates, the C1 contract, and the launcher.
- iOS and Android release behavior.

### Non-Goals

- Shortening the Server Docker Release.
- Guaranteeing that a desktop installed by hand from the release page before the packages exist updates its nodes automatically (DEC-003).

### Preserved Behavior Boundary

- Automatic node updates stay opt-in, off by default, packaged builds only, remote entries only (autobyteus-356).
- One automatic attempt per version per node; no downgrade; a window never starts a node update (356 REQ-004, REQ-006).
- `AUTO_UPDATED` and `PENDING` handling unchanged; a failure whose version the node has not reached keeps showing.
- The record file stays readable by and compatible with the current reader (tolerant read).
- Release: the four workflows, their triggers, the 23 assets, pre-release rules, curated or generated notes and the build-only run (`release:test`) unchanged apart from BEH-003.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When the desktop learns that a node runs version V or a newer version, and its automatic-update record for that node is `AUTO_FAILED` for V, the record no longer holds that failure. Clearing it is not "Updated automatically", because the update did not come from the desktop. The desktop learns this from any of its answers from the node, whichever route updated the node. | BEH-001 | High | FU-003; the failure no longer describes the node | N/A | Task FU-003; DEC-004, DEC-005 |
| REQ-002 | The node card never shows "Automatic update failed" for V once it has the node's answer that the node runs V or a newer version. This holds whether the node's switch is on or off, and right after the card's own update of the node succeeds. Its own notices then show as they would with no automatic outcome. | BEH-002 | High | What the user saw; the card already asks the node | N/A | DEC-006 |
| REQ-003 | A failure for V whose node still runs an older version stays as today, and the one-attempt-per-version rule is unchanged. | BEH-001 | High | Preserved 356 behavior | N/A | Preserved |
| REQ-004 | For a tag, the Desktop Release publishes the `latest*.yml` updater files only after the server package archive, description and signature for both `linux-x64` and `linux-arm64` are on that GitHub release. | BEH-003, BEH-004 | High | FU-004 at the earliest stage that can cause it; electron-updater offers a version only through these files | Read: electron-updater 6.8.3 `GitHubProvider` throws `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND` when the newest release has no channel file; MEAS-01 shows the race | Task FU-004; DEC-001 |
| REQ-005 | That wait is bounded. When the packages do not appear in time, the publish job fails with a message naming the tag and the missing files, and the updater files stay unpublished. A rerun of the publish job after the packages exist completes the release. | BEH-003, BEH-005 | High | A visible, recoverable partial release instead of a hang or a silent publish | N/A | DEC-001 |
| REQ-006 | Releases and re-publishes for which no server packages exist (refs that predate server packages, the zh variant's runs) are not blocked by the wait. | BEH-003 | Medium | Manual re-publish of historical tags stays possible | N/A | Preserved release behavior |
| REQ-007 | RELEASE.md states the ordering (updater files after server packages) and the recovery for missing or late server packages. | BEH-005 | Medium | The release guide is the operator's authority | N/A | Project documents rule |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Record `AUTO_FAILED` for V; the node answers that it runs V | After the desktop's next answer from that node, the record holds no `AUTO_FAILED` for V and the outcome is not `AUTO_UPDATED` | Node answers it runs a version older than V: entry unchanged (AC-004) | Unit tests of the record rule; an isolated packaged desktop with an isolated node |
| AC-002 | REQ-001 | BEH-001, SCN-002 | Record `AUTO_FAILED` for V; the node runs a version newer than V | Same as AC-001 | — | Unit test |
| AC-003 | REQ-002 | BEH-002, SCN-001 | Nodes page open; the card's node has `AUTO_FAILED` for V and runs V (switch on or off; also right after the card's own "Update to V" succeeded) | No "Automatic update failed" on the card once the card has the node's answer; the card's own success notice for V shows when this window followed the update | — | Component tests; the isolated desktop run |
| AC-004 | REQ-003 | BEH-001 | Record `AUTO_FAILED` for V; node runs older than V | The failure still shows, and the desktop does not request V again | — | Existing and new unit tests |
| AC-005 | REQ-004 | BEH-003, BEH-004, SCN-003 | A tag release whose server packages arrive after the desktop builds finish | The release's `latest*.yml` assets are uploaded after all six server package files (asset `createdAt` order) | Packages already present: no wait | Test of the wait logic against a fake release; the upload order checked on the first real release that uses it |
| AC-006 | REQ-005 | BEH-003, SCN-004 | Packages never appear | The publish job fails after the bounded wait with a message naming the tag and the missing files; no `latest*.yml` is on the release | A rerun after the packages appear publishes them | Test of the wait logic (timeout path) |
| AC-007 | REQ-006 | BEH-003 | A ref without server packages (no `autobyteus-server-ts/docker/system-level.json`) | The publish is not held by the wait | — | Test / review of the condition |
| AC-008 | REQ-007 | BEH-005 | — | RELEASE.md's rollout and recovery sections describe the ordering and recovery | — | Review |
| AC-009 | Preserved | Preserved Behavior Boundary | — | Auto updates stay off by default; existing automatic node-update and updater tests pass; `release:test` still publishes nothing | — | Existing test suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | Update a node whose automatic update to V failed | The card's "Update to V", `autobyteus-docker update`, or a launcher image upgrade | Card shows "Automatic update failed" for V | User updates the node to V; the desktop's or the card's next answer shows V | No failure shown; record cleared | Update fails again: the node's own notice shows | Supported Normal Scenario | User's desktop 2026-11-07 (RUN-01, RUN-02) | REQ-001–003; AC-001, AC-003 |
| SCN-002 | System | Desktop main process | Node moved past V by another route | A pass, a follow, or the card asking the node | `AUTO_FAILED` for V; node runs > V | Desktop reads the node's version | Failure cleared | — | Supported Normal Scenario | 356 design (passes and follows read the node) | REQ-001; AC-002 |
| SCN-003 | Operational | Tag push (Release Guide) | Publish a release whose desktops update their nodes | `v*` tag push | Four workflows start | Desktop builds finish → desktop binaries uploaded → wait for server packages → updater files uploaded → desktops update → nodes update | Nodes find the package at the first automatic attempt | Packages late: the desktop is offered later | Supported Normal Scenario | MEAS-01; RELEASE.md Watching The Rollout | REQ-004; AC-005 |
| SCN-004 | Operational | Release operator | Recover a release whose server packages are missing | Server package job failed or was late | Desktop publish job failed after its wait | Rerun the server job's failed jobs → rerun the desktop publish job | Release complete (23 assets) | — | Supported Explicit Edge Scenario | RELEASE.md Recovery | REQ-005, REQ-007; AC-006, AC-008 |
| SCN-005 | User | Desktop user | Install V by hand from the release page before its packages exist, with auto node updates on | Download from the release page | — | Desktop V asks nodes for V → `NO_PACKAGE_FOR_VERSION` → `AUTO_FAILED` | Failure shown with the reason; after the packages land the user clicks "Update to V" and REQ-001/002 clear it | — | Technically Possible but Unsupported/Contrived as an automatic path (DEC-002/003) | DEC-002 | — |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`, limited to removing a stale line (REQ-002). No new UI, wording or state.
- Product Design fields: `N/A — not applicable` (no Product Design requested).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005 | Operability | The wait is bounded, long enough for a normal Server Docker Release: the measured package lag after the desktop updater upload was up to 26 min (beta.7), and the package job itself may take up to 30 min to see the release | Tag releases | Design records the bound and its basis |
| QR-002 | REQ-001, REQ-002 | Compatibility | Existing `node-auto-updates.json` files are read unchanged; the stale beta.7 entries on the user's desktop are cleared by REQ-001 once the desktop runs a build with the fix | Desktop upgrade | Unit test with a stored file |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`: `<userData>/node-auto-updates.json` (desktop).
- Data that must be preserved: the entries of nodes not covered by REQ-001.
- Acceptable loss: a cleared `AUTO_FAILED` entry (it no longer describes the node).
- Constraints: none beyond the existing tolerant read and atomic write.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| electron-updater 6.8.x GitHub provider | Offers a version only when the newest release has the channel file | `GitHubProvider.js` lines 51–121, 114 | Low |
| C1 `GET /rest/node-update?target=V` | Gives the node's `version` and `target.relation` | `shared/nodeUpdateContract.ts` | Frozen contract |
| GitHub Releases / `gh release` | Asset list and `createdAt` | MEAS-01 | Low |

## Supplemental Artifacts

None.

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The Android release (or the desktop's own binary upload) creates the GitHub release early, so the server package job's wait for the release is met before the desktop publish job waits for the packages | No circular wait | Design confirms the order inside the desktop publish job | Open, for design |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does FU-004's fix belong? | The Task leaves it to the team: the earliest stage that can reproduce it | (a) release workflow: updater files after packages; (b) desktop treats a missing package as "not yet" and retries; (c) both | The race is created by the release workflows (MEAS-01), so (a) removes the cause for every desktop on the normal path. It keeps the node and desktop versions together, which S1 requires for the node desktop. (b) would still leave nodes behind for up to an hour (the pass interval) after every such release. **(a).** | Solution Designer | Decided |
| DEC-002 | Also add the desktop retry (lead b)? | The Task's "explain why one is not worth it" | Remaining paths under (a): a desktop installed by hand from the release page in the gap, or an operator replacing package assets (seconds) | Under (a) a desktop can only update itself to V after V's packages exist. The leftover paths are hand actions, and REQ-001/002 already make their outcome truthful and recoverable: the reason is shown, then "Update to V" clears it. The retry would change 356's one-attempt rule for one code and add record/decision states for a path that no longer occurs automatically. **Not now; recorded as a follow-up candidate.** | Solution Designer | Decided |
| DEC-003 | Hold back the installers and the APK too? | They are public before the packages | Holding all desktop assets means creating the release ourselves before waiting, and touching release creation and notes (356 FU-007) | Only the updater files make desktops update themselves, which is the failing path. **Hold only `latest*.yml`.** | Solution Designer | Decided |
| DEC-004 | What does the card show instead of the cleared failure? | Visible wording | "Updated automatically to V" would be untrue | **Nothing on the automatic line**; the card's own notices as with no automatic outcome | Solution Designer | Decided |
| DEC-005 | Clear on "the node runs V or newer", or on any later successful update? | An update to an older intermediate version leaves V unreached | — | The failure is about V; it stays true until V is reached. **V or newer.** | Solution Designer | Decided |
| DEC-006 | How promptly must the card change? | Passes run hourly and only for nodes with the switch on | The card already asks the node when it is shown | The card is the only place the failure is shown, so the card's own answer decides what it shows. **At once on the card; the record is cleared no later than the desktop's next answer from that node.** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001, SCN-002 | — |
| REQ-002 | UC-002 | BEH-002 | AC-003 | SCN-001 | — |
| REQ-003 | UC-001 | BEH-001 | AC-004 | SCN-001 | — |
| REQ-004 | UC-003 | BEH-003, BEH-004 | AC-005 | SCN-003 | — |
| REQ-005 | UC-003 | BEH-003 | AC-006 | SCN-004 | — |
| REQ-006 | UC-003 | BEH-003 | AC-007 | SCN-003 | — |
| REQ-007 | UC-004 | BEH-005 | AC-008 | SCN-004 | — |

## Architecture Phase Input

- Scenarios to map: SCN-001 to SCN-004.
- Constraints: Preserved Behavior Boundary; never move or delete a tag; no release in this ticket.
- Deferred to design: where the clearing rule lives and how the card and the main process share it; the version comparison for "newer than V"; the wait's bound, poll interval and location (a step or a script); how the wait is tested without a release.
- Technical facts to verify: ASM-001; how softprops/action-gh-release behaves when the updater files are uploaded in a later step; whether a release-version comparator exists in `autobyteus-web`.
- Risks: a longer gap before desktops see a release (acceptable; BEH-004).

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

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
