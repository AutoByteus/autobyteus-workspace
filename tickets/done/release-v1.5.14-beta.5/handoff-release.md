# Handoff: release v1.5.14-beta.5 → Delivery (Release Requested)

- **Classification:** `Release Requested`. Merged work, with no software change. Rule → `/delivery_engineer`.
- **Task:** autobyteus-589 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`).
- **Requested by:** `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The founder's word, relayed verbatim (2026-11-21): *"Anyway I think that IOS a problem is fixed right we can release a new version now"*.
- **Worktree / branch / base:** `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.14-beta.5`, branch `codex/release-v1.5.14-beta.5`, from `origin/personal` `9dea98fb83` (fetched 2026-11-21; 20 commits since `v1.5.14-beta.4`). Re-fetch before tagging; cut from the latest personal.
- **Base check:** 584's fix is in the base. `demo/graphql/unreachable-operations.json:27,138,146,154` lists the four memory operations, and `ListAgentRunsWithMemory` is gone. Its build-only iOS run on `codex/ios-demo-operation-coverage` succeeded (2026-11-21T07:37Z).

## The request

- **Release:** beta **`v1.5.14-beta.5`** (pre-release).
- **Included since beta.4:**
  - 584 (iOS demo operation coverage plus the local check);
  - 561 (Antigravity Work Journal rendering, renderer revision 4: existing journals re-render once; 60 s in-process hook timeout);
  - the iOS carry-over: the first TestFlight build with Xcode 27 / iOS 27 SDK (571) and Demo Mode (279).

## Rules (the Task's standing release rules, plus RELEASE.md)

1. `RELEASE.md` end to end: the Secret Gate, and the pre-tag signing check with beta.4's process-only HTTPS rewrite for the `github.com-ryan` alias. Don't change the shared remote.
2. Full smoke.
   - **Grok:** waived only on a usage limit ("Waive grok if no usage limit anymore").
   - **Any other failure, including timeouts,** needs the founder's explicit word. beta.4's "Waive for grok" was for beta.4 only. Ask me, or record his own words if he answers you directly.
3. Notes start with **`## What you need to do`**:
   - iPhone/iPad: a new TestFlight build made with Xcode 27 / iOS 27 SDK. **TestFlight only; do NOT submit to App Store Review.**
   - Users updating from beta.3 or earlier: update the app and every paired/Docker node together (554 + 565; no migration).
   - Existing Work Journals re-render once (561, revision 4).
4. All four workflows green, **the iOS TestFlight upload included**.
   - `latest*.yml` after the six server packages.
   - `:beta` → 1.5.14-beta.5; `:latest` stays 1.5.13.
   - Never move or delete a published tag.
5. Fast-forward the founder's checkout and report the sync line. Leave his uncommitted entries alone.
6. Cleanup (worktree, local/remote branches, `/tmp`) and a verified record copy in `autobyteus-delivery-records/`.

## Constraints

- Nothing to App Store review, and no reply to Apple; TestFlight only.
- No secrets in logs; keys only from `AUTOBYTEUS_TEST_VAULT`; smoke on isolated nodes.
- Never touch the Tailscale Serve entry on 443.

## Done when

The Task's "Done when" is met; return `Delivery Completed` to me.

## Route record

Sent to `/delivery_engineer`, 2026-11-21.
