# Release Report — release-v1.5.15-beta.3 (autobyteus-663): beta v1.5.15-beta.3

Status: **released** — all four workflows succeeded on **attempt 1** (no failed job, no rerun), 27 of 27 assets, GitHub **pre-release** (GitHub Latest stays `v1.5.14`); **iOS 1.5.15 (364)** uploaded to TestFlight ("UPLOAD SUCCEEDED with no errors", no ITMS message); Docker `:beta` moved to the new beta, `:latest` stays on `v1.5.14`; images at **system level 2**; nothing sent to App Store review. **The live release smoke passed 13 of 13, Codex included** (no waiver was asked for or needed), and **the Extensions catalog check passed three times** (before the tag, right before the tag push, and after publication).

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`): the Solution Designer, 2026-11-27 06:40 CET; the Task (`/project_task_manager`, autobyteus-663), on the founder's word of 2026-11-27 (read by the PM): "Okay then just do it".
- Base `origin/personal` @ `80420a8bf6` (re-checked before the smoke, before the cut and before the push: unchanged); `next-beta` → `1.5.15-beta.3`; no `v1.5.15-beta.3` tag existed locally or on origin before the push. The previous beta is `v1.5.15-beta.2`; GitHub Latest is `v1.5.14`.
- Content since `v1.5.15-beta.2` (72 commits; `evidence/delivery/pretag-tickets.txt`): **autobyteus-516** (Extensions in Settings; Voice Input becomes an extension), **autobyteus-657** (the extensions catalog and its public key made real), **autobyteus-581** (sandboxes and the provider relay through a paired node) and **autobyteus-652** (the Memory page layout, file icons), plus the finalization records.
- Checked from the diff `v1.5.15-beta.2..80420a8bf6` (`pretag-tickets.txt`):
  - **No released app-data migration, Prisma, Docker, workflow or script file changed.** The server's released migration order is unchanged (`migrations:record-released` changed nothing), so the release commit holds only the version bump. System level stays 2 (the sandbox work is server code in `sandbox-docker.ts`, not the Docker image).
  - **RELEASE.md changed**: the new "Extensions catalog check" and the "AutoByteus Extensions" section (read in full; the check is below).
  - **A client-data migration is new**: `autobyteus-web/client-data-migrations/migrations/remove-desktop-voice-input-install/` (autobyteus-516): on the first start of this version, the desktop deletes its old built-in Voice Input install (`<base data folder>/extensions`, about 1.7 GB), once and in the background; Voice Input must then be installed again from Settings → Extensions. The notes' "What you need to do" says so plainly.
  - Codex-named source changed: `codex-app-server-client-manager.ts` and `codex-app-server-launch-config.ts` (autobyteus-581: the app-server's launch arguments and environment; unrelayed, the same arguments and the process environment). Android and iOS source: 0 files changed, so the phone apps have no change since beta.2.

## Project Release Guide

- `RELEASE.md` at `80420a8bf6` (**changed since beta.2**, see above), followed end to end: the desktop signing-readiness check (with the process-only HTTPS rewrite of the `github.com-ryan` alias; the shared remote is unchanged), the **new Extensions catalog check** (before every beta and stable tag), the Server Docker system-level check, licensing and hygiene checks, the Secret Gate over everything the release adds, the live release smoke, then `scripts/desktop-release.sh beta --branch finalize/release-v1.5.15-beta.3 --no-push`.
- **Deviations:** (a) the finalize branch was fast-forwarded to the archived release ticket instead of merged `--no-ff` (it only adds record commits, as in earlier releases); (b) **the smoke started at 07:04 CET, not after 07:43 CET** as the Solution Designer's request said. The wait existed so that Codex could run once its usage limit reset. While I waited, the founder wrote to me directly (2026-11-27, between 06:45 and 07:04 CET): **"codex already works"**, so I started the smoke at once. It is the result that decides, and it did: Codex passed 3 of 3 with no usage-limit error, so the purpose of the wait was met. No waiver was involved. Proposed fixes to RELEASE.md: none.
- The macOS in-job retry (`follow-ups.md` FU-001) is still unfixed and did not matter: macOS Intel x64 and ARM64 passed the first time.

## Checks Before Tagging

| Check | Result |
| --- | --- |
| **Extensions catalog check** (RELEASE.md), three times: 2026-11-27 05:36:44Z (before the tag), 06:08:05Z (right before the tag push), 06:47:46Z (after publication, against the tagged source) | **PASS ×3**: the built-in `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` is not empty and equals the extensions repository's `catalog-public-key.pem`; the fixed release `catalog` holds `extensions-catalog.json` (894 bytes) and its `.sig`; the catalog lists `voice-input` 1.0.0 (`offeredOn: desktop-node`, platforms `darwin-arm64`, `darwin-x64`, `linux-x64`, `win32-x64`); in addition, the app's own rule (Ed25519 over the raw catalog bytes, `node:crypto` verify) **verifies the signature with the built-in key**; the catalog's `packageUrl` release `voice-input-v1.0.0` exists and its asset digest `sha256:57e0a541…caf8d` equals the catalog entry; the catalog files were byte-identical across the three checks. Only public data was read; **the private signing key was never opened** (`pretag-extensions-catalog-check.txt`, `pretag-extensions-catalog-check-before-push.txt`, `postpublish-extensions-catalog-check.txt`) |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.6`, run 44901757001, fingerprint `e26a2e74…`; run again by the release script, exit 0 (witness unchanged) |
| `node scripts/server-package/check-system-level.mjs` | exit 0: "System level 2: the system part is unchanged (61cd87f9a8cca3c3df207db0d7b36807f3dace192b9288b00102ff9c809725b7)" |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 ("Licensing is consistent", 8908 files) / exit 0 (106350 files; 106367 after the ticket was archived, run again, passed) |
| `scripts/check_secrets.sh v1.5.15-beta.2..HEAD` | **PASS** (72 commits, no secrets) |
| `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault python3 scripts/release_smoke.py`, run 1 (2026-11-27 06:04:26Z to 06:06:36Z = 07:04 to 07:06 CET, on `80420a8bf6`, no load imposed) | **exit 0, 13 of 13 PASS**: Claude 3/3, **Codex 3/3**, **Grok 3/3**, Antigravity 2/2, AutoByteus 2/2; models `claude haiku, codex gpt-5.6-luna, grok grok-4.7`; durations live 98 s, antigravity 21 s, autobyteus 9 s |

