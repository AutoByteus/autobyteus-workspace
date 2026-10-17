# User-directed follow-up — File Explorer pending-Save draft loss

2026-10-15; parent Task shared-network-workspaces /
project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces;
branch codex/shared-network-workspaces; source a3f65bfe6e7859a3167cb41013b80bc223385cfb.

## Explicit user disposition

The user directs us to KEEP the existing IR010 editor fix for the real peer-refresh
bug, and create a separate Project Task for the ADDITIONAL File Explorer bug found
in this review. They explicitly named /project_task_manager and clarified "for
this file editor bug actually". Continue the filesystem increment without growing
it into further editor work. This is not permission to call the additional bug
fixed, erase its failure evidence, drop the existing fix, or claim product Pass.

## Suggested Task

**Title:** Preserve later File Explorer edits when a pending Save completes.

**Problem:** In the normal asynchronous Save-and-continue-editing workflow, input
that returns to the previously committed text is incorrectly classified clean.
Completion of the earlier Save then silently replaces that newer input. A later
Save sends the earlier snapshot again. This is frontend draft loss, not NFS
committed-file corruption; it does not require NFS, another node or a peer write.

**Coherent goal / contract:** A user saves a checkpoint of a text file, then keeps
editing (including undo/revert) in the still-editable editor. Completion of the
submitted checkpoint must not silently overwrite subsequent input. Existing
AC010/BEH006 no-unsaved-overwrite integrity basis and the ordinary editable,
asynchronous Save lifecycle support the scenario independently of the probe.
This is not competing writers, auto-merge, repeated concurrent Save, or artificially
precise request timing. The controlled request in the test only exposes its
pending lifecycle; no production latency or frequency is asserted.

**Reproduction at component boundary:**
1. Open text with committed content `draft-a original`.
2. Type `saved checkpoint` and press Save; let its network request remain pending.
3. Continue editing back to `draft-a original` without another Save.
4. Resolve the earlier successful Save.
Expected visible editor: `draft-a original`; next Save must submit those bytes.
Observed visible editor: `saved checkpoint`; next Save submits that old snapshot.
Control: a later edit different from the old committed content is preserved.

**Source path:** Monaco update/save -> FileViewer -> FileExplorerTabs ->
fileExplorerContentActions.updateEditorDraft (line274 compares against old
file.content and deletes draft) -> pending _writeFileCore success (line317
replaces file.content) -> Tabs displayFileData (lines289–294) -> FileViewer/Monaco.
The final matching-draft clear at line336 cannot protect a draft already deleted.
Keep the correction bounded to the existing editor/store owner; no new merge,
filesystem, synchronization or durable-draft subsystem is requested.

**Independent evidence:** reviewer-only pending-save-probe.spec.ts, executed by
review-checks.py as a temporary colocated spec; pending-save-probe.log and
checks-result.json record 1Fail/1Pass, with before/after visible text and both Save
payloads. Real Tabs/FileViewer/Pinia store; Monaco and GraphQL are controlled
doubles. No live browser/NFS reproduction of this variant is claimed. The
22-file/148-test adjacent suite and both boundary guards pass. The original peer
regression is unchanged and passes after IR010. Temporary spec and owned scratch
were removed; no production or durable-test fix was made by the reviewer.

**Suggested acceptance:** retain later visible input and its subsequent Save
payload across completion of an earlier successful Save, including undo back to
old committed text and empty text. Preserve failed-Save drafts, ordinary clean
undo when no Save is pending, existing peer-refresh protection, clean-reader
refresh, preview/read-only behavior and workspace/path isolation. Add a durable
regression and proportionate actual-editor validation. No NFS/platform matrix
needed solely for this frontend fix.

**Priority suggestion:** Medium, user-work preservation. Task ownership/dispatch
belongs to Project Task Manager. User requests creation, not automatic execution
or a duplicate agent/team. This follow-up does not block the filesystem increment
under the user's explicit disposition; its failure remains real and unresolved.
