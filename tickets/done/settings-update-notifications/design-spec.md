# Design Spec — Update Notifications (Notification Center)

## Solution And Approval Basis

- Current solution revision ID: `SR-004`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-004.
  - SR-004 (architecture review ARCH-REV-001, Design Impact AR-001..003): AC-003's verification of the release link (DEC-017) is set by the Solution Designer within the direction, user informed; no user-visible behavior of the released app changed.
  - SR-001: the Solution Designer within the direction (user informed), 2026-10-20.
  - SR-002: the user's own review decisions (no skip, persistent indicator, panel).
  - SR-003: the user's approval of the UI/UX package ("i like the UI approved", round 14), plus DEC-014..016 by the Solution Designer within the direction (user informed).
- Behavior-defining supplements and their approval references: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` and `visual-references/VIS-001..028`, design repository `personal` at `288ef06`; user approval 2026-10-20 (round 14, `e6ef28c`).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/investigation-notes.md` (architecture evidence AF-01..AF-14)
- Authorities read (design reading gate; 2026-10-20):
  - `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, `references/handoff.md`;
  - project `DESIGN.md` (repository root, in full);
  - `autobyteus-server-ts/docs/design/data_migration_guideline.md` (§1–4), `autobyteus-web/docs/settings.md` (Feature Capability Toggles);
  - `references/design-examples.md`: not used.
- Project design-principle conflicts with the general principles, or discrepancies: none.
  - Note: `autobyteus-web/docs/settings.md` asks for a new node capability card to be "a card wrapper" around `FeatureCapabilityToggleCard`. The user-approved "Update checks" card has a different look (no status badge; the Basics inner-row pattern). The design keeps the factory-built store (the rule's purpose: no copied store) and adds a dedicated card. The docs are updated to name this case.

## Current-State Read

Evidence: investigation notes BEH-001..010 and AF-01..AF-14.

- **Packages and skill sources.** `AgentPackageService` and `SkillSourceService` (process singletons, called directly by GraphQL resolvers) are the only owners and writers of GitHub update state.
  - Each stores the installed revision, the latest revision seen and the last check time, and keeps the latest revision after a failed check.
  - Checks run only when the web asks: when Agent Packages or Manage skill sources opens, or on a row action.
  - `SkillSourceService` serializes operations per repository; `AgentPackageService` does not, so a check can overwrite an update's new installed revision (AF-05).
  - A failed check hides a known update on both rows (AF-06).
- **GitHub transport.** All GitHub API traffic goes through `integrations/github/public-github-request.ts`, with no rate-limit handling (AF-07).
- **App updates.** The shell's `AppUpdater` owns the state and broadcasts `AppUpdateState` to every window.
  - The renderer's `AppUpdateNotice` card opens by itself.
  - Its dismissal lives only in renderer memory, and some startup-check errors raise toasts (AF-09).
  - Isolated instances use `DisabledAppUpdater` (AF-11).
- **Live updates.** Node → web live updates use broadcast hubs behind `/ws/<feed>` and the web's `NodeChangeFeed` (AF-01/02). Studio-only process resources are composed in `buildStudioServer` and closed on `onClose` (AF-03).
- **Per-node switches.** These are app-config booleans exposed as capabilities and consumed through the web factory store (AF-08).
- **Constraints to respect:**
  - DESIGN.md rule 7 (bad data contained; never block startup);
  - rule 9 (no cross-version compatibility code; clean-cut contracts);
  - the Data Migration Guideline's tolerant reader / exact writer.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - The change spans three runtimes and about 45 files (see Target Subsystem / Folder / File Mapping):
    - the server: a new capability area, changes to two source owners and the GitHub transport, GraphQL, websocket, composition;
    - the Electron shell: updater, notification record, launch profile, preload/IPC, isolated-app CLI;
    - the web: new store, feed, panel components, sidebar entries, settings card, removal of the floating card, localization en/zh-CN.
  - Plus documentation in four places.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - New persisted state in two places (node app data; Electron `userData`).
  - A new recurring background lifecycle on the server.
  - New concurrency against existing check/update pipelines (per-package serialization added).
  - New outbound network behavior with a process-wide rate-limit gate.
  - New contracts: GraphQL query/mutations, a websocket feed, Electron IPC channels and `AppUpdateState` fields, an e2e launch variable.
  - Removal of an existing UI surface and its renderer state.
- Escalation trigger if implementation or validation discovers new impact: return a `Design Impact` to the Solution Designer when any of these happens.
  - A source owner needs a new writer of GitHub update state beyond its existing public methods.
  - The reconcile rules (DS-007) cannot express an observed source transition.
  - electron-updater cannot check a generic test feed in a packaged isolated build.
  - The rate-limit gate would have to block hosts other than `api.github.com`.
  - Any touched file would pass 500 lines without the split this design names.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | AF-01, AF-02 | Change-hub + `NodeChangeFeed` pattern; two duplicated hubs | `/ws/update-notifications` with a generic `ChangeFeedHub`; FU-001 for the old hubs | None |
| Code read | AF-03 | Studio process resources composed and closed in `buildStudioServer` | `composeUpdateNotifications` with `close()` | None |
| Code read | AF-04, AF-05 | Source owners are the only writers; package check/update race | Listener + projection on each owner; per-package serialization | None |
| Code read | AF-06 | Failed check hides known update on rows | `canUpdate` from known latest ≠ installed | None |
| Code read + GitHub docs | AF-07; docs.github.com rate limits | No rate-limit handling; GitHub semantics | `GitHubRateLimitGate` in the transport | GitHub's secondary-limit responses without headers: 60 s wait used |
| Code read | AF-08 | Capability pattern | `ENABLE_UPDATE_CHECKS` capability | None |
| Code read | AF-09, AF-10 | Shell owns app update state; card-only renderer state; publish config | Shell-owned notification record; card removal; release link from publish config | None |
| Code read | AF-11 | e2e profile disables updates | e2e-only test feed variable | Generic feed check in a packaged isolated build is verified by API/E2E (escalation trigger above) |
| Policy read | AF-13 | Tolerant reader / exact writer | New JSON stores, no migration | None |

## Intended Change

Add an update-notification capability:

- **On each node.** A background checker runs the existing GitHub checks of imported packages and skill sources when they are due, within GitHub's rate limits and only while the node's "Update checks" setting is on. One notification record per source is kept, derived from the source owners' own state, with read, handled and cleared state persisted and announced live.
- **In the desktop shell.** The app's own notification record (found, read, handled, cleared) is kept next to the update channel.
- **In the web.** The approved Notification Center: a pill and strip entry on the Settings row, the floating panel, and the Update checks card. Updates run through the existing explicit actions. The self-opening app-update card is removed.

## Change Scope (Mandatory)

- In scope:
  - Use cases: UC-001..UC-007.
  - Server: a new `update-notifications` capability area; `agent-packages` (serialization, projection, listener, `canUpdate`); `skills` (projection, listener); `integrations/github` (rate-limit gate); GraphQL resolver; websocket route; studio composition; a generic change-feed hub in `utils`.
  - Electron: updater (notification record, re-check before download, release link, quiet startup errors through state); launch profile (test feed); preload/IPC/shared types; isolated-app CLI option.
  - Web: notifications store and panel store, change feed, Notification Center components, sidebar entries, Update checks card and capability store, extracted skill-source update confirmation, `SkillSourceRow` `canUpdate`, `appUpdateStore` and `appUpdateErrorDisplay` changes, removal of `AppUpdateNotice`, localization en/zh-CN.
  - Documentation: server module docs, web settings docs, isolated-app docs.
- Deliberately left alone:
  - The package and skill update pipelines themselves (download, validation, reload, rollback), apart from per-package serialization.
  - Settings → Updates (`AboutSettingsManager`), the beta channel and the app's startup check timing.
  - Application packages, local and built-in sources.
  - The existing `/ws/projects` and `/ws/agent-package-definitions` hubs (FU-001).
  - The mobile client.
  - Toasts for actions the user starts.
  - The skill-update notice feature.
- Follow-ups: FU-001 (migrate the two duplicated change hubs onto `ChangeFeedHub`), FU-002 (a switch for the app's own startup update check, from DEC-002).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-008 | System | REQ-001..003, 013, 020; AC-001, 004, 013..015, 021 | Server start; scheduler tick | No background check (AF-03, AF-04) | Due sources checked at most every 6 h while the setting is on; stops at a rate limit | DS-001, DS-006 |
| BEH-009 | User | REQ-004, 005, 008..011, 016, 017; AC-001..004, 008..011, 018..020 | Any check finding an update; panel open; Clear | None today | One notification per source/app; live; read/handled/cleared persisted | DS-001, DS-002, DS-003, DS-005, DS-007 |
| BEH-010 | System | REQ-006; AC-012 | A failed check | Failure hides known update (AF-06) | Known update kept in rows and notification | DS-001, DS-007 |
| BEH-001, BEH-003 | User | REQ-004, DEC-011; AC-001 | Opening Agent Packages / Manage skill sources | On-open checks (preserved) | Their findings also become notifications | DS-002 |
| BEH-002, BEH-003 | User | REQ-007, 015; AC-005, 006, 017 | Update from row or notification | Existing pipelines (preserved); package check/update race (AF-05) | Same pipelines, per-package serialized; skill confirmation reused | DS-002, DS-003 |
| BEH-004, BEH-005, BEH-006 | System/User | REQ-004, 007, 012; AC-003, 007; DEC-001, DEC-016 | App start check; manual check; Download / Install | Self-opening card (AF-09) | Shell notification record; no card; quiet startup errors | DS-004 |
| BEH-007 | Operational | REQ-019; AC-003 | Isolated instance with test feed opt-in | Updater disabled (AF-11) | Test feed only with explicit e2e variable | DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` | Normative UI | REQ-004..014, 016..018; AC-002..011, 016, 018, 019; QR-004 | The web part of this design implements it exactly; its Data/Mock Boundaries table is what DS-001..DS-007 supply | Approved by the user (288ef06) |
| `.../visual-references/VIS-001..028`, `final-validation.mjs` | Final references and click-through checks | Same | Implementation and API/E2E compare against them | Approved |
| Design reference sources in `/Users/normy/autobyteus_org/autobyteus-web-design` (`components/notifications/*`, `components/layout/SidebarNotificationsEntry.vue`, `components/settings/UpdateChecksCard.vue`, `stores/updateNotificationsStore.ts`) | Runnable UI reference | Same | A starting point for markup and styles; its store, plugin, timers and scripted outcomes are not production design | Reference only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature` (with a behavior change: the app-update card is retired).
- Current design issue found: `Yes` (local, in owners this change extends).
- Structural triggers that fire, each with evidence:
  - **Capability-area reuse** (Principle 4):
    - live publication → reuse the change-feed pattern (AF-01/02);
    - setting → reuse the capability factory (AF-08);
    - persistence → reuse `writeJsonArrayFile` (AF-13);
    - app state → reuse the shell's `AppUpdateState` broadcast (AF-09).
  - **Repeated structure** (Principle 11): a third copy of the hub class would be added (AF-01). A generic `ChangeFeedHub` is extracted for the new feed.
  - **Missing invariant in an owner this change uses** (Principle 3):
    - `AgentPackageService` does not serialize check against update (AF-05);
    - both owners' "update available" depends on the last check succeeding (AF-06).
  - **Persisted-data transition** (Principle 5): new files only; no existing shape changes (see the decision below).
  - **Legacy cleanup** (Principle 8): `AppUpdateNotice` and its renderer-only state become unnecessary.
  - **File size:**
    - `appUpdater.ts` is 437 lines. The notification record and the release link go into their own files so it stays under 500.
    - `agent-package-service.ts` is already 528 lines, and this change adds to it. Its GitHub check/update lifecycle moves to `github-agent-package-updates.ts`, an internal file owned by the service (the ticket-scope rule for over-limit files a change adds to).
  - Triggers ruled out:
    - Ambiguous boundary: every new interface takes an explicit compound identity `(kind, sourceId)`.
    - Empty indirection: the GraphQL resolver and the websocket route are thin transport adapters over one owner each, as in existing routes.
    - Shared-base overreach: the source projection has only fields both kinds use.
- Root cause classification: `Missing Invariant` (package serialization; known-update visibility) within an otherwise healthy ownership model; the feature itself is `No Design Issue Found` for its placement.
- Refactor needed now: `Yes`, bounded:
  - per-package serialization in `AgentPackageService`;
  - moving its GitHub check/update lifecycle into `github-agent-package-updates.ts` (the file is over 500 lines);
  - extraction of `ChangeFeedHub` (used by the new feed only);
  - extraction of the skill-source update confirmation so the panel and the dialog share one component.
- Evidence: AF-01, AF-05, AF-06, AF-09.
- Design response: see Ownership Map, Removal Plan and Change Sequence.
- Refactor rationale: without serialization, the background checker introduced here could overwrite a package's installed revision during a user's update (BEH-002 preserved outcome). Without the extractions, the change would duplicate a hub class and a dialog body.
- Intentional deferrals and residual risk: migrating the two existing hubs to `ChangeFeedHub` (FU-001). Residual risk: none for this ticket's behavior; the old hubs keep working unchanged.

## Terminology

- **Source**: an imported GitHub agent package or GitHub skill source.
- **Known latest revision**: the latest default-branch revision the source owner last saw (kept after failed checks).
- **Notification record**: the per-source (node) or per-app (shell) persisted record of a found update: its revision or version, the installed revision or version at the time it was found, when it was found, read, and handled.
- **Waiting / handled**: a record without / with a handled revision or version.
- **Due**: a source whose last check (any kind) is missing or at least 6 hours old.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope:
  - the self-opening app-update card (`AppUpdateNotice.vue`) and its spec;
  - the renderer-only card state in `appUpdateStore` (`visible`, `dismissedVersion`, `shouldShow`, `dismissNotice`, the no-update hide timer);
  - `getAppUpdateNoticeErrorMessageKey` and its `NOTICE_MESSAGE_KEYS`;
  - the `shell.components.app.AppUpdateNotice.*` strings (en, zh-CN).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  - Node: `<app-data>/update-notifications/notifications.json`, a JSON array of `{ kind: "AGENT_PACKAGE" | "SKILL_SOURCE", sourceId, latestRevision, fromRevision, foundAt, read, handledRevision | null, handledAt | null }`. At most one per imported GitHub source (tens).
  - Shell: `<userData>/app-update-notification.json`, a single object `{ version, fromVersion, foundAt, read, handledVersion | null, handledAt | null }` or absent.
  - Node: `<app-data>/github/rate-limit.json`, a single object `{ blockedUntil: ISO time }` written by `GitHubRateLimitGate` (AR-001). A tolerant reader: a missing, unreadable or malformed file, or a past time, means not blocked. One small atomic write per learned limit; read once per process.
  - Existing package and skill registries: no shape change. They are read by the new projection methods and written only by their existing writers.
- Relevant code-model, serialization, semantic, or physical-store change: three new files (node notifications, node rate-limit time, shell app record). `ENABLE_UPDATE_CHECKS` is a new app-config key (absent = on).
- Normal reader/writer behavior and representative evidence:
  - Node store: a tolerant reader keeps only rows with a known `kind`, non-empty `sourceId`/`latestRevision`/`fromRevision`/`foundAt`, a boolean `read` and nullable handled fields, and ignores unknown fields. The exact writer goes through `writeJsonArrayFile` (atomic, cross-process lock; AF-13).
  - Shell store: the same tolerant read / exact write, with an atomic write like `appUpdateChannelStore`.
- Required semantics and invariants under direct use: one record per `(kind, sourceId)`; records for sources that no longer exist are dropped on the next reconcile.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints:
  - A missing, unreadable or malformed file reads as empty, with a logged warning, and is rewritten on the next change (QR-005).
  - The worst case is that a current update shows again as unread; the next reconcile recreates it from the source owners' state.
  - The file is never a startup prerequisite. No personal data beyond repository identifiers already stored.
- Decision: `Not Affected` for existing data; the new stores need no migration (new files, tolerant readers).
- Decision rationale: no released data has these shapes, and losing a record only loses read/handled state that is rebuilt from source state.
- Acceptance criteria or design constraints supported by this decision: REQ-010, QR-005, AC-009, AC-010.
- Data Migration Guideline checklist (§2):
  1. **Need:** none (new files).
  2. **Availability:** never read at startup. A broken file yields no notifications, never a blocked app.
  3. **Source/target:** no released source shapes.
  4. **Disposition:** unreadable rows are skipped with a warning; nothing is deleted except by the owner's own reconcile.
  5. **Commit:** the existing atomic writer.
  6. **Current-only:** one current shape, no version field.
  7. **Cost:** one small file read per reconcile.
  8. **References:** `sourceId` refers to the source owners' ids. Dangling ids are dropped at reconcile.
  9. **Evidence:** store unit tests (tolerant read, exact key set, malformed file).
  10. **Lessons:** follows §3; independent review by the architecture reviewer.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-008, 009, 010 | Scheduler tick on the node | Pill/panel updated in every open window of that node | `UpdateCheckScheduler` → source owners → `UpdateNotificationService` | The background check and notification (UC-001/002) |
| DS-002 | Primary End-to-End | BEH-001..003, 009 | A user's check/update/remove/import through GraphQL | Notification records reconciled and announced | Source owners → `UpdateNotificationService` | Every path keeps notifications consistent (REQ-005, 008, DEC-011) |
| DS-003 | Primary End-to-End | BEH-009, 002, 003 | User clicks the pill/strip icon | Rows read; an Update/Clear done in place | Web `updateNotificationsStore` | Reading and acting (UC-002..004) |
| DS-004 | Primary End-to-End | BEH-004..007 | App start check / manual check / Download / Install | App row and pill; installed after restart; record handled | Shell `AppUpdater` + `AppUpdateNotificationRecord` | App update without a pop-up (UC-006, 007) |
| DS-005 | Return-Event | BEH-009 | `UpdateNotificationService` change | Web store re-read | `ChangeFeedHub` → `/ws/update-notifications` → `UpdateNotificationChangeFeed` | Live updates (AC-004) |
| DS-006 | Bounded Local | BEH-008 | Timer fires | Next timer scheduled | `UpdateCheckScheduler` | Cadence, setting, rate-limit stop (REQ-002, 003, 013) |
| DS-007 | Bounded Local | BEH-009, 010 | Reconcile call | Records persisted (when changed) and announced | `UpdateNotificationService` | One per source, handled/removed rules (REQ-005, 006, 008, DEC-015) |
| DS-008 | Primary End-to-End | BEH-008 | User flips the Update checks switch | Next tick obeys | `UpdateChecksCapabilityService` | Setting (UC-005) |

## Primary Execution Spine(s)

- DS-001: `Scheduler Timer -> UpdateCheckScheduler (due + enabled + gate) -> AgentPackageService / SkillSourceService check -> GitHubRepositoryClient -> publicGitHubRequest + GitHubRateLimitGate -> api.github.com -> source registry write -> owner announces change -> UpdateNotificationService.reconcile -> UpdateNotificationStore -> ChangeFeedHub broadcast -> web UpdateNotificationChangeFeed -> updateNotificationsStore -> Settings-row pill / panel`
- DS-002: `Web action (Agent Packages / Skill sources / panel row) -> GraphQL mutation -> source owner (serialized) -> registry write -> owner announces change -> UpdateNotificationService.reconcile -> store -> hub -> web re-read`
- DS-003: `Pill / strip click -> notificationCenterStore.open -> updateNotificationsStore.markAllRead (GraphQL markUpdateNotificationsRead + shell IPC mark-read) -> panel rows -> row action -> existing store action (agentPackagesStore.updateAgentPackage | skillSourcesStore.githubOperation('update') after confirmation | appUpdateStore download/install) -> DS-002 / DS-004 -> row handled -> Clear -> clearUpdateNotification (GraphQL) | shell IPC clear`
- DS-004: `App start (8 s) / manual check -> AppUpdater -> electron-updater feed -> update-available -> AppUpdateNotificationRecord.recordFound -> AppUpdateState.notification broadcast -> renderer appUpdateStore -> updateNotificationsStore app row -> Download -> AppUpdater.downloadUpdate (re-check if needed) -> progress -> Install and restart -> quitAndInstall -> next start: AppUpdateNotificationRecord.reconcileWithRunningVersion -> handled`
- DS-008: `UpdateChecksCard -> updateChecksCapabilityStore.setEnabled -> GraphQL setUpdateChecksEnabled -> UpdateChecksCapabilityService -> app config ENABLE_UPDATE_CHECKS -> UpdateCheckScheduler reads it on its next tick`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | About a minute after the node starts, and then every 30 minutes, the scheduler wakes. If Update checks is on and GitHub is not rate-limiting this node, it asks each source owner for its sources' update state and picks those not checked in the last 6 hours. It runs the owner's existing check for one source at a time and stops early if the gate closes. Each owner records the result as today and announces that its state changed. The notification service reconciles records with the owners' state and announces any change; open windows re-read and show the pill. | scheduler, source owners, GitHub transport, notification service, web store | `UpdateCheckScheduler` (when), source owners (what a check does), `UpdateNotificationService` (what is notified) | capability service, rate-limit gate, notification store, change hub |
| DS-002 | A check or update started by the user goes through the same owner methods. The owner serializes per source, writes its registry, and announces the change at the end, whether it succeeded or failed. So opening Agent Packages, updating from a row, or removing a source keeps the notifications right without the web coordinating anything. | GraphQL resolver, source owner, notification service | Source owner | listener, hub |
| DS-003 | Clicking the pill opens the panel over the page. Everything waiting is marked read on the node and in the shell, the pill turns soft, and "New" dots stay until the panel closes. Each row's action calls the existing explicit action of its kind; the row shows progress, failure (Try again) or handled. Clear removes a handled record. | panel store, notifications store, existing action stores | `updateNotificationsStore` | `notificationCenterStore`, `SkillSourceUpdateConfirmation` |
| DS-004 | The shell's startup or manual check finds a version. The record is created, or replaced when the version is newer, and travels in `AppUpdateState` to every window. Download re-checks first when this process has not seen the update yet, then downloads; Install restarts. On the next start the record becomes handled because the running version changed. If a check finds the version no longer offered and nothing changed, the record is removed. | `AppUpdater`, `AppUpdateNotificationRecord`, renderer store | `AppUpdater` | notification record file, release-link resolver |
| DS-006 | The timer callback reads the setting and the gate, builds the due list from projections (no network), then checks sequentially. It stops at a closed gate and schedules the next tick. `close()` stops future ticks; an in-flight pass may finish its current check. | scheduler | `UpdateCheckScheduler` | — |
| DS-007 | For every source in the owners' projections, and every record: create or replace a waiting record when the known latest ≠ installed; mark it handled when installed moved since it was found; remove it when nothing moved and no update is offered (DEC-015); drop records of sources that are gone. Mark-read and clear are explicit commands. Persist and announce only when something changed. | notification service, store | `UpdateNotificationService` | store, hub |
| DS-008 | The card flips the factory-built capability store. The server writes `ENABLE_UPDATE_CHECKS`. The scheduler reads the capability on every tick, so the change takes effect without restart; existing records stay. | card, capability store, capability service | `UpdateChecksCapabilityService` | — |

## Spine Actors / Main-Line Nodes

- Server: `UpdateCheckScheduler`, `AgentPackageService`, `SkillSourceService`, `GitHubRepositoryClient` / `publicGitHubRequest`, `UpdateNotificationService`.
- Shell: `AppUpdater`, `AppUpdateNotificationRecord`.
- Web: `updateNotificationsStore`, `notificationCenterStore`, `NotificationCenter` components, the sidebar entries, `UpdateChecksCard`.

## Ownership Map

| Node | Owns |
| --- | --- |
| `UpdateCheckScheduler` (server, new) | When automatic checks run: initial delay (60 s), tick interval (30 min), due rule (≥ 6 h since last check of any kind), sequential order (packages, then skill sources, oldest check first), stop on a closed gate, obeying the capability, timer lifecycle (`start`/`close`, unref'd timer). It never decides what a check does or what is notified. |
| `AgentPackageService` (server, extended) | Package GitHub update state, as today. New: per-package serialization of `checkAgentPackageUpdates` (per id), `updateAgentPackage`, `removeAgentPackage`. Inside `serialize(id, …)` each check and update re-reads its record from the registry before calling GitHub and builds every write from that fresh record, as `SkillSourceService` does with `current`; nothing read before the lock is written back (AR-003); `listGitHubSourceUpdateStates()`; announcing state changes to one injected listener at the end of import/remove/check/update. |
| `SkillSourceService` (server, extended) | Skill source GitHub state, as today (already serialized). New: `listGitHubSourceUpdateStates()`; announcing state changes at the end of import/check/update/remove. |
| `GitHubRateLimitGate` (server, new, `integrations/github`) | The node's "GitHub API blocked until" time for `api.github.com`: learns it from 403/429 responses (`retry-after`; `x-ratelimit-remaining: 0` with `x-ratelimit-reset`; otherwise 60 s for a 429), refuses requests before it with `GitHubRateLimitError`, and answers `isBlocked(now)`. It persists the time in `<app-data>/github/rate-limit.json` whenever it learns a later one, and loads it once on first use, so the stop survives an app or node restart (AR-001, REQ-003). |
| `UpdateNotificationService` (server, new) | Notification records and their rules (DS-007), views for GraphQL, `markAllRead`, `clear(kind, sourceId)` (handled records only), one serialized reconcile at a time, and announcing changes. Reads sources only through the owners' projections. |
| `UpdateNotificationStore` (server, new) | The JSON file: tolerant read, exact write. No rules. |
| `UpdateChecksCapabilityService` (server, new) | `ENABLE_UPDATE_CHECKS` (absent = on): `getCapability()`, `setEnabled()`, `isEnabled()`. |
| `AppUpdater` (shell, extended) | App update lifecycle as today. New: calls the record at found / not-found / start; re-checks before download when this process has not seen the available version; IPC `mark-notification-read`, `clear-notification`; puts `notification` in `AppUpdateState`. |
| `AppUpdateNotificationRecord` (shell, new) | The app record's rules (same as DS-007 with versions) and its `userData` file. |
| `updateNotificationsStore` (web, new) | The combined list (node records from GraphQL plus the app record from `appUpdateStore`), counts (waiting, unread, per kind), order (Software update first; sections by newest waiting; waiting newest first, then handled), per-row transient action state (updating / failed + reason), row actions delegating to existing stores, `markAllRead`, `clear`, and re-read on feed messages and node rebinding. |
| `notificationCenterStore` (web, new) | Panel open/closed, anchor position, ids that were unread when it opened ("New" dots until close). |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `UpdateNotificationResolver` | `UpdateNotificationService`, `UpdateChecksCapabilityService` | Transport | Reconcile rules, filtering |
| `/ws/update-notifications` route | `ChangeFeedHub` instance of the update-notification capability | Transport + remote-access auth | Any message decision |
| `composeUpdateNotifications` | Wires listener → service, service → hub, starts/stops scheduler | Composition | Business rules |
| Electron preload `markAppUpdateNotificationRead` / `clearAppUpdateNotification` | `AppUpdater` | IPC bridge | State |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/components/app/AppUpdateNotice.vue`, `components/app/__tests__/AppUpdateNotice.spec.ts`, its mount in `app.vue` | REQ-012 / DEC-001: the card no longer opens | Notification Center app row | — |
| `appUpdateStore`: `visible`, `dismissedVersion`, `shouldShow`, `dismissNotice`, `noUpdateHideTimer`, `NO_UPDATE_HIDE_DELAY_MS`, `clearNoUpdateHideTimer` | Dead: only the card reads them (AF-09) | Shell record `read`/handled | Update `appUpdateStore.spec.ts` accordingly |
| `utils/appUpdateErrorDisplay.ts`: `NOTICE_MESSAGE_KEYS`, `getAppUpdateNoticeErrorMessageKey` | Dead: only the card used them | — | Settings and toast keys stay |
| Localization `shell.components.app.AppUpdateNotice.*` (en, zh-CN, generated and hand-written files as the localization guide says) | Dead with the card | `settings.notifications.*` | Localization audit must pass |
| Toasts for startup-check errors (non-quiet kinds) | DEC-016 | Quiet; Settings → Updates shows the error | `isQuietStartupAppUpdateError` returns true for every `startup-check` error |
| Inline confirmation body in `SkillSourcesModal.vue` (source block with branch and revisions) | Shared with the panel | `components/skills/SkillSourceUpdateConfirmation.vue` | Visual output unchanged |

