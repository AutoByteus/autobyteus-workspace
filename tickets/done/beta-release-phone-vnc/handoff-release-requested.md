# Handoff — Release Requested: autobyteus-419

- Classification: `Release Requested` (release of work already merged; no software change; no requirements or design by the Solution Designer)
- Task: autobyteus-419 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), "Release the next beta (v1.5.12-beta.6): the phone VNC viewer (407), the Android rotation fix (415) and the Origin and phone-route guard (403)"
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The user's words (2026-11-07, quoted by the PM): "lets go" to the PM's proposal of a beta carrying the phone VNC viewer, the rotation fix and the security work, so he can try the VNC viewer on his phone.
- Release kind: **beta pre-release**; expected version `v1.5.12-beta.6` (latest beta `v1.5.12-beta.5`, latest stable `v1.5.11`) — the delivery engineer confirms the version per RELEASE.md.

## What is included (on `origin/personal`)

- autobyteus-407 (S3, merge `eafc34b185`): node desktop on the phone and in a desktop browser. Release notes with a user action ("update the Docker node") at `tickets/done/node-desktop-on-phone/release-notes.md`.
- autobyteus-415 (merge `9d5da23341`): the Android app keeps its page on rotation (no user action).
- autobyteus-403 (merge `6f69dfb52d`): Origin check for browser requests on every node; a phone credential opens only phone routes. Its `release-notes.md` has ONE user action: a gateway that rewrites Host without sending X-Forwarded-Host needs `AUTOBYTEUS_ALLOWED_ORIGINS`.
- The 402 launcher change (already served from `personal`), records, RELEASE.md/DESIGN.md changes.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/beta-release-phone-vnc`, branch `codex/beta-release-phone-vnc`, base `origin/personal` @ `ff68bfb5fa14b4849acc317371575b349ae8a1dd` (fetched 2026-11-07 with tags). Release from the base per RELEASE.md (its finalize-branch procedure).

## Constraints from the Task and the user's rules

- Follow RELEASE.md as it is on `personal` now (no per-tag build-only run; triage every pipeline failure first; beta notes with the user actions — 403's gateway action and 407's "update the Docker node").
- Never move or delete a published tag. Docker `:beta` moves with the newest tag; `:latest` stays on the stable.
- The Android APK is part of the release; the user will install it on his phone.
- Smoke waiver (Codex, Grok quota) only in the user's own words at release time — ask him (Codex's account quota holds until 2026-11-10; Grok's free tier is limited).
- The user's Docker nodes stay as they are; he updates them himself. Tell the PM when the new `:beta` image is published.
- Clean up everything created (worktrees, branches, test app instances, temp files).

## Done when

The beta tag, the GitHub pre-release with all assets, the workflows and Docker `:beta` are published and verified; the notes carry the user actions; the delivery record is on `personal`; cleanup done. Return `Delivery Completed` to the Solution Designer.
