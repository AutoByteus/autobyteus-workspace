# Release Report — release-v1.5.14-beta.1 (autobyteus-538): beta v1.5.14-beta.1

Status: **published and verified (2026-11-18).**

## Scope

- Release request (`Release Requested`; `handoff-release-requested.md`): one beta of the latest `origin/personal`. The founder: "Release a new beta please." (2026-11-18). Base `53b72018ad`; `next-beta` → `1.5.14-beta.1`; Android versionCode `10051401` (within limits); no `v1.5.14*` tag on origin.
- Content since v1.5.13: autobyteus-517 round 2 (`0f90abd33c`), autobyteus-491 (`e58377895b`, retired compactor model removed; the startup migration `20261118_remove_retired_built_in_agents` deletes `agents/autobyteus-skill-evolver` and `agents/autobyteus-memory-compactor`, no copy; their runs stay), autobyteus-492 (`002b4d781a`, `send_message_to` by run ID to any running agent, also on a paired node; opt-in `list_running_agents`).

## The Founder's Words (relayed by the PM and the Solution Designer, 2026-11-18)

- 491: "Delete the skill evolver and memory compactor from a machine, keeps no copy, the reason is the answer we don't need it, to be honest, that you can see that we are doing self-improvements [without that skill]; and the memory compactor is not used for a long time." Approved, no backup for his machine; the notes still tell every user what the first start removes and to replace either agent in a Team or Org they made.
- Grok: only "Waive grok if no usage limit anymore", for a case failing solely on a usage limit; any other failure goes back to the Solution Designer.
- Smoke: no waiver expected; any other failure goes back to the Solution Designer.
- Docker: `:beta` moves to 1.5.14-beta.1; `:latest` stays at 1.5.13.

## Before Cutting

- Apple developer agreement: v1.5.13's macOS builds were signed and notarized today (`notarization successful` at 13:01Z, Desktop run 44302514508); no refusal since beta.7.
- Released migrations (RELEASE.md, Cutting The Release): the registry has one migration more than `RELEASED`, `20261118_remove_retired_built_in_agents`, appended last (the first 45 match). `RELEASED` set to the registry as released, the comment naming v1.5.14-beta.1 and its base `53b72018ad`; the test passes (3/3); committed `428d5e0055` (`test(app-data-migrations): released set as of v1.5.14-beta.1`).
- Rollback: RELEASE.md allows "possible" only when the older build is checked against the converted data; v1.5.13 was not run against data after this migration, so the notes say going back is not checked and to contact support.
- Notes: `release-notes.md` (what the first start removes, no copy, runs stay; replace either agent in a Team or Org; the desktop and every paired node for cross-node messaging; `autobyteus-docker upgrade --all`, beta-track nodes follow the beta, stable-track nodes stay on 1.5.13, `--tag beta` to switch, checked against the launcher's own help in `core.sh`).

## Checks Before Tagging (on `0c5d7e13df`)

- `pnpm install --frozen-lockfile`, server `prebuild`: pass. Typechecks: server `production errors: 0; test-file errors: 1008 in 315 files (baseline 1008 in 315 files)`; web `production errors: 0 … (baseline 87 in 37 files)`. Registry-order test: pass. `check_licensing.py`, `check_repository_artifact_hygiene.py`, `check_secrets.sh v1.5.13..HEAD`: pass.
- `release_smoke.py` (load average 49–55):

| Case | Run 1 | Run 2 (the rerun that decides) |
| --- | --- | --- |
| Claude 3, Codex 3, AutoByteus 2, Antigravity (live) 2 | PASS | PASS |
| Grok "new run + restore" | FAIL `429 … subscription:free-usage-exhausted` | FAIL `Grok Build model discovery timed out` |
| Grok "brand-new team member" | PASS | FAIL discovery timed out |
| Grok "different same-named skill" | FAIL `429 … free-usage-exhausted` | FAIL discovery timed out |
| `agy-linked-skills-transport.e2e.test.ts` (scripted) | E05 FAIL `The model list of Antigravity CLI could not be read: Antigravity model discovery timed out` | E05 PASS; E06 FAIL `Timed out waiting for delegation result` |

- Classification: timeouts under this machine's load; not identical between runs (each failing case passes in the other run, except Grok's discovery timeouts in run 2). Run 1's two Grok failures are solely a usage limit (covered by the standing word); run 2's discovery timeouts and the scripted Antigravity timeouts are not covered: **back to the Solution Designer for the founder's words.**

## The Founder's Grok Decision And The Third Run

