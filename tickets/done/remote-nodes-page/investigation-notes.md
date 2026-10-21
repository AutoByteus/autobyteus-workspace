# Investigation Notes — remote-nodes-page (autobyteus-267)

## Investigation Meta

- Package: `remote-nodes-page`; Task **autobyteus-267**. It is a UI feature on top of autobyteus-261 (discovery, released in `v1.5.8-beta.6`).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-nodes-page`, branch `codex/remote-nodes-page`, base `origin/personal` `9e7a458808`. Finalization target: `origin/personal`.
- Authorities read: `solution-designer/SKILL.md`, `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (all read in this conversation).
- How each finding was established: `Read`.

## Initial Request

The Task text from the PTM (2026-10-21). The user, with a screenshot: "after I add the remote node, we could really see their agents and agent teams."
1. Under each peer: whether it is reachable now, and a list of its Agents and Teams (name, kind, short description). This is the same data the 261 tools give, from one source.
2. In the card "Agents and Agent Teams available to peers": this node's shared Agents and Teams, each with a flag when it has no default runtime and model, plus a link to where the default is set.
3. Narrowing and search, with a short default view.

Constraints:
- The node's server asks the peer, not the window.
- Only names, kinds and descriptions travel.
- Slow peers have a waiting state, there is a not-reachable state, and nothing polls.
- No version checks.
- Only fields with a value.
- It works in the desktop window opened on a Docker node.

Process: the Product Team designs the UI and the user approves it.

## Relevant Existing Behavior

| ID | Fact | Source |
| --- | --- | --- |
| E-01 | The page is `NodeManager` → `RemoteCollaborationCard.vue`, which holds three things: the switch (`FeatureCapabilityToggleCard`), `RemoteCollaborationPeersSection.vue` (each peer's name, URL and node ID, Rename, Remove, and the add form), and the availability card (a title and one paragraph, `…availability.note`). | `autobyteus-web/components/settings/RemoteCollaboration*.vue`; `localization/messages/en/remoteCollaborationSettings.ts:26-27` |
| E-02 | The page's server API is GraphQL `RemoteCollaborationSettingsResolver`: `remoteCollaborationCapability`, `peerNodes`, and the add, rename and remove mutations. It returns nothing about offers. | `autobyteus-server-ts/src/api/graphql/types/remote-collaboration-settings.ts` |
| E-03 | The agents' source, from 261: `RemoteNodeDiscovery.listNodes()` gives `{name, status}`. `listAvailableAgents(name)` gives the entries, or a refusal `{code, message}` that names the reason. The codes are `REMOTE_COLLABORATION_OFF`, `PEER_NOT_REGISTERED`, `PEER_UNREACHABLE` and `PEER_IDENTITY_MISMATCH`. The messages are agent-facing English. | `remote-collaboration/discovery/remote-node-discovery.ts`; `remote-refusals.ts` |
| E-04 | What this node offers peers is `RemoteCatalogLister`, which applies `policy.listEligible(nodeCatalogPort)`. The eligibility policy also knows each entry's `definitionId`, but the wire entry deliberately leaves it out. | `inbound/remote-catalog-lister.ts`; `collaborator-candidate-policy.ts` |
| E-05 | Whether a peer's start would be refused is decided by `admission.catalogTaskSourceOf(nodeCatalogPort, …)` with the `defaults_only` launch base. It throws `CollaboratorNoDefaultLaunchError` when nothing covers an agent or a Team member, and `CollaboratorAddError` with a reason when a configured default can't run: an unavailable runtime, an unavailable model or invalid settings. The resolver checks each distinct runtime's availability once per resolve. | `collaborator-launch-resolver.ts:75-112,156-238`; `remote-delegation-receiver.ts` |
| E-06 | Defaults are set in the definition forms: `/agents?view=edit&id=<id>` (`AgentDefinitionForm`) and `/agent-teams?view=team-edit&id=<id>` (`AgentTeamDefinitionForm`). | `pages/agents.vue:60`, `pages/agent-teams.vue:58` |
| E-07 | The window always talks to the server of the node it is opened on, so a window opened on a Docker node uses that node's resolver, peers and catalog. Nothing in this path is desktop-only. | E-02; `RemoteCollaborationCard.vue` |

## Supplemental Artifact Inventory

To come: the Product Team's UI/UX package (externally owned; linked once returned and approved).

## Assumptions, Unknowns, And Risks

- Peers' lists are tens of entries, so filtering in the window is enough.
- The readiness check (E-05) checks runtime availability, which can take a moment for CLI runtimes. It runs once per page view for this node's list, and never for peers' lists.

## Notes For Architecture Design

- One source: the resolver calls `RemoteNodeDiscovery` (peers) and the same lister and admission that answer peers (this node).
- Peer reasons come from refusal codes, which the window words with localized text.
