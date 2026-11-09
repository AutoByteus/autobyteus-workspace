# autobyteus-436 — Investigation Result (waiting for the user's decision)

- Package: `phone-registered-folders-436`, SR-001
- Status: requirements `Ready for Approval`; one decision for the user (DEC-001); no design or build yet (the Task: "building follows on his word")
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436`, `codex/phone-registered-folders-436`, `origin/personal` @ `b690a5dfdb`; finalization target `origin/personal`. Nothing committed; no source changed.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Documents: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `follow-ups.md`, `probes/abx436-phone-file-reach.probe.e2e.test.ts`, `evidence/PROBE-01-phone-file-reach.log` (all in `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-registered-folders-436/tickets/in-progress/phone-registered-folders-436/`)

## Original request and constraints

See the Task autobyteus-436 and its two comments of 2026-11-09 (the user prefers design A: a Settings list of folders the phone may open, added by hand on the desktop, once). Constraints: do not widen what a phone can read without the user's decision; no change to how teams make worktrees; no change to stored data; isolated tests; no secrets in logs; release only on the user's word.

## How it works today (evidence)

1. **The phone app** decides whether a file link opens: it opens only a path inside the active run's folder; anything else shows "This file is available only on the host workspace." (`autobyteus-web/composables/useEventMonitorFilePreview.ts:46-63`). Read.
2. **The node does not apply that rule.** Its file route serves any file inside any registered workspace (`autobyteus-server-ts/src/api/rest/workspaces.ts`). Any caller can register any existing folder as a workspace (`createWorkspace`). A phone credential passes both, and so does a device on the trusted network that sends **no credential at all**. Reproduced on an isolated node (PROBE-01): the phone registered a folder outside any run and read a file in it (200). The same worked with no credential (200). `../` out of a workspace was refused (400).
3. The phone app itself also lets the user type any folder for a new run, browse its files, and view and control the computer's desktop. A phone credential is already a window into the whole computer. This is the documented Phase One model (`autobyteus-server-ts/docs/features/remote_access.md`). Least-privilege phone authorization is planned ("Phase Two") but not built.
4. Docker node: it serves only paths inside its container (`/home/autobyteus/workspace`, `/home/autobyteus/shared`, its volumes). A host path such as `/Users/...` does not exist there. Each node needs its own list, of its own paths.

## Proposal (requirements, SR-001)

- Desktop Settings, phone area: a section "Folders the phone can open". The user adds `/Users/normy/autobyteus_org/autobyteus-worktrees` once. Every worktree created under it later opens, with nothing to do per worktree; a removed worktree just disappears.
- Only the desktop edits the list: an edit with a phone credential is refused.
- A listed folder that disappears stays listed and shows "Folder not found". Nothing is removed automatically.
- A listed folder is not a workspace: it is not in the chooser, Files tab, search or the Workspaces/Projects views, and it is never scanned.
- New message for other paths: "This file is outside this run's folder. To open it on your phone, add its folder in Settings on your computer."
- Design A rather than B: a Project's linked folders would give standalone runs nothing, and would give "linked folder" a second meaning. A works for every Project; a second Project adds its worktrees folder to the same list.

## Decision for the user (DEC-001)

- **Option 1, link rule (recommended), Medium:** the phone's file links open files in the run's folder and in the listed folders. The node's reach does not change: it already allowed more, so nothing is widened.
- **Option 2, also a node boundary, Large/High:** the node refuses a phone credential's reads outside those folders, and refuses registering an arbitrary folder from the phone. That removes the phone's "type any folder for a new run". It is still not a full boundary: desktop control, agents with tools and credential-less devices on the network remain.
- Recommendation: option 1 now. Make the real boundary its own Task (FU-001, urgent).

## Follow-ups

- FU-001 (urgent): phone and network authorization (Phase Two). Sent to `/project_task_manager` with this result.

## Route

`get_handoff_rules`: no rule matches an approval hold (all rules need `Architecture Design Complete`, `Release Requested` or a delivery receipt). The result goes to the user in the Solution Designer's conversation and to the delegating agent. Next: the user's answer to DEC-001 and his word to build; then approval recorded, architecture design, classification and routing.
