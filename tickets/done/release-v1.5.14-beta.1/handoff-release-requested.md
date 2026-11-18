# Release Requested: beta v1.5.14-beta.1 (autobyteus-538)

- Classification: `Release Requested` (no software change)
- Requested by: the founder ("Release a new beta please.", 2026-11-18), via `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-538 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. His rule: every release is cut from the LATEST `origin/personal`, by the team that cut the last release; nothing picked.
- Version: `v1.5.14-beta.1` (`python3 scripts/release_versions.py next-beta` → `1.5.14-beta.1`; check the Android versionCode limits). Previous stable `v1.5.13` (`f7b4d68711`); no newer beta.
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-beta-538`, `codex/release-next-beta-538`, from `origin/personal` at `53b72018ad` (2026-11-18 ~15:30). Re-check before the cut; whatever is merged then is in. At 15:30 the interrupt fix (533) was not merged.

## Content since v1.5.13 (first-parent merges)

| Ticket | Merge | Notes draft |
| --- | --- | --- |
| autobyteus-517 round 2 (Antigravity ended-task view; test helper; a duplicate settings note removed) | `0f90abd33c` (via `75048cbaf4`) | `tickets/done/prompt-section-tests-517*/` |
| autobyteus-491 (retired compactor memory model removed; startup migration `20261118_remove_retired_built_in_agents` deletes `agents/autobyteus-skill-evolver` with its skill and `agents/autobyteus-memory-compactor`, no copy; their runs stay) | `e58377895b` | `tickets/done/retired-memory-items-and-stale-built-ins/release-notes.md` |
| autobyteus-492 (`send_message_to` by run ID reaches any running agent, also on a paired node via `node`; a stopped agent is never woken by an unrelated sender; opt-in tool `list_running_agents`; both nodes need the release for cross-node use) | `002b4d781a` | `tickets/done/list-running-agents/release-notes.md` |

## The founder's gates

1. **491 deletes two agent folders with no copy:** his words to the PM, relayed verbatim (2026-11-18): "Delete the skill evolver and memory compactor from a machine, keeps no copy, the reason is the answer we don't need it, to be honest, that you can see that we are doing self-improvements [without that skill]; and the memory compactor is not used for a long time." Approval, no backup. (On his machine: `~/.autobyteus/server-data/agents/autobyteus-skill-evolver` 28 KB, `autobyteus-memory-compactor` 8 KB; no Team or Org of his lists either, checked by the Solution Designer.) The notes still tell every user plainly, under "What you need to do", what the first start removes (both agents, no copy, their runs stay), and to replace either agent in a Team or Org they made.
2. **Grok:** only his standing word "Waive grok if no usage limit anymore", for a Grok case failing solely on a usage limit. A failure that is not a usage limit (such as the initialize timeout of "brand-new team member") needs his own words, through the Solution Designer. (A clean Grok rerun after the quota resets was suggested: autobyteus-521.)
3. **Smoke:** the prompt-section tests are fixed; no waiver is expected; any other failure comes back to the Solution Designer.
4. **Apple:** check the developer agreement before cutting.
5. **Notes:** cross-node messaging needs the new release on this desktop and on every paired node; Docker nodes: `autobyteus-docker upgrade --all` (beta-track nodes follow the beta; stable-track nodes stay on v1.5.13).
6. A beta is offered only to installs with "Receive beta updates" on.

## RELEASE.md in full (beta)

- Before tagging: licensing, artifact hygiene, the Secret Gate over `v1.5.13..HEAD`, and the full release smoke.
- Watch the four workflows together.
- Upload the six server packages before every `latest*.yml`.
- Docker: `:beta` moves to 1.5.14-beta.1; `:latest` stays at 1.5.13, and its index holds exactly the two package digests.
- Publish it as a pre-release; GitHub Latest stays v1.5.13.
- A chip-type failure: `gh run rerun <run-id> --failed`. A published tag is never moved or deleted.

## Done when

- Published as a pre-release, with 4/4 workflows succeeded and 23 assets; the order held.
- The Docker tags are verified, and the tag is annotated with its release commit in personal.
- His words are in the release report.
- Archive and record copy in `/Users/normy/autobyteus_org/autobyteus-delivery-records/`.
- Full cleanup is done.
- Delivery Completed comes back to the Solution Designer with the verification commands.

## Route

- 2026-11-18: `Release Requested` → `/delivery_engineer`.
