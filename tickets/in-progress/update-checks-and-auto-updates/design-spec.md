# Design Spec — Check Intervals, The App's Own Check, Automatic Updates And Agent Runtimes

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (resolves architecture review ARCH-REV-001: AR-001..AR-007, R-1..R-3)
- Approved requirements baseline: `requirements-doc.md` at SR-004.
  - The user approved DEC-003 (no undo), the agent-runtime category, "no automatic app update" (SR-002), the replacement of local changes after a one-time confirmation (SR-003), and the UI (SR-004).
  - The rest was decided by the Solution Designer within the direction, user informed.
- Behavior-defining supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` + `visual-references/VIS-001..037`, design repository `personal` at `5f5fb4c`, user-approved 2026-10-23.
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/investigation-notes.md` (AF-01..AF-15; probes).
- Authorities read (2026-10-23):
  - `references/architecture-design.md`, `references/design-principles.md` (including Principle 1 kinds/forms and citations, Principle 11 derived consumers, Principle 13 one owner per sequence), `references/design-examples.md` (Cases From Our Own Reviews), `references/finding-the-cause.md`, `references/ticket-scope.md`;
  - project `DESIGN.md` (repository root); `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–3.
- Conflicts or discrepancies, one reading (R-1): runtime versions are stored in `latestRevision` / `fromRevision` / `handledRevision`. The Data Migration Guideline says "never reuse a field name with a different meaning" (`data_migration_guideline.md:105`). Reading: no stored row changes meaning, because runtime rows are a new kind and the fields hold "the source's version identifier" for every kind (a commit SHA for GitHub kinds, a version for runtimes). The domain type documents this. Renaming stored fields would drop 209 rows; that loss is avoided.

## Current-State Read

The current state is what autobyteus-209 delivered, plus Settings → Agent Runtimes.

- **Node checks.**
  - A fixed cadence: the first pass after 60 s, a tick every 30 min, a source due after 6 h (AF-01).
  - Both GitHub owners check and update through `fetchRepositoryRevisionMetadata`, which costs 2 REST requests (AF-05, AF-06). Unauthenticated 304s also count (Measured).
- **Automatic updates.** None. Notifications are WAITING/HANDLED records derived from the owners' facts (AF-03).
- **Runtimes.** In-memory rows. Checks run only when the page asks, and `checkAll()` clears finished results. Update is fire-and-forget and refused while agents run. The Codex source uses the REST API without the gate (AF-09, AF-10).
- **App.** One startup check (AF-12); quiet errors only for the startup check (AF-13).
- **Web.** A left-anchored panel; counts are waiting-only (AF-15). The runtime page polls its query and decides own-node access from `isEmbeddedWindow` (AF-14).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`.
- Size rationale:
  - Three runtimes change.
  - Server: settings, scheduler/pass, notification records and outcomes, GitHub transport (new head read, a second gate family), both GitHub owners, the runtime status service and a strategy, GraphQL and feed messages.
  - Shell: the periodic schedule, settings, IPC and state.
  - Web: the panel rebuilt to the new spec, a new category, switches with confirmation, the card rebuilt, Settings → Updates, stores, localization.
  - About 50 files.
- Architectural risk: `High`.
  - New automatic replacement of agent instructions (security-relevant, opt-in).
  - A new GitHub protocol endpoint and request method.
  - Concurrency between the pass, user actions and vendor processes.
  - New persisted settings and record fields.
  - New contracts: GraphQL, feed, IPC and state fields.
- Escalation triggers (return a `Design Impact`):
  - the head read fails for a supported repository form;
  - a source owner needs a new writer of its update state beyond the methods named here;
  - an automatic update cannot run through the owner's existing update method;
  - a touched file would pass 500 lines without the splits named here;
  - Electron `net.isOnline()` misreports in a packaged build.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Decision Supported |
| --- | --- | --- | --- |
| Probe: conditional requests | investigation Source Log (Measured) | Unauthenticated 304 counts | Not used |
| Probe: v2 `ls-refs` | AF-08 | ~84 B, head + branch, quota-free; renames OK; 401 for missing/private | `GitHubRepositoryClient.fetchDefaultBranchHead` |
| Probe: Codex redirect | AF-09 | 302 to the tag, quota-free | `GitHubRepositoryClient.fetchLatestReleaseTag` |
| Code read | AF-05..AF-07 | Checks/updates use REST metadata; archives on codeload | Checks and updates switch to the head read |
| Code read | AF-01..AF-04 | Scheduler, reconcile and store shapes | Pass owner, outcome fields, kind list |
| Code read | AF-10, AF-11 | Runtime service semantics | Background check, awaited update, listener, projection |
| Code read | AF-12..AF-15 | Shell and web owners | Schedule file, quiet periodic errors, panel and stores |

## Intended Change

- **Node.** Each node checks agent packages, skill sources and agent runtimes at their own intervals, from settings it stores, through quota-free requests. A pass every minute picks the sources that are due, and then, where the user opted in, applies found updates through the owners' existing update methods. Outcomes are recorded on the notification records.
- **Shell.** The desktop shell re-checks its own updates on a stored schedule.
- **Web.** The approved Notification Center, the Update checks card and Settings → Updates show and control all of this.

## Change Scope (Mandatory)

- In scope:
  - UC-001..UC-006.
  - Server:
    - `update-notifications` (settings, scheduler, pass, records, outcomes, feed messages);
    - `integrations/github` (head read, release-tag read, gate families);
    - `agent-packages` and `skills` (check/update through the head read);
    - `runtime-management/agent-runtimes` (background check, awaited update, listener, projection, Codex source);
    - GraphQL; composition.
  - Shell: the updater (schedule, settings, periodic source, IPC split).
  - Web: the panel, entry, card, Settings → Updates, stores, confirmation layer, localization.
  - Docs.
- Deliberately left alone:
  - imports (still REST metadata, for identity and privacy checks);
  - the update pipelines' own steps;
  - Settings → Agent Runtimes' page behavior;
  - the app's download/install;
  - remote-node rules of the runtime page;
  - 209's archive.
