# Investigation Notes — agent-initiated-collaborators

## Bootstrap
- **Package:** `agent-initiated-collaborators`.
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators`, branch
  `codex/agent-initiated-collaborators`.
- **Base:** `origin/personal` @ `84224a58d` (fetched 2026-10-01; includes the released `cross-scope-agent-mentions`,
  v1.4.92-beta.5, and the AGY beta.6 release). Finalization target: `personal`.
- **Predecessor package (read-only):** `tickets/done/cross-scope-agent-mentions/` on `personal`.

## Origin of the request (conversation, 2026-10-01)
- The user wants a standalone "project manager" agent to plan work and hand tasks to shared teams, possibly in
  parallel. It should not need an AgentOrg or a manual `@` for each one.
- Decisions reached with the user:
  1. A new opt-in tool `list_available_agents`, selected per agent like any other tool or MCP tool. It is not
     mandatory and not always on.
  2. `send_message_to(address)` means "the one instance at this address, brought in on first use". By run ID it only
     reaches an existing instance.
  3. `delegate_task(address)` always starts a new copy, now also for listed agents.
  4. A team instance is one unit: messages from inside it to addresses inside its own team stay inside that instance,
     however the instance was created.
  5. Anyone in the run may do this.
  6. No global switch and no limit on copies.
  7. Org runs get the same behavior.
  8. `@` and agent-initiated bringing-in are the same thing with a different trigger. Option (a): the list tool
     controls discovery only, and no extra permission check is added.

## Current-state evidence (base `84224a58d`)
- **E-01, collaborator admission.** One shared admission (`agent-collaboration/collaborators/collaborator-mention-admission.ts`):
  policy check, runnability validation (`RunModelSelectionValidator`), identity allocation, one tree write, Offline
  hosting, `COLLABORATOR_ADDED`. Today it is triggered only by user `SEND_MESSAGE` with `mentions`, through
  `Root.admitCollaboratorMentions` in the Team, Org and Agent roots.
- **E-02, candidate policy.** `collaborator-candidate-policy.ts` has `listCandidates(port)` and `requireAdmissible(port,
  mention)`. Shared standalone Agent and Team definitions only. Excluded: Orgs, Daily Assistant, internal built-ins,
  non-shared and application-owned definitions, and in-run definitions. Used by GraphQL `collaboratorMentionCandidates`.
- **E-03, message resolution.**
  - `TeamExecutionIndex.getMessagePlacement` checks, in order: a configured member, a collaborator Agent, a collaborator
    Team (to its coordinator), then a collaborator Team member. **Task-copy members are not in the address index.**
  - The Org and Agent roots have equivalent resolvers. Otherwise `COLLABORATION_TARGET_NOT_FOUND`.
- **E-04, delegation resolution.** `resolveDelegationPlacement` covers configured members, then collaborators (extra
  copy). A catalog definition that is not in the run cannot be delegated to.
- **E-05, team-instance addressing gap** (pre-existing, recorded as E-20 in the predecessor).
  - A delegated task-Team copy keeps its team-local handoffs. `get_handoff_rules` returns
    `/<team>/<member>`.
  - Resolution is run-wide, not sender-instance-relative.
  - Team or Agent root: the copy's own teammate is not found.
  - Org root, where the team is mounted: the message goes to the **mounted (configured) team's** member, not the copy's.
  - `TeamExecutionIndex` already records `containingTeamRunId` and has `listTeamAncestorsDeepestFirst`, so a resolver can
    determine the sender's own team instance.
- **E-06, opt-in tool precedent.** `publish_artifacts`:
  - registered in `defaultToolRegistry` (`agent-tools/published-artifacts/publish-artifacts-tool.ts`), so it appears in
    the tool catalog and picker;
  - exposed through `runtime-agent-tool-exposure.ts` (`publishArtifactsEnabled`) when the definition's `toolNames` include it;
  - for Codex and Claude, through an Agent Tools MCP adapter provider (`publish-artifacts-mcp-adapter-provider.ts`).

  `list_available_agents` can follow the same path.
- **E-07, tool contracts.** `send_message_to` and `delegate_task` descriptions and the shared prompt
  (`agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`, the standalone instruction) describe
  `send_message_to` as reaching an already existing execution. That wording was approved in
  `send-message-delegate-task-semantics` (REQ-001). The user has now approved changing the meaning.

## Material facts for design (architecture phase)
- A copy delegated to a catalog definition that is not in the run needs a persisted source (definition and settings
  snapshot) for restore. Today task-copy sources come from configured nodes or collaborator entries.
- Addresses of not-yet-added catalog entries must be computed deterministically from the catalog and the addresses in use.
- The user expects refactoring. Candidates seen so far:
  - Agent-root "holder" shape;
  - collaborator agents represented by pushing into `memberContexts`;
  - file size of `root-team-run.ts` and `memory-manager.ts`.

## Architecture investigation (after approval, SR-002; base `84224a58d`)
- **E-08, address allocation.** `collaborator-address-allocator.ts#allocateCollaboratorAddress` turns the name into a
  slug, then takes the first free `_2`, `_3`, … against addresses in use. This is **order-dependent**: an address
  computed for a list could differ from the one allocated later, so it cannot meet REQ-003 as it stands. Segments may
  contain any path-safe characters (`assertValidAgentTeamMemberName`); slugs are `[a-z0-9_]`.
