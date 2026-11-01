# Delivery / Release / Deployment Report — release v1.5.11-beta.10 (autobyteus-362)

## Release / Publication / Deployment Scope

A release request (`Release Requested`): the user, 2026-11-01, "release a new beta please". No software change; docs sync, handoff summary and verification from evidence do not apply. The release guide's checks are the verification.

- Final tag: **`v1.5.11-beta.10`** (annotated) on commit `792a58b3d3` (`chore(release): bump workspace release version to 1.5.11-beta.10`, only `autobyteus-web/package.json`).
- Tip released: `origin/personal` **`746b2f5016`** (the tip verified by the checks and built by the build-only run), plus the version bump. `personal` did not move between the checks, the build-only run and the push; teams 318 and 358 had not merged.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `746b2f5016`.
- Deviations from the guide and why:
  - **Grok waived by the user** for this release (the guide's allowed exception): see Checks Before Tagging.
  - **Beta notes:** no carried ticket has a `## What you need to do` section. Two user actions were still collected under that heading above the generated notes:
    - autobyteus-285 (its notes say no action is needed; added at the Task's request): the update into this version still stops busy agents; message them to continue.
    - autobyteus-337: users who connected GitHub in an earlier beta must import the integrations repository on the new Integrations page and give the `github-integration` skill to their agents. These sat under its notes' `## Changed`, without the heading the rule collects; without them, beta users' agents would silently lose GitHub. Added in a second notes edit.
- Proposed guide fixes, and whether the user agreed: `None`.

## What The Tag Carries

`git log --merges --first-parent v1.5.11-beta.9..v1.5.11-beta.10` (`evidence/REL-04-tag-contents.log`, each confirmed an ancestor of the tag):

| Merge | Ticket |
| --- | --- |
| `ceda667fa7` | autobyteus-355: betas carry users' required actions; the release smoke check survives Grok model-list changes |
| `0295553657` | autobyteus-305 closure: ticket archived (steps 1–4 already shipped) |
| `4900dbae57` | autobyteus-345: smaller server package, frozen installs, bounded Windows staging |
| `8a7d91afd6` | autobyteus-357: ten code-quality leftovers, no behavior change |
| `cf0137dfae` | autobyteus-285: busy agents continue by themselves after an update restart |
| `fc3df20d11` | autobyteus-337: Integrations page |

autobyteus-353 (already in beta.9) has one record commit since, ticket files only.

## Checks Before Tagging

On `2e8fd1a6cf` = `origin/personal` `746b2f5016` plus this request's docs commit (`evidence/REL-01-pretag-checks.log`, `REL-02-release-smoke.log`, `REL-02b-release-smoke-second-run.log`, `REL-03-build-only-run.log`):

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: `Repository artifact hygiene check passed.`
- `scripts/check_secrets.sh v1.5.11-beta.9..HEAD`: `PASS (no secrets found)`, 94 commits.
- `pnpm install --frozen-lockfile` and server `prebuild`: exit 0.
- `python3 scripts/release_smoke.py`: 12/13 PASS. Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2, Grok 2/3; models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`. Grok's third case ("different same-named skill") was refused by its quota: `429 … subscription:free-usage-exhausted … tokens (actual/limit): 612927/600000` (rolling 24 h; the beta.8 and beta.9 smoke runs of 2026-10-31 were still in the window). Not a code failure.
  - **Runtime waiver, the user's words verbatim:** "Waive Grok for this release" (2026-11-01). Scope: Grok, v1.5.11-beta.10 only.
  - A second, unintended full run (`release_smoke.py --help`; the script has no help option) repeated the result: every runtime PASS except Grok, refused 3/3 by the same quota. Recorded in `REL-02b`.
- Build-only release run `41292724829` (`pnpm release:test --ref personal`) on `746b2f5016`: **success**, all five desktop targets, Publish skipped as designed.

## Version / Tag / Release Commit

- `python3 scripts/release_versions.py next-beta` → `1.5.11-beta.10`.
- `personal` re-fetched (still `746b2f5016`, no `v1.5.11-beta.10` tag), the untracked SDK `dist/` deleted and the evidence set aside so the tree was clean, then on `finalize/release-v1.5.11-beta.10` from `origin/personal`: `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.11-beta.10 --no-push` → commit `792a58b3d3`, annotated tag `v1.5.11-beta.10`.
- `personal` re-fetched (still `746b2f5016`), then `git push origin HEAD:personal` (`746b2f5016..792a58b3d3`) and `git push origin v1.5.11-beta.10` (09:45:48 UTC).

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Project Release Guide`.
- Pipelines (`evidence/REL-05-rollout.log`), watched together with a first-failure watcher, all **success**: Desktop Release `41294518487`, Android APK Release `41294518489`, iOS App Store Connect Release `41294518512`, Server Docker Release `41294518517` (last finished 10:23 UTC).
- Published artifacts:
  - GitHub release `v1.5.11-beta.10`: pre-release, not draft, **23/23 assets** (macOS ARM64/x64 `.dmg`/`.zip` with blockmaps, Linux x64/ARM64 AppImages, Windows `.exe`, four `latest*.yml`, Android APK and `.sha256`, six `autobyteus-server-1.5.11-beta.10-linux-{arm64,x64}.{tar.gz,json,json.sig}`). GitHub "Latest" remains `v1.5.10`.
  - Docker Hub `autobyteus/autobyteus-server`: `:1.5.11-beta.10` and `:beta` = `sha256:7f8bc579b282…`; `:latest` unchanged (`sha256:a1c22e2e4186…`).
- Beta notes (`RELEASE.md` § Beta notes with a user action): after all four workflows succeeded, `## What you need to do` (this ticket's `release-notes.md`, from autobyteus-285) was put above the generated notes with `gh release edit --notes-file`; the tag and assets did not change. Tickets whose actions were used: autobyteus-285 (from its note body, at the Task's request) and autobyteus-337 (from its `## Changed`, second edit). Neither had the heading. Others: none.
- Release/publication/deployment result: `Completed`

## What The User Should Check After Updating

- Desktop with **Settings > Updates > Receive beta updates** on: the app offers 1.5.11-beta.10. After installing, Settings > Updates shows 1.5.11-beta.10.
- **This update still stops agents that were busy** (the version being replaced, beta.9, cannot yet note them). Message them to continue. From the next update on, busy agents continue by themselves, each with one note in its chat.
- The **Integrations** page (autobyteus-337) is in the main menu. If GitHub was connected in an earlier beta: import `https://github.com/AutoByteus/autobyteus-integrations` there (the GitHub card should show as connected), and give the `github-integration` skill to the agents that use GitHub.
- Docker nodes: `autobyteus-docker upgrade --all --tag beta`, or **Nodes → Manage Nodes → Update to 1.5.11-beta.10** on nodes that support in-place updates; the node then reports 1.5.11-beta.10.

## Repository Finalization

- Release commit on `personal`: `792a58b3d3` (above).
- This request's records (`release/v1.5.11-beta.10`, with `origin/personal` merged in) are merged into `personal` after the rollout, and the folder is archived to `tickets/done/release-v1.5.11-beta.10/`.

## Recovery And Rollback

- Never move or delete the published tag. A problem in the tag's content is fixed on `personal` and shipped as the next beta.
- Rollback: desktop updates never downgrade; turning beta updates off waits for the next stable. Docker users pin an earlier version tag. The carried tickets change no stored data in a way an older build cannot read (285 writes one small file earlier versions ignore).

## Final Status

- Release guide checks complete: `Yes` (Grok waived by the user, verbatim above)
- Release complete: `Yes` — 4/4 workflows, 23/23 assets, `:beta` moved, `:latest` and GitHub "Latest" unchanged, beta notes carry the user actions (285, 337)
- Unresolved blocker: `None`
- Terminal package sent to the Solution Designer: `Yes`, after the records are pushed