- Follow-ups: none new. FU-001, FU-003 and FU-004 of 209 were sent on 2026-10-23.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirements / ACs | Trigger | Evidence | Change | Target Path / Spines |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001..004, 011, 017; AC-001..004, 017 | Tick (60 s) | AF-01 | Per-category intervals, jitter, quota-free checks | DS-001, DS-007 |
| BEH-004 | System | REQ-005..009, 022; AC-005..010, 020 | Pass finds update, switch on | AF-05, AF-06, AF-10 | Automatic update through the owner's update; outcome recorded | DS-002, DS-008 |
| BEH-005 | User | REQ-010, 024; AC-010, 011 | Switch in panel or card | — | One node setting, confirmation, feed sync | DS-004 |
| BEH-006 | System | REQ-002, 004; AC-003, 004 | GitHub answers | AF-08, AF-09, gate | Gate families; banner | DS-006 |
| BEH-002, BEH-007 | System/User | REQ-012..015, 023, 025; AC-012..015, 021 | Shell schedule | AF-12, AF-13 | Periodic check, switch, truthful status | DS-005 |
| BEH-008 | System/User | REQ-020..022; AC-018..020, 022 | Pass; panel Update | AF-09..AF-11, AF-14 | Runtime category, background check, automatic update | DS-001..DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| UI/UX spec + VIS-001..037 (above) | Normative UI | UI-facing REQ/AC | The web part implements it; its mock-boundary table is what DS-001..DS-008 supply | Approved |
| Design reference sources (design repository `components/notifications/*`, `AutoUpdateSwitch.vue`, `UpdateIntervalField.vue`, `UpdateChecksCard.vue`, `AboutSettingsManager.vue`, `updateAutomationStore.ts`) | Markup and styles | Same | A starting point; not its stores, fixtures or timers | Reference |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (plus a behavior change of the check cadence and transport).
- Current design issue found: `Yes`, bounded.
- Structural triggers that fire:
  - **Several kinds** (Principle 1).
    - Three source kinds (package, skill source, runtime) pass through one pass and one record model; each kind's path is traced in DS-001/DS-002.
    - Two entry forms of one setting (panel switch, card switch) share one store and one mutation (DS-004).
    - Two update paths per kind (manual, automatic) call the same owner method; the gates are compared in the table "Manual vs automatic gates".
  - **One owner per sequence** (Principle 13). The scheduler (AF-01) now owns timer, due rule and checking. The new pass also updates and records outcomes, so the pass sequence gets one owner, `UpdatePass`; the scheduler keeps only the timer loop.
  - **Derived consumers** (Principle 11). The record gains outcome fields, the view gains a kind and nullable links, the counts change: see Derived Consumers.
  - **Capability-area reuse** (Principle 4): the gate, feed, settings service, capability factory, `useAgentRuntimes` and `ConfirmationModal` are all reused.
  - **File size:**
    - `appUpdater.ts` (499) must shed its IPC registration (AF-12).
    - `agent-runtime-status-service.ts` (321) stays under 500 with the additions.
    - `update-check-scheduler.ts` shrinks.
  - **Legacy cleanup** (Principle 8): REST metadata in check/update paths; the Codex API URL; fixed interval constants; the panel's left anchor.
  - Ruled out:
    - Ambiguous boundary: every new interface carries an explicit kind enum.
    - Empty indirection: the pass owns ordering, gates and outcome recording.
    - Shared-base overreach: the source projection stays a tight core with nullable link fields only.
- Root cause classification: `No Design Issue Found` for the owners being extended. The scheduler gets a `File Placement Or Responsibility Drift` fix (timer vs pass).
- Refactor needed now: `Yes` (bounded):
  - split the pass out of the scheduler;
  - move IPC registration out of `appUpdater.ts`;
  - route the Codex source through the GitHub transport.
- Evidence: AF-01, AF-09, AF-12.
- Residual risk: none for in-scope behavior.

## Terminology

