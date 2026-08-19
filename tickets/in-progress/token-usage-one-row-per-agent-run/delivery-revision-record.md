# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| `DR-004` | Explicit user verification of the DR-003 personal macOS ARM64 Electron package | `DR-003` Pass at package-build/integrity checkpoint, awaiting user test | Failed / Blocked — live production-shaped migration failed three times; safe-backup reproduction confirmed nullable Prisma decimal-string decoding defect; route `Local Fix` to implementation | `delivery-rework-record.md`, `delivery-evidence/10-*`, `11-*`, `13-*`, `handoff-summary.md`, `release-deployment-report.md`, `docs-sync-report.md` |
| `DR-003` | `CRR-010` Pass after focused integrated `API-REV-004`, plus the user's request for a refreshed personal macOS Electron build | `DR-002` Blocked on latest-base source conflict | Pass — integrated/reviewed package protected, latest base current, README-guided personal ARM64 Electron build and integrity checks passed; awaiting user verification | `delivery-evidence/05-*` through `09-*`, `handoff-summary.md`, `release-deployment-report.md`, `docs-sync-report.md`, `delivery-integration-blocker.md` |
| `DR-002` | User requested a fresh latest-base refresh and local Electron verification build | `DR-001` Pass — prior base current, docs synchronized, verification handoff ready | Blocked — latest base advanced 8 commits; protected candidate checkpointed; merge had one source conflict in `team-run-service.ts`; routed as `Local Fix` | `delivery-integration-blocker.md`, `delivery-evidence/04-reentry-integration-conflict-dr002.log` |
| `DR-001` | `CRR-008` Pass over the 17-path `API-REV-003` durable coverage delta, after authoritative `CRR-007` source Pass | N/A — initial delivery baseline | Pass — latest tracked base unchanged/current, durable docs synchronized, user-verification handoff ready; archival/finalization/release held | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `delivery-evidence/01-*`, `delivery-evidence/02-*`, nine long-lived docs |

## Revision Entries

### DR-004 — User verification fails on production-shaped migration decoding

- Trigger: explicit user testing of the DR-003 Electron bundle.
- Acceptance result: `Failed`. The package started at `14:56`, `14:58`, and
  `15:08` local time; migration
  `20260819_token_usage_run_records_v1` failed each time before scanning/import.
- Exact error:
  `Legacy token usage field 'source_reported_input_tokens' is outside JavaScript SafeInt.`
- Read-only state reported by `/solution_designer`: migration `FAILED`, attempts
  `3`; legacy rows `157,742` across `1,283` run IDs; current rows `0`;
  `quick_check=ok`.
- Contradictory bounded source evidence: `152,026` present snapshot values are
  all SQLite integers, min `7,894`, max `1,371,080,595`, with no invalid or
  out-of-SafeInt value.
- Exact root cause, safely reproduced against a SQLite backup: a nullable
  `json_extract` result set beginning with `NULL` rows causes Prisma `$queryRaw`
  to decode later safe integers as decimal strings. Pre-fix migration decoding
  accepted only `number | bigint`, so the string reached
  `Number.isSafeInteger` and was rejected. All 15 source fields are valid; no
  design/requirement change is needed. Evidence: `delivery-evidence/13-*`.
- Partial behavior result: designed capability-degraded handling passed in the
  field—the server stayed healthy and gated Token Usage history/pre-existing
  restore—but required consolidation did not succeed.
- Classification/route: `Local Fix` -> `/implementation_engineer`.
- Canonical rework record: `delivery-rework-record.md`.
- Evidence: `delivery-evidence/10-user-verification-failure-dr004.log`,
  `delivery-evidence/11-production-migration-failure-dr004.log`, and exact
  diagnosis `delivery-evidence/13-exact-root-cause-dr004.log`; live source logs
  remain at the absolute paths recorded there.
- Safety: delivery did not access or mutate the live database. The existing
  package is invalidated as an acceptance candidate; no more live retries are
  requested until corrected code returns through review and execution gates.
- Current result: `Blocked — implementation correction, review/API-E2E gates,
  rebuilt Electron package, and renewed user verification are required.`
- Hold: no push, archive, finalization merge, version/tag, release, deployment,
  or cleanup.

### DR-003 — Integrated Electron verification package is ready

- Trigger and lineage: `IR-006` completed merge
  `cbbedd6ea0e6d466a3e3741c7216f03887b0182e`; `CRR-009` passed the
  integrated source; focused `API-REV-004` passed at `97.3%`; and `CRR-010`
  passed proportional review of the one updated durable test with no findings.
- Reviewed-state protection: delivery checkpointed the complete returned
  package at `11b861de677200fe7441ed189934f7776804c04d`. This local commit was
  not pushed and is not repository finalization.
