# Release Report — release-v1.5.14-beta.7 (autobyteus-604): beta v1.5.14-beta.7

Status: **cutting** (updated below as the release proceeds).

## Release / Publication / Deployment Scope

- Release request (`handoff-release.md`). The founder (relayed verbatim by the PM, 2026-11-22): "I think we can create a new beta version now".
- Base `origin/personal` @ `e5359c4bdf` (re-checked before the cut); `next-beta` → `1.5.14-beta.7`; no `v1.5.14-beta.7` tag on origin.
- Content since `v1.5.14-beta.6` (`evidence/delivery/pretag-tickets.txt`): 587 (cross-node file transfer; `node` on every cross-node send), 591 (cross-node Task close and reopen), 598 (chrome-vnc 1.4.2 base pins, Docker **system level 2**, the VNC restart fix), 22 (running Teams follow their definition), 28 (Linux ARM64 AppImage on the static runtime), 16 (immediate restart for verified managed Ubuntu updates). No app-data migration changed.

## Project Release Guide

- `RELEASE.md` at `e5359c4bdf`, followed end to end: the signing trust check with the process-only HTTPS rewrite of the `github.com-ryan` alias (shared remote unchanged), the Server Docker system-level check. Deviations: none. Proposed fixes: none new.

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` (HTTPS rewrite) | exit 0; witness `v1.5.14-beta.6`, run 44901757001 |
| `node scripts/server-package/check-system-level.mjs` | exit 0: "System level 2: the system part is unchanged (61cd87f9a8cca3c3df207db0d7b36807f3dace192b9288b00102ff9c809725b7)" |
| `python3 scripts/check_licensing.py` / `check_repository_artifact_hygiene.py` | exit 0 / exit 0 |
| `scripts/check_secrets.sh v1.5.14-beta.6..HEAD` | PASS |
| `python3 scripts/release_smoke.py`, run 1 (load 30–43) | Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2; **Grok 1/3**: `RUN_MODEL_NOT_OFFERED`, "its saved model 'grok-4.5' is not offered by Grok Build now" (models `grok-4.5 (pinned grok-4.7 not offered)`; right after, `grok models` offered only `grok-4.7`, three times: xAI's list changed mid-run) |
| `python3 scripts/release_smoke.py`, run 2 (load 25–32) | Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2; **Grok 2/3** on `grok-4.7`: "different same-named skill" (AC-104) answered `LINKCODE-28eb00f0` (the package's copy, after searching) instead of `OWNCODE-28eb00f0` (FU-1) |

- Evidence: `pretag-release-smoke-run{1,2}-{summary,live,antigravity,autobyteus}.log`, `pretag-release-smoke-run2-grok-failure.txt`, `pretag-grok-models-after-run1.txt`, `pretag-system-level.log`, `pretag-signing-trust.txt`.

## Grok: the founder's waiver (beta.7 only)

- Not a usage limit, so not covered by the standing rule; sent to the Solution Designer with options (waive; one more run; hold with a ticket).
- **The founder, verbatim, to the Solution Designer (2026-11-22): "Waive for grok thanks"** (option (a)). Grok is waived for **v1.5.14-beta.7 only**.
- The Solution Designer checked that no commit since beta.6 touched Grok or the skill code; the failures were xAI's mid-run model-list change (run 1) and AC-104's skill choice (run 2). Follow-up FU-1 (Grok AC-104).

## Release Decision

- Decision: `Beta`. Decided by: the founder's words above.

## Release Notes

- `release-notes.md` (this folder): "What you need to do" from 587 and 591 (update paired nodes together; `node` on every cross-node send), 598 (Docker system level 2: recreate with `autobyteus-docker upgrade --all`, the README's command; beta and stable tracks), the TestFlight-only iOS build, desktop beta updates; "Good to know" from 587, 591, 22, 28 and 16. One `**Full Changelog**` line.
