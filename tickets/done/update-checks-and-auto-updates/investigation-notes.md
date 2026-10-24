# Investigation Notes

## Investigation Meta

- Package identifier: `update-checks-and-auto-updates`
- Request / ticket: Project Task autobyteus-210, "Update behaviour and settings": optional automatic updates for GitHub agent packages and skill sources; the desktop app's own periodic update check and switch; check intervals with GitHub rate-limit safety. Delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-23, with the user's comment "START THIS NOW".
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates`
- Repository mode: `Git`
- Task worktree / branch: the workspace root above, branch `codex/update-checks-and-auto-updates`
- Resolved base remote / branch / revision: `origin/personal` at `d2820672c3` (fetched 2026-10-23; release version `1.5.9-beta.2`; contains autobyteus-209, released in `v1.5.8-beta.4`)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created; ticket folder `tickets/in-progress/update-checks-and-auto-updates/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (requirements reading gate, 2026-10-23):
  - `references/requirements-engineering.md`, `references/ticket-scope.md` (read in this conversation);
  - `references/finding-the-cause.md` (new);
  - the updated `SKILL.md`, including the delegated Product Design Task rule.
- Investigation status: requirements investigation complete for SR-001.
- How findings were established: `Read` = code or docs read only. `Measured` = run against the real dependency, with the command recorded.

## Initial Request And Clarifications

- Original request: the Task description (three parts plus the 2026-10-23 comment), quoted in the requirements doc's Problem section.
- The user's words (from the Task):
  - 2026-10-20: "only when the user has agreed, then we'll do that … a lot of software provide features to ask for human approval, so we can have a setting there; if the user wants to automatically upgrade, they check a toggle … they don't have to care about."
  - 2026-10-21: automatic update fetches and applies the update by itself, because some users do not know to go to Settings, or forget.
  - 2026-10-21: the user found that a running app never learns of a release made after its launch (screenshots).
  - 2026-10-23: "a lot of users, when an agent package has been updated, did not even see a notification."
