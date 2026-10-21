# Investigation Notes — Remote Collaboration Without Publishing (autobyteus-245)

## Investigation Meta

- Package identifier: `remote-collaboration-without-publishing`
- Request / ticket: autobyteus-245 (part of autobyteus-25), from `/project_task_manager`, 2026-10-21
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing`
- Repository mode: `Git`
- Task worktree / branch: same path / `codex/remote-collaboration-without-publishing`
- Resolved base: `origin` / `personal` / `786055f3d7f1ffe338f614340ffed006c7afbf7a` (fetched 2026-10-21; includes the slice 1 merge `d51ef843f6`)
- Finalization target: `origin` / `personal`
- Bootstrap result: worktree and branch created; ticket folder `tickets/in-progress/remote-collaboration-without-publishing/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-004`
- Authorities read (2026-10-21): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (read in this conversation; re-read where updated); the templates. The prior package `tickets/done/cross-node-agent-communication/` is context.
- Investigation status: requirements-phase complete.

## Initial Request And Clarifications

- The user, 2026-10-21 (through the PTM): "lets work on the remote agents without publishing immediately: all the agents and agent teams are automatically available, because this publishing phase is really user unfriendly. The remote node might not have the runtime and model set up right. The big direction is no publishing, all agents and teams are automatically available, and then the software engineering team proposes the solution. My suggestion: if there is no default configuration, just send the error back, like 'there is no default runtime configured for the target agent or agent team'."
- Earlier: FU-007 (2026-10-20); "we need to make both agent teams available for delegate task with node".
- Constraints from the PTM: trusted private network only; switch off by default; no credential crosses nodes; built-ins and application-owned definitions excluded; any `published-agents.json` handled with the user's approval; no release unless asked. Teams are autobyteus-247 (depends on 245).

## Source Log

| ID | Date | Type | Source | Finding | Established |
| --- | --- | --- | --- | --- | --- |
| S-01 | 2026-10-21 | Code | `src/remote-collaboration/` (15 files, 1,024 lines): `domain/published-agent.ts`, `settings/published-agent-service.ts`, `published-agent-store.ts`, `published-launch-check.ts`, `inbound/remote-delegation-receiver.ts`, `domain/remote-refusals.ts`, `domain/remote-requests.ts` | Publishing: a shared Agent with stored launch settings; the published address comes from `CatalogAddressMap` over the published set; the receiver resolves `publishedAddress` → `AGENT_NOT_PUBLISHED`, checks the settings (`PublishedLaunchCheck`: workspace, runtime availability, model selection) → `AGENT_CANNOT_RUN`, then prepares the run with them | Read |
| S-02 | 2026-10-21 | Code | `src/api/graphql/types/remote-collaboration-settings.ts`; `autobyteus-web` Remote Collaboration tab; `docs/modules/remote_collaboration.md`; `docs/design/collaboration_model.md` CM-12 | The publish GraphQL API, UI list and docs; CM-12 says "starts only the Agents its owner published" | Read |
| S-03 | 2026-10-21 | Code | `src/agent-collaboration/collaborators/collaborator-candidate-policy.ts` | The single owner of catalog eligibility: shared Agents, then shared Agent Teams; never Agent Orgs, built-ins (`BUILT_IN_AGENT_DEFINITIONS`) or the viewer's own definition. `requireAdmissible` decides a fresh catalog copy | Read |
| S-04 | 2026-10-21 | Code / Doc | `src/agent-collaboration/collaborators/collaborator-launch-resolver.ts`; `docs/modules/agent_communication.md` § Launch configuration of catalog copies | Layers: Agent copy = agent default → inherited from the run root; Team copy = team default → inherited, members = agent default → the Team's. A layer is usable when it names runtime and model, the runtime is available and the model validates. Workspace and auto-approve always come from the run root | Read |
| S-05 | 2026-10-21 | Code | `src/launch-preferences/default-launch-config.ts` | `DefaultLaunchConfig = {llmModelIdentifier, runtimeKind, llmConfig}`: no workspace, no auto-approve | Read |
| S-06 | 2026-10-21 | Command | `git tag --contains d51ef843f6` (after `git fetch --tags`) → none; latest tag `v1.5.8-beta.4` | Publishing has never shipped in a release | Reproduced |
| S-07 | 2026-10-21 | Code | `src/config/app-config.ts:341` `getTempWorkspaceDir()` (`AUTOBYTEUS_TEMP_WORKSPACE_DIR`, leaf `temp_workspace`); `src/workspaces/temp-workspace.ts` (`temp_ws_default`) | Every node has a temp workspace | Read |

## Architecture Investigation Findings (2026-10-21)

| ID | Source | Observation | Established | Design use |
| --- | --- | --- | --- | --- |
| A-01 | `agent-collaboration/collaborators/collaborator-admission.ts:101-124` (`catalogDefinitionAt`, `catalogTaskSource`) | One call resolves a catalog address (`policy.catalogAddressMap(port).definitionFor`), checks admissibility, builds the plan (Agent or Team) and resolves launches with `port.rootLaunchConfiguration()` | Read | B uses the same call with a node catalog port |
| A-02 | `collaborator-candidate-policy.ts` (`catalogView`, `requireAdmissible`, `isEligibleAgent/Team`) | Eligibility comes from the port: `ownDefinition`, in-run placements, `addressesInUse`, `isApplicationBound`. A port with none of them yields the node's whole eligible catalog | Read | `NodeCatalogPort` |
| A-03 | `collaborator-launch-resolver.ts:86-200` | `resolve(plans, inheritedLaunch)`: configured layers take workspace/auto-approve from the inherited launch; an agent without a usable layer uses the inherited one; the inherited launch is also validated. Its only caller is `CollaboratorAdmission` | Read | Launch base `inherited` / `defaults_only` |
| A-04 | `collaborator-root-port.ts:18-40` | `CollaboratorRootPort` has `rootLaunchConfiguration()` (14 readers in `src/`) | Read | Add `launchBase()`; keep `rootLaunchConfiguration` |
| A-05 | `catalog-address-map.ts:81-89` | `addressFor` and `definitionFor` (reverse lookup) | Read | Address resolution on B |

## Requirement Implications

- Removing publishing removes the source of launch settings. Runtime and model come from the agent default (the user's direction; it matches the first layer of `CollaboratorLaunchResolver`). Workspace and auto-approve need node-level rules (DEC-202, DEC-203).
- Eligibility and addresses come from the existing single owners (S-03, `CatalogAddressMap`). The remote target becomes the same catalog address a local `delegate_task` would use.
- No released data exists (S-06), so no migration is needed (DEC-204).

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| RSK-201 | Risk | Remote runs always auto-approve (DEC-203 (c)), so a peer's task runs tools, including computer use, without the owner's approval | Accepted by the user within the trusted-network scope (2026-10-21); the switch (off by default) and peer registration stay the consent; a permission rule is S6 |
| RSK-202 | Unknown → Resolved | The resolver needs a launch base without the inherited layer (A-03) | Design: `defaults_only` |
