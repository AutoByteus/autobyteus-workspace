# Solution Handoff — Agent Org Draft Input Retention

## Result Classification

- Result: `Architecture Design Complete`
- Stable package identifier: `org-run-draft-input-retention`
- Current solution revision: `SR-003`
- Task size: `Medium`
- Architectural risk: `Low`
- Requirements status: `Approved`
- Exact approved requirements baseline: `SR-002`
- Approval reference: User explicitly replied `approve` on 2026-09-22 after confirming that all standalone Agent, Agent Team and Agent Org runs—new or existing—must retain unsent text and context-file selections across same-session navigation.
- Design status: `Ready`
- Handoff route: Direct implementation via `/software_engineering_team/implementation_engineer` because `task_size=Medium` and `architectural_risk=Low`.

## Original Request

The user reported that a new Agent Org member composer contained unsent text and one context file, but both disappeared after the user opened a member in another Agent Org and returned. Sent messages did not disappear. The user asked for root-cause analysis and whether standalone Agent or Agent Team had the same problem. The user later clarified the intended general product rule: users may switch among any new or existing Agent, Team or Org runs and return without retyping their unsent draft.

## Goal And Approved Scope

- Preserve unsent composer text and selected context attachments during the current application session for standalone Agent, Agent Team member and Agent Org member composers.
- Apply the rule to newly started and existing runs.
- Preserve exact run/root/member isolation.
- Preserve successful-send clearing, rejected-send restoration, newer-edit precedence, async captured attachment ownership, stop/continuation, recovery and sent-history behavior.
- Keep explicit successful archive/delete and application-session end as valid release boundaries.
- Verify standalone Agent and Agent Team behavior as required parity/regression surfaces.

## Out Of Scope / Constraints

- No persistence across reload, application/process restart, sign-out or another device.
- No context-file TTL extension; the current 24-hour draft-file cleanup remains.
- No backend API, schema, conversation-history, storage or migration change.
- No composer/navigation UI redesign.
- No separate draft cache, compatibility wrapper, dual path, identity fallback or legacy alias.
- No Product Design artifact is required; visible behavior is restoration of existing composer content only.

## Confirmed Root Cause

`AgentOrgWorkspaceView` calls `disconnectAgentOrg` on root change and unmount. The underlying `agentOrgContextsStore.disconnect` is a full release: it retires stream/inspection work and deletes the retained root context, errors and pending focus. Each member's unsent `requirement` and `contextFilePaths` live only on its exact in-memory `AgentContext`; reopening hydrates sent server conversation into new objects whose composer fields start empty. This explains why sent messages survive and drafts do not.

A disposable Vitest reproduction confirmed the exact loss. The probe was removed after execution. Related baseline suites passed: 5 files / 41 tests for view/shared composer behavior and 5 files / 82 tests for Org composer, attachment, recovery, inspection and termination invariants.

Current standalone Agent and Agent Team stores retain contexts across ordinary selection/view changes and do not share the defective view-unmount release path.

## Selected Architecture

The user's Agent Team analogy is correct at the lifecycle-invariant level:

- A selection/view change chooses which retained context is presented; it does not determine context lifetime.
- Keep opened Agent Org roots in the existing `agentOrgContextsStore.contexts` collection, just as Agent and Team roots remain in their central collections.
- Keep the existing per-member `AgentContext` as the sole draft authority.
- Keep existing Agent Org streams owned by the store during the session. Inactive/stop/recovery paths already retire or replace transport safely; verified publication already uses `adoptLocalContexts` to preserve exact member composer objects.
- Remove destructive cleanup from `AgentOrgWorkspaceView` root change/unmount.
- Remove `disconnectAgentOrg` from the active presentation facade.
- Clean-cut rename public store `disconnect` to an explicitly destructive release method (design name `releaseContext`) and use it only for successful archive/delete and test/session cleanup.
- Preserve current deferred-release, inspection invalidation, stream retirement and exact map deletion semantics inside that release owner.

Agent Org should not mechanically copy Agent Team internals: Org retains its existing strict root inspection, stream generation, recovery and exact-member adoption machinery.

## Intended Production Files

- `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue`
- `autobyteus-web/stores/activeContextStore.ts`
- `autobyteus-web/stores/agentOrgContextsStore.ts`
- `autobyteus-web/stores/runHistoryMutationActions.ts`
- Corresponding focused component/store/history/Org composer and context-file tests
- Existing Agent/Team context tests for explicit parity regression coverage

## Verification Expectations

1. Org A/member X: enter text and attach files; open Org B/member Y; optionally create a different draft; return to A/X and observe the exact original draft.
2. Navigate from an Org draft to standalone Agent, Agent Team, config and other workspace surfaces; return without loss.
3. Same-root member drafts remain independent.
4. Async upload completion stays on its captured exact owner across navigation.
5. New and existing standalone Agent/Team drafts remain retained and isolated.
6. Successful send, failed send, newer edits, stop/continue, recovery and sent-history hydration remain unchanged.
7. Successful archive/delete releases only the exact root; failed mutation does not release it.
8. Realistic browser validation reproduces the user's sequence after implementation.

## Canonical Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/design-spec.md`
- Solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/solution-revision-record.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention/tickets/in-progress/org-run-draft-input-retention/solution-handoff.md`
- Architecture review artifacts: `N/A — not applicable on the configured Medium/Low direct implementation route.`
- Product prototype/UI specification: `N/A — not applicable.`
- Implementation handoff: `N/A — owned by Implementation Engineer after implementation.`

## Evidence References

- User screenshots:
  - `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_68d55dcb2023__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_62d7b3dc8112__image.png`
  - `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_1cf835f9b4ef4c5b82b317a150e78aeb/software_engineering_team_e8336f4ba2e74322af0333baf0f7755a/solution_designer_c43502df79274c1a98837de4d0619151/context_files/ctx_132f5fd25b04__image.png`
- Relevant source/history/runtime evidence is indexed with exact paths, commits and commands in `investigation-notes.md`.

## Workspace And Finalization Context

- Isolated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-draft-input-retention`
- Branch: `codex/org-run-draft-input-retention`
- Refreshed base: `origin/personal`
- Base revision: `d883f5620a0abaed147209ad0e42a8960df70e68`
- Finalization target: `origin/personal`

## Risks And Escalation

- Session memory/active streams remain for opened roots; this matches existing Agent/Team behavior and ends through inactive/stop/release/session teardown.
- Existing verified `publish` + `adoptLocalContexts` must remain the only recovery mechanism for local composer identity.
- Escalate as Design Impact if implementation finds a new eviction policy, concurrency mechanism, persisted draft store, attachment-owner change or second draft authority is required.

## Blockers And Open Decisions

- Blockers: None.
- Requirements questions: None.
- Expected downstream output: Implement the Ready design, run focused and realistic regression validation, and produce the implementation-owned handoff package.