- New direction (2026-10-23, supersedes Part 3's single interval):
  - (1) a different, configurable check interval per category: the app (default proposed by the team; the user mentioned one hour earlier) and agent packages / skill sources (30 minutes by default), keeping the rate-limit safety;
  - (2) a switch in the Notification Center for automatic updates of agent packages and one for skill sources, a shortcut to the same setting as the Settings card, with the explanation visible at the toggle.
- Product Team designs the screens through the Solution Designer; the user approves the UI.
- Done when: see the requirements doc.

## Source Log

| Date | Type | Source / Command | Why | Finding | How |
| --- | --- | --- | --- | --- | --- |
| 2026-10-23 | Code | `autobyteus-server-ts/src/update-notifications/services/update-check-scheduler.ts` | Node cadence | First pass 60 s after start; tick every 30 min; a source is due after `CHECK_INTERVAL_MS` = 6 h; one source at a time; setting and gate checked per source | Read |
| 2026-10-23 | Code | `src/integrations/github/github-repository-client.ts`, `public-github-request.ts`, `github-rate-limit-gate.ts` | Request budget | Each check = 2 unauthenticated `api.github.com` requests (repository, branch). The gate learns 403/429 resets, persists them in `<app-data>/github/rate-limit.json`, and refuses API requests until the reset. No conditional requests | Read |
| 2026-10-23 | Command | `curl` GET `https://api.github.com/repos/AutoByteus/autobyteus-agents/branches/main`, then 2× with `If-None-Match: <etag>`; same for `/repos/AutoByteus/autobyteus-agents` (probe files in `/tmp/sd-probe-210/`, 14:53 UTC) | Do 304 answers spare the quota? | 200 → remaining 59; 304 → 58; 304 → 57; repo 200 → 56; 304 → 55. **Unauthenticated 304 answers count against the 60/hour limit.** GitHub's docs: the exemption needs "an `Authorization` header" | Measured |
| 2026-10-23 | Command | `curl` GET `https://github.com/AutoByteus/autobyteus-agents.git/info/refs?service=git-upload-pack` (User-Agent `git/2.43.0`), then `/rate_limit` | A quota-free way to learn the latest revision | 200, `application/x-git-upload-pack-advertisement`, 12,231 bytes, 167 refs; first line `a8a09f3e… HEAD … symref=HEAD:refs/heads/main`. REST quota unchanged (55). The git smart-HTTP ref advertisement gives the default branch and its head commit in one request, outside the REST API limit | Measured |
| 2026-10-23 | Web | https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api | Conditional requests | "Making a conditional request does not count against your primary rate limit if a 304 response is returned and the request was made while correctly authorized with an Authorization header" | Read |
| 2026-10-23 | Code | `node_modules/.pnpm/electron-updater@6.8.3/.../providers/GitHubProvider.js` | The app's own check | For github.com it reads `releases.atom` and `/<owner>/<repo>/releases/latest` on github.com, not the API ("do not use API for GitHub to avoid limit"), then the `latest*.yml` asset | Read |
| 2026-10-23 | Code | `autobyteus-web/electron/updater/appUpdater.ts` (499 lines) | App cadence | `startAutoCheck`: one check 8 s after launch (packaged only); manual check; no repeat. `checkForUpdates` returns early while checking/downloading. `checkedAt` is set when a check starts, ends or fails | Read |
| 2026-10-23 | Code | `autobyteus-web/components/settings/AboutSettingsManager.vue` | Truthful state | Shows status (`no-update` = "Up to date", `error` = check failed) and Last Checked from `checkedAt`. A stale "Up to date" comes from the missing repeat, not a wrong label | Read |
| 2026-10-23 | Code | `src/update-notifications/services/update-checks-capability-service.ts`, `domain/settings.ts`; web `components/settings/UpdateChecksCard.vue` | Node setting | `ENABLE_UPDATE_CHECKS` (absent = on), per node; the card holds one switch with the network description and "Applies to this node." | Read |
| 2026-10-23 | Code | `src/update-notifications/domain/update-notification.ts`, `services/update-notification-service.ts` | Notification model | Records WAITING / HANDLED per source; the pill counts waiting records; handled shows "Updated to …" with Clear | Read |
| 2026-10-23 | Code | web `components/notifications/NotificationCenter.vue`, `stores/updateNotificationsStore.ts` | Panel | The panel opens from the pill (present only while updates wait); sections per kind; skill Update keeps its confirmation | Read |
| 2026-10-23 | Code / doc | `src/agent-packages/services/github-agent-package-updates.ts` (189 lines), `agent-package-service.ts` (439), `src/skills/services/skill-source-service.ts` (299); `docs/modules/skills.md` | Update pipelines | Package update: stage archive, validate, skill-name check, record, reload, commit or roll back; serialized per package. Skill source update: a new generation, validated, published atomically; a changed revision replaces the whole managed repository, so local edits are lost (hence the confirmation, `skills.sources.updateWarning`) | Read |
| 2026-10-23 | Code / doc | `src/skill-update-notices/*`, `docs/modules/skill_update_notices.md` | Running agents; local-edit detection | Running agents get one notice per changed skill (SHA-256 per file, `skill-folder-snapshotter.ts`). No record of the content that was installed, so local edits to a managed package or skill cannot be detected today | Read |
| 2026-10-23 | Code / doc | `autobyteus-server-ts/docs/modules/agent_runtimes.md`; `src/runtime-management/agent-runtimes/agent-runtime-status-service.ts` (321 lines), `strategies/*.ts`; web `docs/settings.md` (Settings: Agent Runtimes) | New runtime category (the user, 2026-10-23) | Four runtimes (Codex, Claude, Antigravity, Grok). Checks run only when the page opens or on Check again; results and `checkedAt` are in memory. Update runs `<runtime> update`, only on the desktop's own node, refused while that runtime has running agents. Version sources: Codex `api.github.com/repos/openai/codex/releases/latest` (REST quota, fetched through `runtime-source-fetch.ts`, not through the 209 gate), Claude `downloads.claude.ai`, Antigravity a vendor manifest, Grok `grok update --check --json` | Read |
| 2026-10-23 | Doc | `tickets/done/runtime-lifecycle-review/requirements-doc.md` (out of scope line 54; D-3 line 141) | Earlier user decisions | D-3 (the user): Update and Sign in only on the desktop's own node, because containers lose updates on rebuild. "automatic updates by AutoByteus; notifications outside the page" were out of scope then; the user now asks for both | Read |
| 2026-10-23 | Data | `git show origin/personal:tickets/done/settings-update-notifications/follow-ups.md` | 209 follow-ups | FU-001..FU-004 were unsent; they were sent to the Project Task Manager on 2026-10-23. FU-002 (a switch for the app's check) is Part 2 of this Task | Read |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path / Lifecycle | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Node running, Update checks on | Packages and skill sources are checked every 6 h (first pass 60 s after start) | An update is found up to 6 h after it is published | scheduler |
| BEH-002 | System | Packaged app launch | One app check 8 s after launch; no repeat | A release made after launch is not found until a restart or a manual click | `appUpdater.ts`; the user's 2026-10-21 screenshots |
| BEH-003 | User | Notification row Update / source row Update | Explicit update pipelines (packages; skill sources after confirmation) | Updated only on the user's action | 209 |
| BEH-004 | — | Automatic update | No current supported behavior | — | — |
| BEH-005 | User | Settings → Updates | Status, Last Checked, beta channel, Check / Download / Install. No switch to turn the app check off | — | AboutSettingsManager |
| BEH-006 | System | Rate limit | The gate blocks API requests until GitHub's reset, also across restarts. Checks cost 2 API requests each; 304s also count (Measured) | With 4 nodes on one IP, short intervals would exhaust 60/h | gate; probe |
| BEH-007 | User | Notification Center | Shows waiting / handled rows. Opens only from the pill, which appears only while updates wait | — | 209 |

## Relevant Codebase And Technical Facts

| Path / Contract | Current Behavior | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `update-check-scheduler.ts` | A fixed 6 h interval | Per-category interval, default 30 min; jitter | Interval source (node setting); jitter shape |
| GitHub check transport | 2 API requests per check; no ETag | 30 min × N sources × 4 nodes would exceed 60/h with the REST API | Use the git ref advertisement for checks (Measured: quota-free); keep the API for metadata only when needed (import, update) |
| `appUpdater.ts` (499 lines) | Startup check only | Periodic check with its own interval and switch; skip while downloading, downloaded or offline | New owner file for the app check schedule (file-size limit) |
| Update pipelines | Explicit only | Automatic update reuses them unchanged | Who starts an automatic update (after a check finds an update) and how failures are recorded |
| Managed install content | No record of the installed content | Local edits must not be replaced silently | Record a content fingerprint at install/update; compare before an automatic update (reuse the SHA-256 snapshotter idea) |
| Notification records | WAITING / HANDLED; the pill counts waiting | Automatic results must be visible | The record carries "updated automatically" / "automatic update failed / skipped (local changes)"; unread results show the indicator |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Node registries and the notification store (209); app config keys; Electron `userData` files (channel, app record).

### Structural Surfaces

- Server: scheduler, GitHub transport, source owners, notification service, capability services, GraphQL, change feed.
- Shell: `AppUpdater`, IPC, preload.
- Web: Notification Center, Update checks card, Settings → Updates, stores.

### Potential Structural Impacts To Investigate

- API or external-contract change: new settings (intervals, auto-update per kind, app check switch and interval); new notification outcomes; a new GitHub endpoint (git ref advertisement on github.com). Present.
- Persistence: new setting keys; notification record fields; an installed-content fingerprint per source; an app setting in `userData`. Present (additive).
- Security or privacy: automatic replacement of agent instructions (opt-in); a new host path `github.com/<repo>.git/info/refs`. Present.
- Concurrency or lifecycle: automatic updates from the background pass; a periodic app timer. Present.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Implication | Evidence |
| --- | --- | --- | --- | --- |
| `curl` conditional requests (above) | ETag 304, unauthenticated | Each 304 consumed one request (59→55) | Conditional requests do not make 30 min safe for us; the Task's premise "not modified does not count" is false without authentication | `/tmp/sd-probe-210/h1.txt`..`h4.txt` (disposable; numbers recorded here) |
| `curl` git ref advertisement (above) | Latest default-branch commit without the API | One github.com request, 12 KB for 167 refs, REST quota untouched | A quota-free check is feasible | `/tmp/sd-probe-210/h5.txt`, `refs.bin` |
| Code read, electron-updater | App check transport | github.com feed, not the API | The app interval does not compete for the 60/h API quota | GitHubProvider.js |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication |
| --- | --- | --- | --- |
| User, 2026-10-23 | Users did not see notifications | Direct | Shorter defaults; a visible indicator for automatic results |
| User, 2026-10-21 | The running app missed a release | Direct (screenshots) | Periodic app check |
| User, 2026-10-20/21 | Automatic update opt-in; "they don't have to care" | Direct | Off by default; per kind |
| User, 2026-10-20 (209, round 9) | "I personally have never clicked a skip … I update to the latest" | Direct | Skip/pin are probably unwanted (DEC needs user) |

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint | Evidence | Risk |
| --- | --- | --- | --- | --- |
| GitHub REST API, unauthenticated | docs.github.com | 60/h per IP; 304s count without auth (Measured) | probe | Shared by the user's desktop and three Docker nodes |
| git smart HTTP on github.com | git protocol v0 `info/refs`; GitHub serves anonymous clones | No REST quota (Measured); GitHub may throttle abusive git traffic (undocumented) | probe | Undocumented limits: back off on 429/503 the same way |
| electron-updater GitHub provider | 6.8.3 | Feed on github.com; no API | code | — |

## Persisted Data And State Facts

- New per-node settings (app config keys); notification records gain an outcome; installed-content fingerprint per managed source; app check settings in Electron `userData`.
- Must be preserved: everything from 209 (records, registries, gate file).
- Acceptable loss: a missing fingerprint means "unknown": the automatic update is skipped and notified, never applied blindly.

## Product Design Request Context

- Present: the Task says the Product Team designs the screens through the Solution Designer; the user approves the UI.
- The user's requested outcome: see Initial Request (the 2026-10-23 comment in full in the requirements doc).
- Decisions to design: the automatic-update switches in the Update checks card and in the Notification Center (with the explanation at the toggle); the interval controls with their minimum and rate-limit note; the app check switch and interval in Settings → Updates; notification rows for automatic outcomes (updated, failed, skipped because of local changes); the indicator for unread automatic outcomes; the "GitHub asked this node to wait until …" state.
- Also offered to the Product Team: 209's product questions PQ-1 (no indicator on Settings pages) and PQ-2 (skill confirmation overlaps the panel below about 1100 px).
- Request artifact: `handoff-product-design-request.md` (when sent).

## Product Design Findings

- The final package (SR-004) was approved by the user on 2026-10-23 after round 7: "Okay, now I think I like [it]. It's satisfying. I like it now. Works nice. Looks nice as well. Approved."
- Spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md`; VIS-001..037; design repository `personal` at `5f5fb4c`; ticket closed.
- Verified by the Solution Designer: the spec's status block holds the quote; VIS-010 matches the spec (right-side panel, white cards per category, switches, outcome rows, the runtime waiting text).
- Designer findings integrated in SR-004:
  - PQ-1 not adopted; PQ-2 fixed (REQ-024);
  - the "N updated" entry, the quiet periodic app failure and "Automatic checks are off" (REQ-008, REQ-025);
  - the own-node rule (DEC-020).
- Mocked in the reference (production supplies): node passes, vendor update commands, the app's periodic timer, settings persistence. The reference's GraphQL shape (kind `AGENT_RUNTIME`, outcomes `AUTO_UPDATED` / `AUTO_FAILED` / `AUTO_WAITING`) is a model, not a prescription.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| 209 archive `tickets/done/settings-update-notifications/` (origin/personal) | — | Baseline design and evidence | Reference |
| 209 UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` | Product Team | The current Notification Center design | Approved (209) |
| 210 UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` + VIS-001..037 | Product Team | The approved design of this ticket | Approved (SR-004), design repository `5f5fb4c` |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution / Owner | Status |
| --- | --- | --- | --- | --- |
| RSK-001 | Risk | GitHub may throttle anonymous git traffic in undocumented ways | Back off on 429/503 from github.com like the API; architecture | Open |
| RSK-002 | Risk | Automatic replacement of agent instructions is a supply-chain risk | Opt-in, per kind, explained; visible results; local edits never replaced | Requirements |
| UNK-001 | Unknown | Whether the git ref advertisement handles renamed repositories (redirects) and very large ref lists acceptably | Architecture probe | Open |
| ASM-001 | Assumption | Verification uses real public repositories read-only plus a test repository the team controls, or older installed revisions prepared in an isolated instance (as in 209) | API/E2E | Open |

## Architecture Investigation Findings

Recorded 2026-10-23 (SR-004). Paths are relative to the worktree. How established: `Read` / `Measured`.

| ID | Source | Observation | How | Design implication |
| --- | --- | --- | --- | --- |
| AF-01 | `autobyteus-server-ts/src/update-notifications/services/update-check-scheduler.ts:3-6, 51-80` | Fixed 60 s first pass, 30 min tick, 6 h due rule; per-source loop with setting and gate checks; the pass, due rule and timer live in one class | Read | Intervals per category from settings; tick every 60 s; the pass sequence gets its own owner (checks, then automatic updates) |
| AF-02 | `src/compositions/update-notifications-composition.ts:29-52` | The composition wires owner listeners → `reconcile()` and the scheduler with two owners (packages, skill sources) | Read | A third owner (runtimes); settings service and automation wiring |
| AF-03 | `src/update-notifications/services/update-notification-service.ts:63-74, 142-185`; `domain/update-notification.ts:4, 12-38` | Records are WAITING/HANDLED; `markAllRead` reads only waiting records; reconcile table DS-007; kinds `AGENT_PACKAGE`, `SKILL_SOURCE`; the view has a non-null `repositoryUrl` | Read | New kind `AGENT_RUNTIME`; record fields for automatic outcomes; mark-read also covers unread outcomes; nullable link fields for runtimes |
| AF-04 | `src/update-notifications/stores/update-notification-store.ts:13-32, 60-71` | Tolerant reader, exact writer; an unknown kind drops the row | Read | Additive outcome fields (absent = none); the `AGENT_RUNTIME` kind is added to the reader's kind list |
| AF-05 | `src/agent-packages/services/github-agent-package-updates.ts:39-82, 84-170`; `agent-package-service.ts:220-258` | Package check and update both call `fetchRepositoryRevisionMetadata` (2 REST requests); the archive comes from codeload. The skill-name refusal (lines 142-148) rolls back without recording a failure status. Calls are serialized per package and announced in `finally` | Read | Check and update use a quota-free head read with the stored identity; automatic outcomes are recorded by the automation from the thrown error, not from the owner's status |
| AF-06 | `src/skills/services/skill-source-service.ts:157-205, 265-270` | Skill check/update call `metadata()` → `fetchRepositoryRevisionMetadata` (2 REST requests) with an identity and revision check; checks run in parallel (`Promise.all`, line 159) | Read | Same head read; keep the revision check; the pass calls one source at a time |
| AF-07 | `src/integrations/github/github-repository-source.ts:93-105` | Archive URLs are `codeload.github.com/.../tar.gz/<rev>` (no REST) | Read | Updates need no REST request once the head read replaces the metadata call |
| AF-08 | probes `/tmp/sd-probe-210/` (2026-10-23) | Protocol v2 `ls-refs` POST to `https://github.com/<o>/<r>.git/git-upload-pack` with `ref-prefix HEAD`, `symrefs` → 200, about 84 bytes, `<sha> HEAD symref-target:refs/heads/<branch>`, equal to `git ls-remote`. A renamed repository (zeit/next.js) answers directly; a missing or private one answers 401. The v0 advertisement includes `refs/pull/*` (106 of 167 refs), so it grows with pull requests | Measured | The head read uses protocol v2 `ls-refs` (constant size); 401/404 means "not found or not public" |
| AF-09 | probe; `src/runtime-management/agent-runtimes/strategies/codex-agent-runtime-strategy.ts:9, 19-27`; `runtime-source-fetch.ts:4-11` | Codex newest version comes from `api.github.com/.../releases/latest` through a plain fetch (no gate). `https://github.com/openai/codex/releases/latest` answers 302 with `location: .../tag/rust-v0.164.0` and leaves the REST quota untouched | Measured | The Codex source becomes the github.com redirect, read through the GitHub transport and its gate |
| AF-10 | `src/runtime-management/agent-runtimes/agent-runtime-status-service.ts:133-142, 145-176, 221-265` | `checkAll()` clears finished results (page semantics). `startUpdate()` is fire-and-forget; its outcome lives in `row.operation`. Rows are in memory (`checkedAt` resets on restart). `installed=false` both before the first check and when not installed | Read | Add a background check that keeps results, an awaited update used by both paths, a listener, and a projection with an explicit "not yet checked" state |
| AF-11 | `src/compositions/agent-runtime-status-composition.ts:28-39`; `getAgentRuntimeStatusService()` (status service 318-321) | The service is composed per studio server and bound for the resolver | Read | The update-notification composition receives the same instance |
| AF-12 | `autobyteus-web/electron/updater/appUpdater.ts:149-160, 166-210, 423` (499 lines); `appUpdateChannelStore.ts:17-46` | Startup check only; checks are skipped while checking or downloading (line 184); `source` is `manual` or `startup`; preferences are a small `userData` JSON with a tolerant read | Read | A periodic schedule and its settings in their own files; a `periodic` source; `appUpdater.ts` must lose lines (IPC registration moves out) |
| AF-13 | `autobyteus-web/utils/appUpdateErrorDisplay.ts:38-42` | Quiet errors = `startup-check` only | Read | Periodic-check errors are quiet too (REQ-025) |
| AF-14 | `autobyteus-web/composables/settings/useAgentRuntimes.ts:58-160`; `components/settings/agent-runtimes/AgentRuntimesManager.vue:99-100` | The page polls `agentRuntimes` (2 s busy / 10 s idle); rebinding starts a user check (line 140). Own-node access = `isEmbeddedWindow` | Read | The panel's runtime rows read the same query without starting checks; one shared own-node rule (DEC-020) |
| AF-15 | `autobyteus-web/stores/notificationCenterStore.ts:6-32`; `stores/updateNotificationsStore.ts:72-210` | The panel store keeps a left anchor; the notifications store combines node rows and the app row; counts are waiting-only | Read | Right-side panel (no anchor); counts include unread automatic outcomes |
| AF-16 | `node_modules/.pnpm/electron@42.4.1/node_modules/electron/electron.d.ts:10197`; `server-settings-service.ts:301, 391-401` | `net.isOnline(): boolean` exists in the shipped Electron; settings support string values (`getSettingValue`, `config.set`) for the interval keys | Read (type definitions) | Premises of DS-004 and DS-005 hold |
| AF-17 | `autobyteus-web/electron/server/serverRuntimeEnv.ts:117-133`; grep of `autobyteus-server-ts/src` | The shell builds the embedded server's environment; no variable tells the server it is the desktop's embedded server. The server has no such fact; only the web's `isEmbeddedWindow` | Read | AR-005 (a): the shell sets `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1`; the server reads it once |

## SR-003 Evidence (2026-10-23)

- The user, in the design review, relayed with quotes by the Product UI/UX Designer (run `product_ui_ux_designer_d3a466b2a14542698fcb2a9b4ab76b32`): with automatic updates enabled "we should directly overwrite those" local changes. Instead of skipping, "give them a confirmation overlay" when the switch is turned on.
- The designer's source finding, checked by the Solution Designer (`Read`): `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` `stagePackageReplacement` moves the old install folder aside and deletes it on success. Any file added inside a managed package is therefore lost on every update, manual ones included. Under the earlier skip rule, such a package would never be updated automatically, and every existing package would be skipped once, because no record of installed content exists.
- Consequence: no installed-content fingerprint is needed; DEC-002 is superseded by DEC-019.

## Requirement Implications

- The Task's assumed rate-limit fix (conditional requests) does not work unauthenticated (Measured). A 30-minute default for N sources on four nodes needs a quota-free check or authentication. The git ref advertisement is quota-free (Measured).
- The app check does not use the API quota, so its interval only needs to be polite (Read).
- Local edits cannot be detected today. An automatic update must skip a source whose installed content cannot be shown unchanged.
- The pill counts only waiting updates, so automatic results need their own visibility rule.

## Notes For Architecture Design

- Map SCN-001..SCN-010.
- Reuse the 209 owners: the scheduler (interval from settings, jitter), the source owners' update methods (automatic path), the notification service (new outcomes), the gate (extend to github.com git traffic), and `AppUpdater` (periodic schedule in its own file; `appUpdater.ts` is at 499 lines).
