# Handoff Summary — external-messaging-agent-participant-redesign

## Status

- Stage: **User-verified. Finalization and release are in progress.** On 2026-09-25 the user ran the local personal Electron build on real data and confirmed: "its working now. lets finalize and release". The ticket is archived to `tickets/done/`. The final finalization and release results are recorded in `release-deployment-report.md` and `delivery-revision-record.md` DR-002.
- Classification (carried, unchanged): `task_size=Large`, `architectural_risk=High`. Route: reviewed (Solution Design → Architecture Review → Implementation → Code Review → API/E2E → proportional test-code review → Delivery).
- Revision chain: SR-014 (requirements approved) / SR-016 (design) / ARCH-REV-002 Pass / IR-001 to IR-003 / CRR-001 to CRR-004 (final Pass 9.45/10), CRR-005 `Not Applicable` / API-REV-001 Fail (G-01) → API-REV-002 Pass (95.3%) / DR-001.
- Findings: CR-001 and CR-002 are resolved. None are open.
- Finalization target: `personal` on `origin`. Release: not yet requested. The curated `release-notes.md` is prepared.

## What Changed

The main product no longer contains any external-channel or messaging-gateway code (REQ-101 to REQ-103). Messaging platforms become separate projects that users add through the generic MCP Servers and Skills features.

- **Removed:**
  - Server: the external-channel subsystem, the managed messaging gateway, the channel GraphQL/REST APIs, the `EXTERNAL_SIGNATURE` route class, and the internal base URL seeding.
  - Stream contracts, server and web: the removed external user message stream event.
  - Web: Settings → Messaging with its stores, composables, utils, localization, prototypes and docs.
  - `autobyteus-ts`: the external-channel export and the agent-input external-source metadata.
  - Release and packaging: the gateway release workflow, gateway steps in the desktop/Android/Docker all-in-one release and packaging, and the gateway's pnpm workspace membership with its lockfile importer.
- **Moved:** the message types moved into `autobyteus-message-gateway/`. Per REQ-121 that project is left alone and unvalidated.
- **Added:** exactly 6 files:
  - startup app-data migration `20260924_remove_external_messaging_data`, which deletes 4 data roots with no backup, and its unit test;
  - Prisma migration `20260924120000_remove_external_channel_tables`, which drops the 2 orphan tables;
  - `superseded.md` in each of the 3 stale messaging tickets, which were moved to `tickets/done/`.
- **Preserved:** MCP servers, tools and skills on the native, Codex and Claude runtimes (AC-118). Historical runs started from bindings stay viewable as ordinary conversations (AC-119).
- **Docs sync:**
  - `autobyteus-server-ts/README.md` now documents the cleanup migration and table drop.
  - `autobyteus-server-ts/docs/ARCHITECTURE.md` now records the chat-platform boundary.
  - See `docs-sync-report.md`.

