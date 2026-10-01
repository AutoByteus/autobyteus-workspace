# Implementation Revision Record — agent-initiated-collaborators

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer → implementation handoff (ARCH-REV-003 Pass), round 1 | N/A | `Initial Baseline` | SR-005, ARCH-REV-003 | Implemented; handed to code review |

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
