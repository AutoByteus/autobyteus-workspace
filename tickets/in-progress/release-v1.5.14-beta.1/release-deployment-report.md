# Release Report — release-v1.5.14-beta.1 (autobyteus-538): beta v1.5.14-beta.1

Status: **in progress (checks before tagging).**

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
