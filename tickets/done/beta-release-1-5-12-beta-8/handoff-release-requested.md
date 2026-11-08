# Handoff — Release Requested: beta-release-1-5-12-beta-8

- Classification: `Release Requested`. A new beta of work already merged on `personal`; no software change. There is nothing to design: no requirements, investigation or design documents.
- Task: autobyteus-431 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, "Release the next beta (v1.5.12-beta.8): phone file fix (427), node update fix (412), security round (416), batch round 1 (426) and the rest merged since beta.7".
- Requested by: the user, through `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The user's words (2026-11-08): "we need a new beta now. If any runtime has token limit, I waive for that, we just need the new beta".
- From: Solution Designer, 2026-11-08.

## The request

- **Release kind:** beta pre-release from the base branch `personal`, following RELEASE.md as it is on `personal` now. The Task names it v1.5.12-beta.8; the release guide decides the exact version.
- **Include:** everything merged on `personal` since `v1.5.12-beta.7` (tag `84596c87b8`). The base is now `d785ded109`. Merges since beta.7:
  - autobyteus-427 (`ea3fbffc8e`): a file link in a conversation opens on the phone again.
  - autobyteus-412 (`f3079ff2f8`): a node card drops an automatic-update failure the node has passed; desktop updater files (`latest*.yml`) are published after the six server package files. **The new upload order shows for the first time on this tag:** run the createdAt check from RELEASE.md and report the result.
  - autobyteus-416 (`432f9b09b3`): security round. Nodes refuse requests addressed to a name that is not theirs (`AUTOBYTEUS_ALLOWED_HOSTS`), pages from other localhost ports are no longer trusted (`AUTOBYTEUS_ALLOWED_ORIGINS`), and every route that serves a user file sends a sandbox policy. Its release notes with "What you need to do" are ready: `/Users/normy/autobyteus_org/autobyteus-delivery-records/node-web-page-and-file-security-416-20261108/release-notes.md`.
  - autobyteus-426 round 1 (`a42dbca699`): phone and server small follow-ups. Round 2 is still being worked; do not wait for it.
  - autobyteus-425 (`6225a734a3`): records only (the APK install on the user's phone).
  - Records and docs, including RELEASE.md.
- **Leave out:** nothing named; do not wait for autobyteus-426 round 2.

## Smoke waiver, in the user's words (2026-11-08)

"If any runtime has token limit, I waive for that". Scope, as the PM recorded it:
- A runtime (Codex, Grok or any other) refused by its quota or token limit, for this release only.
- Anything else that fails is not waived.

## Constraints

- Follow RELEASE.md: no per-tag build-only run; triage every pipeline failure first; Beta notes with a user action; updater files after the server packages.
- Never move or delete a published tag. Docker `:beta` moves with the newest tag; `:latest` stays on the stable (v1.5.11).
- The release notes must carry 416's user actions (`AUTOBYTEUS_ALLOWED_HOSTS`, `AUTOBYTEUS_ALLOWED_ORIGINS`) and say clearly that nodes should be updated.
- The user's Docker nodes stay as they are. Tell me when the new `:beta` image is published; I pass it to the PM, and the PM or the user updates them.
- Clean up everything you create: worktrees, branches, test app instances, temp files.

## Done when

- The beta tag, the GitHub pre-release with all assets, the workflows and Docker `:beta` are published and verified.
- The notes carry the user actions.
- The delivery record is on the base branch, and cleanup is done.
- You return Delivery Completed to the Solution Designer; it verifies and reports to the PM.

## Workspace

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/beta-release-1-5-12-beta-8`, branch `codex/beta-release-1-5-12-beta-8`, base `origin/personal` @ `d785ded109` (fetched 2026-11-08 with tags). The worktree holds only this handoff file. Use RELEASE.md's finalize-branch procedure.
