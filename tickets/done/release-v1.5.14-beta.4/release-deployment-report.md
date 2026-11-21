# Release Report — release-v1.5.14-beta.4 (autobyteus-582): beta v1.5.14-beta.4

Status: **partial release** — tagged and published as a pre-release; Desktop, Server Docker and Android succeeded; **iOS failed, cause ours** (554's demo-operations coverage), nothing uploaded to TestFlight. Fixed forward by a prerequisite Task and v1.5.14-beta.5 (the founder's word); the tag is not moved.

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

- `release-notes.md` (this folder), as published above the generated notes: "What you need to do" from 554 and 565 (update the app and every node together; nothing converted at first start), Docker `upgrade --all` (beta track follows, stable track stays on 1.5.13), desktop beta updates; "Good to know" from 554, 565 and 12.
- The iPhone/iPad TestFlight line (571, Xcode 27) was dropped after the iOS failure, as the Solution Designer agreed: the phone's screens come from the node, so iOS users have nothing to do for beta.4; the line moves to the beta that carries iOS.

## Cutting The Release

- `origin/personal` still `a07767f4d0`. The two untracked `*/dist/` folders removed (nothing tracked in them).
- With the process-only HTTPS rewrite (above): `bash scripts/desktop-release.sh beta --branch codex/release-v1.5.14-beta.4 --no-push`. Its own trust check passed (witness `v1.5.14-beta.3`, run 44721149038); `migrations:record-released` ran (no change: no new migration); release commit **`90c4958a35`** `chore(release): bump workspace release version to 1.5.14-beta.4`, annotated tag **`v1.5.14-beta.4`** (tag object `cbb5308cbd`).
- Secret Gate `origin/personal..HEAD` PASS; `origin/personal` fast-forwarded `a07767f4d0 → 90c4958a35`, then the tag, at 06:54:14Z (over the official HTTPS URL).

## Pipelines

| Workflow | Run | Result |
| --- | --- | --- |
| Android APK Release | 44877725611 | success, attempt 1 |
| Server Docker Release | 44877725608 | success, attempt 1 |
| Desktop Release | 44877725652 | success, attempt 1 (publish 07:20:16Z) |
| iOS App Store Connect Release | 44877725696 | **failure**, attempt 1: "Build And Test iOS App" › "Build the bundled demo"; Validate iOS Publish Secrets and Archive And Upload To App Store Connect skipped. Nothing uploaded |

- The poll (every 75 s, stopping on any non-success) stopped on the iOS failure at 07:02:41Z; Desktop and Docker were then watched to the end.

### iOS failure triage: ours

- Log (`evidence/delivery/release-ios-run-44877725696-failed-step.log`), 07:01:32Z, `autobyteus-web/scripts/build-mobile-web.mjs:82`: "The demo build's operations are not all answered: compiled but neither answered nor listed as unreachable: AgentSemanticMemoryFolder / GlobalSemanticMemoryFolder / ListAgentEpisodes / ListMemoryGroupMembers; listed as unreachable but handled or no longer compiled: ListAgentRunsWithMemory".
- Reproduced locally on the tagged commit `90c4958a35` (`evidence/delivery/release-ios-local-reproduction.txt`): `pnpm --filter "{./autobyteus-web}^..." run build` exit 0, then `pnpm -C autobyteus-web build:mobile-web --demo` exit 1 with the same five lines. Not the platform; a rerun of the same commit fails the same way.
- Origin: autobyteus-554's `56b02294d0` (merge `fd2d1fc4a1`) added the four memory GraphQL documents (`semanticMemoryQueries.ts`, `memoryExplorerQueries.ts`), which compile into the phone and demo builds, and removed `ListAgentRunsWithMemory`, which `demo/graphql/unreachable-operations.json` still lists. The demo build's check (autobyteus-279) did not run in 554's or 576's stages.
- Action: sent to the Solution Designer as a new change (release request): the four operations answered or listed, the stale entry dropped, and a local check so a GraphQL document change cannot skip the demo coverage; then v1.5.14-beta.5 on the founder's word. Confirmed by the Solution Designer (run log and the files at the tag). The check belongs at the stage that let it through (GraphQL document changes), not at the release.

## Verification

- GitHub release `v1.5.14-beta.4`: pre-release, not a draft; GitHub Latest stays `v1.5.13`.
- **27 of 27 assets** (iOS publishes none on GitHub): the APK and `.sha256`; the six server packages (last 07:03:02Z); the desktop files with the Linux signed release records (07:19:55Z); the four `latest*.yml` (07:20:14Z), **after the six server packages** (`evidence/delivery/published-state.txt`).
- Docker (registry API): `autobyteus/autobyteus-server:1.5.14-beta.4` = `:beta` = index `sha256:8ae63b5617…`, exactly linux/amd64 `sha256:497f741cdd…` and linux/arm64 `sha256:0332378fcb…`, the digests the two Publish Server Package jobs used; `:latest` = `1.5.13` = `sha256:13df73db92…`, unchanged.
- Notes: `release-notes.md` above the generated notes (`gh release edit --notes-file`); the body starts with "## What you need to do"; no iPhone line; pre-release kept.
- TestFlight: no beta.4 build (the iOS run failed before any upload); iOS users keep beta.3's build 1.5.14 (343).

## Result

- **Partial release**: desktop (all five targets, updater files), Android and the server (Docker image and packages) are published; iOS is not. Release complete: `No` (iOS), by the guide's rule a partial release.

