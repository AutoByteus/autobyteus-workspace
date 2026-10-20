# Handoff Summary — settings-update-notifications

## Ticket

- Package: `settings-update-notifications`, Project Task `autobyteus-209`. Feature: a quiet Notification Center for waiting updates of the app and of agent packages and skill sources imported from GitHub, plus background update checks with a per-node switch.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed. That means architecture review (ARCH-REV-002 Pass), code review (CRR-002 Pass, 9.3/10), API/E2E (API-REV-001 Pass, 94.6%) and test-code review (CRR-003 Pass).
- Revisions: SR-001..SR-004, ARCH-REV-001..002, IR-001..002, CRR-001..003, API-REV-001, DR-001
- Archived ticket folder: `tickets/done/settings-update-notifications/` on `personal`

## What Changed

- Server (`da74c13406`, CR-001 fix `c42bf2abc4`), in `autobyteus-server-ts/src/update-notifications/`:
  - background checks of each imported GitHub agent package and skill source, at most every 6 hours, only against `api.github.com` with no account or token;
  - one notification per source, in `notifications.json`: waiting (unread/read), then handled, then cleared;
  - a persisted GitHub rate-limit gate;
  - per-package serialization of check, update and remove;
  - GraphQL `updateNotifications`, `markUpdateNotificationsRead` and `clearUpdateNotification`, plus `/ws/update-notifications`;
  - the setting `ENABLE_UPDATE_CHECKS`, on when absent.

  Nothing is downloaded until the user presses Update. An unreadable source registry hides only that kind of source (CR-001).
- Desktop shell (`eba4674616`):
  - the app update notification record `userData/app-update-notification.json`;
  - a Release page link from the packaged config;
  - two IPC intents (mark read, clear);
  - an e2e-only loopback test update feed (`isolated-app start --test-update-feed`).
- Web (`71cfcd7d32`):
  - a sidebar pill or strip badge with the waiting count;
  - the Notification Center panel, with one section per kind and Update, Download → Install and restart, Try again and Clear in the rows;
  - Settings → Server Settings → Basics → **Update checks**;
  - en and zh-CN strings.

  The self-opening app update card is removed, and startup-check errors no longer raise a toast. Settings → Updates is unchanged.
- Tests (`eba7cc08f9`):
  - the new server E2E `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` (8 cases);
  - the mobile gate in `autobyteus-web/__tests__/app.spec.ts`.
- Docs: see `docs-sync-report.md`. The seven long-lived docs were updated by the implementation and verified by delivery.

## Integration

- `origin/personal` advanced 114 commits, from `3d4d9d0a95` to `e0df0bfd05`. Those commits include runtime-lifecycle-review (Settings → Agent Runtimes), the MCP SDK v2 migration, test-vault work, the `1.5.8-beta.2` bump and the Secret Gate in `RELEASE.md`.
- Before the merge, the reviewer's uncommitted CRR-003 documents were committed as a checkpoint (`6250f1f90d`).
- Merged into the ticket branch (`6c34ce51d2`). There were two conflicts, both additive and both kept on each side:
  - `autobyteus-server-ts/src/api/graphql/schema.ts`: two resolver imports;
  - `autobyteus-server-ts/src/compositions/build-studio-server.ts`: two imports, and a separate close step for each of `updateNotifications` and `agentRuntimeStatus`.
- Auto-merged overlaps: `settings.md`, `electron_packaging.md`, `isolated-app-instances.md`, the module index and the en/zh-CN settings catalogs. All are additive.
- Rerun on the merged state, after `pnpm install` and server prebuild:

