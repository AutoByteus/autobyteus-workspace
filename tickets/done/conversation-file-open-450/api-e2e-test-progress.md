# API/E2E Test Progress — autobyteus-450

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 12:08 | — | Checkpoint | — | Builds checked (phone bundle from 5f06b08ce9 has contextFileName; server dist from e470edf165, no server change since). API-01…04 reused from the handoff. |
| 12:08 | MSP-28…31 | Started | — | Debug run (not evidence): `--cases=MSP-28,MSP-29,MSP-30,MSP-31 --output-dir=/tmp/api450-dev-1` |
| 12:11 | MSP-28…31 | Completed | MSP-28…30 Pass; MSP-31 Fail (debug) | /tmp debug run 1: MSP-28 (every attachment kind opens, Back returns, no refusal/navigation/new window), MSP-29 (notice), MSP-30 (new and old links show TWO and 3×1) Pass. MSP-31: the Files tab locator (a folder row holds its children and a hidden drag-preview name) → now the visible name span. |
| 12:11 | MSP-31 | Started | — | Debug run 2: `--cases=MSP-31 --output-dir=/tmp/api450-dev-2` |
| 12:14 | MSP-31 | Completed | Fail (debug) | Files tab now opens; the `Edit Mode` click waited on a hidden copy (FileExplorerTabs renders #contentViewer twice) → visible-only locators; screenshot after the Files tab. |
| 12:14 | MSP-31 | Started | — | Debug run 3 → /tmp/api450-dev-3 |
| 12:16 | MSP-31 | Completed | Fail (debug) | The Files tab opens the file in the right panel with VERSION-TWO; the `Edit Mode` toggle is on screen but the visible-locator click timed out → the case now clicks the on-screen toggle by position and records every toggle found. |
| 12:16 | MSP-31 | Started | — | Debug run 4 → /tmp/api450-dev-4 |
| 12:18 | MSP-31 | Completed | Fail (debug) | Edit mode and typing work; a link re-open shows the tab read-only in preview (product behavior), so the editor check now follows with a Files-tab open in edit mode. |
| 12:18 | MSP-31 | Started | — | Debug run 5 → /tmp/api450-dev-5 |
| 12:19 | MSP-31 | Completed | Pass (debug) | first ONE; new link, same old link, Files tab TWO; after a rewrite (THREE) the link's read-only preview shows THREE and the editor (Files tab, edit mode) keeps the unsaved edit. |
| 12:19 | API-05, MSP-28…31 | Started | — | Full probe (evidence): `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<ticket>/evidence/API-05-mobile-shell-probe` |
| 12:37 | API-05, MSP-28…31 | Completed | Cases 31/31 Pass; probe verdict Fail (52 pre-existing lines) | `evidence/API-05-mobile-shell-probe/`: every case Pass incl. MSP-28…31; the 52 unknown lines are `401 (Unauthorized)` from the probe's main `phone` after MSP-13 (autobyteus-446 FU-003, a revoked phone's run streams retry for ever; not this ticket). |
| 12:37 | API-06 | Started | — | Base worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/api450-base-6884309283` (old page and old APK): install, server and phone bundle builds, `assembleDebug` |
| 12:40 | API-06 | Checkpoint | — | Base builds done (old bundle has no contextFileName; old APK built); new APK built from this worktree; own emulator emulator-5584 (autobyteus277_api35, read-only) booted. Run (a): new page + new APK + revoke. |
| 12:44 | API-06 | Checkpoint | — | Run (a) first try (kept as a-0-first-classifier): both taps opened the phone viewer (text shown by Monaco, outside the accessibility tree; screenshot), revocation → the page's "Connect this phone"; the harness's classifier now matches these texts. Starting (a) new page + new APK + revoke, (b) old page + new APK, (c) old page + old APK. |
| 12:50 | API-06 | Completed | Pass | (a) new page + new APK: text and PNG taps → phone viewer (Monaco text shown in the screenshot; image viewer), Back → conversation; revocation → "Connect this phone". (b) old page + new APK: the old tap leaves the page on the conversation, no app screen (KeepPage). (c) old page + old APK: "Pair this phone again" (ASM-001 confirmed). Emulator killed, base worktree removed. |
| 12:51 | — | Checkpoint | — | Reports written (Pass, 95.6%). Committing. |
