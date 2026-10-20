# Investigation Notes

## Investigation Meta

- Package identifier: `settings-update-notifications`
- Request / ticket: Notification area in Settings: tell users when the app, a GitHub agent package or a GitHub skill source has an update (check in the background, notify, never update by itself). Delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), requested by the user 2026-10-20.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications`, branch `codex/settings-update-notifications`
- Resolved base remote / branch / revision: `origin/personal` at `3d4d9d0a951d8ce164b7d1fc3528eb6ee90fd247` (fetched 2026-10-20)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md, Finalization Target)
- Bootstrap result: worktree and branch created from the fetched `origin/personal`; ticket folder `tickets/in-progress/settings-update-notifications/`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md` (2026-10-20), `references/ticket-scope.md` (2026-10-20), repository `AGENTS.md`, `DESIGN.md` (first part, 2026-10-20), `RELEASE.md` (Finalization Target, Release Decision; 2026-10-20), `TESTING.md` (surface table, 2026-10-20).
- Investigation status: Requirements investigation complete (SR-001..SR-003). Architecture investigation complete (2026-10-20, SR-003).
- Authorities read (architecture reading gate, 2026-10-20): `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, `references/handoff.md` (updated skill), repository `DESIGN.md` (in full), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (sections 1–4), `templates/design-spec-template.md`.

## Initial Request And Clarifications

- Original request: see the Task description (Project Task Manager, 2026-10-20). A notification area where users read notifications that the app, an imported GitHub agent package or an imported GitHub skill source has an update, with a background check, an Update action that uses the existing explicit update, dismiss/skip, kept read/handled state, no pile-up, and never updating by itself.
- Clarifications received: none yet.
- User-supplied facts and constraints (from the Task, marked as the user's direction):
  - Small, quiet notification area, not a pop-up. Settings page right-hand empty space suggested; consider a badge or dot on the Settings entry in the sidebar bottom-left. Product Team decides placement and look.
  - First three kinds: app update, GitHub agent package update, GitHub skill source update; other kinds can be added later without redesign.
  - Background check at start and now and then, only for what the user imported, GitHub rate limits and offline in mind, a setting to turn it off, no tracking or telemetry; say honestly what network calls are made.
  - Each notification shows what changed (version/revision, summary or link), an Update action using the existing explicit update, dismiss/skip-this-version; read and handled states kept; no pile-up for the same update.
  - Never update by itself (trust and supply-chain risk). Opt-in automatic update is a separate, later Task.
  - UI/UX design step with the Product Team first (placement, states, empty state, badge, en and zh-CN strings; design repository `autobyteus-web-design` updated by its owner), approved by the user, before building.
  - Done when: user approves the design; the area exists and shows the three kinds from a real check of a test GitHub package, a test GitHub skill source and a test app update (isolated app with test data); background checks respect the setting; updates only on user action; tests; merged; a beta; the user's check in the app.
- Initial ambiguity: whether the existing app-update pop-up card stays; whether the off setting also covers the app's own update check; check cadence; dismiss vs skip semantics; where notifications appear when a window is bound to a remote node or the browser deployment. Resolved as decisions in the requirements doc.

## Product And Domain Understanding

- Product area: Desktop app shell (Electron updater), web UI Settings, server-side agent package and skill source lifecycle.
- Affected actors or systems: desktop user; browser user of a server node (no desktop app); the embedded/remote server node; GitHub REST API (`api.github.com`) and GitHub release feed for the app.
- Existing user or operational purpose: keep imported public GitHub agent packages and skill sources and the desktop app current, by the user's explicit choice.
- Relevant terminology:
  - *Agent package* (`GITHUB_REPOSITORY` source kind): managed copy of a public GitHub repository archive (Settings → Agent Packages).
  - *GitHub skill source*: managed copy of a public GitHub repository with skills (Skills page → Manage skill sources).
  - *Revision*: the default-branch commit SHA; the "version" of a GitHub source.
  - *Node*: the server a window is bound to (embedded or remote); packages and skill sources are node state.
  - *Skill update notice* (`docs/modules/skill_update_notices.md`): unrelated existing feature telling a running agent that a skill changed on disk.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-20 | Doc | `autobyteus-server-ts/docs/modules/agent_packages.md` | Package update lifecycle | Statuses NOT_CHECKED/UNKNOWN/UP_TO_DATE/UPDATE_AVAILABLE/CHECK_FAILED/UPDATE_FAILED; "no polling or automatic download happens"; check never modifies files; update stages, validates, reloads, commits or rolls back | Doc must change: background checks now happen |
| 2026-10-20 | Code | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Check/update paths | `checkAgentPackageUpdates(ids?)` checks GitHub records sequentially; a failed check writes `CHECK_FAILED` keeping `latestRevision`; `updateAgentPackage` re-fetches metadata and replaces only when revision differs | A failed check overwrites the status `UPDATE_AVAILABLE` with `CHECK_FAILED` |
| 2026-10-20 | Code | `autobyteus-server-ts/src/integrations/github/github-repository-client.ts`, `public-github-request.ts` | Network calls per check | 2 unauthenticated requests per source per check: `GET api.github.com/repos/{o}/{r}` then `GET .../branches/{default}`; 30 s timeout; headers `Accept`, `User-Agent: AutoByteus` only; hosts limited to `api.github.com`, `codeload.github.com` | Rate-limit budget: 2 requests per source |
| 2026-10-20 | Code | `autobyteus-server-ts/src/skills/services/skill-source-service.ts`, `src/skills/domain/skill-source.ts` | Skill source check/update | Same client; checks run in parallel per source; status derived: `lastUpdateError` → UPDATE_FAILED, `lastCheck.error` → CHECK_FAILED (even if a newer revision was seen earlier), else compare revisions | A failed check also hides a known update in the row status |
| 2026-10-20 | Code | `autobyteus-web/components/settings/AgentPackagesManager.vue` (onMounted) | When checks run today | Opening Settings → Agent Packages fetches and checks all GitHub packages | Preserve |
| 2026-10-20 | Code | `autobyteus-web/components/skills/SkillSourcesModal.vue`, `SkillSourceRow.vue` | Skill source UI | Opening the dialog checks all GitHub sources; Update requires a confirmation dialog warning that local edits are replaced (`skills.sources.updateWarning`), showing branch and old → new short revisions | Notification Update must keep this confirmation |
| 2026-10-20 | Code | `autobyteus-web/electron/updater/appUpdater.ts` | App update mechanism | electron-updater; `autoDownload=false`; startup check 8 s after launch (packaged only); states idle/checking/available/downloading/downloaded/installing/no-update/error/disabled; release notes and version from feed; beta channel via `allowPrerelease`; `autoInstallOnAppQuit=true` applies only to an update the user downloaded | Existing check is the app notification's producer |
| 2026-10-20 | Code | `autobyteus-web/components/app/AppUpdateNotice.vue`, `stores/appUpdateStore.ts`, `app.vue` | How an available app update is shown today | A floating card fixed bottom-right (`z-[95]`, shadow) appears on its own whenever status becomes `available`, `checking`, `downloading`, `downloaded`, non-quiet `error`, or `no-update` (auto-hides after 3 s). "Later"/dismiss hides it; the dismissed version is kept **in memory only**, so the card returns on every launch | This is the pop-up the direction asks to avoid |
| 2026-10-20 | Code | `autobyteus-web/components/settings/AboutSettingsManager.vue` | Settings → Updates | Shows version, status, last checked, beta toggle, Check / Download / Install & restart buttons | Preserve as the full app-update surface |
| 2026-10-20 | Code | `autobyteus-web/electron/updater/disabledAppUpdater.ts`, `electron/launch-profile/electronLaunchProfile.ts` | Isolated instances | `e2e` launch profile has `updaterEnabled: false`; `DisabledAppUpdater` answers with a quiet `disabled` state | Verifying an app-update notification in an isolated app needs an explicit test feed opt-in |
| 2026-10-20 | Doc | `docs/isolated-app-instances.md` line 30 | Isolated instance contract | "No update checks, prompts or update errors" | Preserve unless an explicit test opt-in is set |
| 2026-10-20 | Doc | `tickets/done/desktop-beta-update-channel/api-e2e-*` | Precedent for testing app updates | Real electron-updater pointed at a local GitHub-shaped feed (`setFeedURL`, provider github, http host) in an Electron harness | Reusable verification approach |
| 2026-10-20 | Code | `autobyteus-web/pages/settings.vue` | Settings layout | Left nav (resizable) + content column; content sections are mostly `max-w-3xl` centered, leaving empty space on wide windows; sections: api-keys, token-usage, display, language, local-tools, mcp-servers, application-packages, agent-packages, server-settings, extensions, updates | Product decides placement |
| 2026-10-20 | Code | `autobyteus-web/components/layout/LeftSidebarStrip.vue`, `components/AppLeftPanel.vue` | Sidebar Settings entry | Cog icon at the bottom of the strip; text entry in the left panel; both gated by `isFeatureAvailableInRuntime('desktopSettings')` | Badge candidate |
| 2026-10-20 | Code | `autobyteus-web/utils/mobileFeatureGates.ts` | Runtimes | Settings available in desktop and browser runtimes, not in the mobile remote-access client | Notification area not in mobile client |
| 2026-10-20 | Code | `autobyteus-web/stores/windowNodeContextStore.ts`, `docs/settings.md` (Feature Capability Toggles) | Node binding and per-node settings | A window binds to one node (embedded or remote); node-bound toggles exist (`createBoundNodeCapabilityStore`, `FeatureCapabilityToggleCard`) | Background-check setting is node state |
| 2026-10-20 | Code | `autobyteus-server-ts/src/startup/background-runner.ts` | Server background work | Non-critical startup tasks run after start; no recurring scheduler for updates exists | Architecture decides the checker's owner |
| 2026-10-20 | Code | `autobyteus-server-ts/src/application-packages/types.ts` | Other GitHub sources | Application packages can be imported from GitHub but have no update check or update | Out of scope; possible later notification kind |
| 2026-10-20 | Code | `autobyteus-web/components/common/ToastContainer.vue`; grep for notification inbox | Existing notification surfaces | Only transient toasts and chat system notices; no inbox/bell | New capability |
| 2026-10-20 | Web | https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api | Rate limits | Unauthenticated: 60 requests/hour per IP; exceeded → 403/429 with `x-ratelimit-remaining: 0`, wait until `x-ratelimit-reset`; secondary limits use `retry-after`; continuing while limited may get the client banned | Background checks must stop on a limit and wait |
| 2026-10-20 | Doc | `RELEASE.md` | Release path | Beta = `vX.Y.Z-beta.N` offered to installs with "Receive beta updates" on | Done-when needs a beta |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User opens Settings → Agent Packages, or presses a row's check | All GitHub packages (or the one) are checked against GitHub; rows show status | Check never changes files; failure → `CHECK_FAILED`, package keeps working | AgentPackagesManager.vue onMounted; agent-package-service.ts | High |
| BEH-002 | User | User presses Update on a GitHub package row | Re-fetch metadata; if newer, download archive, validate, skill-name check, record, reload, commit; else mark UP_TO_DATE | Failure keeps previous package and records `UPDATE_FAILED` | agent-package-service.ts `updateAgentPackage` | High |
| BEH-003 | User | User opens Skills → Manage skill sources | All active GitHub skill sources are checked; rows show status; Update asks for confirmation (local edits replaced) | Same failure-preserving rules | SkillSourcesModal.vue, skill-source-service.ts | High |
| BEH-004 | System | Packaged desktop app starts | 8 s after launch the app checks its update feed (stable or beta channel); never downloads by itself | — | appUpdater.ts `startAutoCheck` | High |
| BEH-005 | System/User | App update check finds a newer version | A floating card pops up bottom-right with version, release notes, Download / Later; it returns on every launch until updated | Download and install only on the user's action | AppUpdateNotice.vue, appUpdateStore.ts | High |
| BEH-006 | User | Settings → Updates | Version, status, last checked, beta toggle, Check / Download / Install & restart | — | AboutSettingsManager.vue | High |
| BEH-007 | Operational | Isolated (`e2e`) app instance | Updater disabled; quiet `disabled` state; no prompts | — | disabledAppUpdater.ts, isolated-app-instances.md | High |
| BEH-008 | System | Any time between Settings visits | No background check of packages or skill sources; nothing tells a user who does not open those pages that an update exists | — | agent_packages.md "no polling" | High |
| BEH-009 | — | Notification area | No current supported behavior | — | grep: only toasts and chat notices | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `GitHubRepositoryClient.fetchRepositoryRevisionMetadata` | 2 API requests per source | Background budget = 2 × (packages + skill sources) per pass, against 60/hour per IP shared with manual checks and imports | Can a background pass use one request per source (stored default branch) or conditional requests? |
| `AgentPackageService.checkGitHubPackageUpdate` | Writes `CHECK_FAILED` over `UPDATE_AVAILABLE` on failure | An offline background check would make a known update disappear from the row status | Notification state must not depend on the last check having succeeded |
| `SkillSourceService.getSkillSources` status derivation | `CHECK_FAILED` wins over a known newer revision | Same | Same |
| `AppUpdater` (Electron main) | Owns app update state and IPC; renderer mirrors it | App notification originates in the desktop shell, not the node | Two producers (node and shell) feed one area |
| `appUpdateStore.dismissedVersion` | In-memory | Skip-this-version for the app must persist | Persisted shell-side state |
| Server settings / node capability toggles | Per-node boolean settings with a UI card | The background-check setting is per node | Reuse the toggle mechanism |
| `/ws/agent-package-definitions` and other node streams | Push changes to the web | A finding made while the window is open should appear without reload | Push or poll — architecture |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records: `<app-data>/agent-packages` registry (`sourceMetadata.github`), `<app-data>/skill-sources/github/registry.json` (`installed`, `lastCheck`, `lastUpdateError`), Electron `userData` update-channel file.
- Existing readers, writers: `AgentPackageRegistryStore`, `GitHubSkillSourceStore`, `appUpdateChannelStore`.
- Evidence paths: see Source Log.

### Structural Surfaces

- Runtime modules: agent-packages, skills, integrations/github, Electron updater, web Settings page, sidebar, app shell (`app.vue`).
- Existing structural surfaces that can support the behavior: the existing explicit check/update operations; node-bound capability toggle; Electron update IPC.

### Potential Structural Impacts To Investigate

- API or external-contract change: new GraphQL (or stream) surface for notifications and the setting; new Electron IPC for app-notification state. Present.
- Persistence schema or invariant change: new notification state (read/dismissed per source and revision; app skipped version). Present (additive).
- Security or privacy boundary change: new automatic outbound requests to `api.github.com`. Present; no new hosts, no credentials, no telemetry.
- Concurrency or lifecycle change: a recurring background job on the server; interaction with manual checks/updates serialized per source. Present.
- Deployment, migration, ownership-boundary change: none expected; additive files only. Unknown until design.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Code reading | Offline check of a package already known to have an update | Status becomes `CHECK_FAILED`; `latestRevision` kept | Notifications must survive a failed later check | agent-package-service.ts `checkGitHubPackageUpdate` |
| Code reading | App update dismissed with Later, app restarted | Card returns at next launch (dismissal not persisted) | Skip-this-version must persist | appUpdateStore.ts `dismissNotice` |

No runtime probe was needed for the requirements; architecture will probe the GitHub request budget and the isolated-instance test feed.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (Task, 2026-10-20) | Users import fast-moving public packages and skills and never learn of updates | Direct request | Background check + notification | — |
| User | Trust and supply-chain risk: never update silently | Direct constraint | Update only on explicit action | — |
| User | Quiet area, not a pop-up; badge so non-Settings users notice | Direct direction | Badge/indicator outside Settings | Placement by Product |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| GitHub REST API, unauthenticated | docs.github.com rate limits | 60 req/h per IP; 403/429 with `x-ratelimit-remaining: 0`; honour `x-ratelimit-reset` / `retry-after` | Web source | Shared budget with the user's other GitHub tools on the same IP |
| GitHub web compare page | `https://github.com/{owner}/{repo}/compare/{old}...{new}` | A link shows what changed without an API call | Public GitHub URL scheme | None |
| electron-updater GitHub provider | existing dependency | Supplies version and release notes; stable `/releases/latest`, beta `releases.atom` | desktop-beta-update-channel ticket | — |