## Integration State

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign`
- Ticket branch `codex/external-messaging-agent-participant-redesign` (local only), with these commits:
  - `40f769e0d`: the reviewed and validated change (IR-003)
  - `b818a6860`: merge of `origin/personal` @ `fdbd07124` (v1.4.79, 8 new base commits: the unified Team/Org run-history policy and the v1.4.79 release)
  - plus uncommitted docs sync edits (`autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md`) and the untracked ticket folder
- Conflicts: 2 files, both mechanical, resolved by keeping both intents:
  - `…/managed-capabilities/messaging-gateway/release-manifest.json`: the base's v1.4.79 bump was dropped and the file stays deleted, as the approved design requires.
  - `agent-team-run-manager.integration.test.ts`: kept the ticket's exact-ID `teamRunService.restoreTeamRun` and the base's single-microtask wait.
- The ticket delta over the new base is identical to the reviewed delta: 440 files, +579/−32279, and the same 6 added files.
- Post-integration checks on the integrated state (`delivery-evidence/`):
  - `tsc -p tsconfig.build.json --noEmit` (server): pass (D-02).
  - Targeted suites (conflicted test, run-history, agent-memory, agent-org, streaming, architecture, cleanup migration): 83/85 files pass. The 2 failures are on the validator's pre-existing list (D-03).
  - Full server unit and architecture: 501/520 files pass. All 37 failing tests are pre-existing and on the R-05 baseline list. There are 19 fewer failures than before, because the base fixed some (D-04).
  - Full server integration: 49 files pass and 18 skip. 45 failing tests, all pre-existing, plus 1 timing flake (`file-system-watcher` "respects nested .gitignore files"). The flake passes 14/14 in 3 isolated reruns, and neither the ticket nor the base touches file-explorer (D-05, D-08).
  - REQ-120 content and path gates: identical to the validated round-2 result, both after the merge and after docs sync. The content gate hits only the 4 allowed registry lines, and the path gate is empty (D-01, D-06).
  - Added-file set: exactly the 6 designed additions. The SDK `dist/` folders are not tracked (D-07).
  - The web, `autobyteus-ts` and contract packages were not rerun: the base changed only a version field in `autobyteus-web/package.json`.

## Validation Evidence (API-REV-002, 95.3%)

- L-02 (AC-114, AC-103, QR-104) upgrade on real baseline-produced legacy data:
  - The 4 roots are deleted, siblings are kept, the tables are dropped, and the server starts.
  - No run is created and no gateway starts.
  - No token remains.
- L-03 (AC-102): the old ingress POST returns 404 on loopback, and remote requests get the default protected treatment. GraphQL shows 0 messaging types.
- L-04 (QR-105) with an undeletable root: the record is FAILED, startup continues, a later start retries, and it then succeeds.
- L-05 (AC-119): historical agent and team binding runs open as ordinary You/assistant turns.
- L-06 (AC-116) at 1440×900: Settings has no Messaging entry, and `?section=messaging` opens API Keys.
- L-07 (AC-118): an MCP server with an env token is configured, discovered, assigned and used on autobyteus, Codex and Claude.
- L-08 (AC-117): the Docker image is gateway-free. This needed a temporary patch for a pre-existing Dockerfile gap.
- R-08: frozen install, actionlint, shellcheck and a local release dry run.
- R-09 and G-01 (AC-120, AC-121): the gates are clean, and a default-data-dir start leaves the tree clean.

## User Verification Build (requested 2026-09-25: "read the readme, and build the electron so i could test")

- Method: the root `README.md` → `autobyteus-web/README.md` "Desktop Application Build", using the macOS local no-notarization build.
- Command, run fully detached (reparented to launchd) from the worktree root. The inherited live-app `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_MEMORY_DIR`, `DATABASE_URL`, `APP_ENV` and `ELECTRON_RUN_AS_NODE` were cleared:

  `NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac`

  Exit 0. Log: `delivery-evidence/D-09-electron-build-mac-personal.log`.
- Built from integrated branch HEAD `b818a6860`. The uncommitted docs edits do not affect the app. The build modified no tracked file.
- The build ran the web boundary and localization guards, the localization literal audit, `prepare-server` (a full server build with the sanitized bootstrap smoke), Nuxt Electron generation, and unsigned electron-builder packaging for arm64.
- App (run directly, no install needed): `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (version 1.4.79, personal flavor, unsigned, no quarantine attribute).
- DMG: `…/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.79.dmg`
  - SHA-256 `5d7245df13db6264ec1bf25bf3619f780710c815f5fe1c1ee7f1e6ba718f1193`
  - `hdiutil verify`: VALID
- ZIP: `…/AutoByteus_personal_macos-arm64-1.4.79.zip`, SHA-256 `ba9a4c0c4a74442027bff91c02953904e091584162fbd31d77324203763c5003`
- Artifact content check (`delivery-evidence/D-10-electron-artifact-check.log`):
  - The bundled server contains `dist/app-data-migrations/migrations/remove-external-messaging-data-migration.js` and `prisma/migrations/20260924120000_remove_external_channel_tables`.
  - It has no `managed-capabilities`, external-channel, channel-ingress or gateway release manifest.
  - The removed stream event appears 0 times in the server dist and 0 times in `app.asar`. Positive controls hit: `AgentTeamRunManager` in the server dist, and `MEMBER_INPUT_MESSAGE` and `mcp-servers` in `app.asar`.
- Launch prerequisites:
  - Your installed AutoByteus (PID 30067) currently listens on the embedded port `29695`. Quit it first.
  - The test build uses the same production data dir `~/.autobyteus/server-data`, so its first start runs the cleanup below.

## User Test Finding (2026-09-25): Cleanup Skipped Because Of A Stale Record From Implementation-Stage Env Contamination

- Observed: the user runs the test build (PID 93341, started 2026-09-25 04:18:51Z, on `:29695`). All four messaging roots are **still present** under `~/.autobyteus/server-data`:
  - binding folder: 272 KB
  - gateway installs: 5.9 GB
  - gateway download cache: 1.0 GB
  - gateway logs: 5.3 MB
- Cause (read-only inspection of `~/.autobyteus/server-data/db/production.db` and `logs/server.log`):
  - The real DB already held `app_data_migration_records` row `20260924_remove_external_messaging_data`: `SUCCEEDED`, "Scanned 4; migrated 4", attempts 1, 2026-09-24 13:35:41, `log_path=/tmp/emr-render-data/logs/app-data-migrations/…`.
  - That is the implementation stage's local startup smoke and render check. It used temp data dir `/tmp/emr-render-data` but inherited the live app's `DATABASE_URL` from the agent shell; API/E2E later documented this hazard and scrubbed the env from then on.
  - That process therefore deleted the *seeded temp* roots and wrote the SUCCEEDED record into the *real* DB. It also applied Prisma `20260924120000_remove_external_channel_tables` to the real DB at the same second, so the orphan tables are already gone there. That is the intended end state.
  - No other migration record and no Prisma history entry changed.
  - Today's startup ran Prisma with nothing pending, skipped the already-SUCCEEDED cleanup (no cleanup attempt log exists in the real `logs/app-data-migrations/`), verified the vault, and listened with 0 error-level log lines.
