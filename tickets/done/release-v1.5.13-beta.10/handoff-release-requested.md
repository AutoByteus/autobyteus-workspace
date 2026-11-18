# Release Requested: v1.5.13-beta.10 (autobyteus-529)

- Classification: `Release Requested` (no software change)
- Requested by: the founder ("Next beta please.", 2026-11-18), via `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-529 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Release kind: one beta (pre-release), the latest `origin/personal`, no picking; version `v1.5.13-beta.10` (previous `v1.5.13-beta.9`, tag object on `1fdca761aa`; no `v1.5.13-beta.10` tag on origin)
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.13-beta.10`, `codex/release-v1.5.13-beta.10`, from `origin/personal` at `0570c47fd9` (re-check before cutting; if personal moved, the beta is the newest personal)

## Content since beta.9 (first-parent merges on personal)

| Ticket | Merge | Notes draft |
| --- | --- | --- |
| autobyteus-520 (Docker release build: native arm64 per runner, registry cache) | `499a887e13` (via `3722dbb1d8`) | `tickets/done/server-docker-build-speed/` |
| autobyteus-515 (native tool search) | `aff573df37` | `tickets/done/native-tool-search-515/release-notes.md` |
| autobyteus-522 (phone Settings in every run's menu; fixes beta.9's wrong-agent save) | `f8221f8b97` | `tickets/done/phone-settings-every-run-522/release-notes.md` |
| autobyteus-524 round 1 (run_bash start limit 30 s) | `62b25e435e` | `tickets/done/native-follow-ups-524/release-notes.md` |
| autobyteus-448 part 2 ("Background task running") | `694ff9b357` | `tickets/done/background-task-restart-notice/release-notes.md` |
| autobyteus-493 (per-agent episodic catalog) | `49d3ea858d` | `tickets/done/per-agent-episodic-catalog/release-notes.md` |
| autobyteus-525 (phone-wide Text size in "On this phone") | `b91eb0ddaa` | `tickets/done/phone-text-size-home-525/release-notes.md` |

## The founder's gates (asked by the Solution Designer directly; his words recorded below)

1. **autobyteus-493 on his real memory:** the first start writes about 124 catalogs under `memory/episodic/` (about 12 s) and logs one warning per discovery for 3 old team runs whose tree is missing. His approval and a backup of his memory first (his standing rule), BEFORE he installs. Put it in "What you need to do". His memory folder: `~/.autobyteus/server-data/memory` (13 GB).
   - Answer (the founder to the Solution Designer, 2026-11-18): "Why do we need to backup first I don't understand please no need to backup". No backup; the catalog writes go ahead. "What you need to do" names the one-time catalog build (new files under `memory/episodic/` only, about 12 s, deletable, run folders unchanged) and the 3 log warnings, with no backup step.
2. **Stale smoke test** `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` (~line 291: the expected heading list lacks "## Long-Running Commands"; still so on `0570c47fd9`; follow-up autobyteus-517 item 1). His beta.9 waiver does not carry over.
   - Answer (the founder to the Solution Designer, 2026-11-18, after the explanation that the check's expected heading list lacks "Long-Running Commands" while the agents' instructions are right): "this release without a facing it and then create a follow-up and if the fix is extremely easy and just fix it". So: release beta.10 without the fix; this one assertion's failure is waived for beta.10 only (every other smoke case must pass, and any other failure goes back to the Solution Designer); the fix (one heading added to the expected list) is the follow-up autobyteus-517 item 1, which the Solution Designer asks the PM to do right after the release.
3. **Grok:** standing word only ("Waive grok if no usage limit anymore") for a Grok smoke case failing solely on a usage limit; anything else goes back to the founder through the Solution Designer.
4. **Apple:** check the developer agreement before cutting (beta.7's notarization was refused for a missing agreement).

## First real release on the new Docker workflow (autobyteus-520)

Check and report: Docker `:beta` moves to the new version, `:latest` unchanged; the version tag's image list has exactly the two digests the package jobs used; all six server package files on the release; every `latest*.yml` newer than those six. A chip-type failure: `gh run rerun <run-id> --failed`, never "Re-run all jobs". Report each job's real time against beta.9 (Docker 3 h) and beta.8 (39 min).

## Notes must state plainly (known issues)

- autobyteus-448 FU-002 (Task autobyteus-526): after a restart a restored native run numbers its next turn `turn_0001` again: the restart reminder card can show twice and the first reply after the restart can be hidden in the conversation view; the server data is right.
- The reminder shows its time in UTC; Codex, Grok and DeepSeek still show "Idle" with a background task (no live count); the desktop's small fixed-pixel text does not follow the Display font size (autobyteus-528).

## RELEASE.md in full

Secret gate; full smoke; notes start with "What you need to do"; the four workflows watched together; `latest*.yml` after the six server packages; `:beta` moves, `:latest` does not; a published tag is never moved or deleted.

## Done when

Published as a pre-release; four workflows succeeded; 23 assets; the order held; Docker tags verified; the tag annotated with its release commit in personal; the founder's decisions (his words) in the release report; archive and record copy in `/Users/normy/autobyteus_org/autobyteus-delivery-records/`; full cleanup (worktree, branches, tmp); Delivery Completed to the Solution Designer with the verification commands. Before he updates, he should see the Text size on a phone-size page: `/Users/normy/autobyteus_org/autobyteus-delivery-records/phone-text-size-home-525-20261118/screenshots/`.

## Route

- 2026-11-18: `Release Requested` → `/delivery_engineer` (handoff rule: Release Requested).