- Evidence: `evidence/delivery/pretag-*.log|txt`, `pretag-release-smoke-run1.{log,load-samples.log,grok-startups.jsonl}`, `smoke-run.sh`, `grok-log-extract.py` (timing and catalog fields only), `release-script.log`, `rollout-ios-key-lines.txt`, `published-state.txt`, `postpublish-extensions-catalog-check.txt`. A passing smoke deletes its own step logs, so the printed summary in `pretag-release-smoke-run1.log` is the record (RELEASE.md: put the summary in the report).
- **Codex: this is the first Codex pass since beta.9 (`13575c21f8`).** It ran on the merged state, including autobyteus-581's launch change and autobyteus-649's prompt change, so the gap that stayed open through beta.10, v1.5.14, beta.1 and beta.2 is **closed for this commit** (the earlier `follow-ups.md` FU-001 and autobyteus-637's post-reset smoke).
- **Grok: no waiver was needed**; it passed all three scenarios, with its 7 processes starting in 159 to 182 ms. The smoke's load (the host's own, nothing imposed; higher than in earlier releases): 1-minute average 53.65 before, then 57.10, 56.22, 66.74, 57.68, and 55.62 at the end.

## Release Decision

- Decision: `Beta`. Decided by: the Task and the founder's word "Okay then just do it", through the Solution Designer, for this beta only.