## Return Or Event Spine(s) (If Applicable)

- DS-005: `UpdateNotificationService (records changed) -> ChangeFeedHub.broadcast({type:"update_notifications_changed"}) -> /ws/update-notifications -> UpdateNotificationChangeFeed (NodeChangeFeed) -> updateNotificationsStore.reload()`.
  - Every (re)connection gets `{type:"connected"}` and re-reads.
  - Node rebinding (`bindingRevision`) rebinds the feed and re-reads.
- Shell app record: `AppUpdater.applyState -> 'app-update-state' IPC broadcast -> appUpdateStore.applyRemoteState -> updateNotificationsStore (computed app row)`.

## Bounded Local / Internal Spines (If Applicable)

- **DS-006**, parent `UpdateCheckScheduler`: `timer -> capability.isEnabled? -> gate.isBlocked? -> due = projections where lastCheckedAt null or ≥ 6 h old -> for each due (packages, then skills; oldest first): capability.isEnabled and gate open? else stop -> owner.check([id]) -> schedule next tick`. Both the setting and the gate are checked before every source, so turning the switch off during a pass stops it at the next source (R-2).
  - Exceptions from one check are logged and do not stop the pass. A closed gate does.
  - A pass never overlaps another pass (a running flag).
- **DS-007**, parent `UpdateNotificationService` (per `(kind, sourceId)`; S = projection, R = record):

  | Condition | Result |
  | --- | --- |
  | Source gone | delete R |
  | `S.installed` null | no record created; existing R left as is |
  | `S.latest` non-null and ≠ `S.installed` | R absent, handled, or `R.latest ≠ S.latest` → new waiting R `{latest: S.latest, from: S.installed, foundAt: now, read: false}` (REQ-005); else keep |
  | Otherwise (up to date or never checked), R waiting and `S.installed ≠ R.from` | R handled `{handledRevision: S.installed, handledAt: now}` (REQ-008) |
  | Otherwise, R waiting and `S.installed = R.from` and `S.latest = S.installed` | delete R (DEC-015) |
  | `markAllRead` | every waiting R read = true |
  | `clear(kind, id)` | delete R only if handled; otherwise refuse with an error |

  - A failed check leaves `S.latest` as it was, so R stays waiting (REQ-006).
  - The shell record follows the same table with `version` / `fromVersion` / running app version. "Source gone" does not apply. Update-not-available with an unchanged running version removes the record.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `GitHubRateLimitGate` | DS-001, DS-002 | GitHub transport (`publicGitHubRequest`) and `UpdateCheckScheduler` (reads `isBlocked`) | Learn/obey GitHub's reset time | REQ-003, QR-001 | In the scheduler: manual calls would keep hammering GitHub; per-caller copies (Principle 13) |
