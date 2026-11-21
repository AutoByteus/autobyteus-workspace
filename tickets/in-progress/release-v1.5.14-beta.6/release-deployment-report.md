# Release Report — release-v1.5.14-beta.6 (autobyteus-595): beta v1.5.14-beta.6

Status: **cutting** (updated below as the release proceeds).

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