## Release Notes

- `release-notes.md` (this folder), put above the generated notes of the pre-release with **one** `**Full Changelog**` line (the generated body had two identical lines; the duplicate removed). It starts with `## What you need to do`:
  - **a normal update from `v1.5.15-beta.2`, with one exception: Voice Input has to be installed again** (the first start removes the old built-in install once; Settings → Extensions → Install Voice Input, about 2 GB, then choose language and microphone again; the microphone buttons stay hidden until then);
  - sandboxes need Docker (a Mac with Docker Desktop, for now);
  - the provider relay's login-token mode (Claude `setup-token`, Grok sign-in) is off by default, new, and not tried against the providers with real logins;
  - the phone apps have no change since beta.2 (the TestFlight build **1.5.15 (364)** only matches the version); Docker nodes; desktop beta updates; pointers to the beta.2, beta.1 and v1.5.14 notes for older versions.
  - Then `## What's new since v1.5.15-beta.2` (Extensions, each node's own extensions, Voice Input as an extension, sandboxes, the relay and its Nodes page label, the Memory page layout, file icons) and `## Good to know` (the signed list, going back to an older app, Voice Input on Apple Silicon needs `ffmpeg`, the sandbox limits). No internal ids.
- Tickets' "What you need to do" sections used: autobyteus-516's (install Voice Input again). autobyteus-581, 652 and 657 have none (657 has no notes file); the Docker, relay and phone items come from the Task's direction and this delivery's checks.

## Version / Tag / Release Commit

- With the HTTPS rewrite: `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.15-beta.3 --no-push`; its trust check passed (witness `v1.5.14-beta.6`, run 44901757001); `migrations:record-released` changed nothing (the registry-order test passed, `Tests 1 passed`). Release commit **`32edb7532d`** (`chore(release): bump workspace release version to 1.5.15-beta.3`; one file, `autobyteus-web/package.json`), annotated tag **`v1.5.15-beta.3`** (tag object `488e621c13`, pointing at `32edb7532dcbc7dce5ee9e150e3a230991608e4f`).
- Secret Gate `origin/personal..HEAD` PASS (2 commits) before the push; `origin/personal` fast-forwarded `80420a8bf6 → 32edb7532d`, then the tag, at 06:08:18Z on 2026-11-27 (07:08 CET). The tag has not been moved or deleted.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Release Script` (RELEASE.md, Cutting The Release).

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 45949936418 | success, attempt 1 (macOS Intel x64 and ARM64 passed the first time; no rerun) |
| Server Docker Release | 45949936457 | success, attempt 1 |
| Android APK Release | 45949936379 | success, attempt 1 |
| iOS App Store Connect Release | 45949936372 | success, attempt 1 |

- No job failed, so there is no failed-job table and no rerun. Android and Docker were seen finished at 06:17Z and 06:19Z, Desktop at 06:38Z, iOS at 06:46Z.

### iOS

- **Build: 1.5.15 (364)** (`iOS build number: 364`; `MARKETING_VERSION: 1.5.15`, `CURRENT_PROJECT_VERSION: 364`).
- Xcode_27.2, iPhoneOS SDK 27.2; "all 18 slots match the logo (on #1E3A8A)"; "The demo answers all 261 compiled operations" (255 in beta.2: the server added operations); "Executed 91 tests, with 1 test skipped and 0 failures"; the UI smoke suite `Selected tests` passed (8 tests, 0 failures; the demo-scan test that flaked once in beta.2 passed in 29.96 s).
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `b4f17a74-a7c7-45ec-9918-16df7e7190fa`; **no ITMS message** (0 lines). Nothing sent to App Store review; no reply to Apple (`evidence/delivery/rollout-ios-key-lines.txt`).

### Published artifacts checked (`evidence/delivery/published-state.txt`)

- **Pre-release, not a draft**; **GitHub Latest stays `v1.5.14`**; target `32edb7532dcbc7dce5ee9e150e3a230991608e4f`.
- **27 of 27 assets** (2 Android, 6 server packages, 15 desktop files, 4 `latest*.yml`); the four `latest*.yml` (06:37:34Z) are newer than all six `autobyteus-server-*` files (last 06:17:59Z).
- Docker (registry API): **`:1.5.15-beta.3` = `:beta` = index `sha256:3563156dab…`**, linux/amd64 `sha256:d820566502…` and linux/arm64 `sha256:fdfd1c70cd…`, the package jobs' digests ("The pushed … index lists linux/amd64 sha256:d8205665… and linux/arm64 sha256:fdfd1c70…"; "Moved `…-server:beta` to `…-server:1.5.15-beta.3`"). **`:latest` = `:1.5.14` = `sha256:70dee9a69e…`, unchanged**; `:1.5.15-beta.2` is still `sha256:218d2f1f1c…`.
- **System level 2:** both image builds "System level 2: the system part is unchanged (61cd87f9…)" and "Wrote server-package.json: 1.5.15-beta.3 linux-<arch>, Node modules 127, system level 2, 66 migrations" (the same 66 as beta.2); the released server package descriptions (x64 and arm64) have `systemLevel: 2`.
- Notes: the body starts with `## What you need to do` and equals `release-notes.md` plus one `**Full Changelog**` line.
- The Extensions catalog check passed again after publication, against the **tagged** source (`git show v1.5.15-beta.3:…`): see Checks Before Tagging.
- **Not done, and only the founder can:** the packaged beta was **not run** here (the Task forbids running a build of `personal` against his real `~/.autobyteus`, and this delivery made no isolated install of the published beta). So these are unverified until he does them: updating the desktop app, the one-time removal of the old Voice Input, installing Voice Input from Settings → Extensions on his Mac, and checking that dictation works (autobyteus-657's API/E2E proved an install on an isolated instance of the earlier build: "installed and ready" in 68 to 112 s, dictation from the desktop window); updating the iPhone from TestFlight (optional: no phone-app change).
- Release/publication result: `Completed`. Release notes handoff result: `Used`.

## Repository Finalization

- Release commit `32edb7532d` and the tag are on `origin` (above). The record commit (this folder, with the iOS build number, the published state, `delivery-revision-record.md` and `follow-ups.md`) follows on `origin/personal` as a fast-forward after a fetch and a Secret Gate.
- The founder's checkout, the worktree cleanup and the record copy: recorded in the terminal message and `delivery-revision-record.md`.

## Rollback Criteria

- Revert the release commit and the merges on `personal` and cut a new release. Desktop updates never downgrade; turning beta updates off waits for the next newer stable. `:beta` only moves forward; pin `:1.5.15-beta.2` or `:1.5.14` (the stable, which `:latest` still is) to go back on Docker.
- **This beta adds a client-data conversion that cannot be undone by the release:** the first start removes the old built-in Voice Input install (about 1.7 GB; its language and microphone choice are not carried over). Going back to an older app means installing Voice Input there again, as the notes say. There is no server app-data migration and no data conversion on the node. A user who already started `v1.5.14` has had saved organization runs converted (autobyteus-29): that cannot be undone either (RELEASE.md, Rollback).
- Changing the catalog key (or its built-in copy) would make every installed app refuse the other catalog; RELEASE.md says it is a coordinated change, never a fix for a failed run.

## Final Status

- Verification complete (RELEASE.md's checks, the Extensions catalog check ×3, the live smoke 13 of 13): `Yes`
- Repository finalization complete: recorded in `delivery-revision-record.md` after the record commit
- Release complete: `Yes` (four workflows green on attempt 1, 27 of 27 assets, pre-release, Docker `:beta` moved and `:latest` unchanged, TestFlight uploaded)
- Unresolved blocker: `None`. Unverified by design: the packaged beta on the founder's machine (his three checks above).