| `UpdateNotificationStore` | DS-007 | `UpdateNotificationService` | File I/O | Persistence | Rules leaking into the store |
| `ChangeFeedHub` (generic) | DS-005 | Update-notification capability | Broadcast frames to connections | Live update | Business logic in transport |
| `UpdateChecksCapabilityService` | DS-006, DS-008 | Scheduler; GraphQL | Setting | REQ-013 | Setting reads scattered |
| `AppUpdateNotificationRecord` file I/O | DS-004 | `AppUpdater` | Persist app record | REQ-010 | `appUpdater.ts` growing past 500 lines |
| `appReleasePage.ts` | DS-004 | `AppUpdater` | Release page URL from the packaged publish config (`app-update.yml`: provider github → `https://github.com/<owner>/<repo>/releases/tag/v<version>`; otherwise null). When the launch uses the e2e test feed, `AppUpdater` does not call it and the URL is `null`, because the packaged config names the real repository, not the feed that offered the version (AR-002, DEC-017) | REQ-004, REQ-019 | A link to a tag that the test feed's version does not have |
| `SkillSourceUpdateConfirmation.vue` | DS-003 | Skill sources dialog and panel | The existing confirmation body | DEC-012 | Two copies of the dialog body |
| `notificationTime.ts` (web) | DS-003 | Rows | Short relative time + full title | UI spec Formats | — |

