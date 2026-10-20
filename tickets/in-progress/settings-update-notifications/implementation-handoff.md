# Implementation Handoff — settings-update-notifications

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-update-notifications`, branch `codex/settings-update-notifications`.
Code commits: `da74c13406` (server), `eba4674616` (desktop shell), `71cfcd7d32` (web, docs), `c42bf2abc4` (CR-001 fix, IR-002). These documents and `evidence/` are in the ticket commit that follows.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High) and passed (ARCH-REV-002); the pass rule names the implementation engineer.
- Requirements doc: `tickets/in-progress/settings-update-notifications/requirements-doc.md` (SR-004, Approved)
- Investigation notes: `.../investigation-notes.md` (AF-01..AF-14)
- Solution revision record: `.../solution-revision-record.md` (SR-001..SR-004)
- Design spec (required on every route): `.../design-spec.md` (SR-004, Ready)
- Supplemental task artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/settings-update-notifications/ui-ux-spec.md` and `visual-references/VIS-001..028` (design repository `288ef06`); `follow-ups.md` (FU-001, FU-002, unchanged)
- Design review report: `.../design-review-report.md` (round 2, Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Triggering rework report, revision record, or evidence: `code-review-report.md` and `code-review-revision-record.md` (CRR-001, finding CR-001) for IR-002

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002 on the IR-001 baseline)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (Fail, CR-001), `CRR-002` (Pass, Targeted Delta Review of `c42bf2abc4`)
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`

What exists now:

- **Server** (`src/update-notifications/`): `UpdateNotificationService` (DS-007 rules, one serialized operation at a time, persist + broadcast only on change; each owner read on its own, so an owner that cannot be read leaves the other kinds working and its records kept and hidden — CR-001), `UpdateNotificationStore` (tolerant read / exact write of `notifications.json`), `UpdateCheckScheduler` (60 s first pass, 30 min tick, 6 h due rule, packages then skills, oldest first, setting and gate read before every source), `UpdateChecksCapabilityService` (`ENABLE_UPDATE_CHECKS`, absent = on), change messages + process hub on the new generic `utils/change-feed-hub.ts`, `/ws/update-notifications`, GraphQL resolver, composition started in `buildStudioServer` and closed on `onClose`.
- **GitHub transport**: `GitHubRateLimitGate` in `publicGitHubRequest` for `api.github.com` only; blocked-until time persisted in `<app-data>/github/rate-limit.json` (AR-001).
- **Source owners**: `AgentPackageService` split — the GitHub check/update lifecycle moved to `github-agent-package-updates.ts`; per-package serialization of check/update/remove with a fresh read inside the lock (AR-003); projection + listener on both owners; `canUpdate` when latest known ≠ installed (packages in the mapper, skills in `SkillSourceRow.vue`).
- **Desktop shell**: `AppUpdateNotificationRecord` (`userData/app-update-notification.json`), `appReleasePage.ts`, `AppUpdater` record calls, re-check before Download, two IPC intents, `AppUpdateState.notification`; e2e-only `AUTOBYTEUS_ELECTRON_TEST_UPDATE_FEED_URL` (loopback http) → `AppUpdater` with a generic feed and `releasePageUrl = null` (DEC-017); `isolated-app start --test-update-feed <url>` (kept on `restart`).
- **Web**: `updateNotificationsStore`, `notificationCenterStore`, `updateChecksCapabilityStore`, the change feed, `NotificationCenter` / `NotificationSection` / `NotificationRow`, `SidebarNotificationsEntry` (pill and strip), `UpdateChecksCard` (last in Basics), shared `SkillSourceUpdateConfirmation`; `AppUpdateNotice` and its renderer state removed; startup-check errors quiet; en and zh-CN strings.
- **Docs**: `autobyteus-server-ts/docs/modules/update_notifications.md` (new, indexed), `agent_packages.md`, `skills.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/electron_packaging.md`, `docs/isolated-app-instances.md`.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design spec, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: three runtimes changed as designed (about 60 source and test files); new persisted files in node app data and Electron `userData`; a recurring server lifecycle; new per-package concurrency control; new GraphQL/websocket/IPC/launch-variable contracts; a UI surface removed.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Checked against the design's triggers: no new writer of GitHub update state beyond the owners' existing methods; the DS-007 table expressed every transition met (the app record's "running version moved" branch on no-update is unreachable within a process and was not implemented, see Notes); the gate covers `api.github.com` only; no touched file passes 500 lines. The packaged generic-feed check is not verified here (API/E2E; it remains the design's open trigger).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-008 | Background checks, 6 h per source, setting, rate-limit stop across restarts | `update-check-scheduler.ts` ← `update-notifications-composition.ts` (`build-studio-server.ts`); owners' `checkAgentPackageUpdates([id])` / `checkGitHubSkillSourceUpdates([id])`; `github-rate-limit-gate.ts` in `public-github-request.ts`; `update-checks-capability-service.ts` | Implemented; unit tests (scheduler, gate incl. restart, capability) |
| BEH-009 | One notification per source/app; live; read/handled/cleared persisted; quiet area | Server: `update-notification-service.ts`, store, hub, `/ws/update-notifications`, GraphQL. Shell: `appUpdateNotificationRecord.ts`. Web: `updateNotificationsStore.ts`, `notificationCenterStore.ts`, `components/notifications/*`, `SidebarNotificationsEntry.vue` | Implemented; unit/component tests; rendered check IMP-10 (live update, persistence across restart) |
| BEH-010 | A failed later check keeps a known update (row and notification) | Owners keep `latestRevision`; reconcile keys on latest ≠ installed; `agent-package-mappers.ts` `canUpdate`; `SkillSourceRow.vue` `canUpdate` | Implemented; tests (package mapper, skill row, reconcile) |
| BEH-001, BEH-003 (on-open checks) | Preserved; findings become notifications | Owners call the listener after every check settles → `reconcile()` | Preserved; listener tests |
| BEH-002, BEH-003 (update) | Preserved pipelines; per-package serialization; skill confirmation reused | `agent-package-service.ts` `serialize` + `github-agent-package-updates.ts` (moved, behavior unchanged); `SkillSourceUpdateConfirmation.vue` shared by `SkillSourcesModal.vue` and the panel | Existing package/skill tests pass; race tests fail without serialization (IMP-03) |
| BEH-004, BEH-005, BEH-006 | Startup check unchanged; no self-opening card; quiet startup errors; Settings → Updates unchanged | `appUpdater.ts` (record calls, re-check before Download, IPC intents); `AppUpdateNotice.vue` removed; `appUpdateStore.ts`, `appUpdateErrorDisplay.ts` | Implemented; Electron + store tests |
| BEH-007 | Isolated instances quiet unless explicit test feed | `electronLaunchProfile.ts`, `electronApplication.ts`, `launchEnvironment.mjs`, `scripts/isolated-app/*` | Implemented; launch-profile and node tests. Packaged check not run (API/E2E) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `src/update-notifications/**`, `src/integrations/github/{github-rate-limit-gate,public-github-request,github-source-update-state}.ts`, `src/agent-packages/services/{agent-package-service,github-agent-package-updates,agent-package-mappers}.ts`, `src/skills/services/skill-source-service.ts`, `src/utils/change-feed-hub.ts`, `src/compositions/{update-notifications-composition,build-studio-server}.ts`, `src/api/graphql/types/update-notifications.ts`, `src/api/websocket/update-notifications.ts`.
- Shell: `electron/updater/{appUpdater,appUpdateNotificationRecord,appReleasePage,appUpdateController,disabledAppUpdater}.ts`, `shared/appUpdateTypes.ts`, `electron/launch-profile/electronLaunchProfile.ts`, `electron/application/electronApplication.ts`, `scripts/isolated-app/{cli,instanceLifecycle}.mjs`, `scripts/electron-launch/launchEnvironment.mjs`.
- Web: `stores/{updateNotificationsStore,notificationCenterStore,appUpdateStore}.ts`, `stores/capabilities/updateChecksCapabilityStore.ts`, `components/notifications/*`, `components/layout/SidebarNotificationsEntry.vue`, `components/settings/UpdateChecksCard.vue`, `components/skills/{SkillSourceUpdateConfirmation,SkillSourcesModal,SkillSourceRow}.vue`, `services/updateNotifications/updateNotificationChangeFeed.ts`, `app.vue`.

## Important Assumptions

- Implementation choices made where the design left room (no new behavior):
  - A rate-limited answer throws `GitHubRateLimitError` ("GitHub rate limit reached; try again after HH:MM.") at once, the same message as a refused request (design example).
  - The app row also shows a handled app record ("Updated to …" + Clear); REQ-008/009 apply to the app and the shell's `clear-notification` intent exists for it.
  - After a skill update from the panel the skill catalog is re-read, as the skill sources dialog does after its update.
  - `UpdateChecksCard` disables the switch until the setting is known and shows a failed save's message in the existing cards' red line.
  - Release notes render as plain text (`whitespace-pre-line`), as the removed card did.
  - The "downloaded, restart to install" toast fires once per download: the new IPC intents rebroadcast state while `downloaded`, which would otherwise repeat it.
  - The app record's no-update rule removes a waiting record; its "running version moved" case is handled at start, because the running version cannot change within a process.
- The capability store sits in `stores/capabilities/` as the design maps it (the two existing instances are in `stores/`).

## Known Risks

- **Confirmation dialog over the panel (Product question).** The panel is `z-[90]` and the shared `ConfirmationModal` is `z-50`, exactly as in the approved reference, so VIS-010 shows the panel undimmed beside the dialog. In windows narrower than about 1100 px the centered dialog overlaps the panel and the panel covers part of it (evidence `IMP-10-skill-confirmation-overlap.png`); the spec text says "below the confirmation dialog". The buttons stay usable. Kept as approved; the Solution Designer may take it to Product.
- The packaged isolated build checking a generic test feed (design escalation trigger) and the macOS install of a test-feed build are not exercised here.
- The live order (handled rows move to the end, sections follow their newest waiting update) is the reviewed behavior; see the UI spec.
- Web `tsc --noEmit -p .` reports about 875 errors in files this change does not touch (no maintained web typecheck gate); none in the new files.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (with the self-opening card retired)
- Reviewed root-cause classification: Missing Invariant (package serialization; known-update visibility)
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes` — serialization with fresh reads, the 528-line service split, `ChangeFeedHub` (used by the new feed only; FU-001 unchanged), shared skill confirmation.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: IMP-03 shows the race reproduced without serialization.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — `AppUpdateNotice.vue` + spec + mount; `appUpdateStore` `visible`, `dismissedVersion`, `shouldShow`, `dismissNotice`, no-update timer and the now-unused `progressLabel`; `NOTICE_MESSAGE_KEYS`, `getAppUpdateNoticeErrorMessageKey`; 74 `shell.components.app.AppUpdateNotice.*` strings (en/zh-CN, hand-written and generated); the identical duplicate branch in `restorePackageRecord`; the audit's script-inspection pattern now names `notifications/NotificationRow` instead of the removed card.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`GitHubSourceUpdateState` carries facts only; stored records carry no display fields)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` — largest: `appUpdater.ts` 434 effective (499 total), `agent-package-service.ts` 382 effective (528 → 439 total). The one change delta over 220 lines is the design-mandated split of `agent-package-service.ts` (code moved to `github-agent-package-updates.ts`).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (new files only; tolerant readers)
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: store tests (exact key set, malformed file → empty with warning, unknown kind/shape rows skipped); gate tests (missing/malformed/past file → not blocked); shell record tests (malformed/unknown shape → none). Existing registries unchanged in shape; seeded registries produced records at the first reconcile (IMP-10).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare` were run in the worktree. `pnpm dev` rebuilt the server.
- The rendered check used the worktree's development data root (`.autobyteus/development/server-data`, git-ignored) seeded with fake `autobyteus-test/*` GitHub records by a script outside the repository; one real `api.github.com` request (a 404) was made by pressing Update on a fake package. The dev stack was stopped afterwards.

## Checks Run

Evidence is in `tickets/in-progress/settings-update-notifications/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` (tsc `tsconfig.build.json --noEmit`) | `71cfcd7d32` | macOS, Node 22 | server `src` | — | Pass | `IMP-01-server-typecheck.log` | `tsc exit 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/update-notifications tests/unit/integrations tests/unit/agent-packages tests/unit/skills tests/unit/compositions/update-notifications-composition.test.ts tests/unit/api/graphql/update-notifications-schema.test.ts --no-watch` | `71cfcd7d32` | macOS | notification service/store/scheduler/capability, gate, package split + serialization, skill projection/listener, composition, GraphQL with the web documents | BEH-001..003, 008..010; AC-008, 009, 011..015 | Pass | `IMP-02-server-focused-unit.log` | `Tests  257 passed (257)` |
| IMP-03 | Same package test with `serialize()` temporarily bypassed (not committed), then restored | `da74c13406` | macOS | `AgentPackageService` serialization | AF-05, AR-003, BEH-002 | Reproduced → fixed | `IMP-03-package-race-reproduction.txt` | `Tests  2 failed | 4 passed (6)` without, `6 passed` with |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` | `71cfcd7d32` (server tree) | macOS | whole server unit suite | — | Pass | `IMP-04-server-unit-excerpt.log` | `Test Files  757 passed | 4 skipped (761)` |
| IMP-05 | `pnpm -C autobyteus-web test:electron --run` | `71cfcd7d32` | macOS | updater, record, release page, disabled updater, launch profile | BEH-004..007; AC-003 (link), AC-007 (re-check), AC-017 | Pass | `IMP-05-electron.log` | `Tests  213 passed | 1 skipped (214)` |
| IMP-06 | `node --test scripts/electron-launch/__tests__/*.node-test.mjs scripts/isolated-app/__tests__/*.node-test.mjs` (in `autobyteus-web`) | `71cfcd7d32` | macOS | launch environment, isolated-app CLI | REQ-019 | Pass | `IMP-06-scripts-node-tests.log` | `# pass 52`, `# fail 0` |
| IMP-07 | `pnpm -C autobyteus-web test:nuxt --run` | `71cfcd7d32` | macOS | whole web unit/component suite | BEH-005, 009; AC-002, 006, 009..011, 016, 018 | Pass | `IMP-07-web-unit-excerpt.log` | `Test Files  646 passed | 2 skipped (648)` |
| IMP-08 | `pnpm guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` (in `autobyteus-web`) | `71cfcd7d32` | macOS | web boundary, localization | AC-019 | Pass | `IMP-08-web-guards.log` | `Passed with zero unresolved findings.` |
| IMP-11 | CR-001 fix: server typecheck + `vitest run tests/unit/update-notifications tests/unit/integrations tests/unit/compositions/update-notifications-composition.test.ts tests/unit/api/graphql/update-notifications-schema.test.ts tests/unit/skills/github/source-update-state.test.ts --no-watch`; the new GraphQL test also run against the `da74c13406` service | `c42bf2abc4` | macOS | `UpdateNotificationService` with a real `SkillSourceService` over a malformed registry | BEH-009, REQ-008, QR-005; DESIGN.md rule 7 | Pass (fails on the previous service) | `IMP-11-cr-001-fix.log` | `tsc exit 0`, `Tests  49 passed (49)`, previous service `Tests  1 failed | 2 passed (3)` |
| IMP-10 | Rendered check: `pnpm dev`, seeded dev data, browser tab: pill, panel, details, Show more, skill confirmation, failed update, Esc/focus, restart persistence, strip layout, live removal, Update checks card on/off, zh-CN | working tree that became `71cfcd7d32` (web code unchanged since) | macOS, Nuxt dev + built server | web UI + server feed/GraphQL | AC-002, 004, 010, 011 (removal), 016, 018 (browser), 019; VIS-001, 003..005, 009, 010, 018, 022, 023, 024 | Pass (with the Known Risk overlap) | `IMP-10-rendered-check.txt`, `IMP-10-*.png` | items 1–10 in the text file |

- IMP-07: a first run of the same commit, made while IMP-04 ran in parallel, had 2 timeouts in `CollaborationMessagesOrgRoot.integration.spec.ts` (untouched; its 42,000-reference tests take 3.2–3.8 s of the 5 s default and passed alone). Cause: CPU contention from the parallel run. The rerun without parallel load passed; both runs are recorded in the excerpt.
- Rerun by impact for IR-002: only `update-notification-service.ts` (and its tests and doc) changed after `71cfcd7d32`. IMP-01 and the notification/GraphQL part of IMP-02 are superseded by IMP-11; IMP-03..IMP-08 and IMP-10 exercise no changed code (the web reads the same GraphQL contract) and stay valid at `71cfcd7d32`. IMP-04 (full server unit suite) was not rerun: the changed file is exercised only by the IMP-11 set.
- Not run, and why: server `test:integration` and server E2E (the change adds no integration-suite surface beyond IMP-02's GraphQL test; API/E2E owns E2E); packaged Electron harness and isolated desktop instances with `--test-update-feed` and real public GitHub repositories (AC-001, AC-003, AC-005..007, AC-013, AC-015, AC-021 in a real instance) — API/E2E; a web type-check gate does not exist (see Known Risks).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: UIS-001..004; UXJ-001..008 (UXJ-005 app download only in unit/component tests — a browser window has no app row).
- Approved references: `ui-ux-spec.md`, VIS-001..028; design repository components used as markup reference.
- Existing design system and adjacent surfaces reviewed: sidebar footer/strip, Basics cards (`CodexFullAccessCard`), `ConfirmationModal`, `SkillSourcesModal`.
- Surface used: `pnpm dev` (README "Local full-stack development"), a browser tab via the agent browser tools (TESTING.md: web unit tests + browser for renderer UI).
- States, layouts, viewports, interactions inspected: unread/soft pill, strip badge, panel open/focus, dots, details, Show N more/less, skill confirmation + Esc, failed update + Try again, Esc focus return, restart persistence, live removal, empty-free browser window (no Software update), card on/off, zh-CN.
- Visual or interaction issues found and corrected: none in the panel; found and fixed the repeated "downloaded" toast (store logic).
- Remaining unverified: Electron-only app row states in a real window (downloading/downloaded/installing are covered by component tests), handled-row and empty-state rendering in the browser (component tests), VIS-026/028 exact sizes, the dialog/panel overlap (Known Risks).

## Downstream Coverage Hints / Suggested Scenarios

- Isolated instance (`isolated-app start --build --test-update-feed http://127.0.0.1:<port>`) with a generic feed offering a newer version: app row, notes, no Release page link, Download → progress → Install and restart (AC-003, AC-007). This also answers the design's escalation trigger.
- Real public GitHub package and skill source imported at an older revision (ASM-001): first pass ~60 s after start creates both notifications without opening their pages (AC-001, AC-002); request log shows only `api.github.com` (AC-021).
- Setting off for a full interval and after restart: no automatic requests; opening Agent Packages still creates notifications (AC-015).
- Rate limit via a fake transport or proxy: stop and no request before reset, also after restart (AC-013).
- Update from the row vs the notification → handled; newer upstream revision → same row unread (AC-008, AC-011); Clear survives restart (AC-009).

## API / E2E / Executable Coverage Investigation And Execution Still Required

All acceptance criteria that need a running product (AC-001..AC-007, AC-012..AC-015, AC-017, AC-018 mobile, AC-021) remain with API/E2E; IMP-* rows are implementation-scoped checks only.
