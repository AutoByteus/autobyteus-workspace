# Handoff: release v1.5.14-beta.4 → Delivery (Release Requested)

- **Classification:** `Release Requested`. Release work that is already merged, with no software change. Rule → `/delivery_engineer`.
- **Task:** autobyteus-582 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`).
- **Requested by:** `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The founder's word, relayed verbatim (2026-11-21): *"Let's first the release on new version a new beta"*.
- **Worktree / branch / base:** `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.14-beta.4`, branch `codex/release-v1.5.14-beta.4`, from `origin/personal` `a07767f4d0` (fetched 2026-11-21). 165 commits since `v1.5.14-beta.3`. Re-fetch before tagging: the release is cut from the **latest** `origin/personal`.

## The request (Task text, verbatim where quoted)

- **Release:** beta **`v1.5.14-beta.4`** (pre-release), from the latest `origin/personal`.
- **Included since beta.3:**
  - 571: Xcode 27 / iOS 27 SDK, clears ITMS-90725;
  - 526 round 2;
  - 568;
  - 565: the Messages view; cross-node messages carry addresses;
  - 517 round 3: Grok self-started turns, ACP wire order;
  - 564 / 11: desktop signing custody, pre-tag trust checks;
  - 572: phone media progress and Retry;
  - 12: managed Ubuntu icon and window grouping;
  - 554 + 576: semantic memory for every agent, the global semantic folder, the owner-based Memory page, FU-002/003/005–009.

## Rules (the Task's standing release rules, plus RELEASE.md)

1. Follow `RELEASE.md` end to end, including the Secret Gate and the pre-tag desktop signing check.
2. Full smoke across all runtimes.
   - **Grok:** waive only on a usage-limit failure (the founder: "Waive grok if no usage limit anymore"). Any other failure needs the founder's explicit word before proceeding; return it to me and I will ask him.
3. Release notes start with **`## What you need to do`**:
   - the desktop/mobile app and every paired/Docker node must update together (GraphQL clean cut in 554, cross-node addresses in 565; no data migration);
   - a new iOS TestFlight build made with Xcode 27 / iOS 27 SDK. **TestFlight only; do NOT submit to App Store Review.**
4. Watch all four release workflows (Desktop, Server Docker, Android, iOS) to completion.
   - Verify `latest*.yml` after the six server packages.
   - Docker `:beta` moves to `1.5.14-beta.4`; `:latest` stays on `1.5.13`.
   - Never move or delete a published tag.
5. Fast-forward the founder's checkout (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`: `git fetch` + `git merge --ff-only`) and report the sync line. Leave his uncommitted entries alone.
6. Clean up the worktree, local/remote release branches and `/tmp` scratch. Save a verified record copy in `/Users/normy/autobyteus_org/autobyteus-delivery-records/`.

## Standing constraints

- The beta's iOS run uploads to TestFlight, which the founder's release word covers. Nothing goes to App Store review, and there is no reply to Apple.
- No secrets in logs. Keys come only from `AUTOBYTEUS_TEST_VAULT` (never `.env` or the environment). Smoke on isolated nodes.
- Never change the Tailscale Serve entry on 443.

## Done when (Task)

- The tag is published as a Pre-release with all expected assets.
- All four workflows are green.
- Docker `:beta` is updated and `:latest` unchanged.
- The iOS build is in TestFlight (no review).
- The release record is on `origin/personal`.
- The founder's checkout is fast-forwarded, cleanup is done, and follow-ups are recorded.
- Return `Delivery Completed` to me.

## Route record

Sent to `/delivery_engineer`, 2026-11-21.