- The founder, to delivery directly (2026-11-18): "Waive for grok". Then, as a standing rule to remember: "whenever it has been so many times if for example if grok is out of usage limit, [waive] it" (voice input: "wait for it"; read as "waive it" and told to him). Stored in delivery's reflections lessons.
- Run 3 (load 49–56): Claude 3, Codex 3, Antigravity (live) 2, AutoByteus 2 PASS; Grok 3/3 `429 … free-usage-exhausted` (waived); **E06 FAIL again, `Timed out waiting for delegation result`, identical to run 2** (45 s).
- E06 in isolation, the smoke script's environment (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs`, a clean HOME): `vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts -t E06` → **PASS twice** (2.3 s, 1.9 s), even at load 137 (`evidence/delivery/DR1-e06-alone-{1,2}.log`).
- The whole file in sequence, the same environment → **E06 FAIL**, the other nine PASS (`DR1-agy-file-in-sequence.log`). E06's frames: the coordinator's turn starts and sends `DELEGATE:`; `DELEGATED:` never returns.
- In v1.5.13's two smoke runs and beta.10's run, E06 passed in sequence. Since v1.5.13: autobyteus-492 changed `send_message_to` routing and when a stopped agent is woken; 517 round 2 changed the Antigravity background-task view.
- **Classification: ours** (a second identical failure; reproducible in sequence on this release). Release-request rule: a new change for the Solution Designer; API/E2E reproduces it locally and turns it into a durable local check. No tag.

## E06 Resolved As A Pre-existing Timing Margin (the Solution Designer's comparison, 2026-11-18)

- Two worktrees of the Solution Designer's own, v1.5.13 (`f7b4d68711`) and the beta (`3809cdb035`), each after `pnpm install` and `prepare:source`, delivery's environment; E06 alone, 10 runs each, alternating, load 15–70: v1.5.13 1.1–31.9 s (mean 16.3 s), the beta 3.1–33.8 s (mean 17.9 s); **20/20 pass**; both within about 12 s of E06's own 45 s wait. The test and the scripted CLI are unchanged since v1.5.13. In run 2 the child's workspace is created late: the delegation arrived late, not lost. Delivery's three failures took 37–44 s at loads up to 137. Summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/_solution-designer-reports/release-v1.5.14-beta.1-smoke-check/summary.md`.
- Corrected classification: **not a regression of this beta**; a pre-existing timing margin of the test under this machine's load (platform-shaped, but a failing case). Delivery's earlier "ours" rested on the "second identical failure" rule, not on a cause in the code.
- Only the founder's words can excuse a failing case: the Solution Designer is asking him (its recommendation: release, with a follow-up giving E06's wait room for the child's cold start, a test-only change). Delivery holds the cut until his words arrive.
- **The founder's decision on E06** (relayed by the Solution Designer, 2026-11-18): "make the time a little bit loose and then fix it in the tickets directly". Fix first: ticket `e06-delegation-wait-margin` (E06's waits to 90 s and 60 s, test only) is with the implementation engineer. Delivery holds; when it is on `personal`, delivery re-checks the base, merges `personal` into the release branch, reruns the checks before tagging and the smoke (a clean E06 expected), then cuts. Grok stays under his "Waive for grok".

## Checks Before Tagging Again, With The E06 Fix (DR2, on `1f835e3e7f`)

- `origin/personal` @ `05dde06bb4` (e06-delegation-wait-margin merged as `0c7f60865d`, its record `05dde06bb4`) merged into `codex/release-next-beta-538` as `23ee80d978`, no conflicts. No migration came in (the e06 change has none); the `RELEASED` comment now names the base `05dde06bb4` (`1f835e3e7f`).
- `pnpm install --frozen-lockfile`, server `prebuild`: exit 0. Typechecks: server `production errors: 0; test-file errors: 1008 in 315 files (baseline 1008 in 315 files)`, web `… 87 in 37 files (baseline 87 in 37 files)`, both PASS (`evidence/delivery/DR2-pretag-typechecks.log`). Registry-order test 3/3 (`DR2-pretag-migration-order.log`). `check_licensing.py` exit 0, `check_repository_artifact_hygiene.py` exit 0, `check_secrets.sh v1.5.13..HEAD` PASS (`DR2-pretag-{licensing,hygiene,secrets}.log`).
- `release_smoke.py` (load average 49–54), `DR2-pretag-release-smoke-summary.log`:

| Case | Result |
| --- | --- |
| Claude 3, Codex 3, Antigravity (live) 2, AutoByteus 2 | PASS |
| `agy-linked-skills-transport.e2e.test.ts` (scripted), whole file | PASS 10/10; **E06 PASS in 29.8 s** (the old 30 s wait would have had 0.2 s to spare; the new one is 90 s) (`DR2-smoke-antigravity-results.log`) |
| Grok, all three | FAIL `Grok Build model discovery timed out; check the CLI and retry.` (`DR2-smoke-live-results.log`) |