| ID | Command | Result | Evidence |
| --- | --- | --- | --- |
| DEL-01 | `pnpm -C autobyteus-server-ts typecheck` | Pass, exit 0 | `evidence/DEL-01-server-typecheck.log` |
| DEL-02 | `env -i … vitest run tests/e2e/update-notifications` | Pass, 8/8 | `evidence/DEL-02-server-e2e-update-notifications-excerpt.log` |
| DEL-03 | `pnpm -C autobyteus-server-ts test:unit` | Pass, 765 files, 6310 passed, 7 skipped | `evidence/DEL-03-server-unit-excerpt.log` |
| DEL-04 | `pnpm -C autobyteus-web test:nuxt --run` | Pass, 649 files, 4632 passed, 3 skipped (includes NotificationCenter, updateNotificationsStore, UpdateChecksCard, app.spec) | `evidence/DEL-04-web-unit-excerpt.log` |
| DEL-05 | `pnpm -C autobyteus-web test:electron --run` | Pass, 38 files, 215 passed, 1 skipped (includes appUpdater, appUpdateNotificationRecord, appReleasePage) | `evidence/DEL-05-electron-excerpt.log` |
| DEL-06 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass, all three, zero unresolved findings | `evidence/DEL-06-web-guards.log` |

## Verification

- Judged from the evidence: sufficient. Every critical acceptance criterion is directly proven.
- Delivery opened the evidence behind the critical criteria. Each file contains the lines the report claims:
  - **AC-001, 002, 004, 021:** API-09 has two real GitHub records, found at 13:30:55/56 about 60 s after start, with no Agent Packages or Skills page opened. The pill shows `3 updates` at `rgb(3, 105, 161)` with the same window marker. Both compare links return `200`. The server's non-loopback connections go only to `lb-…github.com` hosts, and Electron main uses loopback only.
  - **AC-005, 006, 017:** in API-10, Cancel leaves `installedRevision 6be1fa4…`. Each row goes `updating` → `handled … Updated to 8c307f3` / `074dc24`, and the install folder's inode is replaced.
  - **AC-015:** in API-12, `aria-checked` goes `true → false` and `.env` has `ENABLE_UPDATE_CHECKS=false`. After 79 s there is no connection and the list is `[]`. The on-open check still finds the update.
  - **AC-003:** in API-13, the packaged generic feed shows `Found version 1.5.8`, the feed log has only `/latest-mac.yml`, `releasePageUrl: null`, `appUpdateNoticePresent: false` and `toasts: []`.
  - **AC-007 up to Install:** in API-14, the row goes `Downloading 0%` → `100%` → `downloaded … Install and restart`, with `updateStaged: true`. The user's updater caches are identical before and after.
  - **AC-008..014:** the server E2E API-02..07 passed 3/3 in the evidence and again on the integrated state (DEL-02).
  - **AC-018:** API-08 passes 6/6, with a mutation control.
- Confidence: 94.6%. No category is below 90%. The gap to the 95% target is bounded: offline and rate-limit were emulated at `fetch` (API-04/07), and the signed install is open (below).
- User check: not needed before finalization. Two parts are left for the user's beta check, which the design planned for after release:
  - **AC-003, the Release page link with the real GitHub feed.** Only a published newer release on GitHub can offer it. The link builder is covered by the Electron tests with a GitHub publish config (IMP-05, and DEL-05 on the integrated state).
  - **AC-007, installing on "Install and restart".** This needs a signed build. The panel's button calls the same `appUpdateStore.installUpdateAndRestart()` as the existing Settings → Updates button. The real MacUpdater/Squirrel download and staging are proven (API-14).

  Neither part can be checked before CI builds a signed release from `personal`, so neither blocks finalization.

## Release

- `No release`. The user did not ask for one, and `RELEASE.md` defaults to finalize only. A beta can be cut on request. The two beta checks above apply to the first release that contains this change.

## Residual Risks, Open Questions And Follow-ups

- Product questions for the Solution Designer (not defects):
  - On Settings pages there is no update indicator. The sidebar row that carries the pill is not shown there (AC-004 note in the execution report).
  - In windows narrower than about 1100 px, the skill update confirmation dialog overlaps the panel (`evidence/IMP-10-skill-confirmation-overlap.png`).
- Follow-ups in `follow-ups.md`, all unsent; the Solution Designer sends them:
  - FU-001: duplicated change hubs;
  - FU-002: the app's own startup check cannot be turned off;
  - FU-003: pre-existing DCF-E2E-002 watcher-timing flake;
  - FU-004: a type-graphql schema rebuild shifts resolver arguments, which only the in-process E2E restart hits.
- Rollback: revert the merge on `personal`. The new files (`notifications.json`, `github/rate-limit.json`, `app-update-notification.json`) are ignored by older builds, so no data migration is involved.
