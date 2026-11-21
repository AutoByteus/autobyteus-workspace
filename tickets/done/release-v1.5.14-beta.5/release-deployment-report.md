# Release Report — release-v1.5.14-beta.5 (autobyteus-589): beta v1.5.14-beta.5

Status: **released** — tagged, all four workflows succeeded on the first attempt, 27 of 27 assets, GitHub pre-release; iOS 1.5.14 (349) uploaded to TestFlight with Xcode 27.2 / iOS 27.2 SDK and no warning (nothing sent to App Store review).

## Scope

- Release request (`handoff-release.md`). The founder (relayed verbatim by the PM, 2026-11-21): "Anyway I think that IOS a problem is fixed right we can release a new version now".
- Base: `origin/personal` @ `9dea98fb83` (re-checked before the cut); `next-beta` → `1.5.14-beta.5`; no `v1.5.14-beta.5` tag on origin.
- Content since `v1.5.14-beta.4` (`evidence/delivery/pretag-tickets.txt`): autobyteus-584 (the iOS demo build's GraphQL operation coverage, with a local check), autobyteus-561 (Antigravity reads and spilled outputs in the Work Journal; renderer revision 4: journals re-render once). Carried over from beta.4's failed iOS run: the first TestFlight build with Xcode 27 / iOS 27 SDK (571) and Demo Mode (279). No app-data migration changed since beta.4.

## Project Release Guide

- `RELEASE.md` at `9dea98fb83`, followed end to end. The signing trust check runs with beta.4's process-only HTTPS rewrite of the `github.com-ryan` SSH alias (the shared remote unchanged; beta.4 FU-1).

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.4`, run 44877725652; key fingerprint `e26a2e74…9debe` |
| `python3 scripts/check_licensing.py` | exit 0 |
| `python3 scripts/check_repository_artifact_hygiene.py` | exit 0 |
| `scripts/check_secrets.sh v1.5.14-beta.4..HEAD` | PASS |
| `python3 scripts/release_smoke.py` (load 54–74) | **PASS, 13 of 13**: Claude 3, Codex 3, Grok 3, Antigravity 2, AutoByteus 2; models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}` (`pretag-release-smoke-summary.log`). No waiver. |

## Release Notes

- `release-notes.md` (this folder), as published above the generated notes: "What you need to do": the iPhone/iPad TestFlight build 1.5.14 (349) with Xcode 27 / iOS 27 SDK and Try demo (TestFlight only); from beta.3 or earlier, update the app and every node together (554, 565); Docker `upgrade --all`; desktop beta updates. "Good to know": Work Journals rebuild once (561).

## Cutting The Release

- `origin/personal` still `9dea98fb83`; the two untracked `*/dist/` folders removed (nothing tracked).
- With the HTTPS rewrite: `bash scripts/desktop-release.sh beta --branch codex/release-v1.5.14-beta.5 --no-push`. Its trust check passed (witness `v1.5.14-beta.4`, run 44877725652); `migrations:record-released` ran (no change). Release commit **`b4723d0bb7`**, annotated tag **`v1.5.14-beta.5`** (tag object `7a8532f31f`).
- Secret Gate `origin/personal..HEAD` PASS; `origin/personal` fast-forwarded `9dea98fb83 → b4723d0bb7`, then the tag, at 08:39:05Z.

## Pipelines

| Workflow | Run | Result |
| --- | --- | --- |
| Desktop Release | 44885874501 | success, attempt 1 |
| Server Docker Release | 44885874598 | success, attempt 1 |
| Android APK Release | 44885874539 | success, attempt 1 |
| iOS App Store Connect Release | 44885874522 | success, attempt 1 |

- The poll (every 75 s, stopping on any non-success) ran to "ALL SUCCESS".

## iOS TestFlight upload (only; nothing was submitted to App Store review)

- Both macOS jobs: "Selected Xcode app: /Applications/Xcode_27.2.app", "Selected iPhoneOS SDK: 27.2"; the bundled demo: "The demo answers all 252 compiled operations" (584's fix); core `Executed 56 tests, with 0 failures`; smoke `Executed 8 tests, with 0 failures` on "iPhone 17 (iOS 27.2)".
- Upload: **"UPLOAD SUCCEEDED with no errors"**, Delivery UUID `41247a89-cce4-405e-b949-1423c2a7c7b3`, build number 349, version 1.5.14. Beta.3's upload carried one warning (ITMS-90725, iOS 26.2 SDK); this one has none. No App Store review submission and no reply to Apple.

## Verification

- GitHub release `v1.5.14-beta.5`: pre-release, not a draft; GitHub Latest stays `v1.5.13`.
- **27 of 27 assets**; the four `latest*.yml` (09:06:15Z) after all six server packages (last 08:48:19Z) (`evidence/delivery/published-state.txt`).
- Docker (registry API): `:1.5.14-beta.5` = `:beta` = index `sha256:1171310470…`, exactly linux/amd64 `sha256:3b9b23cd66…` and linux/arm64 `sha256:6a50400eca…`, the two package jobs' digests; `:latest` = `1.5.13` = `sha256:13df73db92…`, unchanged.
- Notes: `release-notes.md` above the generated notes (`gh release edit --notes-file`); the body starts with "## What you need to do"; pre-release kept.

## Result

- Release complete: `Yes` (all four workflows succeeded; 27 of 27 assets; iOS in TestFlight). It also completes what beta.4 could not: the first iOS build with the iOS 27 SDK.