## Persisted Data And State Facts

- Affected stored or external subject: new notification state; existing package and skill source registries are read (and written by checks as today).
- Location and representative shape: to be decided by architecture (node app data for package/skill notifications; Electron `userData` for the app notification).
- Approximate volume: one notification per imported GitHub source plus one for the app; tens at most.
- Current readers and writers: see Structural surfaces.
- Current unknown/extra-field behavior: registries normalize unknown fields away on write (agent packages) — architecture must not lose existing metadata.
- Required semantics or data that must be preserved: all existing registry data and update statuses; installed packages and skill files.
- Acceptable loss, reset, rebuild, or regeneration: notification read/dismissed state may be rebuilt as "unread" if its file is unreadable (worst case: a notification shows again). Never lose package or skill data.
- Privacy, retention, compliance: no telemetry; requests go only to GitHub (already used); nothing sent to AutoByteus.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request in the current input: `Present` (the Task requires a UI/UX design step with the Product Team, approved by the user, before building).
- User's requested outcome, in the user's own terms: "A small, quiet notification area, not a pop-up. The Settings page has a lot of empty space on the right, a good place for notifications. Also consider a small badge or dot on the Settings entry in the sidebar bottom-left, so a user who never opens Settings notices that something is waiting; the Product Team decides the placement and look." Design covers placement, states, empty state, badge, en and zh-CN strings; the design repository `autobyteus-web-design` is updated by its owner; approved by the user before building.
- Requirement / behavior IDs involved: REQ-001..REQ-012, REQ-014, UC-001..UC-006, AC-001..AC-016 (see requirements doc).
- Product decision, uncertainty, or experience to understand or evolve: placement of the area in Settings; the outside-Settings indicator; notification item anatomy (kind, source, old → new, what changed link/notes, Update, Dismiss); unread/read/updating/failed/handled states; empty and "checks are off" states; the background-check setting and its honest network-call description; how app download progress/restart appear without a pop-up; en and zh-CN strings.
- Critical journey and states: see SCN-001..SCN-008 in the requirements doc.
- Known constraints and non-goals: never update by itself; no automatic update option; no telemetry; no new pop-up; the existing row actions and Settings → Updates stay.
- Relevant existing-product context: Settings page (`autobyteus-web/pages/settings.vue`), sidebar Settings entries (`LeftSidebarStrip.vue`, `AppLeftPanel.vue`), current app-update card (`AppUpdateNotice.vue`), Settings → Updates (`AboutSettingsManager.vue`), skill source update confirmation (`SkillSourcesModal.vue`), node capability toggle card (`FeatureCapabilityToggleCard.vue`).
- Product Design request artifact / message reference: `tickets/in-progress/settings-update-notifications/handoff-product-design-request.md`
- Established separate design repository/root and ticket reference: `autobyteus-web-design` (owned by the Product Team); ticket to be created by its owner.
- Delegation record (2026-10-20, from `/project_task_manager`): Task `autobyteus-212` ("UI/UX design (Product Team): the update-notifications area in Settings"), given to Product Team run `product_team_1a9221a77fdf4e1aa637b6100cadeacc` (coordinator `product_ui_ux_designer_7fcb2b140a074fafacbb61cf0f811ddb`). The user approves the design; the result returns through the Project Task Manager to this Solution Designer.

