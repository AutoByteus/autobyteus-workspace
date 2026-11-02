# Handoff — stable-release-v1.5.11 (autobyteus-375) → delivery engineer: Release Requested

- From: Solution Designer, 2026-11-02. Task `autobyteus-375`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`,
  requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) at the user's
  word (2026-11-02: "use the same software engineering team to release the stable version").
- Classification: **Release Requested**. The work is already merged; there is no software change and nothing to
  design. Release only.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1.5.11`, branch
  `codex/stable-release-v1.5.11`, base `origin/personal` @ `c4788d81b5` (beta `v1.5.11-beta.12` = `260d4e3fc4`, plus
  one record commit). Teams may still merge into `personal`: release the tip you verify and name it in the report.

## The request (Task text, condensed; the full text is in the Task)
- Cut and publish stable **v1.5.11** from the newest tested beta, following `RELEASE.md` for a stable:
  - secret gate;
  - licensing and hygiene checks;
  - build-only desktop run on the merged state;
  - release smoke check;
  - curated user-facing notes (`tickets/done/<this ticket>/release-notes.md` → `.github/release-notes/release-notes.md`);
  - annotated tag;
  - Docker `:latest` moves with the stable.
- What it carries since v1.5.10 (2026-10-29), and what the curated notes must say to a user coming from v1.5.10, are
  listed in the Task. Facts are in the beta notes and the `release-notes.md` files under `tickets/done/`. In particular:
  - the first update from v1.5.10 will **not** resume busy agents (v1.5.10 has no recorder); after that, busy agents
    continue after an update restart;
  - update Docker nodes together with the desktop: the GraphQL names for the member runtime switch changed, and older
    clients break (no version compatibility);
  - GitHub: connect it through the new Integrations page. Users who connected it in an earlier beta import the
    AutoByteus integrations repository there and give the agents the github-integration skill. Agents set to "all
    installed skills" get access once it is connected;
  - rollback warnings as in the earlier stable notes: startup migrations of the stored runtime names in raw-trace
    manifests and of the vault; rolling back needs the backups the migrations made;
  - the new "Update automatically" switch is off by default. On macOS the restart comes about 36 s after the download.
- Never move or delete a published tag.
- Verify the tag, the assets, the four workflows, Docker `:latest` and `:1.5.11`, and that the release is GitHub "Latest".

## The user's decisions (relayed by the Solution Designer, who asks him)
- **Smoke waivers** (Grok, Codex): only on his explicit words, recorded verbatim. The Grok quota resets daily. Codex has
  had no proper confirmation since 2026-10-29.
- **Paid live suites** that autobyteus-318 repaired but did not run: the Claude real-e2e scenario, the claude-sdk-client
  and Claude backend-factory suites, eight live Claude harness files, and the Codex suites. Run them only if he says so.
- Until his answers arrive, do the free steps only.

## Done-when (from the Task)
- v1.5.11 is the GitHub "Latest" release, with all assets and curated notes.
- The four release workflows succeeded.
- Docker `:latest` and `:1.5.11` point to it.
- The delivery record is committed.
- The report names the tag, the revision released, and what the user should check after updating.
