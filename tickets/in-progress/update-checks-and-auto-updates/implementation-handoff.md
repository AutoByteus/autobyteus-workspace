# Implementation Handoff — update-checks-and-auto-updates

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates`, branch `codex/update-checks-and-auto-updates` (base `origin/personal` `d2820672c3`).
Code commits: `95a608c456` (server), `802ffd917a` (desktop shell), `25609abdf7` (web, web docs), `62082fc36e` (two test type fixes), `985246c53b` (CR-001, CR-002 fix, IR-002). IR-001's documents and evidence are in `9f4dea898e`; IR-002's, with the code reviewer's CRR-001 report and record, in the ticket commit that follows `985246c53b`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High) and passed (ARCH-REV-002 against SR-005); the pass names the implementation engineer.
- Requirements doc: `tickets/in-progress/update-checks-and-auto-updates/requirements-doc.md` (SR-005)
- Investigation notes: `.../investigation-notes.md` (AF-01..AF-15; probes)
- Solution revision record: `.../solution-revision-record.md` (SR-001..SR-005)
- Design spec (required on every route): `.../design-spec.md` (SR-005, Ready). Note R-5 from the review: its line 6 still says "requirements-doc.md at SR-004"; the requirements are at SR-005. Not changed here (Solution Designer's document).
- Supplemental task artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/update-checks-and-auto-updates/ui-ux-spec.md` and `visual-references/VIS-001..037` (design repository `5f5fb4c`), normative for the web part.
- Design review report: `.../design-review-report.md` (round 2, Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md` (ARCH-REV-001, ARCH-REV-002)
- Triggering rework report, revision record, or evidence: `code-review-report.md` and `code-review-revision-record.md` (CRR-001, findings CR-001, CR-002) for IR-002

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002 on the IR-001 baseline)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-002` (AR-001..AR-007 and R-1..R-3 as resolved in SR-005; reviewer notes R-6, R-7 applied)
- Related code-review revision IDs: `CRR-001` (Fail, CR-001, CR-002)
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`, `CR-002`

IR-002 (Local Fix, web only):

- CR-001: a GitHub wait changes no record and no setting, so nothing announces it. `UpdateChecksCard.vue` now re-reads the node's settings when it opens (`automation.refresh()` once resolved, else `ensureResolved()`); the 30 s expiry clock stays. A wait that appears while the card stays open is not shown live (not required).
- CR-002: `NotificationRow.vue` appends "It will be updated automatically once no agent is running." only while the agent-runtime automatic switch is on (`updateAutomationStore`).
- Tests: `UpdateChecksCard.githubWait.spec.ts` (real store resolved earlier without a wait; the node reports one when the card opens) and a waiting runtime row with the switch off in `NotificationCenter.automation.spec.ts`; both fail without the fix (IMP-13). `docs/settings.md` names the read on open.

What exists now:

- **GitHub transport** (`src/integrations/github/`): `git-ls-refs.ts` (protocol v2 request body, `HEAD` answer parsing); `GitHubRepositoryClient.fetchDefaultBranchHead(owner, repo)` (one `github.com` POST, no REST quota; 401/404 → "not found or not public") and `fetchLatestReleaseTag(owner, repo)` (the `releases/latest` redirect, not followed); `publicGitHubRequest(url, options)` with POST, headers, `followRedirects: false`, and only two `github.com` paths allowed; `GitHubRateLimitGate` per family (`api`, `web`), persisted `{ api, web }`.
- **Source owners**: package and skill source checks and updates read the head through git (imports keep the REST metadata for identity and visibility); the Codex strategy reads the tag redirect; `AgentRuntimeStatusService` gains `checkInBackground(kind)` (versions only, keeps finished results), `runUpdate(kind)` (the one update path; refusals as results; `startUpdate` throws them as before), `listUpdateStates()` and one update-state listener.
- **update-notifications**: `UpdatePass` (the one owner of a pass: due checks per kind with the spreading delay, then automatic updates of kinds whose switch is on, outcomes recorded; re-reads closed / Update checks / switch / `web` gate before every source and candidate; runtimes not gated); `UpdateCheckScheduler` (timer only: 60 s + random 0–60 s, then 60 s after each pass); `UpdateNotificationService` (runtime source, outcomes per DS-008, candidates, mark-read of unread automatic updates) over the pure `update-notification-records.ts`; `UpdateAutomationSettingsService` (six app config keys, GraphQL, `update_settings_changed`); `runtimeUpdateSource`; `isDesktopEmbeddedNode()`; composition after `composeAgentRuntimeStatus`, given the runtime service itself (AR-006).
- **Desktop shell**: `AppUpdateCheckSchedule` (the one owner of launch and periodic app checks, its settings file, skip rules; R-6: `AppUpdater` only starts it, reads it and follows its change notification), `appUpdateCheckSettingsStore.ts`, IPC `app-update:set-auto-check` in `appUpdateIpc.ts`, helpers in `appUpdateStateFormat.ts`, `AppUpdater.isBusy()`, `periodic-check`, `AppUpdateState.autoCheck`; `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1` set last in `buildServerProcessEnv` (R-7).
- **Web**: the approved Notification Center (right side, grey surface, title row, white cards, `AutoUpdateSwitch` with the danger confirmation above the panel, outcome rows, "N updated" entry, the runtime category with `NotificationRuntimeReader`), `updateAutomationStore`, `utils/ownNodeWindow.ts` (also used by Settings → Agent Runtimes), `useAgentRuntimes({ checkOnRebind: false })` + `refresh`, the Update checks card rebuilt with `UpdateIntervalField`, Settings → Updates' automatic check, `ConfirmationModal` `layerClass`, `isQuietBackgroundAppUpdateError`, en and zh-CN strings (the spec's 79 rows exact).
- **Docs**: server `update_notifications.md` (rewritten), `agent_runtimes.md`, `agent_packages.md`, `skills.md`; web `settings.md` (Notification Center, Settings → Updates), `electron_packaging.md` (automatic app checks, the server variable, quiet periodic errors).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design spec, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: three runtimes changed (111 files, about 5,400 lines added); a new automatic replacement path for agent content; a new GitHub endpoint and request method; new persisted settings and record fields; new GraphQL, feed, IPC and state contracts; concurrency between the pass, user actions and vendor processes.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Checked against the design's triggers: the head read works for the probed forms (renamed repository answered directly; missing/private 401); no new writer of source state (the pass calls `checkAgentPackageUpdates`, `updateAgentPackage`, `checkGitHubSkillSourceUpdates`, `updateGitHubSkillSource`, `checkInBackground`, `runUpdate` only); every automatic update runs through the owner's existing update method; no touched source file passes 500 lines (largest: `appUpdater.ts` 467, `agent-package-service.ts` 439, `server-settings-service.ts` 430, `agent-runtime-status-service.ts` 417); `net.isOnline()` in a packaged build is not verified here (API/E2E, isolated instance).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Per-kind intervals, spreading delay, quota-free checks; Update checks off stops them | `update-check-scheduler.ts` → `update-pass.ts` (`checkDueSources`) → owners' checks → `github-repository-client.ts` `fetchDefaultBranchHead` → `public-github-request.ts` + gate; `update-automation-settings-service.ts` | Implemented; `update-pass.test.ts`, `update-check-scheduler.test.ts`, IMP-10 (100 sources, 0 REST requests, ≥ 15 min between requests per source) |
| BEH-004 | Automatic update through the owner's update; outcome recorded (DS-002, DS-008) | `update-pass.ts` (`applyAutomaticUpdates`, `toReport`) → owners' update methods / `runUpdate` → `UpdateNotificationService.recordOutcome` → `update-notification-records.ts` `applyOutcome` | Implemented; `update-pass.test.ts`, `update-notification-outcomes.test.ts`; live in IMP-12 step 4 |
| BEH-005 | One node setting in two places, confirmation for packages/skills, feed sync | `AutoUpdateSwitch.vue` (panel + card) → `updateAutomationStore` → `setAutomaticUpdates` / `setUpdateCheckInterval` → service → `update_settings_changed` → `deliverUpdateNotificationChange` | Implemented; component and store specs; IMP-12 steps 3, 5, 6 |
| BEH-006 | Gate families; GitHub wait banner | `github-rate-limit-gate.ts` (`api`, `web`), `UpdatePass.mayContinue`, `githubWaitUntil` → `UpdateChecksCard.vue` banner (expires with a 30 s clock) | Implemented; gate tests incl. old file shape; card spec |
| BEH-002, BEH-007 | The app's periodic check, its switch and interval, truthful status, quiet periodic failure; never an automatic app update | `appUpdateCheckSchedule.ts`, `appUpdateCheckSettingsStore.ts`, `appUpdater.ts` (`isBusy`, `periodic`, `autoCheck`, `checkedAt` at the result), `appUpdateIpc.ts`; web `appUpdateStore.setAutoCheck`, `AboutSettingsManager.vue`, `isQuietBackgroundAppUpdateError` | Implemented; Electron tests (IMP-05), store and component specs |
| BEH-008 | Runtime category on the desktop's own node: background check, panel Update, automatic update waiting for agents | Server: `desktop-embedded-node.ts`, `runtime-update-source.ts`, `AgentRuntimeStatusService` additions, composition. Shell: `serverRuntimeEnv.ts`. Web: `ownNodeWindow.ts`, `NotificationRuntimeReader.vue`, `updateNotificationsStore.updateRuntime` | Implemented; `agent-runtime-update-automation.test.ts`, composition test (embedded / not), `NotificationCenter.automation.spec.ts`; not rendered (needs the desktop's own node) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `src/integrations/github/{git-ls-refs,github-repository-client,public-github-request,github-rate-limit-gate}.ts`; `src/update-notifications/**`; `src/runtime-management/agent-runtimes/{agent-runtime-status-service,agent-runtime-types,runtime-source-fetch}.ts`, `strategies/codex-agent-runtime-strategy.ts`; `src/agent-packages/services/{agent-package-service,github-agent-package-updates}.ts`; `src/skills/services/skill-source-service.ts`, `src/skills/installers/github-skill-repository.ts`; `src/config/desktop-embedded-node.ts`; `src/compositions/{update-notifications-composition,agent-runtime-status-composition,build-studio-server}.ts`; `src/api/graphql/types/update-notifications.ts`; `src/services/server-settings-service.ts`.
- Shell: `electron/updater/{appUpdateCheckSchedule,appUpdateCheckSettingsStore,appUpdateIpc,appUpdateStateFormat,appUpdater,appUpdateController,disabledAppUpdater}.ts`, `electron/server/serverRuntimeEnv.ts`, `shared/appUpdateTypes.ts`, `electron/preload.ts`, `electron/types.d.ts`, `types/electron.d.ts`.
- Web: `components/notifications/{NotificationCenter,NotificationSection,NotificationRow,AutoUpdateSwitch,NotificationRuntimeReader}.vue`, `components/layout/SidebarNotificationsEntry.vue`, `components/settings/{UpdateChecksCard,UpdateIntervalField,AboutSettingsManager,ServerSettingsBasicsPanel}.vue`, `components/common/ConfirmationModal.vue`, `components/skills/SkillSourceUpdateConfirmation.vue`, `components/settings/agent-runtimes/AgentRuntimesManager.vue`; `stores/{updateNotificationsStore,updateAutomationStore,notificationCenterStore,appUpdateStore}.ts`; `composables/settings/useAgentRuntimes.ts`; `services/updateNotifications/updateNotificationChangeFeed.ts`; `graphql/updateNotifications.ts`; `types/updateNotifications.ts`; `utils/{ownNodeWindow,updateInterval,appUpdateErrorDisplay}.ts`; `localization/messages/{en,zh-CN}/{updateNotifications,settings,index}.ts`.

## Important Assumptions

Implementation choices where the design left room (no new behavior):

- **DS-008.** A wait repeated with the same reason changes nothing (no write, no broadcast), so a runtime waiting for agents does not rewrite the file every minute; a wait with another reason (a different agent count) is stored without making the row unread again. An `AUTO_FAILED` record is a candidate again once `outcomeAt + interval ≤ now` (inclusive).
- **Runtime records** carry the runtime kind as their name; the web names them with `runtimeName()`, as Settings → Agent Runtimes does (one derivation).
- **Runtime rows in the panel.** `NotificationRuntimeReader` mounts only while the panel shows runtime rows, reads with `useAgentRuntimes({ checkOnRebind: false })` and is disposed when the panel closes. A row shows "Updating…" also for an update started elsewhere (Settings, the automatic pass). A row's own update reads its end only from a reading taken after the start, so a stale earlier failure never shows.
- **App schedule.** After a settings change it re-arms from the last check; if no check ran yet, it keeps the launch timing (turning it on long after launch checks soon). A skipped check (busy, offline) counts as a run: the next one comes an interval later. `isBusy()` also includes a staged update (`updateStaged`). `checkedAt` is set by a check's result or failure only (not when it starts, not on download, not on a download error). `set-auto-check` answers with `AppUpdateState`; a failed save is logged and the setting applies for the session (like the channel).
- **Feed.** `connected` re-reads both the notifications and the settings; each change message only its subject.
- **Styling.** The settings perimeter's font audit forbids `text-[Npx]`; the spec's `text-[13px]` for the contact bullets and the card's switch text is written `text-[0.8125rem]` (13 px at the default root size, as other settings cards write 11 px).
- **Catalogs.** The `settings.notifications.*` strings moved into their own catalog (`updateNotifications.ts`, en and zh-CN) to keep `settings.ts` under 500 lines; the texts are unchanged.
- **Not gated:** the agent package installer's archive download (a plain `fetch` in the installer's pipeline, which the design leaves alone); skill archives go through `publicGitHubRequest` and the `web` gate.

## Known Risks

- **The 209 server E2E suite is outdated by design.** `autobyteus-server-ts/tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` (API/E2E's suite, cases API-02..API-18) imports the removed scheduler constants (`CHECK_INTERVAL_MS`, `INITIAL_DELAY_MS`) and asserts 209 behavior that SR-005 replaces: REST metadata requests to `api.github.com`, a 6-hour cadence, the `{ blockedUntil }` gate file, a REST `403` limit stopping checks. It needs API/E2E's revision for the head read (a `github.com` `git-upload-pack` POST in its fetch stub), the 30-minute default interval (plus up to 5 minutes of spreading), the one-minute tick and the `{ api, web }` file. Not modified here.
- **Not exercised here:** the Electron-only surfaces in a real shell (the app's periodic check against a test feed, Settings → Updates' section, `net.isOnline()` in a packaged build — a design escalation trigger), and the runtime category on a real desktop's own node (scripted CLIs). These are the design's isolated-instance checks (AC-001, 006, 007, 010, 012, 013, 018, 020).
- **Real GitHub behavior at volume:** the head read was probed on real repositories (IMP-00, including a renamed one); throttling of anonymous git traffic is handled by the `web` gate but was only simulated (IMP-10).
- **Type checks outside the gates:** no web type-check gate exists and `.vue` files are not type-checked (no `vue-tsc`); the server's test tsconfig has many repository-wide errors. No new non-style errors in the changed `.ts` files (IMP-09).
- Two existing test files remain over 500 lines as before (`agent-package-service.test.ts` 810, `appUpdater.spec.ts` 714); the new tests went into new files.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (plus a behavior change of the check cadence and transport)
- Reviewed root-cause classification: No Design Issue Found for the owners; File Placement Or Responsibility Drift for the scheduler
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes` — pass split out of the scheduler (`UpdatePass`), IPC registration and helpers moved out of `appUpdater.ts` (499 → 467), the Codex source through the GitHub transport; the record rules moved to the pure `update-notification-records.ts` to keep the service small.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: `update-pass.test.ts`, `update-check-scheduler.test.ts`, `appUpdaterAutoCheck.spec.ts`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the tolerant readers are the design's data decisions: absent outcome fields read as none; the old `{ blockedUntil }` gate file reads as not blocked)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — check/update use of `fetchRepositoryRevisionMetadata` (import keeps it); `CHECK_INTERVAL_MS`, `INITIAL_DELAY_MS`, the scheduler's pass loop and `CheckedSourceOwner`; Codex `LATEST_RELEASE_URL` and its REST call; `runtime-source-fetch.ts`'s unused `headers` parameter; `NotificationCenterAnchor` and the left placement; `isQuietStartupAppUpdateError` (generalized); `AppUpdater`'s own 8 s timer and IPC body; the panel's anchor math in the entry.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`UpdateSourceState` is facts only with nullable link fields; stored records carry no display fields)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (see Routing Classification)
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` (notification file), `Discard or Rebuild` (old gate file), new keys and files need nothing
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: store test with a 209-shape row (no outcome fields) and unknown outcomes; gate test with `{ blockedUntil }`, malformed and past files; settings service test with invalid stored values (default + one warning); schedule test with a missing, invalid and broken settings file; the rendered check's seeded files were read as written.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- No dependency changes. `pnpm -C autobyteus-server-ts typecheck` runs `pretypecheck` (rebuilds `autobyteus-ts` and the SDKs); running it while the web suite runs makes web suites that import server files fail to resolve `autobyteus-ts` for that moment (seen once, IMP-07 run 2; rerun passed).
- The rendered check used the worktree's git-ignored development data root seeded by a temporary script kept outside the repository (`/tmp/imp210-diag/seed-dev-data.mjs`), and made two real `github.com` requests for fake repositories. The dev stack was stopped afterwards.
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build output of the typecheck's prebuild; not committed.

## Checks Run

Evidence is in `tickets/in-progress/update-checks-and-auto-updates/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | `curl` POST of the `ls-refs` request built as in `git-ls-refs.ts` to real repositories | before the code (premise probe) | macOS | the request bytes | REQ-002, AF-08 | Pass | `IMP-00-ls-refs-probe.txt` | `HTTP/2 200`, `HEAD symref-target` |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `25609abdf7` (server src = `95a608c456`) | macOS 26.5.2, Node 22.23.1 | server `src` | — | Pass | `IMP-01-server-typecheck.log` | `tsc exit 0` |
| IMP-02 | `vitest run tests/unit/{update-notifications,integrations,agent-packages,skills,compositions,runtime-management/agent-runtimes} tests/unit/api/graphql/{update-notifications-schema,agent-runtimes-resolver}.test.ts` | `25609abdf7` | same | transport, gate, owners, runtime service, records, outcomes, pass, scheduler, settings, composition, GraphQL with the web's documents | BEH-001, 004..006, 008; AC-001..011, 017..020, 022 (server parts) | Pass | `IMP-02-server-focused-unit.log` | `Tests  379 passed (379)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | working tree with server src = `95a608c456` | same | whole server unit suite | — | Pass | `IMP-03-server-unit-full.log` | `Test Files  800 passed | 4 skipped (804)` |
| IMP-05 | `vitest run --config ./electron/vitest.config.ts` (in `autobyteus-web`) | working tree with shell = `802ffd917a` | same | schedule, settings store, updater, IPC, disabled updater, server env | BEH-002, 007; AC-012..015, 021 (shell parts), AR-005 env | Pass | `IMP-05-electron.log` | `Tests  237 passed | 1 skipped (238)` |
| IMP-06 | `tsc -p electron/tsconfig.json --noEmit` | `62082fc36e` | same | Electron main process | — | Pass | `IMP-06-electron-typecheck.log` | `tsc exit 0` |
| IMP-07 | `NUXT_TEST=true vitest run` (whole web suite), three runs | see file | same | whole web unit/component suite | BEH-005, 007, 008 (web); AC-002, 006..011, 015..017, 022 | Pass after a fix (font audit) and a rerun (transient rebuild) | `IMP-07-web-unit.log` | run 2 `Tests  4805 passed`; run 3 `2 passed` |
| IMP-08 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `62082fc36e` | same | web boundary, localization | REQ-018 | Pass | `IMP-08-web-guards.log` | `Passed with zero unresolved findings.` |
| IMP-09 | server test-project and web `tsc` filtered to changed files | `62082fc36e` | same | changed `.ts` files incl. tests | — | No new non-style errors | `IMP-09-test-and-web-typecheck.txt` | file text |
| IMP-10 | `vitest run tests/unit/update-notifications/update-check-request-budget.test.ts --reporter verbose` | `62082fc36e` | same | real package owner, client, transport, gate; counting fetch; 100 sources, 15 min, 4 h | REQ-002, AC-003, QR-001, REQ-004 | Pass | `IMP-10-request-budget.log` | both cases `✓` |
| IMP-11 | the spec's exact-strings table compared with both catalogs | `62082fc36e` | same | en and zh-CN strings | REQ-018, AC-016 | Pass | `IMP-11-ui-spec-strings.txt` | `mismatches: 0` |
| IMP-13 | IR-002: the two new tests with the fix stashed, then the affected web suites (`components/notifications`, `components/settings`, `stores`, `services/updateNotifications`, font audit) and the web guards | `985246c53b` | macOS, Node 22.23.1 | `UpdateChecksCard.vue`, `NotificationRow.vue` | CR-001 (REQ-004, AC-004, VIS-019), CR-002 (REQ-022, AC-020, REQ-010) | Fail without the fix → Pass with it | `IMP-13-cr-001-cr-002-fix.log` | `2 failed` without; `Tests  1373 passed (1373)` with |
| IMP-12 | Rendered check: `pnpm dev`, seeded dev data, browser tabs: entry, panel, confirmation, switch on, live automatic pass, card, interval refusal/save, two-window sync | `25609abdf7` (web) on `95a608c456` | macOS, Nuxt dev + built server, browser window | web UI + server pass, feed, GraphQL | UXJ-001..005, 008 (card), 009, 012; VIS-006..008, 014 (count), 018, 021, 022, 031, 037; REQ-005..010, 016 | Pass | `IMP-12-rendered-check.txt`, `IMP-12-*.png` | steps 1–6 |

- IMP-07 run 1 found one real problem (the settings font-size audit, `text-[13px]`), fixed before the web commit; run 2's two failures were the `autobyteus-ts` rebuild from IMP-01 (both suites passed alone; neither touches this change).
- Rerun by impact for IR-002: only `UpdateChecksCard.vue`, `NotificationRow.vue`, their specs and `docs/settings.md` changed after `62082fc36e`. IMP-13 reruns every web suite touching them; the server, shell (IMP-01..IMP-06, IMP-10) and string checks (IMP-08 rerun in IMP-13, IMP-11) exercise no changed code and stay valid. IMP-12 is not repeated: the changed lines are a banner read on open and one conditional sentence, both covered by IMP-13's tests.
- Not run, and why: server `test:integration` and server E2E (the existing update-notifications E2E needs API/E2E's revision, see Known Risks); packaged Electron harness and isolated desktop instances (AC-001, 006, 007, 010, 012, 013, 018, 020 in a real instance; API/E2E).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: UIS-001..006; UXJ-001..012.
- Approved references: `ui-ux-spec.md`, VIS-001..037; the design repository's components were used as the markup reference (applied as a patch onto identical baseline files, then wired to the real contracts).
- Existing design system and adjacent surfaces reviewed: sidebar strip and pill, Basics cards, `ConfirmationModal`, Settings → Agent Runtimes.
- Surface used: `pnpm dev`, browser tabs through the agent browser tools.
- States, layouts, viewports, interactions inspected: narrow window (strip entry), panel placement and surface, switch off/confirming/on with the applying note, outcome rows (updated automatically, automatic failure), a live automatic pass, the card on a non-desktop node, interval refusal and save, a second window following a settings change.
- Visual or interaction issues found and corrected: the font-size audit conflict (rem form); the GitHub wait banner now expires.
- Rendered surfaces not inspected and why: the Software update row, Settings → Updates' automatic check and the runtime category need the Electron shell or the desktop's own node (covered by component specs and Electron tests; isolated instance for API/E2E); zh-CN checked by string comparison only.
- Rendered-result evidence: `IMP-12-rendered-check.txt` and five screenshots.
- Rendered-result check result: `Pass`

## Notes For Code Review

- Concurrency: the pass runs one source or candidate at a time; owners serialize their own work (packages per id; the runtime service claims the row synchronously in `beginUpdate`); the notification service runs one operation at a time, and an owner's announce (reconcile) is queued before the pass's `recordOutcome`, which reconciles first anyway.
- `UpdatePass` re-reads closed, Update checks, the kind's switch and (GitHub kinds) the `web` gate before every source and every candidate (AR-002).
- R-6: `AppUpdater` never writes `app-update-checks.json` or re-arms; the IPC handler calls the schedule. R-7: the embedded-node variable is the last key of `buildServerProcessEnv`.
