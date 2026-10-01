# Implementation Revision Record — agent-initiated-collaborators

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer → implementation handoff (ARCH-REV-003 Pass), round 1 | N/A | `Initial Baseline` | SR-005, ARCH-REV-003, CRR-001 | Implemented; code review **Pass** (CRR-001, 9.3/10, no findings) → api_e2e_engineer |
| IR-002 | architecture_reviewer (ARCH-REV-004 Pass on SR-006) after API-REV-001 Fail; code_reviewer CRR-002/CRR-003 | CR-001 (F-01), CR-002 (F-02) | `Design Impact` (CR-001 via SR-006) + `Local Fix` (CR-002) | SR-006, ARCH-REV-004, CRR-002, CRR-003, API-REV-001 | Implemented; to code review |

## Revision Entries

### IR-001 — Agent-initiated collaborators, catalog copies and one-unit team instances (initial baseline)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`,
  `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-review-report.md`
  (ARCH-REV-003 Pass), round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation of SR-005 complete at commit `549510977`; local checks green against the base baseline (see
  the handoff); handed to code review.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved package.
- Approved behavior or requirement IDs affected: REQ-001–011, AC-001–012, BEH-001–009.
- Implementation delta:
  - `list_available_agents` opt-in tool (registry, exposure flag, AutoByteus binding, Agent Tools MCP adapter, Claude
    options, startup unit), `Root.listAvailableAgents` in all three roots.
  - `CatalogAddressMap` (replaces the first-free allocator); root port `rootDefinition` + `inRunPlacementsByDefinition`;
    policy `listEligible` with AR-002 precedence.
  - Admission split: `CollaboratorAdmission.ensure`; note at the `@` call sites; per-root `CollaboratorAdmissionQueue`.
  - Shared `MessageRecipientResolution` (sender instance → run-wide → catalog bring-in) with index ports in three roots;
    Team addressing extracted to `team-run-message-delivery.ts`.
  - Catalog delegation (`catalog-delegation.ts`), optional `TaskExecutionSource` on task records (parse/validate/project),
    adapters and source resolvers read `source` first; Agent-root first catalog copy creates the package.
  - REQ-009 wording; contracts `source` on task DTOs; web selectors read `source`; docs (5 module docs).
  - Read side found by the render check: member projections (Team, Org, Agent root) and the Agent-root location
    resolve a catalog copy's definition from its `source` (`catalogCopyExecutionSource`).
- Changed files or areas: see the handoff § Key Files Or Areas.
- Local validation and result: see the handoff § Local Implementation Checks Run and § Frontend Rendered-Result Check.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large/High).
- Remaining limitations or risks: AGY/ACP live exposure unverified; concurrency premise corrected locally (per-root
  admission queue) and flagged for review; Org behavior change (REQ-007) documented.

### IR-002 — One member-scope owner (CR-001) and Team-root copy row names (CR-002)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer` (ARCH-REV-004 Pass on
  SR-006) after API-REV-001 (Fail) and `/software_engineering_team/code_reviewer` CRR-002 (failure origin) / CRR-003
  (CR-001 reclassified to Design Impact):
  `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/code-review-report.md`,
  `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-review-report.md`.
- Triggering finding IDs: CR-001 (F-01), CR-002 (F-02).
- Classification: `Design Impact` resolved by SR-006 (CR-001) + `Local Fix` (CR-002).
- Commit: `9b594693b`.
- Prior authoritative result: IR-001 passed CRR-001; API-REV-001 failed F-01 (catalog Team copy members had no own
  handoffs/instruction in all three roots; a catalog Agent copy in a Team root inherited the root-Team instruction) and
  F-02 (Team-root catalog copy rows showed raw segments).
- Current authoritative result: one pure owner `resolveMemberCollaborationScope` decides every member's handoffs and
  enclosing instruction from its hosting TeamRun (`hostTeam`) or the root's facts, in all three roots, at construction
  and restore; per-root special cases removed; Team-root rows and contexts format catalog copies like collaborators.
- Related solution revision IDs: SR-005, SR-006
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-002, CRR-003
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why recorded: rework after API/E2E failure and the SR-006 design revision.
- Approved behavior or requirement IDs affected: REQ-007, REQ-011, AC-007, AC-011, AC-012.
- Implementation delta:
  - new `agent-collaboration/execution/domain/member-instance-scope.ts`;
  - `flat-team-execution-callbacks.ts` (optional `hostTeam`), `flat-team-agent-execution-handle.ts` (passes it);
  - Team root: `member-team-context-builder.ts` (owner; `scope` override and `collaboratorMemberScope` removed),
    `team-flat-execution-callbacks.ts`, `team-root-materializer.ts` (`resolveMemberScope` removed);
  - Org root: `agent-org-execution-scope-builder.ts` (owner; `agentOrgHandoffs`, `resolveFreshInstruction` branching
    removed);
  - Agent root: `agent-run-collaboration-root-builder.ts` (owner; `collaboratorOf` removed);
  - web: `teamExecutionTreeSelectors.ts` (`readsAsDisplayName`), `teamExecutionContextFactory.ts`;
  - docs: `agent_team_execution.md`, `agent_orgs.md`;
  - tests: see the handoff.
- Local validation and result: server 4953 / web 3464 tests, 0 new failures vs base; live Team-root render check
  passed (see the handoff).
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large/High).
- Remaining limitations or risks: copy members' scope verified by tests, not yet live (API/E2E LE-A2, LE-T1, LE-O1);
  AGY/ACP exposure still unverified live.

## Review Outcomes (informational)

- 2026-10-01 — `/software_engineering_team/code_reviewer` **Pass**, CRR-001 on IR-001 (`549510977`, `2dfbd1843`),
  score 9.3/10, no findings. The per-root `CollaboratorAdmissionQueue` was accepted as an implementation-level
  correction, not a Design Impact; the design's "serialize on the gate" wording is to be corrected at docs sync. The
  reviewer delivered the next handoff to `/software_engineering_team/api_e2e_engineer`. Report:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/code-review-report.md`.
  No implementation action taken.
