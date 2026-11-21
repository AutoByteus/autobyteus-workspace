# Release Report — release-v1.5.14-beta.4 (autobyteus-582): beta v1.5.14-beta.4

Status: **cutting** (updated below as the release proceeds).

## Scope

- Release request (`handoff-release.md`): one beta from the latest `origin/personal`. The founder (relayed verbatim by the PM, 2026-11-21): "Let's first the release on new version a new beta".
- Base: `origin/personal` @ `a07767f4d0` (re-checked before the cut: unchanged); `next-beta` → `1.5.14-beta.4`; no `v1.5.14-beta.4` tag on origin.
- Content since `v1.5.14-beta.3` (first-parent merges, `evidence/delivery/pretag-tickets.txt`): 571 (Xcode 27 / iOS 27 SDK), 526 round 2, 568, 565 (every run's Messages; cross-node addresses), 517 round 3 (Grok self-started turns), 11 (desktop signing custody, pre-tag trust check), 572 (phone media loading and Retry), 12 (managed Ubuntu icon), 554 and 576 (semantic memory for every agent, the Memory page). No app-data migration changed since beta.3.

## Project Release Guide

- `RELEASE.md` at `a07767f4d0`. Followed end to end. One deviation in how a check was run, below (signing trust check: the origin URL form); the check itself passed in full.
- Proposed guide or tooling fix: the trust check should accept the official checkout's SSH host alias (resolve it with `ssh -G`), or the guide should say to run it with the HTTPS URL (follow-up FU-1).

## Checks Before Tagging (on `codex/release-v1.5.14-beta.4`, base `a07767f4d0`)

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | exit 0 / exit 0 |
| `node scripts/desktop-package/check-release-trust.mjs` | as configured: exit 1, "Verify the official origin fetch/push destinations" (origin is the SSH host alias `git@github.com-ryan:AutoByteus/autobyteus-workspace.git`). With a process-only `url.https://github.com/AutoByteus/autobyteus-workspace.git.insteadOf=<alias>` (`GIT_CONFIG_*` env; `git remote get-url --all [--push] origin` → the official HTTPS URL): **exit 0**, witness tag `v1.5.14-beta.3`, run 44721149038, attempt 1, key fingerprint `e26a2e74…9debe` (`pretag-signing-trust.txt`). The shared remote was not changed. |
| `python3 scripts/check_licensing.py` | exit 0 |
| `python3 scripts/check_repository_artifact_hygiene.py` | exit 0 |
| `scripts/check_secrets.sh v1.5.14-beta.3..HEAD` | PASS |
| `python3 scripts/release_smoke.py`, run 1 (load 37–64) | Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2; Grok 1/3 (`ACP_REQUEST_TIMEOUT: initialize did not respond in time`, the 30 s run-creation bound); "worktree left unchanged" FAIL, delivery's own (it wrote the release notes during the run) |
| `python3 scripts/release_smoke.py`, run 2 (load 39–70) | Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2, worktree unchanged; Grok 0/3 ("Grok Build model discovery timed out", the 15 s discovery bound) |

- Models: `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.5 (pinned grok-4.7 not offered)"}` (run 1).
- Evidence: `pretag-release-smoke-run{1,2}-{summary,live,antigravity,autobyteus}.log`, `pretag-release-smoke-run{1,2}-grok-lines.txt`, `pretag-grok-initialize-timing.txt`.

## Grok: the founder's waiver

- Not a usage limit, so not covered by the standing rule; sent to the Solution Designer with options (waive as for beta.3; hold for a bounds fix; retry at lower load).
- **The founder, to delivery directly (2026-11-21): "Waive for grok".** Recorded verbatim; the Solution Designer told.
- Cause as measured: Grok's ACP `initialize` answers in 3.3–6.0 s when run alone (CLI 1.0.92, load 45–75), but exceeded the 15 s discovery and 30 s initialize bounds inside the smoke's concurrent load. The same failure as beta.3 (waived then too). No change since v1.5.13 loosened or tightened these bounds. Follow-up FU-2: give Grok's discovery and initialize bounds the margin Antigravity got (e06-delegation-wait-margin).

## Release Notes

- `release-notes.md` (this folder): "What you need to do" from 554 and 565 (update the app and every node together; nothing converted at first start), Docker `upgrade --all` (beta track follows, stable track stays on 1.5.13), the TestFlight-only iOS build with Xcode 27 / iOS 27 SDK (571), desktop beta updates; "Good to know" from 554, 565 and 12.