- **E-09, admission couples creation with the note.** `CollaboratorMentionAdmission.admit` both ensures the entries and
  composes the mention note. Agent-initiated bring-in needs the ensure step without the note. Each root's
  `admitCollaboratorMentions` runs inside the root operation gate (`materializationGate` / `operationGate`), and so do
  message delivery and delegation. A bring-in during a send must therefore reuse the gate it is already in.
- **E-10, team ancestry is available in every index.** `TeamExecutionIndex.listTeamAncestorsDeepestFirst(containingTeamRunId)`,
  `AgentOrgExecutionIndex.listTeamAncestorsDeepestFirst(host.hostRunId)`, and the equivalent in the Agent-root index all
  exist. Indexed teams carry their address and members, which is enough for instance-relative resolution (REQ-007).
- **E-11, task-copy records.** `TaskAgentExecution` and `TaskTeamExecution` hold address, run IDs, delegator and start
  time. Restore finds the source through per-root source resolvers (configured node, then collaborator entry).
  `parseTaskExecutions` reads known fields and ignores unknown ones, so an optional field is tolerated. A copy delegated
  from the catalog has neither kind of source.
- **E-12, opt-in tool path.** See E-06 (`publish_artifacts`). The context a tool sees is the sender's
  `MemberExecutionContext`; every eligible run has one (predecessor REQ-012).

- **E-13, member scope (code review CRR-003, CR-001; live evidence `api-e2e-evidence/le-claude-2.log`, `le-claude-3.log`, `le-codex-2.log`, `le-agy.log`).**
  - Inside a catalog team copy, `get_handoff_rules` returns `[]` and the member gets no team instruction (in a Team root,
    it gets the root team's instruction).
  - Each root derives member scope its own way:
    - `member-team-context-builder.ts#collaboratorMemberScope` uses the root `teamContext` for everyone except
      collaborators;
    - `agent-org-execution-scope-builder.ts#agentOrgHandoffs` / `resolveFreshInstruction` cover Org and collaborator
      handoffs only;
    - `agent-run-collaboration-root-builder.ts#buildChildContext` (`collaboratorOf`) looks in `collaborators[]` only.
  - The hosting TeamRun of every team instance is already prepared from its own source (configured node, collaborator
    entry or task `source`), so its context holds the right handoffs and definition.
  - An uncommitted worktree change (`member-instance-scope.ts`) started deriving scope from the hosting TeamRun.

- **E-14, copy placement (CRR-005 DI-01; evidence `api-e2e-evidence/desktop/DO-05-org-rows-r2.png`, ledger R2-6).**
  - Org and Agent-root adapters place copies at `requireAgent(delegator).host`
    (`agent-org-task-execution-adapter.ts:86`, `agent-run-collaboration-task-execution-adapter.ts:92`).
  - The Team root places by address (`TeamExecutionScopeResolver.resolveTargetOwner`).
  - The Org rule's recorded basis is only "Fresh task Team is stored at exact delegator host"
    (`tickets/done/flat-agent-organization-model/design-spec.md:5449`), from a time when only configured targets
    existed.
  - Placement affects the record location, the memory path of new copies and UI nesting. It does not affect lifetime,
    member scope or address resolution.

## Open questions (to the user with the requirements)
- **Q-1:** does `delegate_task` to a catalog address that is not in the run also add the collaborator instance (an
  Offline row), or only the copy? Recommendation: only the copy.
- **Q-2:** should Daily Assistant appear in `list_available_agents`, as it is excluded from `@`? Recommendation: keep
  the same exclusions as `@`.

## Supplement Inventory
| Supplement | Owner | Purpose | Related IDs | Status | Approval applies |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` + VIS-001–015 (predecessor) | Product Prototyper | Reused rows, Team/Org tab and message rendering for agent-initiated collaborators and copies (REQ-011) | REQ-011, AC-011 | Approved (user, 2026-10-01, predecessor) | Yes, as the reused normative UI |
| `design-review-report.md`, `architecture-review-revision-record.md` (this folder) | Architecture Reviewer | ARCH-REV-001 | — | Fail (first round) | N/A |