- **Kind:** `AGENT_PACKAGE`, `SKILL_SOURCE`, `AGENT_RUNTIME` (the node's notification kinds). The app is the shell's single record.
- **Head read:** the default branch and its head commit of a GitHub repository, read through git protocol v2 `ls-refs`.
- **Gate family:** `api` (`api.github.com`) or `web` (`github.com`, `codeload.github.com`); each has its own "blocked until" time.
- **Outcome:** the automatic result on a record: `AUTO_UPDATED`, `AUTO_FAILED`, `AUTO_WAITING`.

## Legacy Removal Policy (Mandatory)

- Obsolete in scope:
  - check/update use of `fetchRepositoryRevisionMetadata` (import keeps it);
  - `CHECK_INTERVAL_MS` and `TICK_INTERVAL_MS` constants;
  - the Codex `LATEST_RELEASE_URL` (api) and its `fetchRuntimeSource` call;
  - `NotificationCenterAnchor` and the left placement;
  - `isQuietStartupAppUpdateError`'s startup-only rule (renamed and generalized: see Removal Plan).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- **Node app config** (`ServerSettingsService` keys; absent = default):
  - `UPDATE_CHECK_INTERVAL_AGENT_PACKAGES_MINUTES`, `UPDATE_CHECK_INTERVAL_SKILL_SOURCES_MINUTES` (default 30), `UPDATE_CHECK_INTERVAL_AGENT_RUNTIMES_MINUTES` (default 60);
  - `AUTO_UPDATE_AGENT_PACKAGES`, `AUTO_UPDATE_SKILL_SOURCES`, `AUTO_UPDATE_AGENT_RUNTIMES` (default false).
  - A stored value that is not an integer within 15..1440, or not `true`/`false`, reads as the default with a logged warning.
- **Node notification store** (`<app-data>/update-notifications/notifications.json`):
  - records gain `outcome` (`AUTO_UPDATED` / `AUTO_FAILED` / `AUTO_WAITING` / `null`), `outcomeReason` (string or `null`) and `outcomeAt` (ISO or `null`);
  - the reader's kind list gains `AGENT_RUNTIME`;
  - field names `latestRevision` / `fromRevision` / `handledRevision` are kept and also carry runtime versions (no renaming of stored fields).
- **Node gate file** (`<app-data>/github/rate-limit.json`): `{ blockedUntil }` becomes `{ api: ISO|null, web: ISO|null }`.
  - A 209 file with only `blockedUntil` reads as "not blocked" for both families (tolerant reader). It holds at most one reset time; ignoring it can cost one refused request, after which the gate learns the time again.
  - Writer: the exact new shape.
- **Shell** (`<userData>/app-update-checks.json`): `{ enabled: boolean, intervalMinutes: number }`. Missing or invalid → `{ enabled: true, intervalMinutes: 60 }`.
- Decision: `Directly Usable — No Migration` for the existing notification file: rows without outcome fields read as `outcome: null`. `Discard or Rebuild` for the old gate file (a past time at most). New files and keys need nothing.
- Data Migration Guideline §2:
  1. No migration needed.
  2. Never a startup prerequisite.
  3. Source shapes: 209's record (inspected: `update-notification-store.ts:13-32`) and gate file (`github-rate-limit-gate.ts:62-73`).
  4. Disposition: tolerant read.
  5. Commit: the existing atomic writers.
  6. One current shape.
  7. Cost: one small file each.
  8. References: `sourceId` = `runtimeKind` for runtimes.
  9. Evidence: store tests with 209-shape rows.
  10. Review: the architecture reviewer.

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, 008 | Scheduler tick | Records reconciled, feed | `UpdatePass` | Timely notices for three kinds |
| DS-002 | Primary | BEH-004, 008 | Pass finds a waiting update, switch on | Source updated; outcome on record | `UpdatePass` | Automatic update (REQ-006, 022) |
| DS-003 | Primary | BEH-008 | Panel runtime Update | Runtime updated; record handled | `AgentRuntimeStatusService` | Manual runtime update from the notice |
| DS-004 | Primary | BEH-005 | Switch or interval in panel/card | Setting stored; all windows synced; next tick obeys | `UpdateAutomationSettingsService` | One setting, two places |
| DS-005 | Primary | BEH-002, 007 | Shell schedule fires | App record and state broadcast | `AppUpdateCheckSchedule` → `AppUpdater` | Periodic app check |
| DS-006 | Return/Event | BEH-006 | GitHub limiting answer | Pass stops; card banner | `GitHubRateLimitGate` | Back-off, say so |
| DS-007 | Bounded local | BEH-001 | Timer | Next timer | `UpdateCheckScheduler` | Cadence |
| DS-008 | Bounded local | BEH-004 | Owner announce / outcome command | Records | `UpdateNotificationService` | Reconcile + outcomes |

## Primary Execution Spine(s)

Each chain is in the actual call order; one governing owner calls each mechanism itself.

- **DS-001:** `UpdateCheckScheduler tick -> UpdatePass.run() -> [per kind in order: packages, skill sources, runtimes] -> settings.isChecksEnabled() & gate.isBlocked(web) -> owner.listUpdateStates() -> due(lastCheckedAt + interval(kind) + jitter) -> owner.check(id) (GitHub: GitHubRepositoryClient.fetchDefaultBranchHead -> publicGitHubRequest(POST github.com …/git-upload-pack) + gate(web); runtime: strategy.readLatestVersion) -> owner writes its state -> owner announces (listener) -> UpdateNotificationService.reconcile() -> store -> ChangeFeedHub.broadcast(update_notifications_changed) -> web feed -> updateNotificationsStore.reload() -> entry / panel`
- **DS-002 (after the checks, same pass):** `UpdatePass -> notifications.listAutomationCandidates(kind) -> for each candidate: [closed? / settings.isChecksEnabled() / settings.isAutomatic(kind) / (GitHub kinds) gate.isBlocked(web)] re-read before every candidate (AR-002) -> owner update method (packages: AgentPackageService.updateAgentPackage; skills: SkillSourceService.updateGitHubSkillSource; runtimes: AgentRuntimeStatusService.runUpdate, which applies its own refusals and returns a result, AR-001) -> owner announces -> reconcile (record handled) -> UpdatePass maps the result: updated → recordOutcome(AUTO_UPDATED); refused AGENTS_RUNNING → recordOutcome(AUTO_WAITING, reason); refused BUSY / NOT_INSTALLED → no outcome this tick; failed or thrown → recordOutcome(AUTO_FAILED, reason)`
- **DS-003:** `Panel row Update -> useAgentRuntimes.update (mutation updateAgentRuntime) -> AgentRuntimeStatusService.startUpdate -> runUpdate -> vendor process -> re-check -> announce -> reconcile (handled) -> feed; the row reads progress and failure from the agentRuntimes query`
- **DS-004:** `AutoUpdateSwitch (panel or card) -> [packages/skills: ConfirmationModal] -> updateAutomationStore.setAutomaticUpdates(kind, on) -> GraphQL setAutomaticUpdates -> UpdateAutomationSettingsService -> app config -> hub.broadcast(update_settings_changed) -> every window's updateAutomationStore.reload(); UpdateCheckScheduler's next tick (≤ 60 s) runs DS-002`
- **DS-005** (AR-004, three entry forms, one owner `AppUpdateCheckSchedule`):
  - Launch: `electronApplication → appUpdateController.startAutoCheck() → AppUpdateCheckSchedule.start()` (DisabledAppUpdater: starts nothing). The schedule reads its settings file. If enabled, it arms 8 s.
  - Timer: `AppUpdateCheckSchedule timer → enabled & !AppUpdater busy (checking/downloading/downloaded/installing) & net.isOnline() → AppUpdater.checkForUpdates('startup' first, then 'periodic') → electron-updater → AppUpdateNotificationRecord → AppUpdateState broadcast → re-arm(interval)`.
  - Settings: `renderer → IPC app-update:set-auto-check → AppUpdateCheckSchedule.setSettings({ enabled, intervalMinutes }) (validate 15..1440, write app-update-checks.json, re-arm) → schedule notifies its one listener → AppUpdater.applyState({ autoCheck: schedule.settings() }) → broadcast`.
  - The schedule is the only writer of `app-update-checks.json`. `AppUpdater` never calls the schedule; it only receives its change notification. The schedule calls `AppUpdater.checkForUpdates` and reads `AppUpdater.isBusy()`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner | Off-spine |
| --- | --- | --- | --- |
| DS-001 | Every minute the scheduler asks the pass to run (never two at once). For each kind, the pass reads the owner's projection, picks the sources whose last check is older than that kind's interval plus this node's jitter, and checks them one at a time through the owner. It stops when the setting turns off or the GitHub gate closes. GitHub kinds read the repository head in one quota-free request; runtimes read their vendor sources (Codex through the GitHub transport). Each owner announces; the notification service reconciles and broadcasts. | `UpdatePass` | gate, settings, jitter |
| DS-002 | In the same pass, for each kind whose automatic switch is on, the pass asks the notification service for waiting records that are candidates. It skips a revision that failed automatically within the last interval. For runtimes, it records "waiting" while agents run. Otherwise it calls the owner's own update method, the same one the manual Update calls, and records the outcome. No owner knows the update was automatic. | `UpdatePass` | notification service (outcomes) |
| DS-003 | The panel row calls the existing mutation. The runtime service runs the vendor update; `runUpdate` is the one update path for both Settings → Agent Runtimes and the pass. Progress, refusal and failure text come from the existing `agentRuntimes` query that the row polls. | `AgentRuntimeStatusService` | `useAgentRuntimes` |
| DS-004 | One mutation per subject (interval or automatic switch, with the kind). The service validates (15..1440), stores and broadcasts. All windows of the node re-read. Turning a switch on needs no extra trigger: the next tick runs DS-002 within about a minute. | `UpdateAutomationSettingsService` | hub |
| DS-005 | The shell's schedule fires 8 s after launch, then every interval. It skips when off, busy (checking/downloading/downloaded/installing) or offline. A `periodic` check uses the same `checkForUpdates`; its errors are quiet; `checkedAt` marks a finished check. | `AppUpdateCheckSchedule` | settings file |

## Spine Actors / Main-Line Nodes

Server: `UpdateCheckScheduler`, `UpdatePass`, `AgentPackageService`, `SkillSourceService`, `AgentRuntimeStatusService`, `GitHubRepositoryClient` / `publicGitHubRequest`, `UpdateNotificationService`, `UpdateAutomationSettingsService`. Shell: `AppUpdateCheckSchedule`, `AppUpdater`. Web: `updateNotificationsStore`, `updateAutomationStore`, `appUpdateStore`, panel components.

## Ownership Map

| Node | Owns |
| --- | --- |
| `UpdateCheckScheduler` (changed, `update-check-scheduler.ts`) | Timer only:<br>- first tick after 60 s plus a random 0–60 s;<br>- then every 60 s;<br>- never overlapping;<br>- `start` / `close`, unref'd. |
| `UpdatePass` (new, `update-pass.ts`) | The pass sequence:<br>- kind order;<br>- due rule (`lastCheckedAt` null, unparsable, or `now ≥ lastCheckedAt + interval(kind) + jitter(kind)`; `jitter(kind)` = a per-process random value in `[0, min(interval/5, 5 min))`, chosen once);<br>- one source at a time;<br>- before every source and every automatic candidate, re-reads `closed`, checks-enabled, `isAutomatic(kind)` (automation) and, for GitHub kinds only, `gate.isBlocked(web)` (AR-002; R-2: runtime checks of Claude, Antigravity and Grok are not GitHub requests and are not gated; the Codex read fails fast through the transport while `web` is blocked);<br>- the automation step and the result-to-outcome mapping;<br>- a reconcile after the pass.<br>The runtime kind is included only when the node is the desktop's embedded node (AR-005). |
| `UpdateAutomationSettingsService` (new) | The three intervals and three automatic switches: read with defaults, validate, store, broadcast `update_settings_changed`. Its read also exposes the gate's `web` and `api` wait times. |
| `UpdateChecksCapabilityService` (unchanged) | `ENABLE_UPDATE_CHECKS`. |
| `DesktopEmbeddedNode` fact (new, server `config/desktop-embedded-node.ts`) | `isDesktopEmbeddedNode()`: true only when the process was started by the desktop shell as its embedded server. The shell sets `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1` in `buildServerProcessEnv` (`autobyteus-web/electron/server/serverRuntimeEnv.ts:121-133`), also for isolated instances. Docker and standalone servers never set it. Read once (AR-005). |
| `GitHubRepositoryClient` (extended) | `fetchDefaultBranchHead(owner, repo)` → `{ defaultBranch, latestRevision }` via v2 `ls-refs`; 401/404 → "GitHub repository not found or not public"; a malformed answer is an error. `fetchLatestReleaseTag(owner, repo)` → the tag from the `/releases/latest` redirect. Both go through `publicGitHubRequest`. |
| `publicGitHubRequest` (extended) | Hosts `api.github.com`, `codeload.github.com` and `github.com` (only the paths `/<o>/<r>.git/git-upload-pack` and `/<o>/<r>/releases/latest`); method GET or POST with a body; the gate per family before and after each request; manual redirects. |
| `GitHubRateLimitGate` (extended) | Blocked-until per family. Learns: `api` as today (403/429 headers); `web` from 429 or 503 with `retry-after`, else 60 s. Persisted per family. `isBlocked(family)`, `assertOpen(family)`, `blockedUntil(family)`. |
| `GitHubAgentPackageUpdates` (changed) | `checkPackage` and `updatePackage` read the head with the stored identity (`normalizeGitHubRepositorySource(record.source)` gives owner/repo) instead of the REST metadata. Update builds the codeload URL from owner/repo/revision and records `defaultBranch` from the head read. Everything else is unchanged. |
| `SkillSourceService` (changed) | `metadata()` for check/update becomes the head read plus the stored repository and the revision regex; import keeps the REST metadata. |
| `AgentRuntimeStatusService` (extended) | `checkInBackground(kind)`: reads the installed and newest versions only (no sign-in read, which for Codex acquires the app-server, AR-007); skipped while checking or operating; keeps finished operations. `runUpdate(kind): Promise<RuntimeUpdateResult>` applies the refusals itself and is the one update path (AR-001):<br>- `{ result: 'refused', reason: 'NOT_INSTALLED' \| 'BUSY' \| 'AGENTS_RUNNING', runningAgents }`;<br>- `{ result: 'updated', fromVersion, toVersion }`;<br>- `{ result: 'failed', error }`.<br>`startUpdate(kind)` = `beginUpdate(kind)`: a refusal throws `AgentRuntimeError` with its existing code; otherwise the started promise runs on. Both share one private `beginUpdate` that checks the refusals synchronously and claims the row. `listUpdateStates()`, `runningAgents(kind)`, `setUpdateStateListener(listener)`. |
| `UpdateNotificationService` (extended) | The `AGENT_RUNTIME` kind and source. Outcome rules (DS-008). `listAutomationCandidates(kind)`. `recordOutcome(kind, id, outcome)`. `markAllRead` also covers unread outcomes. Views with nullable links and outcome fields. |
| `AppUpdateCheckSchedule` (new, shell, `appUpdateCheckSchedule.ts`) | The one owner of the app check schedule (AR-004): its settings file (`appUpdateCheckSettingsStore.ts`, its only writer), the timer, the skip rules (off, busy, offline), the launch and periodic sources, `setSettings` (validate, save, re-arm), one change listener. |
| `AppUpdater` (changed) | `checkForUpdates(source)` accepts `'periodic'` (errors quiet like `startup`); `isBusy()`; `startAutoCheck()` starts the schedule (the 8 s `setTimeout` at `appUpdater.ts:149-160` is removed); `AppUpdateState.autoCheck` from `schedule.settings()` on its change notification. File size: the IPC registration (`:423-435`) moves to `appUpdateIpc.ts`, and the module helpers `isPrereleaseVersion`, `toIsoNow`, `normalizeReleaseNotes`, `buildErrorDedupeSignature` (`:37-71`) move to `appUpdateStateFormat.ts`. Target ≤ 470 lines. |
| Web stores | `updateNotificationsStore`: rows for three node kinds plus the app, counts (waiting, unread waiting, unread outcomes), order as 209, the runtime category only when `isOwnNodeWindow()` and the node reports `desktopEmbeddedNode` (AR-005). `updateAutomationStore`: node settings and wait times, mutations, feed reload. `appUpdateStore`: `autoCheck` plus `setAutoCheck`. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind | Why | Must Not Own |
| --- | --- | --- | --- |
| GraphQL `updateAutomationSettings`, `setUpdateCheckInterval(kind, minutes)`, `setAutomaticUpdates(kind, enabled)` | `UpdateAutomationSettingsService` | Transport | Validation rules beyond calling the service |
| GraphQL `updateNotifications` (view extended) | `UpdateNotificationService` | Transport | Counts |
| IPC `app-update:set-auto-check` | `AppUpdater` → schedule | Bridge | State |

## Manual Vs Automatic Gates (Principle 1: two paths, one capability)

| Gate | Manual path (row / notification) | Automatic path (pass) | Decision |
| --- | --- | --- | --- |
| Update checks switch | Not required (manual Update and on-open checks work when off; REQ-013 of 209) | Required | Explicit (REQ-017) |
| Automatic switch of the kind | — | Required | REQ-005 |
| GitHub `web` gate | `assertOpen` throws with the reset time (row shows it) | Re-read before every GitHub-kind source and candidate; stops that kind's step; the banner says until when. Runtimes: not gated (R-2) | Same gate, different presentation |
| Skill-source confirmation | Asked (existing) | Not asked; the one-time confirmation at switch-on covers it | REQ-007, DEC-019 |
| Refusals of a runtime update (not installed, busy, agents running) | `startUpdate` throws the existing codes | `runUpdate` returns the same refusals as results: agents running → `AUTO_WAITING`, retried each tick; busy (a login or a manual update is running) or not installed → no outcome this tick | REQ-021, REQ-022 (AR-001) |
| Desktop's embedded node (runtimes) | The web shows the runtime category, switch, interval and contact line only when the node reports `desktopEmbeddedNode: true` and the window is its own window (DEC-020 restated) | `UpdatePass` and the notification service include the runtime kind only when `isDesktopEmbeddedNode()` | Explicit (AR-005) |
| Skill-name conflicts | Error dialog | `AUTO_FAILED` with the conflict message | REQ-008 |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `fetchRepositoryRevisionMetadata` calls in `GitHubAgentPackageUpdates.checkPackage/updatePackage` and `SkillSourceService` check/update | REQ-002 (quota) | `fetchDefaultBranchHead` | Import keeps it |
| `CHECK_INTERVAL_MS`, `TICK_INTERVAL_MS`, `INITIAL_DELAY_MS` and the pass loop in `update-check-scheduler.ts` | Per-category intervals; pass split | `UpdatePass`, settings | — |
| Codex `LATEST_RELEASE_URL` + `fetchRuntimeSource` call | API quota, no gate | `fetchLatestReleaseTag('openai','codex')` | `fetchRuntimeSource` stays for the other vendors |
| `NotificationCenterAnchor`, left positioning in `NotificationCenter.vue` | Right-side panel (spec) | Fixed top-right placement | — |
| `isQuietStartupAppUpdateError` | Generalized | `isQuietBackgroundAppUpdateError` (startup or periodic) | Update its callers |
| `appUpdater.ts` `registerIpcHandlers` body | File size | `appUpdateIpc.ts` | Same handlers |
| `AppUpdater.startAutoCheck`'s own 8 s `setTimeout` (`appUpdater.ts:149-160`) | One owner of launch and periodic checks (AR-004) | `AppUpdateCheckSchedule` (started by `startAutoCheck`) | `electronApplication.ts:396, 401` keep calling `startAutoCheck()` |
| Helpers `isPrereleaseVersion`, `toIsoNow`, `normalizeReleaseNotes`, `buildErrorDedupeSignature` in `appUpdater.ts:37-71` | File size | `appUpdateStateFormat.ts` | Moved unchanged |
| `GitHubRateLimitGate` single-time persistence | Families | Per-family shape | — |

## Return Or Event Spine(s) (If Applicable)

- DS-006: `publicGitHubRequest → gate.learnFrom(family, response) → persisted → GitHubRateLimitError → owner records the check failure (quiet) → UpdatePass sees gate.isBlocked(web) and stops → updateAutomationSettings.waitUntil → card banner`.
- Feed: `/ws/update-notifications` carries `connected`, `update_notifications_changed` and `update_settings_changed`. The web re-reads the matching store.

## Bounded Local / Internal Spines (If Applicable)

- **DS-007 (`UpdateCheckScheduler`):** `timer → if !running: running=true → await pass.run() → running=false → schedule(60 s)`.
- **DS-008 (`UpdateNotificationService`, per record).** The 209 DS-007 table is unchanged. Additions:

  | Event | Result |
  | --- | --- |
  | A newer revision replaces a record | Outcome fields cleared |
  | `recordOutcome(kind, id, AUTO_UPDATED, { candidateFrom })` | Applied when the record exists, is handled, and its `fromRevision` equals `candidateFrom` (the record the pass picked). The handled revision is whatever the update installed, which may be newer than the record's `latestRevision`. Sets `outcome=AUTO_UPDATED`, `read=false`, `outcomeAt=now`. Otherwise (record removed, or replaced by a newer found revision) → result `not_applied`, logged, nothing changed (AR-003) |
  | `recordOutcome(kind, id, AUTO_FAILED, { candidateLatest, reason })` | Applied only to a waiting record whose `latestRevision` equals `candidateLatest`. Sets `outcome`, `outcomeReason`, `outcomeAt`. `read=false` only if the previous outcome was not `AUTO_FAILED` for the same `latestRevision` (one notice per revision, REQ-009). Otherwise `not_applied` |
  | `recordOutcome(kind, id, AUTO_WAITING, { candidateLatest, reason })` | The same rule as `AUTO_FAILED` (no repeated unread). Otherwise `not_applied` |
  | Reconcile marks a waiting record handled (the installed revision changed), whatever its outcome | Outcome fields cleared (`outcome=null`, `outcomeReason=null`, `outcomeAt=null`). A manual update after `AUTO_FAILED` or `AUTO_WAITING` therefore shows the plain "Updated to …" (AR-003). `recordOutcome(AUTO_UPDATED)`, which follows in the same queue for automatic updates, sets it again |
  | Reconcile removes a record (source gone, or DEC-015) | Outcome goes with it; a later `recordOutcome` for it is `not_applied` |
  | Candidates | Waiting records of the kind, except those with `AUTO_FAILED` and `outcomeAt + interval(kind) > now` |
  | `markAllRead` | Marks waiting records and handled records with an unread outcome |

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Risk If On Main Line |
| --- | --- | --- | --- | --- |
| `GitHubRateLimitGate` | DS-001, 002, 006 | Transport, pass | Families, persistence | Per-caller retry copies |
| Jitter source (`random()` injected) | DS-001 | `UpdatePass` | Testable spreading | Hidden nondeterminism |
| `UpdateNotificationStore` | DS-008 | Service | Tolerant read / exact write | Rules in the store |
| `ChangeFeedHub` | DS-001, 004 | Service, settings | Broadcast | — |
| `AppUpdateCheckSettingsStore` | DS-005 | Schedule | Shell file | `appUpdater.ts` size |
| `isOwnNodeWindow()` (web, `utils/ownNodeWindow.ts`) | DS-003, 004 | Panel, card, Agent Runtimes page | "This window is the bound node's own window" (`isEmbeddedWindow`). The runtime parts additionally need the node's `desktopEmbeddedNode` (from `updateAutomationSettings`) | Two derivations drifting |
| `ConfirmationModal` `layerClass` | DS-004 | Panel | REQ-024 | — |

## Ownership Boundaries

- Source owners alone write source state, and they alone run updates.
- The pass calls their public methods only; it never touches registries, installers or processes.
- The notification service alone writes records. The pass records outcomes only through `recordOutcome`.
- The settings service alone reads and writes the six keys. The pass and the GraphQL resolver read through it.
- The GitHub transport alone talks to GitHub hosts and updates the gate.
- The shell alone schedules app checks; the renderer sends intents.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass |
| --- | --- | --- | --- |
| `AgentRuntimeStatusService` | rows, processes, strategies | pass, resolver | Pass spawning `<runtime> update` itself |
| `AgentPackageService` / `SkillSourceService` | registries, installers, serialization | pass, resolvers | Pass calling `GitHubAgentPackageUpdates` directly |
| `UpdateNotificationService` | store, reconcile | pass, resolver, composition | Pass writing `notifications.json` |
| `publicGitHubRequest` | gate | client | Strategy calling `fetch` to github.com |

## Dependency Rules

- `update-notifications` → `agent-packages`, `skills`, `runtime-management/agent-runtimes` (public service methods and projection types), `integrations/github` (gate reads), `services/server-settings-service`. Never the reverse: owners know a `() => void` listener only.
- `runtime-management/agent-runtimes/strategies/codex-*` → `integrations/github` (client) is allowed.
- Web components → stores only. Stores → GraphQL documents, feeds, `window.electronAPI` (`appUpdateStore` only).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity |
| --- | --- | --- | --- |
| `GitHubRepositoryClient.fetchDefaultBranchHead(owner, repo)` | Repository head | Quota-free head read | owner + repo |
| `GitHubRepositoryClient.fetchLatestReleaseTag(owner, repo)` | Latest release tag | Quota-free | owner + repo |
| `AgentRuntimeStatusService.checkInBackground(kind)`, `runUpdate(kind)`, `listUpdateStates()`, `runningAgents(kind)`, `setUpdateStateListener(l)` | One runtime / all | As Ownership Map | `AgentRuntimeKind` |
| `RuntimeUpdateResult` (`agent-runtime-types.ts`) | One update's result | `refused` (with reason) / `updated` / `failed` | — |
| `isDesktopEmbeddedNode()` (server) and GraphQL `updateAutomationSettings.desktopEmbeddedNode: Boolean!` | Node fact | Read once from the env set by the shell | — |
| `publicGitHubRequest(url, { method, body, followRedirects })` | Transport | `followRedirects: false` returns a 3xx response to the caller; `fetchLatestReleaseTag` uses it and validates `location` = `https://github.com/<o>/<r>/releases/tag/<tag>` (R-3) | — |
| `UpdateNotificationService.listAutomationCandidates(kind)`, `recordOutcome(kind, sourceId, outcome)` | Records | DS-008 | kind + sourceId |
| GraphQL `updateAutomationSettings: UpdateAutomationSettings` | Node settings | `{ intervals: { agentPackages, skillSources, agentRuntimes } (minutes), automaticUpdates: { agentPackages, skillSources, agentRuntimes }, githubWaitUntil: String (ISO, the later of api/web, or null) }` | — |
| GraphQL `setUpdateCheckInterval(kind: UpdateNotificationKind!, minutes: Int!)` | One interval | Refuses outside 15..1440 (`UPDATE_CHECK_INTERVAL_OUT_OF_RANGE`) | kind |
| GraphQL `setAutomaticUpdates(kind: UpdateNotificationKind!, enabled: Boolean!)` | One switch | — | kind |
| GraphQL `UpdateNotification` view | Records | Adds `AGENT_RUNTIME`; `repositoryUrl` and `defaultBranch` nullable; `outcome`, `outcomeReason`, `outcomeAt` | — |
| Feed message `update_settings_changed` | Settings | Re-read | — |
| IPC `app-update:set-auto-check` `{ enabled, intervalMinutes }` → `AppUpdateState`; `AppUpdateState.autoCheck: { enabled, intervalMinutes } \| null` (`null` when updates are disabled) | App schedule | Validates 15..1440 | — |

## Interface Boundary Check

All new interfaces: singular responsibility `Yes`; explicit identity `Yes` (kind enum or one runtime kind); ambiguous selector risk `Low`.

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Note |
| --- | --- | --- | --- |
| Pass | `UpdatePass` | Yes | — |
| Settings | `UpdateAutomationSettingsService` | Yes | Matches the reference's name |
| Stored revision fields used for runtime versions | `latestRevision`, `fromRevision`, `handledRevision` | Acceptable | Kept to avoid renaming stored fields; documented in the domain type comment |
| Head read | `fetchDefaultBranchHead` | Yes | — |
| Gate families | `api`, `web` | Yes | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Update execution | Owners' update methods | Reuse |
| Runtime progress in the panel | `useAgentRuntimes` (with an option not to start a check on rebinding) | Extend |
| Settings storage | `ServerSettingsService` boolean/string settings | Reuse |
| Live sync | 209 feed | Extend (message) |
| Confirmation | `ConfirmationModal` | Extend (`layerClass`) |
| App preferences | Channel-store pattern | New sibling file |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| `server/src/update-notifications` | settings, scheduler, pass, records, outcomes, feed | Extend |
| `server/src/integrations/github` | head read, tag read, gate families | Extend |
| `server/src/agent-packages`, `src/skills` | check/update transport | Extend |
| `server/src/runtime-management/agent-runtimes` | background check, awaited update, projection, listener, Codex source | Extend |
| `web/electron/updater` | schedule, settings, IPC split | Extend |
| `web/components/notifications`, `components/settings`, `stores`, `utils` | UI and stores | Extend / Create |

## Draft File Responsibility Mapping

See the Final mapping. One change after the draft: the pass moved out of the scheduler.

## Reusable Owned Structures Check

| Structure | File | Why | Must Not Become |
| --- | --- | --- | --- |
| `UpdateSourceState` (`sourceId`, `displayName`, `installedRevision`, `latestRevision`, `lastCheckedAt`, `repositoryUrl \| null`, `defaultBranch \| null`) | `update-notifications/domain/update-notification.ts` | One shape for three kinds into reconcile and views | A base with runtime-only fields |
| `RuntimeUpdateState` (runtime projection: `runtimeKind`, `checked`, `installedVersion \| null`, `latestVersion \| null` (newer, else installed), `lastCheckedAt`) | `agent-runtime-types.ts` | Runtime owner's facts | A status model |

The notification service's runtime source maps `RuntimeUpdateState` to `UpdateSourceState`:
- `checked=false` → `installedRevision=null` (record kept);
- checked and not installed → omitted (record removed);
- `checkFailed` → `latestRevision=null` (record kept, REQ-006).

## Shared Structure / Data Model Tightness Check

- `UpdateSourceState`: one meaning per field `Yes`; links nullable only for runtimes; risk `Low`.
- Record outcome fields: singular `Yes`.
- `githubWaitUntil`: one field (the later family time), not two parallel ones in the UI.

## Derived Consumers (Principle 11)

| Changed structure | Consumer | Decision |
| --- | --- | --- |
| Record (+ outcome, + `AGENT_RUNTIME`) | Store reader/writer (`update-notification-store.ts:13-71`) | Extend kind list and fields |
| | `reconcileRecords` | Clear outcome on replacement |
| | `markAllRead` | Include unread outcomes |
| | `toViews` | Outcome fields, nullable links |
| | GraphQL types | Extend |
| | Web `updateNotificationsStore` rows, `waitingCount`, `hasUnread`, `waitingByKind` | Counts include unread outcomes; runtime rows; own-node filter |
| | `SidebarNotificationsEntry` text and aria label | "N updated" form |
| | Panel sections | New card, outcome rows |
| | Docs `update_notifications.md` | Update |
| Gate (families) | `publicGitHubRequest`; scheduler/pass `isBlocked`; settings `githubWaitUntil`; manual rows' error text | Family per host; message unchanged ("try again after HH:MM") |
| Source state check transport | Package and skill rows' status and `lastError` texts | Same statuses; new error text for "not found or not public" |
| Runtime service `startUpdate` (now via `runUpdate`) | Settings → Agent Runtimes page; resolver | Same refusals and operation states |
| `AppUpdateState` (+ `autoCheck`) | `appUpdateStore.applyRemoteState`, `AboutSettingsManager`, disabled updater | Extend |
| Quiet error rule | `appUpdateStore` toast logic | Periodic quiet too |
| `ConfirmationModal` | Existing callers | Default layer unchanged |
| Own-node rule | `AgentRuntimesManager.vue:99` | Use the shared helper |

## Final File Responsibility Mapping

Server (`autobyteus-server-ts/src`):

| File | Kind | Concern |
| --- | --- | --- |
| `update-notifications/services/update-check-scheduler.ts` | Modify | Timer loop only |
| `update-notifications/services/update-pass.ts` | Add | Pass sequence (DS-001, DS-002) |
| `update-notifications/services/update-automation-settings-service.ts` | Add | Intervals, switches, validation, broadcast |
| `update-notifications/domain/settings.ts` | Modify | Keys, defaults, range |
| `update-notifications/domain/update-notification.ts` | Modify | Kind, outcome, `UpdateSourceState` |
| `update-notifications/services/update-notification-service.ts` | Modify | Runtime source, outcomes, candidates, mark-read |
| `update-notifications/stores/update-notification-store.ts` | Modify | Fields, kind |
| `update-notifications/changes/update-notification-change-messages.ts` | Modify | `update_settings_changed` |
| `integrations/github/github-repository-client.ts` | Modify | Head read, tag read |
| `integrations/github/git-ls-refs.ts` | Add | v2 request body and answer parsing (pkt-lines) |
| `integrations/github/public-github-request.ts` | Modify | github.com paths, POST, families |
| `integrations/github/github-rate-limit-gate.ts` | Modify | Families |
| `agent-packages/services/github-agent-package-updates.ts` | Modify | Head read |
| `skills/services/skill-source-service.ts` | Modify | Head read for check/update |
| `runtime-management/agent-runtimes/agent-runtime-status-service.ts` | Modify | Background check, `runUpdate`, projection, listener |
| `runtime-management/agent-runtimes/agent-runtime-types.ts` | Modify | `RuntimeUpdateState`, outcome type |
| `runtime-management/agent-runtimes/strategies/codex-agent-runtime-strategy.ts` | Modify | Tag read |
| `api/graphql/types/update-notifications.ts` | Modify | Settings query and mutations, view |
| `compositions/update-notifications-composition.ts` | Modify | Runtime source, settings, pass |
| `compositions/build-studio-server.ts` | Modify | Compose update notifications after `composeAgentRuntimeStatus` (`build-studio-server.ts:288` vs `:350`) and pass it the runtime status service itself (AR-006) |
| `config/desktop-embedded-node.ts` | Add | `isDesktopEmbeddedNode()` (AR-005) |

Shell (`autobyteus-web/electron/updater`):

| File | Kind | Concern |
| --- | --- | --- |
| `appUpdateCheckSchedule.ts` | Add | Timer, skip rules |
| `appUpdateCheckSettingsStore.ts` | Add | `userData` file |
| `appUpdateIpc.ts` | Add | IPC registration (moved) |
| `appUpdater.ts` | Modify | `periodic` source, `isBusy`, `autoCheck`; `startAutoCheck` starts the schedule; IPC and helpers moved out (≤ 470 lines) |
| `appUpdateStateFormat.ts` | Add | Moved helpers |
| `../application/electronApplication.ts` | Unchanged | Still calls `startAutoCheck()` at `:396`, `:401` |
| `../server/serverRuntimeEnv.ts` | Modify | Sets `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1` for the embedded server (AR-005) |
| `disabledAppUpdater.ts`, `appUpdateController.ts`, `../../shared/appUpdateTypes.ts`, `../preload.ts` + types | Modify | Contract |

Web (`autobyteus-web`):

| File | Kind | Concern |
| --- | --- | --- |
| `stores/updateNotificationsStore.ts` | Modify | Kinds, outcomes, counts, own-node filter |
| `stores/updateAutomationStore.ts` | Add | Node settings |
| `stores/notificationCenterStore.ts` | Modify | No anchor |
| `stores/appUpdateStore.ts` | Modify | `autoCheck` |
| `utils/ownNodeWindow.ts` | Add | DEC-020 rule |
| `utils/appUpdateErrorDisplay.ts` | Modify | Quiet periodic |
| `components/notifications/*` | Modify / Add | Spec: `NotificationCenter`, category card, rows, `AutoUpdateSwitch.vue` |
| `components/layout/SidebarNotificationsEntry.vue` | Modify | "N updated" |
| `components/settings/UpdateChecksCard.vue`, `UpdateIntervalField.vue` (add) | Modify / Add | Card per spec |
| `components/settings/AboutSettingsManager.vue` | Modify | Switch, interval, status |
| `components/common/ConfirmationModal.vue` | Modify | `layerClass` |
| `components/settings/agent-runtimes/AgentRuntimesManager.vue`, `composables/settings/useAgentRuntimes.ts` | Modify | Shared rule; read-only option |
| `graphql/*`, `types/*`, `services/updateNotifications/updateNotificationChangeFeed.ts` | Modify | Contracts, feed message |
| `localization/messages/{en,zh-CN}/*` | Modify | Strings as the spec |

Docs:
- `autobyteus-server-ts/docs/modules/update_notifications.md`, `agent_runtimes.md`, `agent_packages.md`, `skills.md`;
- `autobyteus-web/docs/settings.md`, `electron_packaging.md` (app schedule).

## Applied Patterns (If Any)

- Worker loop (`UpdateCheckScheduler`).
- One owner per sequence (`UpdatePass`).
- State machine (DS-008).
- Repository (stores).
- Observer (owner listeners: notifications only).

## Target Subsystem / Folder / File Mapping

As in the Final mapping. No new folders; `integrations/github/git-ls-refs.ts` sits beside its only caller, the client.

## Folder Boundary Check

The existing folders keep their depth; risk `Low`.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Automatic update of a package | `UpdatePass` → `packages.updateAgentPackage(id)` (the manual method) → catch error → `notifications.recordOutcome('AGENT_PACKAGE', id, { outcome: 'AUTO_FAILED', reason: error.message })` | A separate "auto-update" pipeline, or the owner learning an `automatic` flag |
| Runtime update awaited | `private beginUpdate(kind): RuntimeUpdateRefusal \| Promise<RuntimeUpdateResult>`; `startUpdate(kind)` throws for a refusal; `runUpdate(kind)` returns `{ result: 'refused', … }` or awaits the promise. The pass maps results (DS-002) | The pass checking running agents itself and calling an unguarded update (AR-001) |
| Head read body | pkt-lines, each prefixed with its 4-hex-digit length (payload + 4): `command=ls-refs\n`, `agent=…\n`, `object-format=sha1\n`, delimiter `0001`, `symrefs\n`, `ref-prefix HEAD\n`, flush `0000`. The probe's exact request (with `agent=git/2.43.0`) is in investigation AF-08. Answer: `<40 hex> HEAD symref-target:refs/heads/<branch>` | Fetching `info/refs` (size grows with pull requests, AF-08) |
| Turning on while updates wait | Switch on → mutation → next tick (≤ 60 s) runs DS-002 for that kind | A "run now" call from the resolver that starts a second pass owner |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision |
| --- | --- | --- |
| Reading the old gate file's `blockedUntil` into `api` | Continuity | Rejected: at most a past reset time |
| Renaming stored `*Revision` fields | Naming | Rejected: data continuity; documented meaning |
| Keeping the REST metadata path for checks as a fallback | Safety | Rejected (dual path); the head read is the one check path |

## Change / Refactor Sequence

1. GitHub transport:
   - `git-ls-refs.ts` with tests against recorded answers (AF-08 bytes);
   - client head and tag reads;
   - request hosts, paths and POST;
   - gate families (tests: families, persistence, old file).
2. Owners:
   - package and skill check/update through the head read (existing tests adapted; renamed-repo and 401 cases);
   - runtime service additions and Codex source (tests: background check keeps results; `runUpdate` outcomes; projection states).
3. update-notifications:
   - domain, store (209-shape rows read), settings service, outcomes and candidates in the service (table tests), `UpdatePass` (fake clock and random: due rule, jitter, order, stop on gate/setting, automation and outcomes, runtime waiting), scheduler, feed message, GraphQL, composition;
   - the counting-transport test for REQ-002 (100 sources, 15 min, several hours: 0 REST requests, ≤ 1 request per source per interval).
4. Shell: settings store, schedule (fake timers; skip rules), `AppUpdater` periodic source, IPC split, contract, preload; tests.
5. Web:
   - stores, own-node helper, `useAgentRuntimes` option;
   - components per the spec (panel, card, switches, confirmation layer, entry, Settings → Updates);
   - localization and audit.
6. Docs. Remove everything in the Removal Plan; typecheck; all suites.

## Key Tradeoffs

- **Protocol v2 `ls-refs` over the REST API:**
  - for: no quota, constant size;
  - against: a little pkt-line code, and reliance on GitHub's git service (anonymous clones are a core GitHub service);
  - mitigation: the `web` gate.
- **One-minute tick.** Cheap local work each minute in exchange for a timely "within about a minute" after switching on, and spreading without a second timer.
- **A failed automatic update is retried once per interval.** Enough for transient GitHub errors, without noise.

## Risks

- GitHub could throttle anonymous git traffic at volumes we don't reach; the `web` gate backs off.
- Automatic replacement of agent content is a supply-chain path by design (opt-in, confirmed, visible; DEC-019).
- `net.isOnline()` accuracy: when it misreports online, the check just fails quietly.

## Guidance For Implementation

- Follow the UI spec exactly, including the strings (en and zh-CN), the right-side panel and the danger confirmation text.
- The pass never calls an owner's internals.
- An owner's announce comes before `recordOutcome` (both through the service queue). Keep that order: the pass awaits the owner, then records.
- `useAgentRuntimes` in the panel must not start checks (`checkOnRebind: false`).
- Keep every touched file under 500 lines (`appUpdater.ts`: move IPC registration first).
- Tests to add are listed in the Change Sequence. Isolated-instance checks for AC-001, 006, 007, 010, 012, 013, 018, 020 use real GitHub repositories (read-only), scripted runtime CLIs, and `--test-update-feed`.


## SR-005 Revision Notes (ARCH-REV-001)

- AR-001: `runUpdate` owns all refusals and returns results; the pass maps them (DS-002, Ownership Map, Gates table, Examples).
- AR-002: settings and gate re-read before every automatic candidate (DS-002, `UpdatePass`).
- AR-003: DS-008 rows for handled-with-outcome, newer installed head, removed record, and the `not_applied` result.
- AR-004: DS-005 has three entry forms and one owner, `AppUpdateCheckSchedule`. `startAutoCheck` is now its starter. The file split is named (≤ 470 lines).
- AR-005, option (a): a server-side desktop-embedded-node fact set by the shell. The runtime kind runs only there. The web shows runtime parts only when the bound node reports it and the window is its own (DEC-020 restated in the requirements). REQ-020, the Out of Scope line and AC-022 are unchanged and now hold on every node kind:
  - the desktop's embedded node: runtimes checked, notified, switchable;
  - a Docker or remote node seen from a desktop window: nothing for runtimes (the node never checks them; the window is not its own);
  - the same node in its own browser window: nothing for runtimes (not embedded).
- AR-006: composition order and the runtime service passed in (File Mapping).
- AR-007: background runtime checks read versions only.
- R-1: the reading in "Conflicts or discrepancies". R-2: runtime kind not gated. R-3: `followRedirects: false`.