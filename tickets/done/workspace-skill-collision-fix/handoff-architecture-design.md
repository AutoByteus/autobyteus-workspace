# Handoff — Architecture Design Complete (SR-002)

- Package identifier: `workspace-skill-collision-fix` (Project Task `autobyteus-142`, requested by `/project_task_manager` for the user)
- Classification: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=Low` → independent architecture review (rule: Large or High → `/software_engineering_team/architecture_reviewer`)
- Current solution revision: `SR-002` (supersedes SR-001; the SR-001 handoff to implementation was put on hold by message)
- Approval: requirements `Approved` by the **User**, 2026-10-18: "Okay, restore it. Let's go restore it." / "We shouldn't do anything considering NFS right now." / "the design before the NFS change was actually the correct direction."
- Urgency: URGENT. v1.5.6-beta.2 blocks every Claude/Codex/Grok run of agents with configured skills. The user is on v1.5.6-beta.1 meanwhile. The fix ships as beta `v1.5.6-beta.4`, and the next stable must not carry the bug. Please review promptly; this is a restore of shipped beta.1 behavior.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix`
- Branch: `codex/workspace-skill-collision-fix`, base `origin/personal` @ `1c718202b2`. The worktree holds uncommitted SR-001 implementation changes from the implementation engineer; they are to be discarded (design step 1). Ticket docs are uncommitted.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/`
- Restore reference: tag `v1.5.6-beta.1`
- Finalization target: `origin/personal`; beta `v1.5.6-beta.4` per `RELEASE.md` (beta.3 was taken by autobyteus-136 and still has the bug). Merge/rebase onto current `origin/personal` (now `9de0828aaa`, includes `4964c61836`, `65cf41c6b4`) before release; no file overlap with the restore.

## Summary

The NFS extraction (`2448e166bd`, merged `55bff1f5ee`) switched Claude/Codex/Grok skill exposure on every workspace to the NFS-only private-profile path. That caused (1) "Workspace skill path collision" for any same-named workspace entry, including the user's links to the same skills, and (2) ENOENT for every brand-new run. In v1.5.5 and beta.1 the private path ran only on shared network workspaces, so effectively never.

Fix: restore the beta.1 workspace-link materializer path for Claude, Codex and Grok on all workspaces. Remove the NFS-only private skill path. Keep every non-skill NFS removal. Leave Antigravity and AutoByteus unchanged. Restore the beta.1 tests and add regression tests for the user's setup and for brand-new runs. The Restore Inventory and the Removal Plan are in the design spec.

## Constraints

- Restore exactly. beta.1 quirks are follow-ups, not corrections (DEC-103).
- No NFS concept in skill code. Do not reintroduce the deleted NFS non-skill files.
- Tests and checks use only test-owned workspaces and data, never the user's real workspaces or `.claude`/`.codex` folders.

## Follow-ups / Needs user

- F1 (Needs user, non-blocking): the same commit changed two local-workspace behaviors outside skills (resolver errors for registered workspaces; AutoByteus opening a registered workspace instead of using the temp fallback). They are kept for now, and the user decides later.
- F2–F6: listed in the design spec's Change Scope.

## Artifacts

- Requirements: `…/requirements-doc.md` (SR-002)
- Investigation notes: `…/investigation-notes.md` (History, SR-002 Evidence, Restore Inventory)
- Design spec: `…/design-spec.md` (SR-002)
- Solution revision record: `…/solution-revision-record.md`
- Prior review artifacts: none

## Route

- `get_handoff_rules` applied 2026-10-18 for SR-002: Large → `/software_engineering_team/architecture_reviewer`.
- Next expected action: architecture review. On pass, the reviewer routes to implementation per its rules.
