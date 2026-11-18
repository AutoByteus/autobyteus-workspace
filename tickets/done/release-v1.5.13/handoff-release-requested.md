# Release Requested: STABLE v1.5.13 (autobyteus-535)

- Classification: `Release Requested` (no software change)
- Requested by: the founder, via `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task autobyteus-535 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. His rule (2026-11-18): every release, beta or stable, is cut from the LATEST `origin/personal`, by the team that cut the last release; no ticket is picked or left out.
- Release kind: **stable** `v1.5.13` (GitHub Latest, not a pre-release). Previous stable `v1.5.12` (2026-11-09, `8338f97e59`); last beta `v1.5.13-beta.10` (`b1229d0430`).
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.13`, `codex/release-v1.5.13`, from `origin/personal` at `0ce426bc9f` (2026-11-18 12:54). Re-check before the cut: whatever is merged on personal when the cut starts is in. At 12:54 the interrupt fix (533), the cleanup (491) and the list of running agents (492) were not merged.

## The founder's words (asked by the Solution Designer directly, 2026-11-18)

1. **Content and cut time** (shown: the content summary since v1.5.12 below, "This is a stable release and cannot be rolled back…", "The cut: now, today at about 13:00, from whatever is on personal at that moment"): **"Okay let's just release the new stable now let's go"**.
2. **Docker `:beta`:** he asked "previously beta also always a point to the latest right"; answered: yes, `:beta` always moves with the newest tag, stable or beta (RELEASE.md line 303; v1.5.12 moved `:latest` and `:beta`); then his go above. So: `:latest` and `:beta` both move to 1.5.13, as the rules say.
3. **Smoke:** no waiver. The stale prompt-section test is fixed on personal (`f734aedc26`). Grok: only his standing word "Waive grok if no usage limit anymore", for a Grok case failing solely on a usage limit. Any other failure comes back to the Solution Designer for his words.
4. **App data:** the episodic catalogs on first start with no backup ("please no need to backup", 2026-11-18, recorded for beta.10).

## Content summary since v1.5.12 (for the notes; the curated notes cover everything)

Merges on personal since `v1.5.12` (47 first-parent merges; the betas' notes and each ticket's `tickets/done/*/release-notes.md` are the sources; the release records are in `/Users/normy/autobyteus_org/autobyteus-delivery-records/`):

- Phone:
  - Settings (runtime and model) in every run's menu, including task agents and task-team members;
  - one phone-wide Text size with three steps;
  - the readable conversation;
  - background tasks in Activity;
  - pinch-zoom in PDFs and images;
  - any node file opens read-only;
  - attached files open in the viewer.
- Agents:
  - per-agent semantic memory;
  - `search_memory` for every run;
  - per-agent episodic catalog (first start builds it);
  - `run_bash` in the background;
  - 2-hour shell commands for Claude;
  - native tool search;
  - "Background task running" for idle agents;
  - restart reminder;
  - running agents take new skills;
  - delegated runs outlive their delegator;
  - the Daily Assistant as an ordinary collaborator;
  - personal settings kept outside package files.
- Desktop and node:
  - open files refresh live;
  - Markdown and code wrapping;
  - heading links;
  - Memory Sync of large files;
  - large video uploads;
  - Claude thinking settings tell the truth;
  - Docker setup-code feedback;
  - the faster server Docker build;
  - node file open on desktop;
  - collaboration tree shows open Tasks only.
- Fixes since beta.10:
  - a restored native run's turn ids continue (no merged replies);
  - quitting no longer closes folder watches;
  - the prompt-section tests;
  - the phone Text size in three steps.

## The notes (RELEASE.md, stable)

- Curated, user-facing, ONE set for everything since v1.5.12. No internal ticket IDs, review rounds or file paths. Format `.github/release-notes/template.md`; sources `.github/release-notes/release-notes.md` and the tickets' `release-notes.md`.
- Start with `## What you need to do`, which says plainly:
  - this stable cannot be rolled back (app data is converted: delegated runs; the episodic catalogs are written on the first start, about 12 s);
  - Docker launcher users (corrected 2026-11-18 from the launcher's own help, `scripts/public/docker/autobyteus-docker.d/bash/core.sh:62-79`, after the founder's question): each node keeps its saved track. Nodes on `latest` (stable, the default) get 1.5.13 with a plain `autobyteus-docker upgrade --all` (or the in-place `autobyteus-docker update --all`). Nodes on `beta` get 1.5.13 with the same plain command and stay on the beta track. `autobyteus-docker upgrade --all --tag latest` only switches every node back to the stable track: safe now, because 1.5.13 is at least as new as every beta. Do NOT tell every user to run `--tag latest`: it would move beta users off their track.
- Known issues, stated plainly:
  - runs restored before the turn-id fix keep their already-merged older replies;
  - Codex, Grok and DeepSeek show Idle while a background task runs (no live count);
  - the desktop's small fixed-pixel text does not follow the Display font size;
  - the first start after the update writes the episodic catalogs (about 12 s).

## RELEASE.md in full (stable)

Do these in order, and keep to the rules:
- Apple: check the developer agreement before cutting (beta.7's notarization refusal).
- Checks before tagging, on the merged state: licensing, repository artifact hygiene, the Secret Gate over `v1.5.12..HEAD`, and the full release smoke.
- Watch the four workflows together: Android, iOS/TestFlight, Server Docker (the new native workflow) and Desktop.
- The six server packages before every `latest*.yml`.
- The stable tag becomes GitHub Latest.
- Docker: `1.5.13` = `latest` = `beta`, and the index holds exactly the two package digests.
- A chip-type failure: `gh run rerun <run-id> --failed`. A published tag is never moved or deleted.

## Done when

- Published as a stable (GitHub Latest, not a pre-release); all four workflows succeeded; the asset set is complete (23); the order held.
- The Docker tags are verified, and the tag is annotated with its release commit in personal.
- His words are recorded in the release report.
- Archive and record copy in `/Users/normy/autobyteus_org/autobyteus-delivery-records/`.
- Full cleanup: worktree, branches, tmp.
- `Delivery Completed` to the Solution Designer, with the verification commands and the final list of what the stable carries.

## Route

- 2026-11-18: `Release Requested` → `/delivery_engineer` (handoff rule: Release Requested).
