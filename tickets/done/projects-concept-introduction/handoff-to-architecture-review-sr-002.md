# Handoff — Architecture Design Complete (SR-002)

- Result classification: `Architecture Design Complete`
- Package identifier: `PROJ-CONCEPT-20260926-001` (`projects-concept-introduction`)
- Current solution revision: `SR-002`
- Classification: `task_size=Large`, `architectural_risk=High`
- Route: `get_handoff_rules` rule "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review" → `/architecture_reviewer`
- Expected output: independent architecture review of the design against the approved requirements (Pass / Fail with findings / Blocked).

## Original Request And Goal

User (2026-09-26): introduce a Projects concept, informed by the exploratory Project/Task prototype, behind a feature flag like Applications (hidden by default). Clarified: a Project has a description and linked workspaces, each link with a description of what that workspace is for (e.g. the `autobyteus` project → main workspace, UI-prototype workspace, marketing workspaces). Confirmed: toggle on = visible and usable; toggle off = hidden; this ticket is Projects only, Tasks later.

## Approval Basis

- Requirements `Approved` — `SR-001`, `REQ-001`–`REQ-014`, `AC-001`–`AC-012`, `SCN-001`–`SCN-006`, `DEC-001`–`DEC-008` resolved as recommended.
- Approval reference: `APPROVAL-PROJ-CONCEPT-20260926-001` (explicit user approval in the Solution Designer conversation, 2026-09-26).
- Behavior-defining supplements: none.

## Workspace Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction`
- Branch: `codex/projects-concept-introduction`
- Base: `origin/personal@1676bede9d910ca40dc0331390a35f203206fd41`
- Finalization target: `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/` (uncommitted working files)

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/solution-revision-record.md`
- Prior architecture review artifacts: `N/A — not applicable (first review)`
- External, non-normative context (Product-owned / historical, container `autobyteus-server-0` only, unpushed):
  - `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQ-ATPTN-001/tickets/in-progress/REQ-ATPTN-001/` (exploratory visualizer, `Awaiting User Review`)
  - `/home/autobyteus/workspace/.codex/worktrees/agent-team-project-task-navigation/tickets/in-progress/agent-team-project-task-navigation/requirements-doc.md` (Draft `RER-004`, unapproved)

## Design Summary

- New server subsystem `src/projects/` (domain, `ProjectStore` JSON at `<appDataDir>/projects/projects.json`, `ProjectService` governing owner, `ProjectsCapabilityService` default-disabled) + GraphQL `projects.ts`, `projects-capability.ts`.
- Links reference registered `agent_ws_` workspace ids, snapshot the root path, carry a description; availability (`AVAILABLE`/`UNREGISTERED`) resolved at read time via `WorkspaceManager`; workspace removal untouched and never blocked.
- Bounded refactor (design-health `Duplicated Policy Or Coordination`): generic `ServerSettingsService.getBooleanSetting/setBooleanSetting` replacing four feature-specific methods; web `createBoundNodeCapabilityStore` factory and `FeatureCapabilityToggleCard` shared by Applications, Skill Improvement and Projects; table-driven route gate. Applications/SI GraphQL contracts, store ids and test ids unchanged (`AC-010`).
- Web: `/projects` index + `/projects/[id]` detail, `components/projects/*`, `projectStore`, `projectsCapabilityStore`, nav key `projects` after `Nodes`, mobile-excluded, `en`/`zh-CN` catalogues.
- Persisted data: `Not Affected` for existing data; no migration.

## Classification Evidence

- Size: ~40 files across server and web; new subsystem, new routes, new stores, plus migration of two shipped capability stores/cards.
- Risk: new additive GraphQL contract; new persisted subject; shared capability refactor touching Applications and Skill Improvement.

## Open Risks / Uncertainty

- Regression risk in Applications/SI capability behavior from the extraction (mitigated by unchanged public APIs/test ids and existing specs).
- `generated/graphql.ts` regeneration requires a running backend schema.
- `UNK-001` ("task admission") deferred to the Tasks slice; `RISK-001` unpushed container-only prototype/requirements branches (user action).

## Next Expected Action

`/architecture_reviewer` reviews the design package. On Pass, the reviewer applies its own handoff rules; Fail/Blocked findings return to Solution Designer.