- Classification: a validation-environment contamination on this machine only. It is **not** a product defect: in shipped builds the DB and the data roots are always co-located, and L-02 and G-01 prove the real upgrade path. No code change is required.
- Repair (needs user go-ahead):
  1. Quit the test app.
  2. Back up the DB.
  3. Delete only the stale cleanup record row.
  4. Relaunch the test build, so the cleanup runs on startup against the real roots exactly as a normal upgrade would.
  5. Verify the record, the attempt log and the roots.
- Repair performed (the user approved it: "could you manually udpate the db, so i could rerun the app"), 2026-09-25 04:24Z:
  - Online consistent backup `~/.autobyteus/server-data/db/production.db.before-rerun-remove-external-messaging-20260925T042415Z.bak` (875,474,944 bytes; `PRAGMA integrity_check` = ok).
  - Guarded delete `DELETE FROM app_data_migration_records WHERE migration_id='20260924_remove_external_messaging_data' AND status='SUCCEEDED' AND log_path LIKE '/tmp/emr-render-data/%'` removed 1 row. Records went from 26 to 25. `_prisma_migrations` is unchanged.
  - The test build (PID 93341) was still running. The cleanup runs on its next startup.
- Rerun result (the user relaunched the test build, PID 96789, started 2026-09-25 04:25:00Z): **the cleanup ran on real data and passed.**
  - Record `20260924_remove_external_messaging_data`: `SUCCEEDED`, attempts 1, started 04:25:01Z, "Scanned 4; migrated 4; skipped 0; failed 0.", with no error.
  - The attempt log is now in the real logs dir: `~/.autobyteus/server-data/logs/app-data-migrations/20260924_remove_external_messaging_data-2026-09-25T04-25-39-223Z.log`. All four items (`bindingDataDir`, `gatewayInstallDir`, `gatewayDownloadDir`, `gatewayLogsDir`) are `MIGRATED`, "Removed.".
  - All four roots are gone (about 6.9 GB freed). `extensions/` and `download/` are now empty, because their only child was the gateway folder. The sibling logs (`server.log`, `app-data-migrations/`, older backend logs) are kept.
  - No `provider-config.json`, `gateway.env`, `bindings.json` or callback outbox remains anywhere in the data dir (QR-104).
  - Startup had 0 error-level lines and listened on `:29695`. Records are back to 26.
- Backup disposal: at the user's request, delivery deleted the single repair backup file `production.db.before-rerun-remove-external-messaging-20260925T042415Z.bak` after the successful rerun. The live `production.db` (`PRAGMA quick_check` = ok) and `production.db.secret.key` are untouched. The user's older pre-existing backups were left alone.
- Process lesson for the terminal package: local server runs in agent shells must scrub the inherited `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_MEMORY_DIR` and `DATABASE_URL`, as the `api-e2e-evidence/scripts/cleanenv.sh` script does.

## What User Verification Should Know

- **Irreversible on real data.** The first start of any build containing this change against the live data dir `/Users/normy/.autobyteus/server-data` permanently deletes, with no backup:
  - `extensions/<gateway>` (5.9 GB)
  - the gateway download cache (1.0 GB)
  - gateway logs (5.3 MB)
  - the binding folder (272 KB): the Telegram → `classroomsimulation` binding, receipts and outbox, and the plaintext bot token config

  This is the approved DEC-110 outcome. Verify against a scratch data dir if you want to keep that data for now.
- Verification options:
  1. **Safe local check:** the integrated worktree server and web in dev mode against a scratch data dir. Check that Settings has no Messaging, that the old link opens API Keys, and that MCP and skills work. Delivery can launch this for you.
  2. **Real-app check:** a local macOS Electron build of the integrated branch, run against your real data. This triggers the deletion above.
  3. **Accept the recorded validation evidence** (API-REV-002 plus these post-integration checks) as sufficient.

## Residual Risks And Follow-Ups

- **R-3 (release notes):** the Docker all-in-one `gateway.log` and any gateway-memory Docker volume are not pruned. This is covered in `release-notes.md` and the server README.
- Release workflow edits cannot be exercised on GitHub without a tag. `release:test` needs a pushed ref. Static checks and a local release dry run passed (R-08).
- The gateway (`autobyteus-message-gateway/`) is left non-functional and unvalidated, as approved in REQ-121. It is no longer a workspace member.
- Separate-ticket candidates, all pre-existing and not caused by this change:
  - The Docker all-in-one Dockerfile never copies the agent-presentation/collaboration-stream contracts. The minimal patch is `api-e2e-evidence/logs/L-08-temp-patch.diff`.
  - The `token-usage-analytics-graphql` e2e depends on test order.
  - The `file-system-watcher` integration test is timing-sensitive under full-suite load.
- Upstream wording notes for Solution Designer (DV-1 in the design and AE-06; the REQ-120 gate should state that it also covers tracked paths) are listed in `docs-sync-report.md`.

## Artifacts

- Delivery: `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`, `delivery-evidence/`
- Upstream: `requirements.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `product-model-analysis.md`, `solution-handoff.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md`, `api-e2e-test-review-report.md`, `api-e2e-evidence/`
