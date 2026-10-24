# Architecture Design Complete — nfs-guide-install-commands, R2

## Identity / direction
Task **autobyteus-254** / `project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3`, requested by `/project_task_manager` run `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`. Existing Task explicitly reopened Oct24; not a new NFS task. User: “remove the redundant links here ... dispatch to the same worker which earlier worked on this ticket.” PM and screenshots specify only “View release downloads” and “Review the pinned installer script” below installation cards.

**R2/SR-003 Approved; SR-004 Ready; Small / Low; Architecture Design Complete.** Requirements approved within direction, user informed. No Needs user decision, prerequisite, Product artifact or new follow-up. Implementation/validation for this delta not yet done.

## Authoring / preservation
- **Worktree:** /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2
- **Branch:** codex/nfs-guide-install-commands-r2
- **Fresh base:** origin/personal 8b34e8ae108a281b0c93c679c60883df28a30773; finalization origin/personal per RELEASE.md. No release requested.
- **Canonical active ticket:** /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2/tickets/in-progress/nfs-guide-install-commands
- Original task delivered at ca1f09e52a71e061fce36b04288e5495fc2356e7. Existing archive moved byte-preserving (except own current docs) to in-progress in this NEW worktree for authorized reopen; prior other-owner reports/evidence are historical, not current readiness.
- Preserve old detached worktree /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands at 6d90a825feae66f4c397924370562a271da722a0; canonical dirty superrepo/PM boards and NFS repo untouched. No dependencies, runtime, browser, installer or live storage action started by Solution Designer. Only new worktree/branch and ticket documentation authored.

## Design to implement
Remove only NfsGuideCard.vue anchors at current base lines31–32. Keep advanced README link line54, all nine cards/Copy buttons, existing exact command strings and all remaining guidance. Local downloadUrl computed also controls version paragraph: replace with explicit hasAvailableInstaller boolean derived from any validated command, preserving version visibility for partial data; keep allAvailable separate. **Do not remove descriptor.downloadUrl validation or change the command helper.**
Delete just the two obsolete label keys from English/Chinese; clarify review reminder via URL already displayed in command. Update focused component expectations (remaining link exact, partial/invalid version behavior, both locales) and stale guide-doc link-state sentence. Current design-spec lists exact paths/consumers and boundaries. No broad cleanup, new architecture, CSS-hidden legacy links or relocated substitutes.

## Constraints / verification intent
Copy-only application UI revision. No NFS source/installer/release/field changes; no app-node/UUID/launcher coupling; no shared/workspace skill edit; no Docker change, links elsewhere, version/tag/deployment, mandatory user check or live execution. Existing autobyteus-nfs-4 remains separate.
Current helper/component/test/docs equal original completed source; catalogs contain unrelated later additions to preserve. Static code + user screenshots fully establish removal premise; no new execution verdict claimed. Focused component/command/localization checks plus affected real browser layout/copy journey under current TESTING.md; impact-plan against current base and preserve original failures/results. No need to repeat NFS/installer qualification or previous 36 clipboard samples merely as a ritual.

## Expected next output
Implementation Engineer implements this approved bounded revision and owns implementation checks; then configured executable validation and Delivery. Append new rounds in existing owner histories without rewriting original round results. Finalize freshly on origin/personal and clean owned resources, leaving old retained receipt checkout intact. Return only genuine requirement/design expansion to Solution Designer.

## Own documents (all absolute)
- /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2/tickets/in-progress/nfs-guide-install-commands/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2/tickets/in-progress/nfs-guide-install-commands/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2/tickets/in-progress/nfs-guide-install-commands/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2/tickets/in-progress/nfs-guide-install-commands/solution-revision-record.md
- This handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2/tickets/in-progress/nfs-guide-install-commands/solution-design-handoff.md

Two supplied current screenshots identify exact removals; attach these, not the entire historical evidence chain. Prior terminal receipt and old owner reports remain linked in investigation/ticket for reference. No outstanding solution gaps; downstream evidence required before closing again.

## Route
Fresh `get_handoff_rules` on 2026-10-24 selected its Architecture Design Complete + Small/Medium + Low rule: **/software_engineering_team/implementation_engineer**, direct implementation. Large/High review and delivery-receipt-gap rules do not match. Independent architecture/source review N/A—not selected; implementation self-checks and executable API validation remain required. Only this primary recipient; no duplicate PM/API/Delivery dispatch.

Pre-handoff document audit: all 107 other-owner/history files moved byte-identically from the base archive; only ticket paths changed; staged/working whitespace checks passed. No current product test or completion claim.