- Grok triage (`DR2-grok-initialize-timing.txt`): `grok --version` and `grok agent --help` answer in 0.04–0.10 s; the ACP `initialize` that the server's discovery waits for answered in 15.2 s, 3.2 s and 4.6 s at the same load, against the handshake's 15 s bound (`DISCOVERY_TIMEOUT_MS`, unchanged since v1.5.13; no change to `runtime-management/acp` or `grok` since v1.5.13). The same failure as run 2 above, which the founder answered with "Waive for grok". **Waived under that word**; not a change of this beta. A follow-up is proposed to the Solution Designer: Grok's discovery handshake bound has the same load margin as Antigravity's had (FU, release record only).
- Every other case passes, E06 included. Cleared to cut.

## The Cut

- The two untracked build-output folders the prebuild left (`autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`, nothing tracked in them) were removed so the script's clean-tree check passes.
- `scripts/desktop-release.sh beta --branch codex/release-next-beta-538 --no-push` → `2eb195603a` `chore(release): bump workspace release version to 1.5.14-beta.1`, annotated tag `v1.5.14-beta.1`.
- Secret Gate `origin/personal..HEAD` PASS; `git push origin HEAD:personal` (fast-forward `05dde06bb4` → `2eb195603a`) and `git push origin v1.5.14-beta.1` at 17:26:57Z.

## Pipelines

| Workflow | Run | Result |
| --- | --- | --- |
| Server Docker Release | `44358782062` | success, attempt 1 (amd64 7.3 min, arm64 7.6 min, publish 0.4 min, packages 1.6 min) |
| Android APK Release | `44358782245` | success, attempt 1 |
| Desktop Release | `44358781953` | success, attempt 2: attempt 1's `Build macOS ARM64` was cancelled at 17:43Z with "The job was not acquired by Runner of type hosted even after multiple attempts" and GitHub's notice "Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times"; `gh run rerun --failed` after the run ended (17:52Z); the job got a runner at 17:57Z and passed at 18:20Z; Publish GitHub Release 18:20–18:23Z |
| iOS App Store Connect Release | `44358782422` | success, attempt 3: attempts 1 and 2 `Build And Test iOS App` cancelled, same message (17:43Z, 17:58Z); rerun `--failed` each time at once; attempt 3 built 18:00–18:08Z and uploaded to App Store Connect 18:10–18:16Z |

- Classification of the cancellations: **platform** (no hosted macOS arm64 runner was assigned; the job never started a step). githubstatus.com at 18:00Z: no unresolved incident, Actions operational; the capacity notice is the only statement. Rerun at once each time; only the cancelled jobs were rerun.
- The poll checked every job every 60–90 s and stopped on any non-success (it stopped at each cancellation).

## Verification

- GitHub release `v1.5.14-beta.1`: pre-release `true`, draft `false`; GitHub's Latest stays `v1.5.13`.
- 23 assets: the Android APK and its `.sha256` (17:35Z); the six server packages (`autobyteus-server-1.5.14-beta.1-linux-{arm64,x64}.{tar.gz,json,json.sig}`, last at 17:36:43Z); the desktop builds (two AppImages, macOS arm64 and x64 `.dmg`/`.zip` with blockmaps, the Windows `.exe`, 18:23:13Z); then the four `latest*.yml` (`latest-linux-arm64.yml`, `latest-linux.yml`, `latest-mac.yml`, `latest.yml`, 18:23:40Z), **after the six server packages**.
- Docker (registry API): `autobyteus/autobyteus-server:1.5.14-beta.1` = `:beta` = index `sha256:25c7ea85295f…`, exactly two images, linux/amd64 `sha256:c539d8245d07…` and linux/arm64 `sha256:24c29c02db3b…`, the digests the two Publish Server Package jobs used (their logs: `autobyteus-server@sha256:c539d8245d076b5c7594b6bd123456ab801d9c32bd0f347abd5f5c4f444487f4`, `…@sha256:24c29c02db3b3ee53a253c124eefe63fb0338fb0a50dc44120eb38c10cb3c679`). `:latest` = `1.5.13` = `sha256:13df73db926a…`, unchanged.
- Notes: the generated notes (the `v1.5.13...v1.5.14-beta.1` changelog link) with `release-notes.md` prepended (`gh release edit --notes-file`); the body starts with "## What you need to do"; pre-release kept.

## Follow-Ups

- Grok's discovery handshake bound (`DISCOVERY_TIMEOUT_MS = 15_000`, `acp-discovery-handshake.ts`) is as tight under this machine's load as Antigravity's was: `initialize` answered in 15.2 s once (`DR2-grok-initialize-timing.txt`). Proposed to the Solution Designer as a follow-up, like `e06-delegation-wait-margin`.
- Repeated macOS arm64 runner capacity cancellations (two workflows, three cancellations, about 30 minutes lost): recorded, no change proposed; the rerun at once worked.

