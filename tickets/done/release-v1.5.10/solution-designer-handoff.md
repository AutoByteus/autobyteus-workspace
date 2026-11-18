# Solution Designer Handoff: autobyteus-322 (release-v1.5.10)

- Result: `Release Requested` (no software change; no requirements, investigation or design for a release request)
- Package: `release-v1.5.10`, Project Task `autobyteus-322`
- Requested by: the user (2026-10-29), through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.10`, branch `codex/release-v1.5.10`, base `origin/personal` @ `5562fc73e6` (fetched with tags 2026-10-29)
- Release guide: `RELEASE.md` of the tagged revision

## The request

- Kind: **stable**. Version: **v1.5.10**, the next patch after the highest stable tag v1.5.9.
- From the Task (the user's request, written by the Project Task Manager): "Publish the next stable release, v1.5.10, from origin/personal, following RELEASE.md."
- Include: everything on personal since v1.5.9. That is only autobyteus-320, the web UI cleanup round, already shipped as beta v1.5.10-beta.1.
- Leave out: nothing named. Do not touch v1.5.9-beta.14 (a partial pre-release) or any published tag.

## Facts I verified (2026-10-29)

- `git log v1.5.10-beta.1..origin/personal` gives one commit, `5562fc73e6` (autobyteus-320's delivery record). `git diff --name-only v1.5.10-beta.1 origin/personal` lists only `tickets/done/web-ui-cleanup-round/release-deployment-report.md`; no file outside `tickets/` changed. So the code at the personal tip is the tested beta's code. The Task asks delivery to decide between the beta content and the tip; the evidence says they are the same software.
- The beta v1.5.10-beta.1 (tag `78c42e699a`):
  - GitHub pre-release with 17 assets;
  - Desktop `40747472691`, Android `40747472710`, iOS `40747472696` and Docker `40747472748` workflows all succeeded;
  - Docker `1.5.10-beta.1` = `:beta` (amd64/arm64), `:latest` still 1.5.9;
  - proven from a clean clone (autobyteus-320, verified in my receipt `/Users/normy/autobyteus_org/solution-designer-receipts/autobyteus-320-web-ui-cleanup-round-receipt.md`).
- Tag `v1.5.10` does not exist on the remote yet (`git ls-remote --tags origin v1.5.10` is empty).

## What the Task asks of the release

- Run the secret gate and the build-only release run before tagging (RELEASE.md).
- Curated user-facing notes in `.github/release-notes/release-notes.md` of the tagged revision.
  - What is new since v1.5.9, in plain words:
    - the Settings menu is text-only again (the decorative icons made visible in v1.5.9 are removed);
    - runtimes are named AutoByteus, Codex App Server, Claude Agent SDK, Antigravity CLI and Grok Build everywhere, in the app and in server texts to agents;
    - the Embedding settings card shows one "Waiting…" state;
    - the "Skill updated" card shows file paths literally;
    - Enter in the Depends-on picker chooses the first choosable Task;
    - Memory → Search has a voice input button.
  - The v1.5.9 rollback warnings carried forward briefly: there is no new migration or stored-data change since v1.5.9, so going back to a build before v1.5.9 is still not supported (Task titles, stored-name renames, the mcps.json backup, list_peer_nodes).
- Tag `v1.5.10`, which becomes GitHub Latest; Docker `:latest` moves; `:beta` moves as RELEASE.md says. Watch the four workflows.
- Verify:
  - GitHub Latest with 17 assets;
  - Desktop, Android, iOS and Docker workflows succeeded;
  - Docker `:1.5.10` and `:latest` exist for amd64 and arm64, and `:beta` is as RELEASE.md says.
- Archive the release report and clean up the worktree.
- Constraints: never move or delete a published tag; follow the secret gate; do not touch the user's nodes (he upgrades them himself with `autobyteus-docker upgrade --all --tag latest`) or his app; say plainly anything left partial.

## Route

Handoff rule "Release Requested" → `/software_engineering_team/delivery_engineer` (2026-10-29).
