Status: Design-ready
Scope: Small

# Problem

Switching focus between agent-team members currently loses unsent draft state from the agent input form. In the reproduced flow, a screenshot added under Solution Designer disappears after switching to another member and then back.

# Functional Requirements

1. The agent input draft state must remain isolated per agent run/member context.
2. Unsent `requirement` text and `contextFilePaths` must not be transferred to a newly focused member.
3. Reopening or refocusing an inactive team member from run history must preserve that member's unsent local draft state while still refreshing persisted conversation/config from history.
4. Switching to a different member must show that member's own draft state, not a globally shared buffer.

# Acceptance Criteria

1. If member A has an unsent requirement or screenshot and the user focuses member B, member A keeps that unsent draft and member B shows only member B's own draft.
2. If the user refocuses member A later, member A's prior unsent requirement and screenshots are still present locally.
3. If an inactive team member is reopened from run history while a local team context already exists, the member conversation/config/status can refresh from persisted history without clearing the stored unsent draft for matching member route keys.
4. The fix remains frontend-local; no backend persistence of unsent drafts is introduced.
5. Focused regression coverage proves:
   - focus switching no longer retargets drafts
   - inactive reopen keeps existing member draft text and context files