## Product Design Findings

- Interim (2026-10-20, SR-002): `Requirement Impact` from the Product UI/UX Designer, relayed by `/project_task_manager`. The user's decisions in review rounds 6–13 are: no Dismiss/skip; the indicator stays while updates wait (emphasised while unread, softer once read); a Notification Center panel opened from the sidebar's Settings row; the setting is an "Update checks" card in Server Settings → Basics.
  - Evidence: `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/settings-update-notifications/tickets/in-progress/settings-update-notifications/product-ticket.md`; `review-evidence/round-10`, `round-12`, `round-13` (for example `round-13/r15-00-panel-in-context-2x.png`). Proposal commit `52364d3`, branch `design/settings-update-notifications`.
  - Not yet approved as the final UI/UX package.
- Final package (2026-10-20, SR-003): approved by the user ("i like the UI approved", round 14, `e6ef28c`). Integrated on the design repository's `personal` at `288ef06`.
  - UI/UX spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md`.
  - Final references: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/visual-references/` (VIS-001..028, `capture-references.mjs`, `final-validation.mjs` 30/30).
  - Runnable reference: `/Users/normy/autobyteus_org/autobyteus-web-design/ui-reference-runbook.md`.
  - Verified by the Solution Designer: the spec's Status block records the user's words and commit; VIS-003 matches the spec (soft pill, ✕, sections, rows, Clear); the product ticket's Status is `Completed`.
  - Designer findings recorded as DEC-014 (REQ-004 details placement) and the live-order note in the requirements UI section.
  - Mocked in the reference (production must supply): producer and persistence (read, handled, cleared), live push, update pipelines, Electron updater state, per-node setting.
  - Design reference sources usable as a starting point (not prescribed): `stores/updateNotificationsStore.ts`, `components/notifications/NotificationCenter.vue`, `NotificationCard.vue`, `NotificationEntry.vue`, `notificationTime.ts`, `components/layout/SidebarNotificationsEntry.vue`, `components/settings/UpdateChecksCard.vue` in the design repository.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/settings-update-notifications/handoff-product-design-request.md` | Solution Designer | Product Design request context | UI/UX design step | All UI-facing REQ/AC | Current | Not behavior-defining by itself |
| Product UI/UX spec and references (external, `autobyteus-web-design`) | Product Team | Normative UI | Notification area | All UI-facing REQ/AC | Pending | Requires user confirmation; will be linked in SR-002 |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | GitHub's 60/hour unauthenticated budget is shared with manual checks, imports and other tools on the same IP | Background checks could exhaust it and make a user's manual action fail | QR-001 limits; architecture minimizes requests per source | Open (design) |
| RSK-002 | Risk | Isolated instances have the updater disabled by contract | The done-when requires an app-update notification in an isolated app | REQ-013: explicit test-feed opt-in; architecture | Open (design) |
| UNK-001 | Unknown | Whether a single request per source (stored default branch) or conditional requests are reliable for the background check | Rate-limit budget | Architecture probe | Open |
| UNK-002 | Unknown | Best transport for live notification updates to an open window (node stream vs refresh) | AC-004 | Architecture | Open |
| ASM-001 | Assumption | Verification uses real public GitHub repositories read-only (an older installed revision prepared in the isolated instance's test data, or a test repository the user provides) | Real check without touching the user's accounts or data | API/E2E plan | Open |

## Architecture Investigation Findings

Recorded 2026-10-20 (SR-003). Paths are relative to the worktree.

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| AF-01 | `autobyteus-server-ts/src/api/websocket/projects.ts`, `agent-package-definitions.ts`; `src/projects/changes/project-change-hub.ts`; `src/agent-package-definitions/changes/agent-package-definition-change-hub.ts` | Node → web change feeds are broadcast-only hubs behind `/ws/<name>`, authorized by `authorizeRemoteAccessWebSocket`, greeting each connection with `connected`. The two hub classes are line-for-line duplicates (49 lines each) except for the message serializer. | A new `/ws/update-notifications` feed follows the pattern. A third copy of the hub would duplicate it again, so this change extracts one generic broadcast hub. Migrating the two existing hubs onto it is pre-existing duplication → follow-up FU-001. |
| AF-02 | `autobyteus-web/services/nodeChangeFeed/nodeChangeFeed.ts`, `services/agentPackages/agentPackageDefinitionChangeFeed.ts`, `composables/agentPackages/useAgentPackageDefinitionChangeFeed.ts`, `app.vue` | The web has a generic `NodeChangeFeed` base (reconnect, rebind on node change); per-feed subclasses parse frames and deliver; app-wide retention starts in `app.vue` when the app is ready. | Reuse `NodeChangeFeed` for the notifications feed; re-read on `connected` and on change. |
| AF-03 | `src/compositions/build-studio-server.ts` (`composeAgentPackageDefinitionFeed`, `closeStudioProcessResources`, `app.addHook("onClose")`), `src/compositions/agent-package-definition-feed-composition.ts` | Studio-only process resources are composed in `buildStudioServer` and closed via `closeStudioProcessResources` on `onClose`. Services announce changes through injected publishers (`reloader.setPublisher`). The standalone application host does not compose them. | Compose the update-notification capability (hub, store, checker) the same way; the checker's timer is closed on server close. |
| AF-04 | `src/agent-packages/services/agent-package-service.ts`; `src/skills/services/skill-source-service.ts`; `src/api/graphql/types/agent-packages.ts`, `skills.ts` | Both source owners are process singletons (`getInstance()`), called directly by GraphQL resolvers. Their public check/update/remove/import methods are the only writers of GitHub update state. `SkillSourceService` serializes operations per repository; `AgentPackageService` does not serialize. | The notification owner reads a narrow update-state projection from each source owner and is told by them when that state changed (injected listener). |
| AF-05 | `agent-package-service.ts` `checkGitHubPackageUpdate` / `updateAgentPackage`; `agent-package-registry-store.ts` `updateGitHubSourceMetadata` | A check reads the record, awaits GitHub, then writes metadata built from the record it read earlier (including `installedRevision`). An update that commits in between gets its new `installedRevision` overwritten by the stale one. | With a background checker, the product itself creates this concurrency (a system pass and a user's Update on the same package). Per-package serialization in `AgentPackageService` (as `SkillSourceService` does) is part of this ticket (BEH-002 preserved outcome). |
| AF-06 | `agent-package-mappers.ts` `buildGitHubUpdateInfo`; `skills/domain/skill-source.ts` / `SkillSourceService.getSkillSources`; `autobyteus-web/components/skills/SkillSourceRow.vue` (`canUpdate`, `canCheck`) | Package `canUpdate` is false on `CHECK_FAILED` even when `latestRevision ≠ installedRevision`. Skill status puts `CHECK_FAILED` ahead of a known newer revision; the web row's `canUpdate` is only `UPDATE_AVAILABLE`/`UPDATE_FAILED`. Both keep `latestRevision` after a failed check. | REQ-006: `canUpdate` also when the known latest differs from installed; the notification is derived from the kept `latestRevision`, not from the status. |
| AF-07 | `src/integrations/github/public-github-request.ts`, `github-repository-client.ts`, `skills/installers/github-skill-repository.ts` | Every GitHub API call (metadata, branch, tarball) goes through `publicGitHubRequest` (hosts `api.github.com`, `codeload.github.com`). There is no rate-limit handling; a 403/429 becomes a generic HTTP error. | One rate-limit gate in `integrations/github` (the transport owner) records GitHub's reset time and refuses further `api.github.com` requests until then; the checker stops its pass when the gate is closed. |
| AF-08 | `src/services/server-settings-service.ts` (`getBooleanSetting`/`setBooleanSetting`); `src/skill-improvement/services/skill-improvement-capability-service.ts`; `src/api/graphql/types/application-capability.ts`; web `stores/capabilities/createBoundNodeCapabilityStore.ts`, `components/settings/FeatureCapabilityToggleCard.vue`, `docs/settings.md` | Per-node boolean capabilities are app-config keys exposed as `{ enabled, settingKey, source }` with a query and a `set…Enabled` mutation; the web builds one store per capability from a factory. | `ENABLE_UPDATE_CHECKS`, default on when the key is absent; capability query/mutation; a web store from the factory; the Basics card. |
| AF-09 | `autobyteus-web/electron/updater/appUpdater.ts`, `disabledAppUpdater.ts`, `appUpdateChannelStore.ts`, `shared/appUpdateTypes.ts`, `electron/preload.ts`, `stores/appUpdateStore.ts`, `components/app/AppUpdateNotice.vue`, `utils/appUpdateErrorDisplay.ts` | The shell owns app update state and broadcasts `AppUpdateState` to every window; preferences persist in `userData` (channel file). `downloadUpdate` requires status `available` in this process. The renderer's `visible`/`dismissedVersion`/`dismissNotice`/`shouldShow` and the no-update timer exist only for the floating card. Non-quiet startup-check errors raise a toast. | The app notification record lives in the shell next to the channel file and travels inside `AppUpdateState`. Removing the card makes its renderer-only state dead. Startup-check errors become quiet (DEC-016). After a restart the persisted notification exists before a check: Download first re-checks, then downloads. |
| AF-10 | `autobyteus-web/build/scripts/build.ts` (`resolveUpdaterPublishConfig`) | The updater feed is the GitHub provider with `owner`/`repo` resolved at build time; electron-builder writes them into the packaged `app-update.yml`. | The release page link is built in the shell from that publish config (`https://github.com/<owner>/<repo>/releases/tag/v<version>`); a test feed has no release page. |
| AF-11 | `autobyteus-web/electron/launch-profile/electronLaunchProfile.ts`; `autobyteus-web/scripts/isolated-app/cli.mjs`; `docs/isolated-app-instances.md` | Isolated instances use the `e2e` profile (`updaterEnabled: false`), run a packaged worktree build, and get only a baseline environment. e2e-only variables are rejected in the production profile. | REQ-019: an e2e-only `AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL` (set by `isolated-app start --test-update-feed <url>`) selects `AppUpdater` with a generic feed at that URL; without it, `DisabledAppUpdater` as today. |
| AF-12 | `autobyteus-web/components/AppLeftPanel.vue` (footer), `components/layout/LeftSidebarStrip.vue`, `plugins/15.appUpdater.client.ts` | The Settings row and the strip cog are gated by `isFeatureAvailableInRuntime('desktopSettings')`. `appUpdateStore.initialize()` runs app-wide from a client plugin. | The pill and strip entry live beside these entries and inherit the same runtime gate; the app notification is available on every page. |
| AF-13 | `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–3; `src/persistence/file/store-utils.ts` | New stored data must be read tolerantly and written exactly; JSON array files have an atomic, cross-process-locked writer (`writeJsonArrayFile`). | The notification store is a new JSON file with a tolerant reader; no migration; a missing or unreadable file reads as empty (QR-005). |
| AF-14 | `autobyteus-server-ts/src/skills/services/skill-source-service.ts` `checkGitHubSkillSourceUpdates` (`Promise.all`) | Checks of several skill sources run in parallel. | The checker calls one source at a time, so it can stop as soon as the rate-limit gate closes. |

Unknowns closed:
- UNK-001 (one request per check): not needed. The existing 2-request check at most every 6 hours keeps 20 sources at 40 requests per 6 hours, well inside 60 per hour. DESIGN.md says not to optimize ahead of need.
- UNK-002 (live transport): the node change-feed pattern (AF-01/02).
- RSK-002 (isolated updater off): addressed by AF-11.

## Requirement Implications

- No background check or notification exists (BEH-008, BEH-009): genuinely new behavior with the user's direction as its trigger basis.
- A failed check overwrites a known update in both row status models: the notification must keep a found update until it is handled, dismissed or superseded (REQ-006).
- The current app-update card pops up by itself on each launch and forgets "Later": conflicts with the direction of a quiet area and with no pile-up (DEC-001, REQ-009).
- Skill source Update carries a confirmation (local edits replaced): the notification's Update must keep it (REQ-007).
- Isolated instances never check for app updates: verification needs an explicit opt-in (REQ-013).
- Two request per source per check against a 60/hour budget: cadence and rate-limit handling are requirements (QR-001).

## Notes For Architecture Design

- Map SCN-001..SCN-008 to production paths: node-side background checker for GitHub packages and skill sources; shell-side app update producer; one web notification area combining the node's notifications and (desktop only) the shell's app notification.
- Reuse the existing explicit check and update operations; do not create a second update path.
- Decide notification persistence (node app data; Electron `userData`) and keep it additive; an unreadable notification-state file must not break startup or package/skill features (DESIGN.md rule 7 spirit).
- Decide how to keep row statuses and notifications consistent after a failed background check.
- Decide the live-update transport (UNK-002) and the minimal GitHub request budget (UNK-001).
- Design the isolated-instance test update feed opt-in (REQ-013) without changing the quiet default.