## Ownership Boundaries

- The source owners are authoritative for source state. `UpdateNotificationService` never reads their registries or stores directly; it uses `listGitHubSourceUpdateStates()` and receives the change signal.
- `UpdateNotificationService` is authoritative for notification records. The web, the resolver and the scheduler never read or write the store directly.
- The scheduler triggers checks only through the owners' public check methods. It never calls `GitHubRepositoryClient` itself.
- The GitHub transport owns rate-limit policy. The scheduler only asks `isBlocked()`.
- The shell owns the app record. The renderer sends only `mark-read` and `clear` intents.
- The web `updateNotificationsStore` is the only place that combines node and app records. Components read it and the panel store; row actions call it, and it delegates to `agentPackagesStore`, `skillSourcesStore` and `appUpdateStore`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentPackageService` | `AgentPackageRegistryStore`, installer, serialization, `github-agent-package-updates.ts` | Scheduler, notification service (projection), resolvers | Scheduler/notification reading `agent-packages/registry.json` or calling `GitHubRepositoryClient` | Add a method to the service |
| `SkillSourceService` | `GitHubSkillSourceStore`, repository installer | Same | Reading `skill-sources/github/registry.json` | Same |
| `UpdateNotificationService` | `UpdateNotificationStore`, hub | Resolver, composition | Resolver reading the store | Add a service method |
| `publicGitHubRequest` | `GitHubRateLimitGate` updates | `GitHubRepositoryClient`, `GitHubSkillRepository` | Callers updating the gate themselves | Extend the transport |
| `AppUpdater` | `AppUpdateNotificationRecord`, electron-updater | IPC handlers only | Renderer writing the record file | Add an IPC command |
| `updateNotificationsStore` (web) | GraphQL documents, feed, transient row state | Notification components, sidebar entries | Components calling GraphQL or `window.electronAPI` directly for notifications | Add a store action |

## Dependency Rules

- `update-notifications` → `agent-packages`, `skills` (public service methods and the shared projection type), `integrations/github` (gate `isBlocked` only), `services/server-settings-service`, `utils/change-feed-hub`. Never the other way round: source owners know only an injected `() => void` listener.
- `integrations/github` depends on nothing new.
- `api/graphql/types/update-notifications.ts` and `api/websocket/update-notifications.ts` → `update-notifications` only.
- Web: notification components → `updateNotificationsStore`, `notificationCenterStore`, `updateChecksCapabilityStore`. `updateNotificationsStore` → `agentPackagesStore`, `skillSourcesStore`, `appUpdateStore`, GraphQL documents, feed. No store imports a component.
- Shell: `AppUpdater` → `AppUpdateNotificationRecord`, `appReleasePage`. The record has no Electron imports except via injected paths (testable).

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentPackageService.listGitHubSourceUpdateStates(): GitHubSourceUpdateState[]` | GitHub packages | Projection `{ sourceId, displayName, repositoryUrl, defaultBranch, installedRevision, latestRevision, lastCheckedAt }` | — | `displayName` = the row's display name |
| `SkillSourceService.listGitHubSourceUpdateStates()` | ACTIVE GitHub skill sources | Same projection | — | `REMOVING` sources excluded |
| `setGitHubSourceStateListener(listener \| null)` on both owners | — | One listener, called after import/remove/check/update settle (success or failure) | — | Listener errors are caught and logged by the owner |
| `UpdateNotificationService.listNotifications(): UpdateNotificationView[]` | Node notifications | Reconcile, then views | — | View: `{ kind, sourceId, name, repositoryUrl, defaultBranch, installedRevision, latestRevision, foundAt, read, state: WAITING \| HANDLED, handledRevision, handledAt }` |
| `markAllRead()` | Same | Read all waiting | — | Returns views |
| `clear(kind, sourceId)` | One record | Delete a handled record | `(kind: AGENT_PACKAGE \| SKILL_SOURCE, sourceId)` | Error when waiting or absent |
| `reconcile()` | Same | DS-007 | — | Called by the listener and the scheduler (after its pass) |
| GraphQL `updateNotifications`, `markUpdateNotificationsRead`, `clearUpdateNotification(kind, sourceId)` | Same | Transport | Enum `UpdateNotificationKind` + `String` | — |
| GraphQL `updateChecksCapability`, `setUpdateChecksEnabled(enabled)` | Setting | `{ enabled, settingKey, source: SERVER_SETTING \| DEFAULT_ENABLED }` | — | Shape fits `createBoundNodeCapabilityStore` |
| `/ws/update-notifications` | Change feed | `{type:"connected"}` \| `{type:"update_notifications_changed"}` (zod, strict) | — | Server → client only |
| `GitHubRateLimitGate.isBlocked(now)`, `GitHubRateLimitError { resetAt }` | API rate limit | — | — | Process singleton `getGitHubRateLimitGate()`; its blocked-until time is persisted in `<app-data>/github/rate-limit.json` (AR-001) |
| `UpdateCheckScheduler.start()`, `close()` | Cadence | — | — | Constants: `INITIAL_DELAY_MS=60_000`, `TICK_INTERVAL_MS=1_800_000`, `CHECK_INTERVAL_MS=21_600_000` |
| IPC `app-update:mark-notification-read`, `app-update:clear-notification` | App record | Intents | — | Both return `AppUpdateState`; disabled updater returns its state unchanged |
| `AppUpdateState.notification: AppUpdateNotification \| null` | App record | `{ version, fromVersion, foundAt, read, state: 'waiting' \| 'handled', handledVersion, releasePageUrl }` | — | `releasePageUrl` is the GitHub release page from the packaged publish config; `null` under the e2e test feed (DEC-017). The row's details omit the Release page link when it is `null` |
| e2e env `AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL` | Launch profile | `http://127.0.0.1:<port>` or `http://localhost:<port>` only; rejected in the production profile | — | `isolated-app start --test-update-feed <url>` sets it |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `clearUpdateNotification(kind, sourceId)` | Yes | Yes (compound) | Low | — |
| `listGitHubSourceUpdateStates()` (two owners) | Yes | Yes (each owner's own ids) | Low | Kind is added by the notification service, which knows which owner it asked |
| `markUpdateNotificationsRead` | Yes | N/A (all waiting on the node) | Low | — |
| App IPC intents | Yes | N/A (one app record) | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Capability area | `src/update-notifications/` | Yes | Low | — |
| Scheduler | `UpdateCheckScheduler` | Yes | Low | — |
| Notification owner | `UpdateNotificationService` | Yes | Low | — |
| Setting | `ENABLE_UPDATE_CHECKS`, `UpdateChecksCapabilityService` | Yes (matches the UI's "Update checks") | Low | — |
| Gate | `GitHubRateLimitGate` | Yes | Low | — |
| Shell record | `AppUpdateNotificationRecord` | Yes | Low | — |
| Web panel | `NotificationCenter` (UI "Notifications") | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Checking a source | Source owners' check methods | Reuse | Same pipeline, same failure semantics | — |
| Updating from a notification | Web `agentPackagesStore`, `skillSourcesStore`, `appUpdateStore` | Reuse | REQ-007 | — |
| Live push | Change-hub pattern + `NodeChangeFeed` | Extend (generic hub) | Pattern exists | — |
| Setting | Capability services + web factory | Reuse | AF-08 | — |
| JSON persistence | `writeJsonArrayFile` / `readJsonArrayFile` | Reuse | Atomic, locked | — |
| Rate limit | `integrations/github` | Extend | Transport owner | — |
| App record | Shell updater folder | Create new file | Keeps `appUpdater.ts` < 500 lines | — |
| Notification records and rules | — | Create New | No owner of "update found / read / handled" exists | Source owners own source state, not the user's reading of it |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/update-notifications` | Scheduler, notification records, setting, change messages, composition | DS-001, 002, 005..008 | Itself | Create New | Studio-only |
| `src/agent-packages`, `src/skills` | Source state, projections, change signal, serialization | DS-001, 002 | Themselves | Extend | — |
| `src/integrations/github` | Rate-limit gate | DS-001, 002 | Transport | Extend | — |
| `src/utils` | Generic `ChangeFeedHub` | DS-005 | Feeds | Create New file | Concern-agnostic |
| `src/api/graphql`, `src/api/websocket`, `src/compositions` | Transport, wiring | All | — | Extend | — |
| `autobyteus-web/electron/updater`, `electron/launch-profile`, `shared`, `preload` | App record, test feed, IPC | DS-004 | `AppUpdater` | Extend | — |
| `autobyteus-web/stores`, `services`, `composables`, `components/notifications`, `components/layout`, `components/settings`, `components/skills`, `localization` | UI | DS-003, 005, 008 | Web stores | Create New / Extend | — |
| `autobyteus-web/scripts/isolated-app` | `--test-update-feed` | DS-004 | Ops | Extend | — |

## Draft File Responsibility Mapping

See the Final mapping (the draft needed only one change: the app record moved out of `appUpdater.ts` for size).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Source update projection (two owners → one consumer) | `src/integrations/github/github-source-update-state.ts` | `integrations/github` (already shared by both owners) | One shape for both kinds | Yes (no status, no path, no error) | Yes (status is the owners' business; the projection carries facts) | A second status model |
| Broadcast hub | `src/utils/change-feed-hub.ts` | utils | Third use | Yes | Yes | A message router |
| Skill update confirmation body | `components/skills/SkillSourceUpdateConfirmation.vue` | skills UI | Dialog + panel | Yes | Yes | A generic confirmation |
| Notification rules (node and shell) | — (two runtimes, two processes) | — | Not shared code: different processes and builds | — | — | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `GitHubSourceUpdateState` | Yes | Yes | Low | — |
| `UpdateNotificationRecord` (stored) | Yes; display fields are not stored (taken from the projection) | Yes | Low | — |
| `UpdateNotificationView` (GraphQL) | Yes | Yes | Low | `compareUrl` is built in the web from `repositoryUrl` + revisions, not sent |
| `AppUpdateNotification` | Yes | Yes | Low | Release notes stay in `AppUpdateState.releaseNotes` (not duplicated) |

## Final File Responsibility Mapping

Server (`autobyteus-server-ts/src`):

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `update-notifications/domain/update-notification.ts` (new) | Notification types | `UpdateNotificationKind`, record, view types |
| `update-notifications/stores/update-notification-store.ts` (new) | Store | Tolerant read / exact write of `notifications.json` |
| `update-notifications/services/update-notification-service.ts` (new) | Notification owner | DS-007, views, mark-read, clear, serialized reconcile, publish |
| `update-notifications/services/update-check-scheduler.ts` (new) | Scheduler | DS-006 |
| `update-notifications/services/update-checks-capability-service.ts` (new) | Setting | `ENABLE_UPDATE_CHECKS` |
| `update-notifications/changes/update-notification-change-messages.ts` (new) | Feed contract | zod schema + serializer |
| `compositions/update-notifications-composition.ts` (new) | Wiring | Listeners → service; hub; scheduler start; `close()` |
| `utils/change-feed-hub.ts` (new) | Transport-generic | Connect/greet/broadcast/closeAll for any serializer |
| `integrations/github/github-rate-limit-gate.ts` (new) | Transport | Gate + `GitHubRateLimitError` + its one-timestamp file (tolerant read once, atomic write when a later time is learned) |
| `integrations/github/public-github-request.ts` (modify) | Transport | Consult/update the gate for `api.github.com` |
| `integrations/github/github-source-update-state.ts` (new) | Shared type | Projection type |
| `agent-packages/services/agent-package-service.ts` (modify, split) | Package owner (public boundary) | Import, remove, reload, list, per-package serialization, listener; delegates the GitHub check/update lifecycle. It is 528 lines today: the split brings it under 500 instead of growing it |
| `agent-packages/services/github-agent-package-updates.ts` (new, internal to `AgentPackageService`) | GitHub update lifecycle of managed packages | Moved from the service: the per-record check, the update body (stage/validate/record/reload/commit/rollback), marking update failure, and the `GitHubSourceUpdateState` projection. Only `AgentPackageService` calls it; callers keep depending on the service (Principle 3) |
| `agent-packages/services/agent-package-mappers.ts` (modify) | Mapping | `canUpdate` when known latest ≠ installed; projection mapper |
| `skills/services/skill-source-service.ts` (modify) | Skill owner | Projection, listener |
| `api/graphql/types/update-notifications.ts` (new), `api/graphql/schema.ts` (modify) | Transport | Resolver + registration |
| `api/websocket/update-notifications.ts` (new), `api/websocket/index.ts` (modify) | Transport | Route + registration |
| `compositions/build-studio-server.ts` (modify) | Composition | Compose and close |

Shell (`autobyteus-web`):

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `electron/updater/appUpdateNotificationRecord.ts` (new) | App record | Rules + `userData` file |
| `electron/updater/appReleasePage.ts` (new) | Release link | Read `app-update.yml` publish config |
| `electron/updater/appUpdater.ts` (modify) | Updater | Record calls, re-check before download, IPC intents, generic test feed (`setFeedURL({ provider: 'generic', url })` when given), state field |
| `electron/updater/disabledAppUpdater.ts`, `appUpdateController.ts` (modify) | IPC contract | New channels; `notification: null` |
| `shared/appUpdateTypes.ts` (modify) | Contract | `AppUpdateNotification`, state field |
| `electron/preload.ts` + its renderer type declaration (modify) | Bridge | Two intents |
| `electron/launch-profile/electronLaunchProfile.ts`, `electron/application/electronApplication.ts` (modify) | Launch | e2e test feed variable → `AppUpdater` with feed |
| `scripts/isolated-app/*` (modify) | Ops | `--test-update-feed <url>` |

Web (`autobyteus-web`):

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `types/updateNotifications.ts` (new) | Types | Views, kinds, feed messages |
| `graphql/updateNotifications.ts` (new) | Documents | Query, mutations, capability |
| `services/updateNotifications/updateNotificationChangeFeed.ts` (new) | Feed | `NodeChangeFeed` subclass, parse, deliver |
| `composables/notifications/useUpdateNotificationChangeFeed.ts` (new), `app.vue` (modify) | Retain feed | App-wide while ready; mount `NotificationCenter`; remove `AppUpdateNotice` |
| `utils/nodeEndpoints.ts` (modify) | Endpoints | `updateNotificationsWs` |
| `stores/updateNotificationsStore.ts` (new) | Notifications owner | Combined list, counts, order, actions, transient row state |
| `stores/notificationCenterStore.ts` (new) | Panel UI state | Open/anchor/new-this-visit |
| `stores/capabilities/updateChecksCapabilityStore.ts` (new) | Setting | Factory instance |
| `components/notifications/NotificationCenter.vue`, `NotificationSection.vue`, `NotificationRow.vue` (new) | UI | Panel, sections, rows per spec |
| `utils/notificationTime.ts` (new) | Format | Relative time |
| `components/layout/SidebarNotificationsEntry.vue` (new); `components/AppLeftPanel.vue`, `components/layout/LeftSidebarStrip.vue` (modify) | UI | Pill / strip entry |
| `components/settings/UpdateChecksCard.vue` (new); `ServerSettingsBasicsPanel.vue` (modify, last in grid) | UI | Setting card |
| `components/skills/SkillSourceUpdateConfirmation.vue` (new); `SkillSourcesModal.vue`, `SkillSourceRow.vue` (modify) | UI | Shared confirmation; `canUpdate` for REQ-006 |
| `stores/appUpdateStore.ts`, `utils/appUpdateErrorDisplay.ts` (modify) | App state | Notification field + intents; remove card state; quiet startup errors |
| `components/app/AppUpdateNotice.vue` + spec (remove) | — | — |
| `localization/messages/en/*`, `zh-CN/*` (modify) | Strings | `settings.notifications.*` per the spec; remove `AppUpdateNotice` keys |

Docs:
- `autobyteus-server-ts/docs/modules/update_notifications.md` (new) and the module index.
- `agent_packages.md` (replace "no polling" with the background check, serialization and `canUpdate`).
- `skills.md` (background check and notifications).
- `autobyteus-web/docs/settings.md` (Update checks card, Notification Center, capability note).
- `docs/isolated-app-instances.md` (`--test-update-feed`).
- `autobyteus-web/docs/electron_packaging.md` (e2e variable).

## Applied Patterns (If Any)

- **Worker loop:** `UpdateCheckScheduler` (DS-006), a timer-driven loop inside one owner.
- **State machine:** reconcile rules (DS-007) in `UpdateNotificationService` and `AppUpdateNotificationRecord`.
- **Repository:** `UpdateNotificationStore`.
- **Observer:** the single injected listener on each source owner (as `reloader.setPublisher`).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/update-notifications/` | Folder | Update-notification capability | domain / stores / services / changes | A capability area like `projects/` | GitHub transport, source-registry access |
| `autobyteus-server-ts/src/utils/change-feed-hub.ts` | File | Transport-generic | Hub | Truly concern-agnostic | Message types |
| `autobyteus-server-ts/src/integrations/github/` | Folder | GitHub transport | Gate, projection type | Shared by both source owners | Notification rules |
| `autobyteus-web/electron/updater/` | Folder | Shell updater | Record, release link | Next to `AppUpdater` and the channel store | Renderer code |
| `autobyteus-web/components/notifications/` | Folder | Notification UI | Panel, sections, rows | As in the approved reference | Data fetching |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/update-notifications/{domain,stores,services,changes}` | Main-Line Domain-Control + Persistence | Yes | Low | Mirrors `projects/` |
| `src/compositions/update-notifications-composition.ts` | Mixed Justified (wiring) | Yes | Low | Same as the existing feed composition |
| `components/notifications/` | Off-Spine UI | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Source change signal | `AgentPackageService.updateAgentPackage` runs inside `this.serialize(id, …)` and, in `finally`, calls `this.announceGitHubSourceStateChanged()`; the composition set that listener to `() => notifications.reconcile()` | `UpdateNotificationService` importing `AgentPackageRegistryStore` to diff files; or GraphQL resolvers calling `reconcile()` after each mutation | Keeps one writer per state and one coordination owner (Principles 3, 13) |
| Reconcile, failed check | Record waiting for `B`; offline check → owner keeps `latestRevision=B`, status `CHECK_FAILED` → reconcile sees latest `B` ≠ installed `A` → unchanged; row still offers Update (`canUpdate` from `B ≠ A`) | Deriving "update available" from `updateStatus === 'UPDATE_AVAILABLE'` | REQ-006 |
| Reconcile, update done elsewhere | Record waiting `A→B`; user updates from the Agent Packages row; installed becomes `B`, latest `B` → installed ≠ `R.from` (A) → handled "Updated to B" | Removing the record (the user would never see "Updated") | REQ-008 |
| Serialized check (AR-003) | `serialize(id, async () => { const record = await registry.findPackageById(id); … fetch … write from record })` | Reading all records before the loop, then serializing a write built from that earlier read | The race AF-05 stays open if the read happens before the lock |
| Rate limit across a restart (AR-001) | Gate blocked until T and persisted; the app restarts at T−20 min; the gate loads T; the scheduler's first tick at 60 s sees `isBlocked()` and makes no request | An in-memory gate that is empty after the restart and lets one request through | REQ-003 holds across restarts |
| Rate limit | First 403 with `x-ratelimit-remaining: 0`, `x-ratelimit-reset: T` → gate blocked until T → scheduler stops after that source; a manual check before T fails at once with "GitHub rate limit reached; try again after HH:MM" and makes no request | Retrying the remaining sources, each receiving 403 | QR-001, GitHub guidance |
| App Download after restart | Record waiting `1.5.7`; status `idle` (startup check not done) or `no-update`/`error`; Download → `checkForUpdates('manual')` → if `available`, `downloadUpdate()`; else the result is shown as today | Button that does nothing or a main-process error "No update available" | DS-004 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `AppUpdateNotice` behind a flag | Existing users know it | Rejected | Removed; notification row + Settings → Updates |
| Keep renderer `dismissedVersion` as a fallback | Former "Later" | Rejected | Shell `read` state |
| Version check between web and server for the new GraphQL fields | Mixed versions | Rejected (DESIGN.md rule 9) | Clean-cut contract |

## Derived Layering (If Useful)

Not needed; the spines and ownership map are sufficient.

## Change / Refactor Sequence

1. **Server transport:** `GitHubRateLimitGate` + `publicGitHubRequest` integration; `GitHubSourceUpdateState` type; tests (403/429 headers, blocked refusal, codeload untouched).
2. **Source owners:**
   - move the GitHub check/update lifecycle out of `agent-package-service.ts` into `github-agent-package-updates.ts` (behavior unchanged; existing tests pass);
   - per-package serialization in `AgentPackageService` (tests: check concurrent with update keeps the new installed revision);
   - projections and listeners in both owners;
   - `canUpdate` fix (mappers) and `SkillSourceRow` `canUpdate`/`canCheck`.
3. **Capability area:** domain, store, service (DS-007 table as unit tests), capability service, scheduler (fake timers; setting off; gate; due rule; sequential stop), change messages, `ChangeFeedHub`, composition, GraphQL, websocket, registration in `build-studio-server.ts` (closed on `onClose`).
4. **Shell:** record + release link + `AppUpdater` changes + IPC/preload/types + disabled updater; launch profile variable and `isolated-app --test-update-feed`; Electron tests.
5. **Web:**
   - types, documents, feed, stores, capability store;
   - components per the spec (port markup from the reference, not its store);
   - sidebar entries, card, extracted confirmation;
   - `app.vue` (remove the card, mount the panel, retain the feed);
   - `appUpdateStore` / `appUpdateErrorDisplay` changes and removals;
   - localization en/zh-CN and audit.
6. **Docs** as listed.
7. Remove everything in the Removal Plan; run the server, web and Electron test suites, the localization audit and typecheck.

## Key Tradeoffs

- **Derived records vs a free-standing inbox.** Records are derived from source state plus the user's read/clear actions, so they cannot drift from reality, and new kinds add a projection rather than a new producer protocol. The cost is a reconcile on every relevant change (a small local read).
- **Existing 2-request check** instead of a one-request variant. Simpler and correct within budget (UNK-001); revisit only if users with many sources hit limits.
- **A failed check counts as a check (REQ-002).** A node that starts offline waits up to 6 hours for its next automatic check. Accepted for simplicity and rate safety; manual checks are unaffected.
- **Process-wide rate-limit gate also refuses manual requests until the reset.** The user gets an immediate, clear message instead of another 403, which GitHub asks clients to avoid.

## Risks

- Electron's generic-provider check in a packaged isolated build is not yet proven (escalation trigger).
- Under the e2e test feed the app row has no Release page link (DEC-017). The link is verified by Electron unit tests of `appReleasePage.ts` and of `AppUpdater` with a GitHub publish config, and in the user's own check of the beta (a real GitHub feed).
- macOS download/install of a test feed build requires matching signing; AC-007 install is verified in the Electron harness per the `desktop-beta-update-channel` precedent if the isolated instance cannot.
- Live order movement while the panel is open was reviewed by the user; if implementation finds it disruptive, it is a Product question.

## Guidance For Implementation

- **Follow the UI/UX spec exactly** (strings, colours, sizes, focus, Esc/outside-click rules, live order). The design repository's components are the reference markup; replace its store, plugin and scripted outcomes with the production stores.
- **Row actions:**
  - Package: `agentPackagesStore.updateAgentPackage(id)`.
  - Skill: open `SkillSourceUpdateConfirmation` (shared with `SkillSourcesModal`), then `skillSourcesStore.githubOperation('update', id)`.
  - App: Download → `appUpdateStore.downloadUpdate()`; Install → `installUpdateAndRestart()`. Disable Download while status is `checking`.
  - Failure: show the thrown error's message as the reason. Skill-name conflicts keep using the global conflict dialog, as today.
- **Panel open:** `markAllRead()` calls the node mutation and the shell IPC. The node call is skipped when the window has no server connection.
- **Counts:** waiting = waiting node records + the app record when it is waiting. The app row shows when the record is waiting, or while status is downloading/downloaded/installing.
- **Browser windows:** `appUpdateStore.isElectron` is false, so there is no app row. Mobile runtime: no entry (`isFeatureAvailableInRuntime('desktopSettings')`).
- **Empty / checks-off text:** use `updateChecksCapabilityStore.isEnabled`.
- **Server listener calls** are fire-and-forget (`void notifications.reconcile().catch(log)`) so a notification problem never fails a package or skill action. The service serializes its own reconciles.
- **Tests to add:**
  - Server: unit tests for the gate, the store, the reconcile table, the scheduler, capability, package serialization and `canUpdate`; a GraphQL/ws integration test.
  - Shell: Electron tests for the record, the re-check before download, the IPC intents and the launch profile.
  - Web: tests for the stores, the panel (keyboard, Esc, outside click, order, Show N more) and the card; the localization audit.
  - Isolated instance with `--test-update-feed` and real public GitHub repositories (ASM-001) for AC-001..003.
- **Wiring (R-1):** the resolver reaches `UpdateNotificationService.getInstance()` and `UpdateChecksCapabilityService.getInstance()`, the same pattern as `SkillImprovementCapabilityService` and the source owners. `getInstance()` builds the service with its default dependencies (the two source owners' `getInstance()`, the store, and the process hub `getUpdateNotificationChangeHub()`). `composeUpdateNotifications` takes those same instances to set the owners' listeners, register the hub on `/ws/update-notifications` and start the scheduler; `close()` clears the listeners, stops the scheduler and closes the hub. No second instance is created anywhere.
- **File size:** keep every touched file under 500 lines.
