# autobyteus-436 — Architecture Design Complete (the phone opens any file read-only)

- Package: `phone-registered-folders-436`, SR-005; task_size `Medium`, architectural_risk `High`
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436`, `codex/phone-registered-folders-436`, `origin/personal` @ `34ea6e36bb` (on top of 437 slice 1, beta.9); finalization target `origin/personal`. Documents uncommitted; no source changed. Note from the PM: autobyteus-440 (Antigravity agy-project EEXIST fix) is merging on another copy; read `origin/personal` before touching memory or phone code.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user; Project Task `autobyteus-436` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`).

## Request and approval

- The user's word to build (2026-11-09): "Since the authentication [is] done now … we can work on the ticket for the files on the worktree, file display."
- The user's decision (2026-11-09, SR-004): no folder list; the phone opens any file a conversation names, read-only ("let's drop this limitation now just can just open any files now … read only").
- Design adds no visible behavior beyond the approved requirements; release only on the user's word.

## What to review

- `design-spec.md`: DS-001 (phone link → `openNodeFile` → `useMobileNodeFile` → authorized fetch) and DS-002 (`GET /rest/node-files/content?path=` → 437 gate (owner|phone) → `NodeFileReader`: absolute path, no `..`, real path, regular file → `sendUserFile`).
- Contract: `autobyteus-server-ts/docs/design/node_access_model.md` NAS-39, NAS-40 and §5 row (441 decides folder limits).

## Documents (`/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436/tickets/in-progress/phone-registered-folders-436/`)

`requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`; contract `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436/autobyteus-server-ts/docs/design/node_access_model.md`.

## Route

`get_handoff_rules`: `Architecture Design Complete`, architectural_risk High → `/software_engineering_team/architecture_reviewer`.
