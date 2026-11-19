# Release Report — release-v1.5.13 (autobyteus-535): stable v1.5.13

Status: **Completed: stable v1.5.13 published as GitHub Latest (4/4 workflows on the first attempt, 23/23 assets).**

## Scope

- Release request (`Release Requested`; `handoff-release-requested.md`): stable v1.5.13 (GitHub Latest) from the latest `origin/personal`. The founder: "Okay let's just release the new stable now let's go" (2026-11-18). Base re-checked: `0ce426bc9f` (autobyteus-533, 491 and 492 not merged at the cut).
- No validated package: the release guide's checks are the verification.

## The Founder's Words (relayed by the Solution Designer, 2026-11-18)

- Content and cut time: "Okay let's just release the new stable now let's go".
- Docker `:beta`: moves with the newest tag, stable or beta (his question "previously beta also always a point to the latest right", answered yes); `:latest` and `:beta` both move to 1.5.13.
- Smoke: no waiver (the prompt-section tests are fixed, `f734aedc26`); Grok only under "Waive grok if no usage limit anymore", for a case failing solely on a usage limit; anything else back to the Solution Designer.
- App data: the episodic catalogs on first start, no backup ("please no need to backup").
- Docker launcher wording (Solution Designer's correction after his question): every user runs plain `autobyteus-docker upgrade --all` (each node keeps its track); `--tag latest` only for beta-track nodes going back to stable.

## Before Cutting

- Apple developer agreement: beta.10's macOS builds were signed and notarized on 2026-11-18 (Desktop run 44239204356, success); no refusal since beta.7.
- Released migrations: the 461 conversion (since v1.5.12) is in `RELEASED` as of v1.5.13-beta.7; nothing changed since; `RELEASED` unchanged (its comment: a later release only appends).
- Notes: one curated set since v1.5.12, `release-notes.md`, "What you need to do" first (no rollback, contact support; update everything together; plain `upgrade --all`, `--tag latest` only for beta-track nodes back to stable; the Android APK; the catalog build; the double approval; the Daily Assistant on another node), the handoff's known issues under "Good To Know".

## Checks Before Tagging (on `5bb41f0dd1`: `0ce426bc9f` plus this ticket's documents)

- `pnpm install --frozen-lockfile`, server `prebuild`: pass. Typechecks: server `production errors: 0 … (baseline 1012 in 316 files)`, web `production errors: 0 … (baseline 87 in 37 files)`. Registry-order test: pass. `check_licensing.py`, `check_repository_artifact_hygiene.py`, `check_secrets.sh v1.5.12..HEAD`: pass.
- `release_smoke.py`:

| Case | Run 1 | Run 2 (the rerun that decides) | Classification |
| --- | --- | --- | --- |
| Claude 3, Codex 3, AutoByteus 2 | PASS | PASS | — |
| Antigravity 2 | PASS | PASS | — |
| `agy-linked-skills-transport.e2e.test.ts` (scripted AGY): hook timeout 60 s; E07 "a linked run resumes after its skill folder was deleted" timed out waiting for `TURN_COMPLETED` | FAIL | PASS (no failure) | Platform: this machine's load (average 49–61) |
| Grok "new run + restore, linked workspace" | FAIL `Grok Build model discovery timed out` | FAIL `429 Too Many Requests: subscription:free-usage-exhausted` | run 2: solely a usage limit, covered by his standing word |
| Grok "brand-new team member" | FAIL discovery timed out | FAIL `COLLABORATION_AGENT_ACTIVATION_FAILED: ACP_REQUEST_TIMEOUT: initialize did not respond in time` | not a usage limit: **needs his words** |
| Grok "different same-named skill" | FAIL discovery timed out | FAIL `429 … free-usage-exhausted` | run 2: solely a usage limit, covered |

- Grok's free usage is now exhausted (rolling 24 h), so a further rerun cannot give a clean Grok result today. Evidence: `evidence/delivery/DR1-pretag-*`.
- **The founder's Grok decision** (to delivery directly, 2026-11-18): "Waive for grok quota limit thanks". Delivery's reading, stated to him before the cut: the Grok runtime is waived for v1.5.13, all three cases (two failed solely on the quota; the third, `ACP_REQUEST_TIMEOUT: initialize did not respond in time`, cannot be rerun cleanly while the quota is exhausted). The other runtimes passed.

## Cutting

- Base re-checked at the cut: `origin/personal` `0ce426bc9f`; the tagged code is identical to the smoke-checked `5bb41f0dd1` apart from ticket documents.
- `bash scripts/desktop-release.sh release 1.5.13 --release-notes tickets/done/release-v1.5.13/release-notes.md --branch codex/release-v1.5.13 --no-push` → release commit `f7b4d68711` (`chore(release): bump workspace release version to 1.5.13`: `autobyteus-web/package.json` and `.github/release-notes/release-notes.md`, identical to the ticket's notes), annotated tag `v1.5.13`. Android versionCode `10051399`. Secret Gate `85a414c14c..HEAD` PASS. Pushed `0ce426bc9f..f7b4d68711 HEAD -> personal` and the tag at 12:17:30Z.

## Rollout

- Android APK Release `44302514748`, iOS App Store Connect Release `44302514563`, Server Docker Release `44302514536`, Desktop Release `44302514508`: **all success on attempt 1**; the poll (every 75 s, stopping on any non-success) never stopped.
- macOS ARM64 took 50.1 min (beta.10: 21): its build step ran 12:23:30–13:06:48Z, electron-builder began only at 12:49:58Z (about 26 min building the app on a slow runner), signing 1 min, notarization 12:52:49–13:01:28Z (9 min; `notarization successful`, no retry). GitHub reported capacity constraints for macOS arm64 runners at the time (an unrelated build-only Desktop run, `44306459004` on `codex/follow-ups-of-461-500`, started by hand at 12:42Z, had its macOS ARM64 job cancelled with "The job was not acquired by Runner of type hosted even after multiple attempts"). Notarization passed: the Apple agreement is in effect. `evidence/delivery/DR1-macos-arm64-timeline.log`.

| Failed Run And Job | Classification | Log Lines | Action | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Published

- GitHub release `v1.5.13`: `isPrerelease: false`, not a draft, **23 assets**; `/releases/latest` → `v1.5.13`. The body is the curated notes (identical apart from one trailing blank line; `evidence/delivery/DR1-published-release-notes.md`).
- Order: the six `autobyteus-server-1.5.13-linux-{x64,arm64}.{tar.gz,json,json.sig}` files by 12:27:03Z; every `latest*.yml` from 13:11:56Z (`evidence/delivery/DR1-release-asset-order.tsv`).
- Docker: `autobyteus/autobyteus-server:1.5.13` = `:latest` = `:beta`, the index `sha256:13df73db926a…` (12:25Z), with exactly two images, amd64 `sha256:b595bcf370c6…` and arm64 `sha256:6545f7ed682c…`, the digests the two Publish Server Package jobs used (`…b595bcf370c62de051219ed9e7239a3616a4cc78fae0ee351d8fde029d29a522`, `…6545f7ed682c43c502e2c5d5d456b03c30742d09ab6c84efc27ad2b5d6a17fbb`).

### Times (tag push to the workflow's end)

| Workflow | beta.10 | v1.5.13 |
| --- | --- | --- |
| Server Docker Release | 10 min | 10 min (amd64 7.2, arm64 6.9, publish 0.4, packages 1.4 / 1.7) |
| Desktop Release | 24 min | 54 min (macOS ARM64 50.1 on a slow runner; Intel 21.5; Windows 12.9; Linux 7.9 / 7.4; publish 2.9) |
| Android APK Release | 6 min | 6 min |
| iOS App Store Connect Release | 20 min | 25 min |

## Final Status

- Verification (the guide's checks; the founder's Grok waiver): `Yes`. Repository finalization: `Yes` (`personal` at `f7b4d68711`, then this record). Release: `Completed`. Blocker: `None`. Cleanup: after this record is pushed.

