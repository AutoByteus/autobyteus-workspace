# Stable v1.5.6 — Solution Designer handoff to Delivery Engineer

- Package: `stable-release-v1-5-6`; Project Task `project_task_784234fc-e6b8-43db-8f87-94e4a4757b13`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's request of 2026-10-19 ("we have done many beta. now could release stable version now right?")
- Result: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low`, current SR-002. Route: the user named the Delivery Engineer ("just send to dleiver engineer to do a stable release please", 2026-10-19). No implementation, architecture review or code review: there is no code change.
- Release decision: **Stable `v1.5.6`**, decided by the user.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6`, branch `codex/stable-release-v1-5-6` (local, not pushed), base `origin/personal` @ `69d7d4f3e643f770b172e565c2d88572f42ded65`
- Ticket folder: `tickets/in-progress/stable-release-v1-5-6/` (archive to `tickets/done/` as usual)
- Finalization target: `origin` / `personal`
- The shared checkout (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`) is behind and holds other owners' dirty files; do not use it.

## What to do (RELEASE.md stable path; details in design-spec.md, Change / Refactor Sequence)

1. Archive the ticket, branch `finalize/stable-release-v1-5-6` from freshly fetched `origin/personal`, merge `codex/stable-release-v1-5-6` with `--no-ff`.
2. Confirm product content equals beta.11: `git diff --stat v1.5.6-beta.11 HEAD -- . ':!tickets'` is empty. If not, stop and ask (REQ-002).
3. Pre-tag checks: licensing, artifact hygiene, `release_versions.py android-version-code 1.5.6`.
4. `bash scripts/desktop-release.sh release 1.5.6 --release-notes tickets/done/stable-release-v1-5-6/release-notes.md --branch finalize/stable-release-v1-5-6 --no-push`; fetch-check; push personal; push `v1.5.6`.
5. Watch all four workflows; verify and record.
6. Merge the delivery record to personal; remove the worktree and both branches.

## Done when (acceptance criteria in requirements-doc.md)

- AC-001: `v1.5.6` non-prerelease, GitHub Latest, 17 assets
- AC-002: Desktop, Android, iOS, Server Docker workflows `success` on the tag
- AC-003: `v1.5.6` differs from beta.11 only in `tickets/`, the version bump and `.github/release-notes/release-notes.md`; tag is an ancestor of origin/personal
- AC-004/AC-005: release body equals the approved `release-notes.md` (backup, one-way conversion, no-rollback with the GitHub Issues pointer, update-together, Docker channels)
- AC-006: Docker `:1.5.6`, `:latest`, `:beta` same digest, linux/amd64 and linux/arm64
- AC-007: `latest*.yml` updater metadata at 1.5.6; Android `.sha256` present
- AC-008: delivery record merged; worktree and branches cleaned up

Report how each point was verified. The user's own update check on a real install is his to do afterward; it is not a delivery gate.

## Decisions (user, 2026-10-19)

- F1 of autobyteus-142 kept (no revert); mentioned in the notes under Improvements.
- Support pointer: https://github.com/AutoByteus/autobyteus-workspace/issues
- No extra beta checks before the stable.

## Constraints

- Never move or delete a published tag. A tag-content failure → fix on personal and cut `1.5.7`; transient failure → rerun failed jobs only (RELEASE.md Recovery).
- Excluded and not waited for: autobyteus-146, -149, -181, -180, -53, the test vault, cross-node.
- No product, workflow, script or RELEASE.md changes. Editorial fixes to the notes are fine; content changes come back to Solution Designer.
- Do not upgrade the user's installs or nodes.

## Open risks

- One-way data conversion: a faulty stable is fixed forward (RSK-001).
- Mixed desktop/node versions are unsupported (RSK-002); the notes say so.

## Expected return

`Delivery Completed` to Solution Designer with the archived ticket folder path, release URL, workflow run IDs, asset list, Docker manifest digests, finalization commits and cleanup state.

## Documents

- `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/investigation-notes.md` (merged-change inventory since v1.5.5)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/stable-release-v1-5-6/tickets/in-progress/stable-release-v1-5-6/release-notes.md` (approved curated notes)
- Architecture review, implementation, code review, API/E2E artifacts: `N/A — not applicable` (no code change).

## Route record

`get_handoff_rules` returned: architecture review (Large/High), implementation (Small/Medium + Low) and delivery receipt gap. By classification the implementation rule would match, but there is nothing to implement and the user explicitly named the Delivery Engineer. Applied the user's named collaborator: one `send_message_to` to `/software_engineering_team/delivery_engineer`. No other recipients.
