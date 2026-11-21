# Release Report — release-v1.5.14-beta.6 (autobyteus-595): beta v1.5.14-beta.6

Status: **released** — all four workflows succeeded on the first attempt, 27 of 27 assets, GitHub pre-release; **iOS 1.5.14 (352)** uploaded to TestFlight ("UPLOAD SUCCEEDED with no errors", no ITMS message); nothing sent to App Store review.

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`). The founder (relayed verbatim by the PM, 2026-11-21): "Yeah releaser ask the previous team which released that I mean did the Mac the iOS app just do the ask to release a beta".
- Base `origin/personal` @ `b768c503f9` (re-checked before the cut); `next-beta` → `1.5.14-beta.6`; no `v1.5.14-beta.6` tag on origin.
- Content since `v1.5.14-beta.5` (`evidence/delivery/pretag-tickets.txt`): autobyteus-583 (the runtime hand-over notice names the journal to read), autobyteus-594 (the iOS icon from the product logo with `ios-icon:check` in the release workflow; `ITSAppUsesNonExemptEncryption` = false), autobyteus-15 (idle-aware automatic restart for managed Ubuntu). No app-data migration changed.

## Project Release Guide

- `RELEASE.md` at `b768c503f9`, followed end to end; the signing trust check with the process-only HTTPS rewrite of the `github.com-ryan` alias (shared remote unchanged). Deviations: none. Proposed fixes: none new (beta.4 FU-1 stands).

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.5`, run 44885874501 |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 / exit 0 |
| `scripts/check_secrets.sh v1.5.14-beta.5..HEAD` | PASS |
| `pnpm --dir autobyteus-web ios-icon:check` (confidence; the workflow runs it too) | "all 18 slots match the logo (on #1E3A8A)" |
| `python3 scripts/release_smoke.py` (load 40–73) | **PASS, 13 of 13**: Claude 3, Codex 3, Grok 3, Antigravity 2, AutoByteus 2; models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`. No waiver. |

## Release Decision

- Decision: `Beta`. Decided by: the founder's words above.

## Version / Tag / Release Commit

- With the HTTPS rewrite: `bash scripts/desktop-release.sh beta --branch codex/release-v1.5.14-beta.6 --no-push`; its trust check passed (witness `v1.5.14-beta.5`, run 44885874501); `migrations:record-released` no change. Release commit **`9c5f85f92f`**, annotated tag **`v1.5.14-beta.6`** (tag object `46ac5e9416`).
- Secret Gate `origin/personal..HEAD` PASS; `origin/personal` fast-forwarded `b768c503f9 → 9c5f85f92f`, then the tag, at 12:00:28Z.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Release Script` (RELEASE.md, Cutting The Release).

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 44901757001 | success, attempt 1 |
| Server Docker Release | 44901757006 | success, attempt 1 |
| Android APK Release | 44901756978 | success, attempt 1 |
| iOS App Store Connect Release | 44901756955 | success, attempt 1 |

- No failed job (the poll, stopping on any non-success, ran to "ALL SUCCESS").

### iOS (for autobyteus-592)

- **Build: 1.5.14 (352)** (`iOS build number: 352`; the archive job `CURRENT_PROJECT_VERSION = 352`, `MARKETING_VERSION = 1.5.14`).
- Step 9 **"Check the app icon against the logo": success**, "[ios-icon] all 18 slots match the logo (on #1E3A8A)."
- Both macOS jobs: Xcode_27.2.app, iPhoneOS SDK 27.2; "The demo answers all 252 compiled operations"; core `Executed 56 tests, with 0 failures`; smoke `Executed 8 tests, with 0 failures`.
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `d7a91c02-0900-47a4-9690-0f11d98a4300`. **No ITMS message** in the log (0 lines). Nothing submitted to App Store review; no reply to Apple. App Store Connect's own processing result (the icon accepted, no "Missing Compliance") shows in App Store Connect, not in this log.

### Published artifacts checked

- Pre-release, not a draft; GitHub Latest stays `v1.5.13`.
- **27 of 27 assets**; the four `latest*.yml` (12:29:07Z) after all six server packages (last 12:10:10Z) (`evidence/delivery/published-state.txt`).
- Docker (registry API): `:1.5.14-beta.6` = `:beta` = index `sha256:47b8911073…`, exactly linux/amd64 `sha256:7628f94b47…` and linux/arm64 `sha256:1b58307d10…`, the two package jobs' digests; `:latest` = `1.5.13` = `sha256:13df73db92…`, unchanged.
- Notes: `release-notes.md` above the generated notes, with **one** `**Full Changelog**` line (the generated body had two; the duplicate removed); the body starts with "## What you need to do"; pre-release kept.
- Release/publication result: `Completed`. Release notes handoff result: `Used`.

