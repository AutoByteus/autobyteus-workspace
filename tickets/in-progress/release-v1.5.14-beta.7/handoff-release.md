# Handoff: release v1.5.14-beta.7 → Delivery (Release Requested)

- **Classification:** `Release Requested`. Merged work, with no software change. Rule → `/delivery_engineer`.
- **Task:** autobyteus-604 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`).
- **Requested by:** `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The founder's word, relayed verbatim (2026-11-22): *"I think we can create a new beta version now"*.
- **Worktree / branch / base:** `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.14-beta.7`, branch `codex/release-v1.5.14-beta.7`, from `origin/personal` `e5359c4bdf` (fetched 2026-11-22; 184 commits since `v1.5.14-beta.6`). Re-fetch before tagging; cut from the latest personal.
- **Base check (mine):**
  - `autobyteus-server-ts/docker/system-level.json` is level **2**, with base images default `sha256:86b7891d3d1d…` and zh `sha256:c381f2e82fc0…`;
  - Docker Hub's `autobyteus/chrome-vnc:1.4.2` and `:1.4.2-zh` have exactly those digests, each with amd64 and arm64.

## The request

- **Release:** beta **`v1.5.14-beta.7`** (pre-release).
- **Included since beta.6:**
  - 587: cross-node file transfer; `node` is required on every cross-node send;
  - 591: cross-node Task close and reopen;
  - 598: Docker System level 2, chrome-vnc 1.4.2, the VNC restart fix;
  - 22: running Teams follow their definition live;
  - 28: Linux arm64 AppImage on the static runtime;
  - 16: immediate restart for verified managed Ubuntu updates.

## Rules (the Task's standing release rules, plus RELEASE.md)

1. `RELEASE.md` end to end: the Secret Gate; the pre-tag signing check with the process-only HTTPS rewrite for the `github.com-ryan` alias (don't change the shared remote); the Docker system-level check.
2. Full smoke.
   - **Grok:** waived only on a usage limit ("Waive grok if no usage limit anymore").
   - **Any other failure** needs the founder's explicit word, through me, or his own words recorded if he answers you directly.
3. Notes start with **`## What you need to do`**, with exactly **one** `**Full Changelog**` line:
   - update paired nodes together (587 + 591); agents pass `node` on every cross-node send;
   - Docker: this release is **System level 2** (chrome-vnc 1.4.2, the VNC restart fix). Existing level-1 nodes must be recreated with `autobyteus-docker upgrade` (use the exact command RELEASE.md / the Docker README gives for a level change);
   - iPhone/iPad: a new TestFlight build, **TestFlight only; do NOT submit to App Store Review**. Report its build number.
4. All four workflows green.
   - `latest*.yml` after the six server packages.
   - `:beta` → 1.5.14-beta.7; `:latest` stays 1.5.13.
   - Check that the Docker images carry level 2.
   - Never move or delete a published tag.
5. Fast-forward the founder's checkout and report the sync line. Leave his uncommitted entries alone.
6. Cleanup (worktree, local/remote branches, `/tmp`) and a verified record copy in `autobyteus-delivery-records/`.

## Constraints

- Nothing to App Store review, and no reply to Apple.
- No secrets in logs; keys only from `AUTOBYTEUS_TEST_VAULT`; smoke on isolated nodes.
- Never touch the Tailscale Serve entry on 443.

## Done when

The Task's "Done when" is met; return `Delivery Completed` to me.

## Route record

Sent to `/delivery_engineer`, 2026-11-22.
