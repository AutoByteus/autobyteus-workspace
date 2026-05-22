# Design Impact Rework: Lazy Historical Workspace Activation

Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/design-impact-rework-history-lazy-workspace.md`
Date: 2026-05-22
Status: Ready for architecture review

## Trigger

During delivery validation of the current-ticket packaged Electron build, the user observed that opening historical run rows was very slow. The user clarified this blocks release of the current ticket; it is not a follow-up.

## Finding

History-run opening currently requires eager workspace activation:

```text
openHistoricalRun
-> openAgentRun
-> loadRunContextHydrationPayload
-> ensureWorkspaceByRootPath(workspaceRootPath)
-> workspaceStore.createWorkspace / backend WorkspaceManager.createWorkspace
-> FileSystemWorkspace.initialize
-> buildWorkspaceDirectoryTree(1)
```

This is unnecessary for read-only history viewing because run history already stores `workspaceRootPath` in the resume metadata.

## Same-Ticket Design Decision

Fold lazy historical workspace activation into the current EBADF/file-explorer lifecycle ticket:

- Historical run viewing uses canonical `workspaceRootPath` and a cheap `WorkspaceReference`.
- Cheap reference resolution may derive deterministic `workspaceId` and display name but must not initialize `FileSystemWorkspace` or build file trees.
- Files, Terminal, resume/rerun, context picker, and similar actions explicitly activate/initialize workspace at their own action boundary.
- Missing/inaccessible workspace paths do not block viewing stored history; errors surface only for workspace-dependent actions.

## Updated Artifacts

- Requirements updated with UC-009 through UC-011, REQ-014 through REQ-023, and AC-016 through AC-026.
- Investigation notes updated with code-path evidence and root-cause refinement.
- Design spec updated with DS-008 and DS-009, workspace reference/activation ownership, removal plan, file mappings, dependency rules, interface mappings, migration sequence, and validation plan.
- Root-cause report updated with the same release-blocking refinement.

## Round 3 Design-Impact Revision

Architecture review round 3 accepted the lazy-history direction but required two concrete design additions before implementation rework:

1. `WorkspaceReference` must be integrated into the real run/team config and context data model.
2. Historical team/member hydration must be designed through its actual code path instead of covered only by a validation bullet.

Updated same-ticket target:

- `AgentRunConfig.workspaceId` and `TeamRunConfig.workspaceId` mean deterministic workspace reference id only; they are not proof of an initialized `WorkspaceInfo`.
- `AgentRunConfig` and `TeamRunConfig` carry `workspaceReference` as the root-path/display companion.
- `WorkspaceStore` owns `workspaceReferencesById`, activation state, `activeWorkspaceReference`, and initialized `workspaces`; `activeWorkspace` stays initialized-only.
- Historical team hydration splits live member activation from historical member shell/reference building.
- Team historical open builds `primaryWorkspaceReference` and `memberWorkspaceReferencesByRouteKey`; it does not call `ensureWorkspaceByRootPath()` for every member.
- Focused/sibling historical team projection hydration remains projection-only. Files/Terminal/context actions activate the focused member reference when the user actually requests workspace functionality.