- Latest-base refresh: repeated fetches left `origin/personal` at
  `1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`. It is the ticket branch's
  merge base; divergence after the checkpoint was `0 behind / 3 ahead`, with
  no unmerged paths. Evidence: `delivery-evidence/05-*` and `08-*`.
- Post-integration rerun decision: no new base commit was integrated after
  `API-REV-004` / `CRR-010`, so their final focused integrated result of
  `7 files / 37 tests` remained current. The requested Electron packaging run
  supplied the additional executable integrated-state check rather than
  repeating that same server selection.
- Packaging instructions: read the current
  `autobyteus-web/README.md` Desktop Application Build and macOS no-
  notarization sections. Built personal macOS ARM64 version `1.4.52` with the
  documented verbose, no-timestamp command plus explicit ARM64 selection and
  all Apple signing/notarization credentials blank.
- Build result: `Pass`. Web/localization guards, server preparation/build,
  mobile/static assets, Electron renderer/transpilation, electron-builder DMG,
  ZIP, blockmaps, and updater metadata completed with exit `0`. Evidence:
  `delivery-evidence/06-electron-build-macos-arm64-dr003.log`.
- Package result: `Pass`. DMG and ZIP integrity, mounted DMG payload,
  `com.autobyteus.app`, version/build `1.4.52`, ARM64 executable, packaged
  `dist/index.js`, Prisma ARM64 engine, real packaged `node-pty` spawn probe,
  zero broken symlinks, and updater SHA-512/size consistency passed. Evidence:
  `delivery-evidence/07-electron-package-integrity-dr003.log`.
- Primary user artifact:
  `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`.
  SHA-256:
  `cefaa367556b0edd5b76e3e974a39e1143d5ec72bcd5bbec92db20f654e7c348`.
- ZIP fallback SHA-256:
  `02ef6a9f51ed97fd39cb7b650fc89f2ca92b0ef4a84c3fadb7a6c4f9fe8e22c6`.
- Signing state: intentionally local-only and unsigned. The root executable is
  ad-hoc/linker-signed; strict codesign, Gatekeeper assessment, and stapler
  validation fail as expected because no Developer ID identity or notarization
  credentials were supplied. This artifact is not a public release candidate.
- Docs result: `Pass / no additional long-lived edits`. The DR-001 durable docs
  remain accurate on the integrated base; `CRR-009` found no new docs impact
  from `IR-006`. The stale-contract scan and 55-link audit across nine durable
  docs passed again. Evidence: `delivery-evidence/08-*`.
- Current result: `Pass — local Electron artifact ready for explicit user
  verification.`
- Hold: the ticket remains in `tickets/in-progress`. No push, archival, target-
  branch finalization, version bump, tag, publication, deployment, or cleanup
  has occurred. Refresh `origin/personal` again after user approval and before
  finalization.
- Supersession note: DR-004 user verification failed. DR-003 remains only the
  historical package-build/integrity result and is not an acceptance Pass.

### DR-002 — Latest-base conflict (historical; resolved before DR-003)

- The base advanced from
  `0194fb4fffa69037a46aeace491024fdf816dde7` to
  `1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`.
- Delivery protected DR-001 at
  `b68170cf608364bbcd264dde198ad83e030a3bb2`, then stopped the merge on the
  `restoreTeamRun(...)` conflict between managed/offline lifecycle and token
  restore readiness.
- Classification/route: `Local Fix` -> `/implementation_engineer`.
- Resolution: `IR-006` composed both contracts and completed merge
  `cbbedd6ea0e6d466a3e3741c7216f03887b0182e`; `CRR-009`, `API-REV-004`, and
  `CRR-010` all passed. The canonical historical record remains
  `delivery-integration-blocker.md` and `delivery-evidence/04-*`.

### DR-001 — Integrated-state documentation baseline

- Initial fetch left base, ticket `HEAD`, and merge base at
  `0194fb4fffa69037a46aeace491024fdf816dde7`, divergence `0/0`.
- Added canonical
  `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`
  and synchronized eight existing long-lived server, web, and UI-prototype
  documents to the reviewed one-row current Token Usage model.
- `git diff --check`, the stale retired-owner/period scan, and local Markdown
  link audit passed. Evidence: `delivery-evidence/01-*` and `02-*`.
- Persisted-data disposition is `Migration Required` on release installation.
  Delivery did not touch a live user database.
- Validation baseline: source `CRR-007` Pass at `9.3/10`; `API-REV-003` Pass
  at `97.1%`, including `27 files / 125 tests`, all original API/E2E-owned
  paths, builds, released-scale SQLite, lifecycle/retry/rollback/SafeInt,
  Chrome normal/degraded/fatal, and `CRR-008` proportional review.
