# Requirements Document

## Document Status

- Status: `Approved` at `SR-003` (SR-003 integrates the user-approved Product UI/UX package as the behavior-defining UI supplement, with three Solution Designer readings: DEC-014..DEC-016)
- Current solution revision ID: `SR-003`
- Package identifier: `settings-update-notifications`
- Request / ticket: Notification area in Settings: tell users when the app, a GitHub agent package or a GitHub skill source has an update (check in the background, notify, never update by itself)
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-20
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-20
- Approved by and reference: SR-001 `Solution Designer within the direction (user informed)`, reference: the Solution Designer's message to the user of 2026-10-20. SR-002 deltas: `User`, reference: the user's own words in the Product ticket (`autobyteus-web-design`, branch `design/settings-update-notifications`, `tickets/in-progress/settings-update-notifications/product-ticket.md`, rounds 6–7, 9–10 and 11–12, and its "Requirement Impact" section), relayed by `/project_task_manager` on 2026-10-20
- Exact approved requirements baseline / solution revision: this document at `SR-003`
- Behavior-defining supplements and their approved versions: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` with final references `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/visual-references/` (VIS-001..028), design repository `personal` at `288ef06` (approved round 14, commit `e6ef28c`); user approval "i like the UI approved", 2026-10-20

## Problem And Desired Outcome

- Problem: Users import public agent packages and skill sources from GitHub that improve quickly, but AutoByteus only checks them when the user opens Settings → Agent Packages or the skill source dialog. Users who don't open those pages never learn that an update exists, so their packages stay old. An app update is announced by a card that pops up on its own at every launch, which is the opposite of the quiet experience the user wants.
- Affected actors or systems: desktop users; browser users of a server node; the server node (embedded or remote) that owns packages and skill sources; the desktop shell that owns app updates; GitHub (`api.github.com`, GitHub releases).
- Desired outcome: a small, quiet notification area (a Notification Center panel opened from the sidebar's Settings row) that tells the user when the app, an imported GitHub agent package or an imported GitHub skill source has an update, found by a background check the user can turn off; each notification says what changed and offers the existing explicit Update; nothing is ever updated without the user's action.
- Observable definition of success: in an isolated app with test data, a real background check produces an app-update, a GitHub-package and a GitHub-skill-source notification; an indicator on the sidebar's Settings row shows they are waiting; Update from a notification updates only on the user's action; turning the setting off stops background requests; read, handled and cleared states survive restarts.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-004 | Opening Settings → Agent Packages checks all GitHub packages; rows show status | Any check that finds an update also creates or refreshes that package's notification | The on-open check, row statuses, row Check/Update actions | AgentPackagesManager.vue; agent-package-service.ts |
| BEH-002 | User | SCN-003 | Package Update downloads, validates and replaces only on the user's press; failure keeps the package | The same update is reachable from the notification | Whole update pipeline, rollback and `UPDATE_FAILED` semantics | agent-package-service.ts |
| BEH-003 | User | SCN-003, SCN-004 | Opening Manage skill sources checks all GitHub sources; Update needs a confirmation (local edits replaced) | Same as BEH-001 for skill sources; the notification's Update keeps the confirmation | The confirmation and its warning; the update pipeline | SkillSourcesModal.vue; skill-source-service.ts |
| BEH-004 | System | SCN-002 | Packaged app checks its feed 8 s after launch; never downloads by itself | The finding becomes the app-update notification | Startup check, channels (stable/beta), `autoDownload` off | appUpdater.ts |
| BEH-005 | System/User | SCN-002 | A floating card pops up bottom-right by itself when an update is available, during checks/downloads, after "no update" (3 s) and on errors; "Later" is forgotten at the next launch | The card no longer opens by itself; the app update is announced only in the notification area with the indicator; download progress and "restart to install" appear in the notification and in Settings → Updates | — (replaced, DEC-001) | AppUpdateNotice.vue; appUpdateStore.ts |
| BEH-006 | User | SCN-002 | Settings → Updates shows version, status, last checked, beta toggle, Check / Download / Install & restart | Unchanged; its result also keeps the app notification consistent | All of it | AboutSettingsManager.vue |
| BEH-007 | Operational | SCN-008 | Isolated (`e2e`) instances never check for app updates and stay quiet | Unchanged by default; an explicit test opt-in can point an isolated instance at a test update feed for verification | Quiet default | disabledAppUpdater.ts; isolated-app-instances.md |
| BEH-008 | System | SCN-001, SCN-007 | No background check of packages or skill sources | The node checks imported GitHub packages and skill sources in the background (start and periodically) while the setting is on | Built-in and local-path sources are never checked against GitHub | agent_packages.md ("no polling") |
| BEH-009 | User | SCN-001..SCN-006 | No current supported behavior (only transient toasts and chat notices) | A notification area with an indicator outside Settings; proposed target trigger: background or manual check finding an update; approval: SR-001 | — | grep; ToastContainer.vue |
| BEH-010 | System | SCN-005 | A failed check (e.g., offline) replaces a known `UPDATE_AVAILABLE` row status with `CHECK_FAILED` | A failed later check never removes a known update: the notification stays and the source's Update stays available; the failure is shown as the last check's result | Failure never changes files | agent-package-service.ts; skill-source.ts status derivation |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user | Keep app, packages and skills current | Notices waiting updates without opening Settings; updates on their own decision | Nothing changes silently |
| Browser user of a server node | Same for that node's packages and skills | Same, without the app notification | — |
| Privacy-conscious user | Control outbound calls | Can turn background checks off; knows what is contacted | No telemetry |
| GitHub | Rate-limited public API | Requests stay within limits and stop when limited | 60 req/h per IP unauthenticated |
| Later Tasks (opt-in auto update; other kinds) | Extend notifications | Add kinds without redesign | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The node checks imported GitHub agent packages and GitHub skill sources for updates in the background (shortly after start and periodically), within rate limits and quietly when offline | SCN-001, SCN-005, SCN-007 |
| UC-002 | The user sees a waiting update: an indicator outside Settings and a quiet notification area in Settings listing app, package and skill source updates with what changed | SCN-001, SCN-002 |
| UC-003 | The user updates from a notification through the existing explicit update of that kind | SCN-003 |
| UC-004 | Notifications stay consistent and don't pile up: one per source, replaced by a newer version, marked handled when updated, cleared by the user; read and handled states persist | SCN-004, SCN-006 |
| UC-005 | The user turns background checks off or on per node, with an honest description of the network calls | SCN-007 |
| UC-006 | The app update is announced through the notification area instead of a self-opening card | SCN-002 |
| UC-007 | An isolated app instance can be pointed at a test update feed to verify the app-update notification | SCN-008 |

### Out Of Scope

- Any automatic update (download, replace or install) of packages, skill sources or the app, including an opt-in automatic update (a separate Task waits for this one).
- Update checks or notifications for local-path packages, local skill folders, built-in packages, application packages (including GitHub-imported ones), MCP servers or other sources. The design must allow adding them later.
- A setting to turn off the app's own startup update check (unchanged behavior; recorded as a follow-up candidate).
- OS-level (system tray / Notification Center) notifications, sounds, e-mail or any pop-up.
- Authenticated GitHub access, private repositories, or a commit-list/diff summary fetched through the API.
- Changes to the skill-update notice feature (`skill_update_notices.md`), toasts for user-initiated actions, and chat system notices.
- Notifications in the mobile remote-access client.

### Non-Goals

- Not a general notification/inbox framework for arbitrary events in this ticket; only the three kinds, built so others can be added.
- No guarantee that every upstream commit is noticed promptly; a check cadence of hours is enough.

### Preserved Behavior Boundary

- BEH-001, BEH-002, BEH-003 preserved behavior columns: existing on-open checks, row actions, update pipelines, rollback and skill confirmation.
- BEH-004 and BEH-006: startup app check, channels, Settings → Updates controls.
- BEH-007: isolated instances stay quiet without the explicit test opt-in.
- Invariant: no code path downloads, replaces or installs anything without an explicit user action on that item (REQ-015).

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | While the background-check setting is on, each node checks every imported GitHub agent package and GitHub skill source for a newer default-branch revision without user action: a first pass shortly after the server starts (without delaying startup) and then periodically while it runs. Built-in and local sources are never checked. | BEH-008 | Must | Core need | User direction; DEC-003 |
| REQ-002 | A source is checked automatically at most once every 6 hours; a check of any kind (automatic or manual) counts. Restarting the app within that time does not trigger a new automatic check of that source. | BEH-008 | Must | Rate limits and restarts | DEC-003; QR-001 |
| REQ-003 | Background check failures (offline, timeout, rate limit, repository gone or private) create no notification, toast, prompt or error dialog. When GitHub reports a rate limit, the pass stops and no further automatic GitHub request is made before GitHub's reset time. | BEH-008, BEH-010 | Must | Quiet, offline-friendly, respects GitHub | DEC-006; QR-001 |
| REQ-004 | Whenever a check (automatic, or manual including the on-open checks) finds that a source's latest revision differs from the installed revision, that source has a notification showing: its kind, its name and repository, installed → latest short revision, when it was found, and a link to GitHub's compare page for the two revisions. The app-update notification shows the current → new version, the release notes when the feed supplies them, and a link to the release page. | BEH-001, BEH-003, BEH-004, BEH-009 | Must | "What changed" | DEC-005; DEC-011 |
| REQ-005 | At most one notification exists per source and one for the app. A newer revision or version found later updates that same notification to the newest one and makes it unread again; it does not add a second one. | BEH-009 | Must | No pile-up | User direction |
| REQ-006 | A failed later check never removes a known available update: the notification stays and the source's Update stays available (in the notification and on its row); the failure is shown as the last check's result. | BEH-010 | Must | Offline must not hide updates | DEC-007 |
| REQ-007 | A notification's Update runs the existing explicit update of its kind: package Update; skill source Update after its existing confirmation (local edits are replaced); app Download, then Install & restart. Progress and the result appear in the notification. A failure shows its error, leaves the source or app unchanged as today, and keeps the notification. | BEH-002, BEH-003, BEH-005 | Must | Reuse the trusted path | User direction; DEC-012 |
| REQ-008 | When a source or the app reaches (or passes) the notified revision or version by any path (notification, row, Settings → Updates), its notification is marked handled and stops counting as waiting. When a check finds the source up to date, an unhandled notification for it is resolved the same way. Removing a source removes its notification. | BEH-001..BEH-006 | Must | Handled state, consistency | User direction |
| REQ-009 | There is no dismiss or skip-this-version action, and no skipped-version state is stored. A waiting notification goes away only when its source or the app is updated (REQ-008) or when a newer version replaces it (REQ-005). A handled notification stays until the user clears it (Clear), a newer update replaces it, or its source is removed. | BEH-009 | Must | The user always updates to the latest; one notification per source already skips intermediate versions | User decision, Product review round 9–10 ("do we really need the skip? … I personally have never clicked a skip"); DEC-013 |
| REQ-010 | Notifications are unread until the user has seen them in the notification area; read ones stay listed until handled. Read, handled and cleared states persist across app and server restarts. | BEH-009 | Must | Kept states | User direction; DEC-013 |
| REQ-011 | The notification area is quiet: a Notification Center panel that opens only when the user clicks the indicator on the sidebar's Settings row (or its icon in the collapsed sidebar), over the current page. The indicator shows the number of waiting (not handled) updates whenever any wait: emphasised while any is unread, softer once all are read, absent only when nothing waits. No notification opens a pop-up, modal, toast or OS notification by itself. The look follows the user-approved Product design. | BEH-005, BEH-009 | Must | Direction | User direction; user decisions in Product review rounds 6–7 (one place, "don't make it redundant") and 11–12 ("Gray color makes people feel like notification is normally not gray"); DEC-013 |
| REQ-012 | The app-update card no longer opens by itself. An available app update is announced only through its notification and the indicator; Settings → Updates keeps all its controls. Feedback for actions the user starts (for example the existing "downloaded, restart to install" message) may stay as it is today. | BEH-005, BEH-006 | Must | Quiet area replaces the self-opening pop-up | DEC-001 |
| REQ-013 | Each node has a setting "check imported GitHub packages and skill sources for updates in the background", on by default. When off, the node makes no automatic GitHub request for packages or skill sources; manual checks and the on-open checks still work and still create notifications; existing notifications stay. The setting's description says honestly which network calls are made (REQ-014). | BEH-008 | Must | User control | User direction; DEC-002 |
| REQ-014 | The setting's description and the user documentation state the network calls: for each imported GitHub package and skill source, unauthenticated requests to `api.github.com` for the repository and its latest default-branch commit, at most every 6 hours; the user's IP and the repository names are visible to GitHub; nothing is sent to AutoByteus; no account or token is used. They also state that the desktop app checks GitHub releases for its own update at start. | BEH-004, BEH-008 | Must | Honesty | User direction |
| REQ-015 | No code path downloads, replaces or installs a package, skill source or the app without an explicit user action on that item. | BEH-002..BEH-005 | Must | Trust and supply-chain risk | User direction |
| REQ-016 | Notification kinds form an open set: adding a kind later (for example application packages) needs a new producer and its strings, not a redesign of the area, its states or its persistence. | BEH-009 | Should | Future kinds | User direction |
| REQ-017 | A desktop window shows its bound node's package and skill source notifications plus the app-update notification; a browser window of a server node shows that node's notifications only; the mobile remote-access client shows none. | BEH-009 | Must | Runtime boundaries | DEC-009 |
| REQ-018 | All new user-visible text exists in English and Simplified Chinese (zh-CN). | BEH-009 | Must | Localization rule | User direction |
| REQ-019 | An isolated app instance can be pointed at a test update feed by an explicit test-only opt-in, so the app-update notification can be verified without the user's data; without that opt-in, isolated instances keep their quiet disabled update state. | BEH-007 | Must | Done-when verification | DEC-010 |
| REQ-020 | The checks send no telemetry or tracking and contact no host other than GitHub's existing API, archive and release hosts. | BEH-004, BEH-008 | Must | Privacy | User direction |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-004 | SCN-001 | Isolated app; a GitHub package and a GitHub skill source imported whose installed revision is older than GitHub's latest; setting on; neither checked in the last 6 hours | Shortly after start, without opening Agent Packages or Skills, both notifications appear with installed → latest short revisions and a working compare link | — | Isolated instance, real GitHub |
| AC-002 | REQ-011 | SCN-001 | AC-001 state; user is on a non-Settings page | The indicator on the Settings entry is visible; opening the notification area shows the items; no pop-up, modal, toast or OS notification appeared | — | Isolated instance; UI check |
| AC-003 | REQ-004, REQ-012, REQ-019 | SCN-002, SCN-008 | Isolated instance with the test update feed opt-in offering a newer version | An app-update notification shows current → new version, release notes, release link; the old card does not open by itself | Without the opt-in: no app notification, quiet disabled state | Isolated instance + test feed; Electron tests |
| AC-004 | REQ-001, REQ-004 | SCN-001 | Window open on Settings when a background pass finds a new update | The notification and indicator appear without reloading the window | — | Isolated instance |
| AC-005 | REQ-007, REQ-015 | SCN-003 | Package notification | Pressing Update updates the package through the existing pipeline; the notification shows progress then handled; the row shows up to date | Update failure: error shown in the notification, package unchanged, notification kept | Isolated instance + server tests |
| AC-006 | REQ-007 | SCN-003 | Skill source notification | Pressing Update shows the existing confirmation with its warning; confirming updates; cancelling changes nothing | — | Isolated instance + web tests |
| AC-007 | REQ-007 | SCN-003 | App notification with the test feed | Update downloads only after the press; progress shows in the notification; "Install & restart" is offered and installs only on press | — | Electron harness / isolated instance |
| AC-008 | REQ-005 | SCN-004 | A notification exists for revision A; upstream moves to B; check runs | Still one notification for that source, now showing B, unread again | — | Server tests + isolated instance |
| AC-009 | REQ-009, REQ-005 | SCN-006 | Notification for revision A, unread or read; user does not update | No dismiss or skip action exists; the notification stays (and the indicator shows) across restarts; when upstream moves to B, the same notification shows B and is unread again; after the source is updated the notification shows handled, and Clear removes it permanently (also after restart) | — | Server/web tests + isolated instance |
| AC-010 | REQ-010, REQ-011 | SCN-006 | Unread notifications; user opens the panel; restarts | Items are read: the indicator changes from the emphasised to the softer form (still showing the waiting count) and the items are still listed after restart | — | Tests |
| AC-011 | REQ-008 | SCN-004 | Notification for a package; user updates from the package row (not the notification) | The notification shows handled and no longer counts; removing a source removes its notification | — | Tests |
| AC-012 | REQ-006, REQ-003 | SCN-005 | Notification exists; network off; background pass runs | Notification stays; no new notification, toast or prompt; row still offers Update and shows the failed check | — | Server tests + isolated instance (offline) |
| AC-013 | REQ-003, QR-001 | SCN-005 | GitHub answers 403/429 with `x-ratelimit-remaining: 0` | The pass stops at that response; no automatic GitHub request before the reset time | — | Server tests with a fake transport |
| AC-014 | REQ-002 | SCN-001 | Source checked 1 hour ago; app restarted | No automatic request for that source until 6 hours after its last check | — | Server tests |
| AC-015 | REQ-013 | SCN-007 | Setting turned off | No automatic GitHub requests for packages or skill sources over a full interval and after restart; opening Agent Packages still checks and still creates notifications; existing notifications stay | Turning it back on resumes automatic checks | Server tests + isolated instance request log |
| AC-016 | REQ-013, REQ-014 | SCN-007 | User views the setting | The description names the network calls of REQ-014 in en and zh-CN; the docs say the same | — | UI check; docs review |
| AC-017 | REQ-015 | All | Any notification state, background passes | No package, skill or app file changes and no app download happen without a user press | — | Tests asserting no update call from background paths; isolated instance |
| AC-018 | REQ-017 | SCN-001 | Browser window of a server node; mobile client | Browser: package/skill notifications only, no app notification; mobile: no notification area | — | Web tests |
| AC-019 | REQ-018 | All | Language zh-CN | All new text is translated; localization audit passes | — | Localization audit |
| AC-020 | REQ-016 | — | Design review | Adding a kind requires a producer and strings only (shown by the design's extension point) | — | Architecture review |
| AC-021 | REQ-020 | SCN-001 | Background pass with request logging | Only `api.github.com` (packages/skills) and the app's release feed are contacted; no other host, no identifying payload | — | Request log in isolated instance / tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System → User | Node background check | Learn about package/skill updates without visiting their pages | Server start; periodic timer | Setting on; imported GitHub sources; due for a check | Node checks due sources → finds newer revisions → notifications created → indicator shows on Settings entry → user opens the area | User sees what changed and can act | Offline/limited: quiet (SCN-005) | Supported Normal Scenario | User direction (Task, 2026-10-20) | REQ-001..005, 011, 017; AC-001, 002, 004, 014, 018, 021 |
| SCN-002 | System → User | Desktop shell startup check; Settings → Updates check | Learn about an app update without a pop-up | App start (packaged) or manual check | Newer version on the selected channel | Check finds version → app notification + indicator → user reads version, notes, link | Quiet announcement | Check error: no notification; Settings → Updates shows the error as today | Supported Normal Scenario | BEH-004/005; DEC-001 | REQ-004, 012; AC-003 |
| SCN-003 | User | User | Update from a notification | Update action in the area | Notification waiting | Press Update → (skill: confirm) → existing pipeline → progress → handled | Updated by explicit action only | Failure: error, unchanged, notification kept | Supported Normal Scenario | BEH-002/003 | REQ-007, 015; AC-005..007, 017 |
| SCN-004 | User/System | User or check | Keep notifications consistent with real state | Row update, removal, newer revision, up-to-date check | Notification exists | Source updated elsewhere / removed / superseded | Handled / removed / one updated item | — | Supported Normal Scenario | User direction | REQ-005, 008; AC-008, 011 |
| SCN-005 | System | Node background check | Stay quiet and safe when offline or limited | Background pass | No network, or GitHub rate limit | Requests fail → nothing shown → pass stops on limit until reset | Known updates kept; no noise | — | Supported Explicit Edge Scenario (offline/rate limit are explicit in the user's direction) | User direction; GitHub rate-limit docs | REQ-003, 006; AC-012, 013 |
| SCN-006 | User | User | Keep read and handled state; tidy handled items | Viewing the panel; Clear on a handled item | Notifications waiting or handled | View → read (indicator softer, still counts waiting); restart → states kept; Clear → handled item gone | Persistent states, one per source | Newer version replaces the same item | Supported Normal Scenario | User direction; user decisions (Product rounds 9–12) | REQ-009, 010, 011; AC-009, 010 |
| SCN-007 | User | User | Control outbound background calls | Background-check setting | — | Turn off → no automatic requests; turn on → resumes | User control, honest description | Manual checks still work | Supported Normal Scenario | User direction | REQ-013, 014; AC-015, 016 |
| SCN-008 | Operational | Tester / delivery | Verify the app-update notification without the user's data | Isolated instance with explicit test-feed opt-in | Isolated instance | Start with opt-in → shell checks test feed → app notification | Verifiable app notification | Without opt-in: quiet disabled state | Supported Explicit Edge Scenario (done-when requires it; TESTING.md isolated-instance rule) | Task done-when; TESTING.md | REQ-019; AC-003, 007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` (Status `Approved`). It is normative for every UI-facing requirement here.
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: design repository `/Users/normy/autobyteus_org/autobyteus-web-design`, default branch `personal` at `288ef06`. Runnable reference: `/Users/normy/autobyteus_org/autobyteus-web-design/ui-reference-runbook.md`, section settings-update-notifications (`corepack pnpm dev --port <port>`, then `/chat`). Baseline report: `/Users/normy/autobyteus_org/autobyteus-web-design/ui-baseline-report.md` (WEB-BASELINE-REFRESH-011). Source pin: autobyteus-web `9227d61597fd7ef8f6324fc9092be24ed1684c8a`.
- Product ticket record and folder (externally owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/product-ticket.md` (rounds 1–14, DC-001..DC-048, Requirement Impact and its SR-002 resolution); Project Task autobyteus-212.
- Design repository revision or commit: `288ef06` (integration); approved proposal round 14 at `e6ef28c`; final validation fixes at `e114a67` and `62f05a7`.
- UI/UX user-confirmation reference: the user, 2026-10-20, "i like the UI approved" (round 14), recorded in `ui-ux-spec.md` (Status And User Confirmation) and `product-ticket.md`; relayed by `/project_task_manager`.
- Approved visual-reference baseline: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/visual-references/VIS-001` … `VIS-028` (1440×900 unless stated; VIS-026 1000×760; VIS-027/028 390×844).
- Normative visual and interaction details, including the approved final references: every visible value in `ui-ux-spec.md` (Visual Language, colour roles, dimensions, Content strings en/zh-CN, Journey Details UXJ-001..008, Interaction And State Transitions TR-001..015, State Behavior, Responsive, Accessibility, Motion) and in the final references. In summary: a word pill "N updates" on the sidebar's Settings row (N = waiting rows, the app included; solid `sky-700` while any is unread, soft `sky-100` once read, absent at 0; hover lists the types); in the collapsed strip, an icon with a count badge; a floating Notification Center panel that opens only on a click, over the current page; one section per kind (Software update first, then by newest waiting update); one row per update (name; installed → latest · found time; one action on the right); details on click (repository · branch, "See changes on GitHub"; app: release notes and Release page); first 3 rows per section, then "Show N more"; close with ✕, Esc or a click outside; package Update, skill Update after the existing confirmation, app Download → progress → Install and restart → restarting; "Update failed. Nothing was changed." + reason + Try again; "Updated to …" + Clear; no Skip or Dismiss; the "Update checks" card last in Server Settings → Basics; the self-opening app-update card not shown.
- Explicitly illustrative fixture content or permitted implementation variation: names, repositories, revisions, versions, counts, times, release notes and error reasons are illustrative; the relative-time wording comes from `Intl` per locale; the component split, the design store, plugin and timers are not prescribed (`ui-ux-spec.md`, Implementation Fidelity Boundary).
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: as in the UI/UX spec. Opening the panel marks every waiting row read (the pill turns soft immediately); the "New" dots stay until the panel closes (REQ-010). While the panel is open the order is live: a row that becomes handled moves to the end of its section, and sections follow their newest waiting update (the reviewed behavior; changing it is a Product question).
- Product decisions that need the user (with reasoning and recommendation): none open; the design was approved.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-003; AC-013, AC-014 | Reliability / Compatibility | Automatic GitHub requests per source ≤ one check per 6 hours; on 403/429 with `x-ratelimit-remaining: 0` (or `retry-after`), zero automatic requests before the reset time | Per node | Server tests with a fake transport; request log |
| QR-002 | REQ-001 | Performance | The background pass never delays server or app startup and never blocks a user action | Startup | Startup timing unchanged within noise; tests |
| QR-003 | REQ-020, REQ-014 | Privacy | No hosts beyond `api.github.com` / `codeload.github.com` (packages/skills, as today) and the app's existing release feed; no tokens; no telemetry | All | Request log |
| QR-004 | REQ-011, REQ-018 | Accessibility | Indicator and actions reachable by keyboard, with accessible names in en and zh-CN | Web | Web tests; UI check |
| QR-005 | REQ-010 | Reliability | An unreadable or missing notification-state file never stops startup or package/skill features; worst case notifications show again as unread | Node and shell | Tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new notification state; existing registries are read and written by checks as today).
- Data or state that must be preserved: all package and skill source registry data and installed files; app update channel; existing update statuses.
- Loss, reset, rebuild, or regeneration that is acceptable: notification read/handled/cleared state may be lost if its file is unreadable (notifications show again as unread).
- Retention, privacy, compliance, volume, downtime, or operational constraints: tens of records at most; no personal data beyond repository names already stored.
- Unknowns requiring downstream investigation: none beyond architecture choices.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| GitHub REST API (unauthenticated) | ≤ 60 req/h per IP shared with all callers; honour reset/retry headers | docs.github.com rate limits | Budget shared with the user's other tools (RSK-001) |
| GitHub compare page URL | Link only, no API call | Public URL scheme | — |
| electron-updater feed | Version and release notes | existing dependency | macOS download/install needs a signed build (as today) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/settings-update-notifications/handoff-product-design-request.md` | Product Design request | UI-facing REQ/AC | Current | Context only |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` + `visual-references/` (external, Product-owned) | Normative UI | UI-facing REQ/AC (see the spec's Related Requirements table) | Approved (`288ef06`) | Behavior-defining; user-approved 2026-10-20 ("i like the UI approved") |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Real public GitHub repositories can be used read-only for verification (older installed revision in the isolated instance's test data, or a test repository the user provides) | "Real check" without the user's accounts or data | API/E2E plan | Open |
| ASM-002 | A 6-hour interval is frequent enough for fast-moving repositories | Cadence | User may change in review | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What happens to the existing app-update card that pops up by itself? | Direction says quiet area, not a pop-up; keeping both would announce the same update twice | (a) keep card; (b) keep card, also notify; (c) retire the self-opening card, notification + indicator announce, Settings → Updates keeps controls | The card opens by itself at every launch and forgets "Later" (BEH-005); keeping it contradicts "not a pop-up" and "no pile-up". (c) keeps every capability (Download, Install, notes, progress) in the notification and Settings → Updates. Recommend (c). The Product design shows it to the user before building. | Solution Designer | Decided |
| DEC-002 | Scope and default of the background-check setting | Privacy vs usefulness | per-node setting for packages/skills, default on; or also covering the app's startup check | The direction asks for a setting to turn off the background check of what the user imported, which implies on by default. The app's own startup check already exists, lives in the desktop shell rather than the node, and is not in the direction; keep it unchanged and document it honestly; a separate switch for it is a follow-up candidate. | Solution Designer | Decided |
| DEC-003 | Cadence | Rate limit vs freshness | Start + every N hours; minimum interval per source | 2 requests per source; 60/h shared budget; frequent restarts. A pass shortly after start for sources not checked in the last 6 hours, then every 6 hours, keeps 20 sources at 40 requests per 6 hours. | Solution Designer | Decided |
| DEC-004 | Dismiss vs skip this version | Two similar actions confuse | One "Dismiss" meaning skip this version; read state covers "later" | **Superseded at SR-002 by DEC-013** (the user removed Dismiss/skip). Original SR-001 reasoning: read state covers "later"; Dismiss meant don't show this version again. | Solution Designer → User | Superseded |
| DEC-005 | How to show what changed | Rate limit; usefulness | Compare link; API commit list | The GitHub compare page shows the commits without an API call. App: release notes from the feed and the release link. | Solution Designer | Decided |
| DEC-006 | Notify about check failures? | Noise when offline | Notify / quiet | Offline is normal; failures stay visible as the row's last check result (as today). No notification. | Solution Designer | Decided |
| DEC-007 | Failed later check vs known update | Today a failure hides a known update | Keep / hide | Hiding a real update because the network was down is wrong and would flip the notification; keep the update available and show the failure as the last check result. Consistency across both source kinds. | Solution Designer | Decided |
| DEC-008 | Handled notifications | "read and handled states are kept" | Delete / keep as handled | Keep the one record per source in a handled state (not counted as waiting) until a newer update supersedes it, the user clears it (Clear), or the source is removed. Bounded by one per source. (SR-002: "dismisses" replaced by "clears".) | Solution Designer | Decided |
| DEC-009 | Which notifications where | Packages/skills are node state; app update is shell state | — | Desktop: bound node + app; browser: node only; mobile: none (Settings is not in the mobile client). | Solution Designer | Decided |
| DEC-010 | How to verify the app notification in an isolated app | Isolated instances have the updater off by contract | Electron harness only; explicit test-feed opt-in | The done-when asks for an isolated app; precedent (desktop-beta-update-channel) used a local GitHub-shaped feed. An explicit test-only opt-in keeps the quiet default. In scope as an enabling change. | Solution Designer | Decided |
| DEC-011 | Do manual/on-open checks create notifications? | One truth | Background only / any check | Any check: otherwise the area and the rows disagree. | Solution Designer | Decided |
| DEC-012 | Confirmation for Update from a notification | Safety vs friction | Same as the row | Keep each kind's existing flow: skill source confirmation (local edits replaced), package without confirmation, app Download then Install & restart. | Solution Designer | Decided |
| DEC-013 | The user's review decisions (SR-002) | They change SR-001 intended behavior | Product review rounds 6–7, 9–10, 11–12 | The user decided: (1) no Dismiss / skip this version — a waiting notification goes only by update or replacement by a newer version, a handled one by Clear; no skipped-version state; accepted cost: someone who deliberately stays on an old version keeps seeing it counted; (2) the indicator stays while updates wait, emphasised while unread and softer once read; (3) the area is a Notification Center panel opened from the Settings row, not a Settings section, and the setting is an "Update checks" card in Server Settings → Basics. The Solution Designer has no objection: each is consistent with the other requirements and REQ-015. | User | Decided |
| DEC-014 | How does REQ-004's "shows" apply to the repository and the compare link? | The approved design keeps them one click away | Approved design: the kind (section), name, installed → latest and the found time are always visible; repository · branch and "See changes on GitHub" (app: release notes and the release page) are in the row's details | Reading: REQ-004 is met when every listed item is in the notification, either always visible or in its details one click away. This is what the user approved; no requirement text changes. | Solution Designer | Decided |
| DEC-015 | A waiting notification when the source becomes "up to date" without being updated (upstream moved back to the installed revision, or the app channel no longer offers the version) | REQ-008 says "resolved the same way"; "Updated to …" would be false here | Mark handled vs remove | When the installed revision or app version changed since the update was found, the notification is handled ("Updated to <installed>"). When it did not change and the update is no longer offered, the notification is removed, because nothing was updated. This is a reading of "resolved" in REQ-008; it stays consistent with REQ-005 and REQ-009. | Solution Designer | Decided |
| DEC-016 | Errors from the app's own startup check | Today, startup-check errors other than network and release-preparing errors raise a toast by themselves | Keep the toasts vs quiet | REQ-011 and DEC-006 say a check the user did not start never produces a toast. All startup-check errors become quiet (no toast); Settings → Updates still shows them. Errors from checks, downloads and installs the user starts keep their feedback (REQ-012). | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-008 | AC-001, AC-004 | SCN-001 | — |
| REQ-002 | UC-001 | BEH-008 | AC-014 | SCN-001 | — |
| REQ-003 | UC-001 | BEH-008, BEH-010 | AC-012, AC-013 | SCN-005 | — |
| REQ-004 | UC-002 | BEH-001, 003, 004, 009 | AC-001, AC-003, AC-004 | SCN-001, SCN-002 | Product design |
| REQ-005 | UC-004 | BEH-009 | AC-008 | SCN-004 | — |
| REQ-006 | UC-001 | BEH-010 | AC-012 | SCN-005 | — |
| REQ-007 | UC-003 | BEH-002, 003, 005 | AC-005, AC-006, AC-007 | SCN-003 | Product design |
| REQ-008 | UC-004 | BEH-001..006 | AC-011 | SCN-004 | — |
| REQ-009 | UC-004 | BEH-009 | AC-009 | SCN-006 | Product design (user decision, rounds 9–10) |
| REQ-010 | UC-004 | BEH-009 | AC-009, AC-010 | SCN-006 | — |
| REQ-011 | UC-002 | BEH-005, BEH-009 | AC-002, AC-010 | SCN-001, SCN-006 | Product design (user decisions, rounds 6–7, 11–12) |
| REQ-012 | UC-006 | BEH-005, BEH-006 | AC-003 | SCN-002 | Product design |
| REQ-013 | UC-005 | BEH-008 | AC-015, AC-016 | SCN-007 | Product design |
| REQ-014 | UC-005 | BEH-004, BEH-008 | AC-016 | SCN-007 | Product design |
| REQ-015 | UC-003 | BEH-002..005 | AC-017 | SCN-003 | — |
| REQ-016 | UC-002 | BEH-009 | AC-020 | — | — |
| REQ-017 | UC-002 | BEH-009 | AC-018 | SCN-001 | — |
| REQ-018 | UC-002 | BEH-009 | AC-019 | — | Product design |
| REQ-019 | UC-007 | BEH-007 | AC-003, AC-007 | SCN-008 | — |
| REQ-020 | UC-001 | BEH-004, BEH-008 | AC-021 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-008.
- Product and system constraints architecture must preserve: BEH-001..BEH-007 preserved columns; REQ-015 invariant; QR-001..QR-005.
- Decisions intentionally deferred to architecture design: owner and scheduling of the node background checker; notification persistence and its location (node app data; Electron `userData`); live update transport to open windows; how the row status keeps a known update after a failed check; GitHub request budget per check (one or two requests; conditional requests); how the shell's app notification and the node's notifications combine in the web; the isolated-instance test-feed opt-in mechanism; extension point for new kinds.
- Technical facts architecture should verify: GitHub rate-limit headers on the real API; whether `GET /repos/{o}/{r}/commits/{branch}` with the SHA media type (or a conditional request) is reliable for a one-request check; electron-updater feed override in a packaged isolated build.
- Known feasibility or integration risks: RSK-001 (shared rate budget), RSK-002 (isolated updater off by contract).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes` (SR-003)
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes` (SR-003)
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None for the requirements basis. The UI/UX basis follows from the Product step.

### Approved Basis Ready For Design

- Approval recorded: `Yes` (SR-001: Solution Designer within the direction, user informed, 2026-10-20; SR-002 deltas: the user's own decisions in the Product review, 2026-10-20; SR-003: the user's approval of the UI/UX package, 2026-10-20, plus DEC-014..016 by the Solution Designer within the direction, user informed)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-003; UI/UX spec at design repository `288ef06`)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
