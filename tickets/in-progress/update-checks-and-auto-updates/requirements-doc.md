# Requirements Document

## Document Status

- Status: `Approved` at `SR-004` (the user-approved UI/UX package integrated)
- Current solution revision ID: `SR-004`
- Package identifier: `update-checks-and-auto-updates`
- Request / ticket: Project Task autobyteus-210, "Update behaviour and settings"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's requests of 2026-10-20, 2026-10-21 and 2026-10-23
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-23
- Approved by and reference: `User` for DEC-003, the agent-runtime category and "no automatic update of the app" (the user's answers in the Solution Designer conversation, 2026-10-23). The rest by the Solution Designer within the direction, user informed (same conversation).
- Exact approved requirements baseline / solution revision: this document at `SR-004`
- Behavior-defining supplements and their approved versions: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` with final references `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/visual-references/` VIS-001..037, design repository `personal` at `5f5fb4c`; the user's approval 2026-10-23 after round 7 ("Okay, now I think I like [it]. It's satisfying. I like it now. Works nice. Looks nice as well. Approved.")

## Problem And Desired Outcome

- Problem:
  - Users do not learn of updates in time. The node checks imported GitHub agent packages and skill sources only every 6 hours, and the desktop app checks for its own update only at launch. The user, 2026-10-23: "a lot of users, when an agent package has been updated, did not even see a notification." On 2026-10-21 he showed a running app that missed a beta published after its launch.
  - Users who forget or do not know to press Update stay on old packages and old agent runtimes (Codex, Claude, Antigravity, Grok). The user, 2026-10-23: "a lot of users, they don't know that they need to update those."
  - Users who forget or do not know to press Update stay on old packages. The user wants an opt-in automatic update: "if the user wants to automatically upgrade, they check a toggle … they don't have to care about."
  - Shorter intervals hit GitHub's limit for unauthenticated requests (about 60 per hour per IP address). The user's desktop and three Docker nodes share one IP.
- Affected actors or systems: desktop users; browser users of a server node; each node (embedded and Docker); the desktop shell; GitHub.
- Desired outcome:
  - Configurable check intervals per notification category: software (the app), agent packages, skill sources, agent runtimes.
  - The app re-checks while it runs, and its check can be turned off.
  - Agent runtimes become a fourth notification category.
  - An opt-in automatic update for agent packages, for skill sources and for agent runtimes (each off by default), switchable in the Update checks card and right in the Notification Center, with its meaning explained at the switch. The app itself is never updated automatically.
  - Automatic results are visible as notifications.
  - With automatic updates on, a source simply follows GitHub: local changes are replaced, which the user confirms once when turning the switch on (SR-003, the user).
  - All of this stays within GitHub's limits.
- Observable definition of success:
  - In an isolated app with test data, a published package or skill update appears within the configured interval without a restart or click.
  - With automatic updates on, it is applied by itself and announced; with them off, nothing changes until the user presses Update.
  - A running app finds a newer release by itself; its check can be turned off; Settings → Updates tells the truth.
  - A test proves that a node with many sources at the shortest allowed interval stays within GitHub's limits.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Node checks each source every 6 h (first pass 60 s after start) | Interval per node, default 30 min, configurable within a safe range; passes spread with a random delay | Setting "Update checks" turns node checks off; one source at a time; failures quiet | scheduler |
| BEH-002 | System | SCN-004, SCN-005 | App checks once, 8 s after launch | App re-checks periodically while running (default 60 min, configurable); a switch turns the app's checks off | Manual "Check for Updates"; channels; Download/Install only on the user's action | appUpdater |
| BEH-003 | User | SCN-003 | Updates only when the user presses Update | Unchanged when automatic updates are off (default) | Existing pipelines, skill confirmation | 209 |
| BEH-004 | System | SCN-002, SCN-006, SCN-007 | No current supported behavior. Proposed trigger: a check finds an update while automatic updates are on for that kind | The update is applied by itself through the same pipeline, then announced; local changes are replaced (confirmed when the switch was turned on); a failure is announced and nothing changes | Validation, skill-name checks, safe replacement, skill-update notices to running agents | pipelines |
| BEH-005 | User | SCN-008 | No current supported behavior | Switches for automatic updates of agent packages and of skill sources in the Update checks card and in the Notification Center (same settings) | — | — |
| BEH-006 | System | SCN-009 | Checks use 2 REST API requests each; unauthenticated 304s also count (Measured) | Automatic checks do not use up the REST API quota; when GitHub refuses, checks back off until GitHub allows and the Update checks card says so | Gate persists across restarts | probe |
| BEH-008 | System/User | SCN-010, SCN-011 | Settings → Agent Runtimes checks runtime versions only when opened or on Check again; Update runs the vendor command on the desktop's own node only, refused while that runtime has running agents; no notification outside the page; the Codex version source is `api.github.com` (REST quota, outside the 209 gate) | A runtime with a newer version gets a notification in an "Agent runtimes" category, found by a periodic check; opt-in automatic runtime update | The page, its checks, the vendor commands, the running-agent rule, desktop-own-node-only Update (runtime-lifecycle-review D-3) | `docs/modules/agent_runtimes.md`; web `docs/settings.md` |
| BEH-007 | User | SCN-005 | Settings → Updates shows "Up to date" with the time of the last (startup) check | Shows the last check's real time and result; a failed check says so; shows when checks are off | — | AboutSettingsManager |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User who wants control | Decide every update | Nothing changes without pressing Update (default) | Opt-in only |
| User who doesn't want to care | Always current packages | Automatic updates for a kind, visible afterwards | Confirms once that local changes are replaced |
| User with several nodes on one IP | Stay within GitHub limits | Intervals with a safe minimum; spreading; back-off | 60 req/h per IP for the REST API |
| Running agents | Consistent skills | Existing safe replacement and notices | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | The node checks imported GitHub packages and skill sources at a configurable interval (default 30 min), safe for GitHub's limits | SCN-001, SCN-009 |
| UC-002 | Automatic update of agent packages and/or skill sources, opt-in per kind per node, with visible results | SCN-002, SCN-006, SCN-007 |
| UC-003 | Turning automatic updates on or off in the Update checks card or in the Notification Center, with the explanation at the switch | SCN-008 |
| UC-004 | The desktop app re-checks for its own update at a configurable interval (default 60 min) and can be turned off | SCN-004, SCN-005 |
| UC-005 | Settings → Updates and the Update checks card show truthful check state (last check, failure, back-off, off) | SCN-005, SCN-009 |
| UC-006 | Agent runtimes as a notification category: periodic check, notification, manual Update from the notification, opt-in automatic update (desktop's own node) | SCN-010, SCN-011 |

### Out Of Scope

- Automatic download or install of the desktop app itself (the app update stays Download → Install and restart on the user's action).
- Per-package or per-source automatic-update exceptions (DEC-001).
- Undo, pin to a revision, or skip a version (DEC-003, the user).
- Runtime notifications, Update or automatic update on remote or Docker nodes (runtime-lifecycle-review D-3: their runtimes are updated on that node's computer or image).
- Installing a runtime that is not installed.
- Authenticated GitHub access (tokens, accounts), private repositories.
- Local-path packages, local skill folders, built-in packages, application packages.
- 209's product questions PQ-1 (no indicator on Settings pages) and PQ-2 (skill confirmation overlaps the panel below about 1100 px). They are passed to the design step as questions. Adopting either needs the user's approval and a requirements revision.

### Non-Goals

- Noticing an upstream change faster than the configured interval.
- A general scheduler for other background work.

### Preserved Behavior Boundary

- 209's REQ-001..REQ-020 stay in force except where this document changes them: REQ-002's 6-hour cadence becomes the configurable interval (REQ-001 here), and REQ-015 "never updates by itself" becomes "never updates by itself unless the user turned automatic updates on for that kind" (REQ-005 here).
- BEH-003 preserved column; the update pipelines, the skill confirmation for manual updates, the gate's persistence, and the quiet failures of checks.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- Adjacent concerns outside the boundary are non-blocking recommendations or follow-ups, unless they are prerequisites.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Each node checks its imported GitHub agent packages and its GitHub skill sources each at its own configurable interval: default 30 minutes, minimum 15 minutes, maximum 24 hours. A source is checked automatically at most once per interval of its category; any check counts. | BEH-001 | Must | Timely notices | User 2026-10-23 ("different check interval per notification category"); DEC-004 |
| REQ-002 | Automatic checks (packages, skill sources, and the runtime version sources) use no GitHub REST API quota, so four nodes on one IP can check at the minimum interval without being refused by the 60-per-hour limit. Each automatic check costs at most one request per source. Any throttling answer from GitHub makes the node back off (REQ-004). Proven by a test with many sources. | BEH-006 | Must | Rate limits | User Part 3; probe; DEC-005 |
| REQ-003 | Automatic checks of different nodes do not all run in the same minute: each node's passes start after a random delay. | BEH-001 | Must | Shared IP | User Part 3; DEC-005 |
| REQ-004 | When GitHub refuses or limits requests, automatic checks and automatic updates wait until GitHub allows them again (also across restarts), and the Update checks card says until when. When offline, checks stay quiet and resume when the network returns. | BEH-006 | Must | Back off and say so | User Part 3; DEC-006 |
| REQ-005 | Each node has the settings "automatic updates for agent packages" and "automatic updates for skill sources" (and, on the desktop's own node, "automatic updates for agent runtimes", REQ-022), all off by default. Nothing is updated automatically unless the setting of that kind is on. With both off, behavior is exactly 209's (notify, update only on the user's press). | BEH-003, BEH-004 | Must | Opt-in; trust | User 2026-10-20/21; DEC-001 |
| REQ-006 | With a kind's setting on, when a check finds a newer revision of a source of that kind, the node applies it by itself through the same update pipeline as a manual update. That covers download, validation, skill-name checks, safe replacement and notices to running agents. Turning a setting on applies updates that are already waiting soon after (within about a minute). | BEH-004 | Must | "they don't have to care" | User; DEC-012 |
| REQ-007 | With automatic updates on for a kind, a found update replaces the installed source with GitHub's revision, including any local changes or added files, without asking again. This is the same replacement as a manual update. Turning the switch on for agent packages or for skill sources (in the card or in the Notification Center) first opens a confirmation that says what is downloaded and from where, that updates can change what agents do, that local changes and added files are replaced without asking and cannot be restored, and how to turn it off. Cancel leaves the switch off. The node keeps no record of installed content and no backup of replaced files. | BEH-004 | Must | The user: staying on stale packages costs more than losing local edits | The user, 2026-10-23 (design review, relayed with quotes by the Product designer); DEC-019 |
| REQ-008 | Every automatic outcome is visible as a notification of that source, unread until seen: "updated automatically to <revision/version>" (with what changed); "automatic update failed, nothing was changed" (with the reason and a manual Update); for runtimes, waiting while agents run. The Settings-row entry shows while any such notification is unread: when nothing waits it reads "N updated" (UI spec). | BEH-004 | Must | Visible | Task direction; DEC-007; UI spec |
| REQ-009 | A failed or skipped automatic update keeps the source unchanged and is not retried by itself more than once per interval. It is notified once per revision, not again at every pass. | BEH-004 | Must | No noise | DEC-016 |
| REQ-010 | The automatic-update switches (packages, skill sources, and on the desktop's own node runtimes) appear in the node's Update checks card (the full home) and in the Notification Center, at the category they belong to (a shortcut to the same settings). At both places the switch shows what turning it on means: what is downloaded and from where, that the content can change what agents do, that local changes are replaced (packages and skill sources), and how to turn it off. Turning a package or skill-source switch on asks for confirmation (REQ-007). | BEH-005 | Must | "some users don't even know the setting exists" | User 2026-10-23 |
| REQ-011 | The check intervals for agent packages, skill sources and agent runtimes are set in the node's Update checks card, with their minimum enforced and a short note about GitHub's limits beside the controls. | BEH-001, BEH-008 | Must | User Part 3 | User |
| REQ-012 | The desktop app checks for its own update periodically while it runs: default every 60 minutes, minimum 15 minutes, maximum 24 hours, configurable in Settings → Updates. A newer release found by such a check appears in the Notification Center as in 209. | BEH-002 | Must | Missed releases | User 2026-10-21/23; DEC-004 |
| REQ-013 | The app's own update check can be turned off in Settings → Updates (on by default). When off, the app makes no automatic update request (neither at launch nor periodically); "Check for Updates" still works when pressed. | BEH-002 | Must | FU-002 | User Part 2; DEC-009 |
| REQ-014 | No periodic app check runs while an app update is checking, downloading, downloaded or installing, or while the machine is offline. | BEH-002 | Must | Task | DEC-010 |
| REQ-015 | Settings → Updates shows the real time and result of the last check (up to date, update available, or the check failed), and that automatic checks are off when they are. | BEH-007 | Must | Truthful | User Part 2 |
| REQ-016 | The Update checks card and Settings → Updates describe honestly every network call: the endpoints contacted for packages, skill sources and agent runtimes (each vendor's version source), for automatic updates (including the runtimes' own vendor update commands) and for the app's check, how often, that no account or token is used, and that nothing is sent to AutoByteus. | BEH-006 | Must | Honesty | Task |
| REQ-017 | Turning the node's "Update checks" off stops its automatic checks of packages, skill sources and runtimes, and its automatic updates; the automatic-update switches show that they have no effect while checks are off. | BEH-001, BEH-004 | Must | Consistency | DEC-013 |
| REQ-018 | All new user-visible text exists in English and Simplified Chinese (zh-CN). | — | Must | Localization rule | — |
| REQ-019 | No version-compatibility or negotiation code between the app and nodes (DESIGN.md rule 9). | — | Must | Project rule | Task |
| REQ-020 | The desktop's own node checks its installed agent runtimes (Codex, Claude, Antigravity, Grok) for a newer version at a configurable interval: default 60 minutes, minimum 15 minutes, maximum 24 hours, while "Update checks" is on. A newer version creates a notification in an "Agent runtimes" category, with installed → newest version. Not-installed runtimes and failed checks create none. The Settings → Agent Runtimes page and its own checks are unchanged, and their findings also create the notification. | BEH-008 | Must | "a lot of users, they don't know that they need to update those" | User 2026-10-23; DEC-017 |
| REQ-021 | A runtime notification's Update runs the same vendor update as Settings → Agent Runtimes (desktop's own node), with the same rule: not while that runtime has running agents (the row says why). Success marks the notification handled ("Updated to <version>"); failure shows the vendor's message, keeps the runtime unchanged, and offers Try again. | BEH-008 | Must | Same safety | runtime-lifecycle-review |
| REQ-022 | The desktop's own node has the setting "automatic updates for agent runtimes", off by default. With it on, a found runtime update is applied by itself through the same vendor update, but only when no agent of that runtime is running; otherwise it waits and is tried again at the next pass. Outcomes are notified as in REQ-008 (updated automatically; automatic update failed). | BEH-008 | Must | User 2026-10-23 | DEC-018 |
| REQ-023 | The app itself is never updated automatically: its update stays Download → Install and restart on the user's action. | BEH-002 | Must | The user, 2026-10-23 | User |
| REQ-024 | A confirmation opened from the Notification Center (the skill-source update confirmation, the automatic-update confirmations) appears above the panel at every window width (209 PQ-2). | — | Must | The user approved the fix | UI spec (VIS-017) |
| REQ-025 | A failed periodic app check is quiet (no toast or pop-up); Settings → Updates shows "Check failed" with its time, and "Automatic checks are off" when the switch is off and no check ran. | BEH-007 | Must | Truthful and quiet | UI spec (VIS-025, VIS-026) |

## Acceptance Criteria

| AC ID | Requirement IDs | Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | SCN-001 | Isolated instance, default settings, a test source gets a new revision | The notification appears within 30 min plus the random delay, with no click | Interval set to 15 min: within 15 min plus delay | Isolated instance + real GitHub; scheduler tests |
| AC-002 | REQ-001, REQ-011 | SCN-001 | User sets the interval in the Update checks card | Values below 15 min or above 24 h are refused with a message; the next pass uses the new value without a restart | — | Web + server tests |
| AC-003 | REQ-002 | SCN-009 | Test: 100 sources, 15-minute interval, over several simulated hours | Zero REST API requests from automatic checks; at most one request per source per interval; a throttling answer stops the pass and the node waits | — | Server test with a counting transport |
| AC-004 | REQ-004 | SCN-009 | GitHub answers 403/429 (API) or 429/503 (git endpoint) | No automatic request before the allowed time, also after a restart; the Update checks card shows "GitHub asked this node to wait until HH:MM" | Offline: no notification, no error dialog | Server tests; UI check |
| AC-005 | REQ-005 | SCN-003 | Fresh install / existing install | Both automatic-update settings are off; a found update is only notified; nothing changes until Update is pressed | — | Server + isolated instance |
| AC-006 | REQ-006, REQ-008 | SCN-002 | Packages setting on; a test package gets a new revision | Within the interval the package is updated through the normal pipeline; a notification "updated automatically to <rev>" with the compare link appears unread; the indicator shows | — | Isolated instance + real GitHub |
| AC-007 | REQ-006, REQ-008 | SCN-002 | Skill sources setting on; a test skill source gets a new revision | Same, without a confirmation dialog; running agents using that skill get the existing skill-update notice | — | Isolated instance |
| AC-008 | REQ-007 | SCN-006 | (a) The user turns the packages or skill-sources switch on. (b) The switch is on and a file of the installed source was edited or added locally; a newer revision appears | (a) A confirmation states the replacement of local changes; Cancel leaves the switch off; Confirm turns it on. (b) The source is updated to GitHub's revision; the local edit and added file are gone; the notification says "updated automatically" | Manual Update of a skill source still asks its existing confirmation | Web tests; server tests; isolated instance |
| AC-009 | REQ-008, REQ-009 | SCN-007 | Setting on; the update fails (e.g., invalid package) | Source unchanged; one notification "automatic update failed, nothing was changed" with the reason; not repeated at the next passes for the same revision | — | Server tests |
| AC-010 | REQ-006 | SCN-008 | Updates waiting; the user turns the packages switch on in the Notification Center | The explanation is visible at the switch; within about a minute the waiting packages are updated and announced | Turning it off again stops further automatic updates | Isolated instance |
| AC-011 | REQ-010 | SCN-008 | The switch in the panel and in the card | Both show the same state; changing one changes the other (also in another window of the same node) | — | Web tests |
| AC-012 | REQ-012 | SCN-004 | Running app (test feed), a newer version published after launch | Found within the app interval without a restart or click; the Notification Center shows it | — | Isolated instance with `--test-update-feed` |
| AC-013 | REQ-013 | SCN-005 | App check switch off | No app update request at launch or periodically (request log); Check for Updates still works | — | Isolated instance + Electron tests |
| AC-014 | REQ-014 | SCN-004 | Downloading / downloaded / offline | No periodic check runs | — | Electron tests |
| AC-015 | REQ-015 | SCN-005 | After a periodic check; after a failed check; with the switch off | Last Checked shows that check's time; status says up to date / available / check failed; "automatic checks are off" when off | — | Electron + web tests |
| AC-016 | REQ-016, REQ-018 | — | User reads the card and Settings → Updates in en and zh-CN | Network calls described accurately; all new text translated | — | UI check; localization audit |
| AC-017 | REQ-017 | — | Update checks off with automatic updates on | No checks and no automatic updates; the switches show they have no effect | — | Server tests; UI |
| AC-018 | REQ-020 | SCN-010 | Desktop's own node; a scripted runtime reports a newer version | Within the runtime interval a notification "Agent runtimes · <Runtime> X → Y" appears without opening Settings → Agent Runtimes | Not installed or check failed: no notification | Server E2E with the scripted CLIs; isolated instance |
| AC-019 | REQ-021 | SCN-010 | Runtime notification, no running agents / agents running | Update runs the vendor update; "Updated to Y"; with agents running Update is unavailable with the reason | Failure: vendor message, Try again, runtime unchanged | Server + web tests |
| AC-020 | REQ-022 | SCN-011 | Runtime automatic updates on | Applied by itself when no agent of that runtime runs, and announced; postponed while agents run, then applied at a later pass | Off (default): only notified | Server E2E with scripted CLIs |
| AC-021 | REQ-023 | — | App update available, any settings | Never downloaded or installed without the user's press | — | Electron tests |
| AC-022 | REQ-020 | — | A desktop window bound to a remote/Docker node | No runtime category, runtime switch, runtime interval or runtime contact line for that node (VIS-036, VIS-037); a browser window served by a node counts as that node's own window, as on Settings → Agent Runtimes (DEC-020) | — | Web tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Initiator | Goal | Trigger | Steps | Outcome | Alternate | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Node | Find updates in time | Interval elapsed (+ random delay) | Check due sources → notification | Notified within the interval | Offline/limited: quiet, back off | Supported Normal | User 2026-10-23 |
| SCN-002 | System | Node | Keep packages current for users who opted in | Check finds a newer revision, setting on | Apply via pipeline → notification "updated automatically" | Updated and visible | — | Supported Normal | User 2026-10-21 |
| SCN-003 | System | Node | Default: notify only | Check finds update, setting off | Notification waiting | User decides | — | Supported Normal | 209 |
| SCN-004 | System | Desktop app | Find app releases while running | App interval elapsed | Check feed → notification | Found without restart | Busy/offline: skipped | Supported Normal | User 2026-10-21 |
| SCN-005 | User | User | Control and understand the app check | Settings → Updates | Switch off/on; read status | Truthful state | — | Supported Normal | User Part 2 |
| SCN-006 | User/System | User, then node | Follow GitHub without being asked again | Turning the switch on; later a newer revision | Confirm once → later updates replace local changes | Always current | Cancel: switch stays off | Supported Normal | The user, 2026-10-23 |
| SCN-007 | System | Node | Safe failure | Automatic update fails | Rollback → notification | Unchanged, visible | — | Supported Explicit Edge (Task direction) | Task |
| SCN-008 | User | User | Opt in where the notice is | Notification Center switch or card | Read explanation → turn on | Waiting updates applied | — | Supported Normal | User 2026-10-23 |
| SCN-010 | System/User | Desktop's own node | Learn of runtime updates and update them | Runtime interval elapsed / page check | Check → notification → Update (not while agents run) | Runtime current | Agents running: Update unavailable | Supported Normal | User 2026-10-23 |
| SCN-011 | System | Desktop's own node | Keep runtimes current for users who opted in | Check finds a newer runtime, setting on | Wait until no agents of that runtime run → vendor update → notification | Updated and visible | Failure: notified, unchanged | Supported Normal | User 2026-10-23 |
| SCN-009 | System | Node | Respect GitHub limits | Many sources, several nodes, refusals | Quota-free checks, spreading, back-off | Within limits; card says so | — | Supported Explicit Edge (Task) | Task; probe |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` (Status `Approved`); it is normative for every UI-facing requirement here.
- Runnable reference: design repository `/Users/normy/autobyteus_org/autobyteus-web-design` (`personal` at `5f5fb4c`), `ui-reference-runbook.md` section `update-checks-and-auto-updates`; baseline WEB-BASELINE-REFRESH-012 (autobyteus-web `9e7a458`; no file this design touches changed up to `d2820672c3`).
- Product ticket: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/product-ticket.md` (rounds 1–7, the user's words).
- User confirmation: 2026-10-23, after round 7, in the Product UI/UX Designer conversation (quoted in Document Status).
- Final references: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/visual-references/VIS-001..037`.
- Normative details: every visible value in the spec. In summary:
  - the panel opens at the top right of the window (368 px): a grey surface, a fixed "Notifications" title row, and one white card per category;
  - an "Agent runtime updates" category (own-node windows only);
  - an "Update automatically" switch under each category header except software, with 3 short lines of text (2 when on);
  - a danger confirmation when turning packages or skill sources on; a "within about a minute" line;
  - outcome rows; the entry "N updated" when only unread outcomes exist;
  - the full-width Update checks card: contacts list, GitHub wait banner, three intervals saved on blur/Enter with range refusal, three switches, checks-off banner with dimmed blocks;
  - Settings → Updates: switch, interval, status, Last Checked, "Automatic checks: every X / off", contacts;
  - confirmations above the panel.
- Illustrative: names, revisions, versions, counts, times, reasons. The relative-time wording comes from `Intl`. The component split, store, fixtures, timer and `layerClass` are not prescribed.
- Live order as 209.
- 209 questions: PQ-1 (indicator on Settings pages) was **not adopted** (the user rejected both tries as "not clean"). PQ-2 is **fixed** (REQ-024).
- Product decisions that need the user: none open.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002 | Reliability | 0 REST API requests from automatic checks; ≤ 1 request per source per interval (for 20 sources at the 30-minute default: 40 requests per hour per node, outside the REST quota) | Counting-transport test |
| QR-002 | REQ-006 | Integrity | An automatic update leaves either the old or the new revision installed, never a mix; validation as for manual updates | Existing pipeline tests extended |
| QR-003 | REQ-004 | Reliability | No automatic request before GitHub's allowed time, across restarts | Gate tests |
| QR-004 | REQ-001, REQ-012 | Performance | Checks never delay startup or user actions | Tests |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`. New settings, notification outcomes, the app check settings.
- Preserve: all 209 data.
- Acceptable loss: with automatic updates on, local changes inside a managed package or skill source are replaced by updates, as the user confirmed (REQ-007). Nothing else.
- Unknowns: none.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| GitHub REST API | 60/h per IP; 304s count without auth | Measured | Shared IP |
| GitHub git smart HTTP | Quota-free for the REST limit (Measured); undocumented abuse limits | Measured | RSK-001 |
| electron-updater feed | github.com feed, not the API | Read | — |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `handoff-product-design-request.md` | Product Design request | To be written after approval |

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | Verification can use real public repositories plus prepared older installed revisions in an isolated instance (as in 209) | API/E2E | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Scope of automatic updates | Safety vs simplicity | Global; per kind; per source | The user's 2026-10-23 direction names "an automatic updates switch for agent packages and one for skill sources". Per node, like the Update checks switch, because packages live on nodes. Per-source exceptions add UI and state without a stated need; a follow-up if wanted. | Solution Designer (from the user's direction) | Decided |
| DEC-002 | Automatic update when local files changed | Silent loss of edits | Replace; skip + notify | Today a manual skill update warns that local edits are lost. Automatically losing them breaks trust. Skip and notify, with the manual Update still offered. If unknown, treat as changed. | Solution Designer | Superseded by DEC-019 (SR-003) |
| DEC-019 | Local changes under automatic updates | The user rejected skip-and-notify | Skip + notify (DEC-002); replace after a one-time confirmation | The user, 2026-10-23: with automatic updates enabled "we should directly overwrite those"; staying on stale packages costs more than losing local edits; instead "give them a confirmation overlay" when they enable the switch. It applies to skill sources as well (the same reasoning; Solution Designer). No record of installed content, no list of what was replaced, no backup (not asked for; consistent with DEC-003). The confirmation is started by the user, so it is not one of the excluded pop-ups. | User (skill sources: Solution Designer for consistency) | Decided |
| DEC-020 | Which windows count as "the desktop's own node" for the runtime category (UI spec, Open Decisions) | REQ-020, AC-022 | The Agent Runtimes page's rule (`nodeAccess === 'own'`, from `windowNodeContextStore.isEmbeddedWindow`): an Electron window bound to its embedded node, or a browser window served by that node, is "own"; an Electron window bound to another node is not | Use the page's rule exactly, so the category, its switch and its Update appear exactly where the page already offers Update. A browser window served directly by a server node is that node's own window, as on the page today. An Electron window bound to a remote or Docker node shows no runtime category (VIS-036/037). | Solution Designer (consistency with the shipped page) | Decided |
| DEC-003 | Undo, pin to a revision, or skip a version for automatic package/skill updates | Recovery from a bad upstream revision vs complexity | (a) none: the notification links to what changed; a user who does not want automatic updates turns the switch off and keeps using manual Update; (b) "Undo" (reinstall the previous revision, which then needs pinning or the next pass re-updates it); (c) pin per source / skip version | In 209 you said "I personally have never clicked a skip … I update to the latest". Undo only works with pinning (otherwise the next pass re-applies the update), which needs per-source state and UI. **Recommendation: (a)** in this ticket. **The user, 2026-10-23: none** ("nobody is going to just the updates … the user, mostly, user will update by themselves"). | User | Decided: (a) |
| DEC-004 | Interval defaults and limits | Timeliness vs limits | — | One interval per category (the user). Agent packages and skill sources: each default 30 min (the user), minimum 15 min, maximum 24 h. Agent runtimes: default 60 min (vendor releases are less frequent than package commits; each check runs four short version reads), minimum 15 min, maximum 24 h. App: default 60 min (the user mentioned one hour), minimum 15 min, maximum 24 h; its feed is not on the API quota (Read) but each check fetches the releases feed. 15 min keeps any single source at ≤ 4 requests per hour. | Solution Designer | Decided |
| DEC-005 | How 30 minutes stays safe | The Task's assumed fix fails | Conditional requests (Measured: still counted); authentication (out of scope); git ref advertisement (Measured: quota-free) | Checks must not consume the REST quota (REQ-002); random delay per pass; one source at a time. The mechanism is the architecture's choice; the git ref advertisement is the measured candidate. | Solution Designer | Decided |
| DEC-006 | "Say so" when GitHub refuses | Visibility without noise | Notification; card status | Not a notification (check failures stay quiet, 209 DEC-006): the Update checks card shows "GitHub asked this node to wait until HH:MM". | Solution Designer | Decided |
| DEC-007 | Visibility of automatic outcomes | The pill counts only waiting updates | Count unread outcomes too | An automatic update must be noticed; the indicator shows while outcomes are unread. Product designs the look. | Solution Designer | Decided |
| DEC-008 | App automatic install | Scope | — | Out of scope; the Task covers packages and skill sources. | Solution Designer | Decided |
| DEC-009 | Where the app check switch and interval live | — | Settings → Updates | It is the desktop app's own setting (the Task suggests it), not a node setting. | Solution Designer | Decided |
| DEC-010 | When periodic app checks skip | — | — | Skip while checking/downloading/downloaded/installing, offline, or switched off. | Solution Designer | Decided |
| DEC-012 | Turning automatic updates on while updates wait | Expectation in the panel | Next pass vs soon | The user turns it on while looking at waiting updates and expects them applied: apply within about a minute. | Solution Designer | Decided |
| DEC-013 | "Update checks" off vs automatic updates on | Consistency | — | No checks → no automatic updates; the switches say so. | Solution Designer | Decided |
| DEC-017 | Where runtime notifications exist | The runtime page offers Update only on the desktop's own node (runtime-lifecycle-review D-3, the user: containers lose updates on rebuild) | All nodes; desktop's own node | The desktop's own node only, consistent with D-3: a Docker node's runtimes are updated with its image. Remote windows show no runtime category. | Solution Designer (following the user's earlier D-3) | Decided |
| DEC-018 | Automatic runtime update while agents run | A vendor update replaces the binary agents are using | Refuse; wait | Same rule as the manual Update: never while agents of that runtime run; wait and try at the next pass. | Solution Designer | Decided |
| DEC-016 | Repeated failures | Noise | — | One notification per revision; retry at most once per interval. | Solution Designer | Decided |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 |
| REQ-002 | UC-001 | BEH-006 | AC-003 | SCN-009 |
| REQ-003 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-004 | UC-001, UC-005 | BEH-006 | AC-004 | SCN-009 |
| REQ-005 | UC-002 | BEH-003, 004 | AC-005 | SCN-003 |
| REQ-006 | UC-002 | BEH-004 | AC-006, AC-007, AC-010 | SCN-002, SCN-008 |
| REQ-007 | UC-002 | BEH-004 | AC-008 | SCN-006 |
| REQ-008 | UC-002 | BEH-004 | AC-006, AC-007, AC-009 | SCN-002, SCN-007 |
| REQ-009 | UC-002 | BEH-004 | AC-009 | SCN-007 |
| REQ-010 | UC-003 | BEH-005 | AC-010, AC-011 | SCN-008 |
| REQ-011 | UC-001 | BEH-001 | AC-002 | SCN-001 |
| REQ-012 | UC-004 | BEH-002 | AC-012 | SCN-004 |
| REQ-013 | UC-004 | BEH-002 | AC-013 | SCN-005 |
| REQ-014 | UC-004 | BEH-002 | AC-014 | SCN-004 |
| REQ-015 | UC-005 | BEH-007 | AC-015 | SCN-005 |
| REQ-016 | UC-005 | BEH-006 | AC-016 | — |
| REQ-017 | UC-002 | BEH-001, 004 | AC-017 | — |
| REQ-018 | all | — | AC-016 | — |
| REQ-019 | all | — | review | — |
| REQ-020 | UC-006 | BEH-008 | AC-018, AC-022 | SCN-010 |
| REQ-021 | UC-006 | BEH-008 | AC-019 | SCN-010 |
| REQ-022 | UC-006 | BEH-008 | AC-020 | SCN-011 |
| REQ-023 | UC-004 | BEH-002 | AC-021 | — |
| REQ-024 | UC-003 | — | review (VIS-017) | SCN-008 |
| REQ-025 | UC-005 | BEH-007 | AC-015 | SCN-005 |

## Architecture Phase Input

- Scenarios to map: SCN-001..SCN-009.
- Constraints: 209 owners and contracts; REQ-002 (no REST quota for automatic checks); QR-002.
- Deferred to architecture: the quota-free check mechanism (candidate measured); the jitter shape; how automatic updates run from the pass; the notification outcome model; the app schedule owner (`appUpdater.ts` is at 499 lines).
- Facts to verify: the git ref advertisement for renamed repositories and large ref lists (UNK-001); GitHub's behavior on git endpoint throttling.

## Readiness Check

### Content Ready For Approval

- Current behavior evidence-backed: `Yes`
- Desired and preserved behavior explicit: `Yes`
- Scope and non-goals clear: `Yes`
- Requirements and ACs testable and traceable: `Yes`
- Scenarios covered with validity and evidence: `Yes`
- Product design integrated: `Yes` (SR-004)
- Decisions visible with reasoning: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None.

### Approved Basis Ready For Design

- Approval recorded: `Yes` (SR-002; the user's answers of 2026-10-23 for DEC-003, the runtime category and no automatic app update; the rest within the direction, user informed)
- Approved requirements package ready for architecture design: `Yes` (SR-004)
