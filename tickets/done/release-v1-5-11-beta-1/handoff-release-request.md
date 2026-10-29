# Handoff — Release Requested: v1.5.11-beta.1 (Project Task autobyteus-326)

- Result: `Release Requested`. This releases work that is already merged, with no software change, so there are no requirements, investigation or design documents.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user. User's request, 2026-10-29: release a beta for the smoke.
- Task: autobyteus-326 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. Name the key in every report.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1-5-11-beta-1`
- Branch: `codex/release-v1-5-11-beta-1`, created from `origin/personal` @ `5bde5a33493b56d9ff79a4327a544d9cf71beb4b` (fetched 2026-10-29 13:14Z)
- Ticket folder: `tickets/in-progress/release-v1-5-11-beta-1/` (this file only)
- Finalization target: `origin` / `personal`, as RELEASE.md describes (finalize branch, `--no-ff`, check that the target has not moved before each push)

## The request

- **Release kind:** Beta.
- **Version:** `v1.5.11-beta.1`. Checked 2026-10-29: `python3 scripts/release_versions.py next-beta` → `1.5.11-beta.1`; the highest stable tag is `v1.5.10`.
- **Content:** everything on `origin/personal`. First-parent history `v1.5.10..origin/personal` contains only the release smoke check: merge b681fc2e8c and docs 5bde5a3349. There is no product behavior change.
- **Short release notes:** the release smoke check is now part of every release; no product change. Pre-release tags use GitHub-generated notes (RELEASE.md).
- **Steps, all from RELEASE.md:** before the tag, run the secret gate, the build-only release run and the release smoke check. Then cut the beta, push the branch and the tag, watch all four workflows (Desktop, Android, iOS, Docker), and verify:
  - GitHub: a pre-release with 17 assets;
  - Docker: `:1.5.11-beta.1` and `:beta` exist, and `:latest` is unchanged (still 1.5.10).

## Release smoke: planning facts the delivery engineer needs

- **Codex:** the user's ChatGPT usage limit lasts until **2026-11-04 07:11Z**, so all 3 Codex cases will FAIL on usage. A tag before then needs the user's **explicit waiver of Codex for this beta**, asked directly in the user's conversation and recorded word for word in the release report (Task direction; RELEASE.md "Release smoke check"). The user's 2026-10-29 acceptance covered autobyteus-149's validation, not this release.
- **Grok — important for timing:** autobyteus-149 delivery ran the smoke twice today, at about **11:06Z and 13:01Z**, using about **480k of the 600k Grok tokens per rolling 24 h**. One smoke run needs about 150–240k, so a run before roughly **2026-10-30 11:06Z** will very likely hit Grok's 429 and fail Grok too. Plan **one** smoke run. Either:
  - run it after the first of today's runs drops out of Grok's 24-hour window (about 11:06Z on 2026-10-30), or
  - get the user's explicit decision to run now and waive Grok as well.

  Put this choice to the user together with the Codex waiver.
- Claude, Antigravity and AutoByteus are expected to pass; they passed on the merged code (DEL-03 of autobyteus-149).
- A signed-out or refreshing Grok is reported as "model not offered" (autobyteus-325, open, not part of this release). If that appears, run `grok models` to check before treating it as anything else.

## Constraints

- Never move or delete a published tag. `v1.5.9-beta.14` stays as a partial pre-release.
- Follow the secret gate.
- Do not touch the user's Docker nodes or his app.
- Say plainly anything left partial.

## Done when

- `v1.5.11-beta.1` is published as a pre-release with 17 assets, and the Desktop, Android, iOS and Docker workflows succeed.
- Docker `:1.5.11-beta.1` and `:beta` exist, and `:latest` is unchanged.
- The release report holds the per-runtime smoke result and the user's waiver answer(s).
- The report is archived and the worktree cleaned up.

## Related

autobyteus-149 (the smoke; archive `tickets/done/release-smoke-new-run-skill-links/`), autobyteus-325, autobyteus-322 (the last release), autobyteus-319.

## Route

- Handoff rules applied 2026-10-29: no rule covers `Release Requested`. The Task's direction names the collaborator ("The software engineering team's delivery engineer cuts it"), so this goes to `/software_engineering_team/delivery_engineer` under the skill's named-collaborator rule.
- Next expected action: the delivery engineer runs the release; afterwards, `Delivery Completed` comes back to the Solution Designer for receipt verification.
