# Handoff: release v1.5.14-beta.6 → Delivery (Release Requested)

- **Classification:** `Release Requested`. Merged work, with no software change. Rule → `/delivery_engineer`.
- **Task:** autobyteus-595 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; feeds 592).
- **Requested by:** `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The founder's word, relayed verbatim (2026-11-21): *"Yeah releaser ask the previous team which released that I mean did the Mac the iOS app just do the ask to release a beta"*. He asked that the team which released the iOS app, this team, cut a beta.
- **Worktree / branch / base:** `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.14-beta.6`, branch `codex/release-v1.5.14-beta.6`, from `origin/personal` `b768c503f9` (fetched 2026-11-21; 33 commits since `v1.5.14-beta.5`). Re-fetch before tagging; cut from the latest personal.

## The request

- **Release:** beta **`v1.5.14-beta.6`** (pre-release).
- **Included since beta.5:**
  - 594: the iOS app icon from the product logo (`ios-icon:build` / `ios-icon:check` in `release-ios.yml`), and `ITSAppUsesNonExemptEncryption` = false;
  - 583: the runtime hand-over notice names the newest closed journal file and asks the agent to read it completely;
  - 15: idle-aware automatic restart for managed Ubuntu desktops.

## Rules (the Task's standing release rules, plus RELEASE.md)

1. `RELEASE.md` end to end: the Secret Gate, and the pre-tag signing check with the process-only HTTPS rewrite for the `github.com-ryan` alias. Don't change the shared remote.
2. Full smoke.
   - **Grok:** waived only on a usage limit ("Waive grok if no usage limit anymore").
   - **Any other failure** needs the founder's explicit word, through me, or his own words recorded if he answers you directly.
3. Notes start with **`## What you need to do`**:
   - the new iPhone/iPad TestFlight build with the AutoByteus logo as its icon and export compliance declared, **TestFlight only; do NOT submit to App Store Review**;
   - the usual Docker and desktop lines.
   - Keep **one** `**Full Changelog**` line. beta.4 and beta.5 had two; avoid that here.
4. All four workflows green, the iOS TestFlight upload included.
   - **Report the exact new iOS build number** (`1.5.14 (NNN)`) from the upload log, so autobyteus-592 can select it.
   - Check the iOS log for the "Check the app icon against the logo" step and the upload's result. Note any App Store Connect message (ITMS-*), if present.
   - `latest*.yml` after the six server packages.
   - `:beta` → 1.5.14-beta.6; `:latest` stays 1.5.13.
   - Never move or delete a published tag.
5. Fast-forward the founder's checkout and report the sync line. Leave his uncommitted entries alone.
6. Cleanup (worktree, local/remote branches, `/tmp`) and a verified record copy in `autobyteus-delivery-records/`.

## Constraints

- Nothing to App Store review, and no reply to Apple (592 is separate, on the founder's word).
- No secrets in logs; keys only from `AUTOBYTEUS_TEST_VAULT`; smoke on isolated nodes.
- Never touch the Tailscale Serve entry on 443.

## Done when

The Task's "Done when" is met; return `Delivery Completed` to me with the iOS build number.

## Route record

Sent to `/delivery_engineer`, 2026-11-21.
