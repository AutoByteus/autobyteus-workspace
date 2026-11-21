# Release Report — release-v1.5.14-beta.5 (autobyteus-589): beta v1.5.14-beta.5

Status: **cutting** (updated below as the release proceeds).

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

- `release-notes.md` (this folder): "What you need to do": the iPhone/iPad TestFlight build with Xcode 27 / iOS 27 SDK and Try demo (TestFlight only); from beta.3 or earlier, update the app and every node together (554, 565); Docker `upgrade --all`; desktop beta updates. "Good to know": Work Journals rebuild once (561).
