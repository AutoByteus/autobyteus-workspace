import { configuredPlacementSource } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { ContainedIn } from "../../agent-collaboration/domain/contained-in.js";
import type { OrgContainerPort, OrgUnitPlacement } from "../../agent-collaboration/domain/org-container-port.js";
import {
  createAgentOrgRootExecutionIdentity,
  createAgentRootExecutionIdentity,
  createTeamRootExecutionIdentity,
  rootExecutionIdentityKey,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { ContainedTeamAddressSpace } from "../../agent-team-execution/container/contained-team-address-space.js";
import type { TeamRunExecutionTreeFile } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { AgentOrgContainerFile, AgentOrgUnit } from "../domain/agent-org-container-file.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgContainerStore } from "../../run-history/store/agent-org-container-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";

/** The files the directory reads: the container's and each unit run's own. */
export type OrgContainerDirectoryFiles = Readonly<{
  /** The stored container file (`null`: absent, or a released Org tree not yet converted). */
  storedContainer(orgRunId: string): Promise<AgentOrgContainerFile | null>;
  teamTree(teamRunId: string): Promise<TeamRunExecutionTreeFile | null>;
  agentMetadata(agentRunId: string): Promise<AgentRunMetadata | null>;
}>;

const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * The container directory (design R-2, N-1): the one answerer of the `OrgContainerPort`, created by the composition root
 * and handed to the readers that ask for a unit run (the collaboration tree, cross-run delivery, unit contexts). It reads
 * a run's `containedIn` from the run's own file once (it never changes) and the container's units from the container
 * file (a live container's current one); a Team unit's members from its own tree at each use (its membership follows its
 * definition). A unit file that cannot be read is left out with a warning naming it (`DESIGN.md` rule 7).
 */
export class OrgContainerDirectory implements OrgContainerPort {
  private readonly containedIn = new Map<string, ContainedIn | null>();
  private readonly loaded = new Map<string, AgentOrgContainerFile>();
  /** Each known container's unit runs, by unit run key (learned from container files as they are read). */
  private readonly containerOfUnit = new Map<string, string>();
  /** A live container's current file, without reading (`null`: not live); bound once the container manager exists. */
  private liveContainer: (orgRunId: string) => AgentOrgContainerFile | null = () => null;
  /** A live Team run's tree, without reading (`null`: not live); bound once the Team run manager exists. */
  private liveTeamTree: (teamRunId: string) => TeamRunExecutionTreeFile | null = () => null;
  /** Each Team unit's current members (team-space address → agent run ID), as last read or changed (REQ-004 reads them synchronously). */
  private readonly teamMembers = new Map<string, ReadonlyMap<string, string>>();

  constructor(private readonly files: OrgContainerDirectoryFiles) {}

  /** The composition root binds the live containers (the container manager is created after the Task side). */
  bindLiveContainers(liveContainer: (orgRunId: string) => AgentOrgContainerFile | null): void { this.liveContainer = liveContainer; }

  /** The composition root binds the live Team runs (their trees change as they follow their definitions). */
  bindLiveTeams(liveTeamTree: (teamRunId: string) => TeamRunExecutionTreeFile | null): void { this.liveTeamTree = liveTeamTree; }

  /** A Team unit's tree changed (it followed its definition): later answers read its members from it. */
  teamUnitChanged(tree: TeamRunExecutionTreeFile): void { this.learnTeam(tree); }

  async containedInOf(run: RootExecutionIdentity): Promise<ContainedIn | null> {
    if (run.rootSubjectKind === "agent_org") return null;
    const key = rootExecutionIdentityKey(run);
    if (this.containedIn.has(key)) return this.containedIn.get(key)!;
    const file = run.rootSubjectKind === "agent" ? await this.files.agentMetadata(run.rootRunId) : await this.files.teamTree(run.rootRunId);
    if (!file) return null; // Not stored (yet): asked again next time.
    const containedIn = file.containedIn ?? null;
    this.containedIn.set(key, containedIn);
    return containedIn;
  }

  async sameContainer(a: RootExecutionIdentity, b: RootExecutionIdentity): Promise<boolean> {
    if (rootExecutionIdentityKey(a) === rootExecutionIdentityKey(b)) return false;
    const [first, second] = await Promise.all([this.containedInOf(a), this.containedInOf(b)]);
    return Boolean(first && second && first.orgRunId === second.orgRunId);
  }

  async unitOfAgent(orgRunId: string, agentRunIdInput: string): Promise<Readonly<{ run: RootExecutionIdentity; orgAddress: AgentTeamAddress }> | null> {
    const agentRunId = agentRunIdInput.trim();
    const file = await this.container(orgRunId);
    // A unit leaving the Org still finishes its work: its agents take the Org view's commands until it stopped (REQ-009).
    for (const unit of file ? [...file.rootOrg.units, ...file.rootOrg.formerUnits.filter((former) => former.leaving)] : []) {
      if (unit.kind === "agent" && unit.runId === agentRunId) return Object.freeze({ run: createAgentRootExecutionIdentity(unit.runId), orgAddress: unit.address });
      if (unit.kind !== "agent_team") continue;
      const tree = await this.teamTreeOf(unit);
      // A former member is still the Team run's agent (its root answers a message to it with the former-member refusal).
      const member = tree ? [...tree.rootTeam.members, ...tree.rootTeam.formerMembers ?? []].find((candidate) => candidate.agentRunId === agentRunId) : null;
      if (member) {
        return Object.freeze({ run: createTeamRootExecutionIdentity(unit.runId),
          orgAddress: ContainedTeamAddressSpace.of({ orgRunId, address: unit.address })!.toOrg(member.address) });
      }
    }
    return null;
  }

  async placementsOf(orgRunId: string): Promise<readonly OrgUnitPlacement[]> {
    const placements: OrgUnitPlacement[] = [];
    for (const unit of (await this.container(orgRunId))?.rootOrg.units ?? []) {
      if (unit.kind === "agent") {
        placements.push(Object.freeze({ orgAddress: unit.address, run: createAgentRootExecutionIdentity(unit.runId), agentRunId: unit.runId,
          memberAddress: unit.address, ref: Object.freeze({ kind: "agent" as const, definitionId: unit.definitionId }) }));
        continue;
      }
      const tree = await this.teamTreeOf(unit);
      if (!tree) continue;
      const space = ContainedTeamAddressSpace.of({ orgRunId, address: unit.address })!;
      const run = createTeamRootExecutionIdentity(unit.runId);
      const coordinator = tree.rootTeam.members.find((member) => member.address === tree.rootTeam.coordinatorAddress);
      if (coordinator) {
        placements.push(Object.freeze({ orgAddress: unit.address, run, agentRunId: coordinator.agentRunId, memberAddress: coordinator.address,
          ref: Object.freeze({ kind: "agent_team" as const, definitionId: unit.definitionId }) }));
      }
      for (const member of tree.rootTeam.members) {
        placements.push(Object.freeze({ orgAddress: space.toOrg(member.address), run, agentRunId: member.agentRunId, memberAddress: member.address,
          ref: Object.freeze({ kind: "agent" as const, definitionId: member.agentDefinitionId }) }));
      }
    }
    return Object.freeze(placements);
  }

  async delegationSourceAt(orgRunId: string, orgAddress: AgentTeamAddress): Promise<TaskExecutionSource | null> {
    const file = await this.container(orgRunId);
    const unit = file?.rootOrg.units.find((candidate) => candidate.address === orgAddress
      || (candidate.kind === "agent_team" && orgAddress.startsWith(`${candidate.address}/`)));
    if (!file || !unit) return null;
    if (unit.kind === "agent") {
      const metadata = await this.agentMetadataOf(unit);
      return metadata ? configuredPlacementSource({ address: unit.address, agentDefinitionId: metadata.agentDefinitionId, role: null, description: null,
        agentRunId: unit.runId, platformAgentRunId: null, launchConfiguration: Object.freeze({ runtimeKind: metadata.runtimeKind,
          llmModelIdentifier: metadata.llmModelIdentifier, llmConfig: metadata.llmConfig, autoExecuteTools: metadata.autoExecuteTools,
          workspaceRootPath: metadata.workspaceRootPath || null }) }, []) : null;
    }
    const tree = await this.teamTreeOf(unit);
    if (!tree) return null;
    const space = ContainedTeamAddressSpace.of({ orgRunId, address: unit.address })!;
    const memberAddress = space.fromOrg(orgAddress);
    if (memberAddress) {
      // A Team unit's member, as the Org's configured Agent inside a mounted Team answered before: its definition and launch.
      const member = tree.rootTeam.members.find((candidate) => candidate.address === memberAddress);
      return member ? configuredPlacementSource({ ...member, address: orgAddress }, []) : null;
    }
    // As the Org's mounted Team answered before: its layout at its Org address, and its members' rules (its own and the Org's).
    return configuredPlacementSource({ address: unit.address, teamDefinitionId: tree.rootTeam.teamDefinitionId, role: null, description: null,
      teamRunId: unit.runId, coordinatorAddress: space.toOrg(tree.rootTeam.coordinatorAddress), defaultLaunchConfiguration: tree.rootTeam.defaultLaunchConfiguration,
      members: tree.rootTeam.members.map((member) => Object.freeze({ ...member, address: space.toOrg(member.address) })) },
    [...space.rulesToOrg(tree.handoffs), ...file.handoffs]);
  }

  /**
   * REQ-004: the Org rules from an Org address that apply now: a rule to a member that is not currently in its Team (it
   * left) is left out until it returns, derived at each read, never stored twice (contract §2).
   */
  orgRulesFrom(orgRunId: string, orgAddress: string): readonly CollaborationHandoff[] {
    const file = this.liveContainer(orgRunId) ?? this.loaded.get(orgRunId) ?? null;
    return Object.freeze(file ? rulesFromIn(file, orgAddress, (teamRunId) => this.membersOf(teamRunId)) : []);
  }

  /** A former unit at or above an Org address (its messages are refused by name, as a Team's former member's); `null` otherwise. */
  formerUnitAt(orgRunId: string, orgAddress: string): AgentOrgUnit | null {
    const file = this.liveContainer(orgRunId) ?? this.loaded.get(orgRunId) ?? null;
    if (!file || file.rootOrg.units.some((unit) => within(unit, orgAddress))) return null;
    return file.rootOrg.formerUnits.find((unit) => within(unit, orgAddress)) ?? null;
  }

  /**
   * REQ-004, design R-6: the agents of a Team unit's container whose Org rules changed with that Team's membership change
   * (a rule to a member that left is left out; to one that joined, or came back, is in again), each with its rules before
   * and after; none for a Team outside an Org. Synchronous: the Team's notices are merged in the same step.
   */
  orgRuleChangesFor(change: Readonly<{ tree: TeamRunExecutionTreeFile; joined: readonly { address: string }[]; left: readonly { address: string }[] }>):
    readonly Readonly<{ agentRunId: string; before: readonly CollaborationHandoff[]; after: readonly CollaborationHandoff[] }>[] {
    const containedIn = change.tree.containedIn;
    const file = containedIn ? this.liveContainer(containedIn.orgRunId) ?? this.loaded.get(containedIn.orgRunId) ?? null : null;
    const teamRunId = change.tree.rootTeam.teamRunId;
    const before = new Map(this.membersOf(teamRunId) ?? []);
    for (const member of change.joined) before.delete(member.address);
    for (const member of change.left) before.set(member.address, "");
    this.learnTeam(change.tree);
    if (!file || !containedIn) return [];
    const membersBefore = (id: string) => id === teamRunId ? before : this.membersOf(id);
    const membersAfter = (id: string) => this.membersOf(id);
    const changes: Array<Readonly<{ agentRunId: string; before: readonly CollaborationHandoff[]; after: readonly CollaborationHandoff[] }>> = [];
    for (const from of new Set(file.handoffs.map((handoff) => handoff.from))) {
      const rulesBefore = rulesFromIn(file, from, membersBefore);
      const rulesAfter = rulesFromIn(file, from, membersAfter);
      if (rulesBefore.length === rulesAfter.length && rulesBefore.every((rule, index) => rule === rulesAfter[index])) continue;
      const agentRunId = agentAt(file, from, membersAfter);
      if (agentRunId) changes.push(Object.freeze({ agentRunId, before: Object.freeze(rulesBefore), after: Object.freeze(rulesAfter) }));
    }
    return Object.freeze(changes);
  }

  /** Every agent of a container's current units, by its Org address (the Org-level notices' recipients). */
  agentsOfContainer(file: AgentOrgContainerFile): readonly Readonly<{ agentRunId: string; orgAddress: string }>[] {
    return file.rootOrg.units.flatMap((unit) => unit.kind === "agent" ? [Object.freeze({ agentRunId: unit.runId, orgAddress: unit.address as string })]
      : [...(this.membersOf(unit.runId) ?? new Map<string, string>())].map(([address, agentRunId]) =>
        Object.freeze({ agentRunId, orgAddress: `${unit.address}${address}` })));
  }

  /** The Org rules from an Org address in a given container file, as `orgRulesFrom` derives them now. */
  rulesFromIn(file: AgentOrgContainerFile, orgAddress: string): readonly CollaborationHandoff[] {
    return Object.freeze(rulesFromIn(file, orgAddress, (teamRunId) => this.membersOf(teamRunId)));
  }

  async loadContainer(orgRunId: string): Promise<Readonly<{ orgDefinitionId: string }> | null> {
    const file = await this.container(orgRunId);
    // Its Team units' members are read once too: an Org rule's target is checked against them synchronously (REQ-004).
    for (const unit of file?.rootOrg.units ?? []) if (unit.kind === "agent_team" && !this.membersOf(unit.runId)) await this.teamTreeOf(unit);
    return file ? Object.freeze({ orgDefinitionId: file.rootOrg.orgDefinitionId }) : null;
  }

  /** The container's current file was written (a live container's change): later answers read it. */
  updated(file: AgentOrgContainerFile): void { this.learn(file); }

  /** A known container's unit runs, read synchronously (a container read at least once, or live); `null` otherwise. */
  unitRunsOf(orgRunId: string): readonly RootExecutionIdentity[] | null {
    const file = this.liveContainer(orgRunId) ?? this.loaded.get(orgRunId);
    return file ? file.rootOrg.units.map((unit) => unit.kind === "agent" ? createAgentRootExecutionIdentity(unit.runId) : createTeamRootExecutionIdentity(unit.runId)) : null;
  }

  /** The container of a unit run, read synchronously (its container read at least once, or live); `null` otherwise. */
  containerOfSync(run: RootExecutionIdentity): RootExecutionIdentity | null {
    const orgRunId = this.containerOfUnit.get(rootExecutionIdentityKey(run));
    return orgRunId ? createAgentOrgRootExecutionIdentity(orgRunId) : null;
  }

  private learn(file: AgentOrgContainerFile): void {
    this.loaded.set(file.rootOrg.orgRunId, file);
    for (const unit of [...file.rootOrg.units, ...file.rootOrg.formerUnits]) {
      const run = unit.kind === "agent" ? createAgentRootExecutionIdentity(unit.runId) : createTeamRootExecutionIdentity(unit.runId);
      this.containerOfUnit.set(rootExecutionIdentityKey(run), file.rootOrg.orgRunId);
    }
  }

  async orgAddressOf(identity: Pick<CollaborationMemberExecutionIdentity, "root" | "memberAddress">): Promise<AgentTeamAddress | null> {
    const containedIn = await this.containedInOf(identity.root);
    if (!containedIn) return null;
    return identity.root.rootSubjectKind === "agent" ? containedIn.address : ContainedTeamAddressSpace.of(containedIn)!.toOrg(identity.memberAddress);
  }

  private async container(orgRunId: string): Promise<AgentOrgContainerFile | null> {
    const live = this.liveContainer(orgRunId);
    if (live) return live;
    const stored = await this.files.storedContainer(orgRunId);
    if (stored) this.learn(stored);
    return stored ?? this.loaded.get(orgRunId) ?? null;
  }

  /** A Team unit's current members: a live run's tree now, else as last read; `null` when never read. */
  private membersOf(teamRunId: string): ReadonlyMap<string, string> | null {
    const live = this.liveTeamTree(teamRunId);
    if (live) this.learnTeam(live);
    return this.teamMembers.get(teamRunId) ?? null;
  }

  private learnTeam(tree: TeamRunExecutionTreeFile): void {
    this.teamMembers.set(tree.rootTeam.teamRunId, new Map(tree.rootTeam.members.map((member) => [member.address as string, member.agentRunId])));
  }

  private async teamTreeOf(unit: AgentOrgUnit): Promise<TeamRunExecutionTreeFile | null> {
    try {
      const tree = this.liveTeamTree(unit.runId) ?? await this.files.teamTree(unit.runId);
      if (!tree) console.warn(`Org unit ${unit.address} (Team run '${unit.runId}') is left out: its file is absent.`);
      else this.learnTeam(tree);
      return tree;
    } catch (error) {
      console.warn(`Org unit ${unit.address} (Team run '${unit.runId}') is left out: its file cannot be read: ${errorText(error)}`);
      return null;
    }
  }

  private async agentMetadataOf(unit: AgentOrgUnit): Promise<AgentRunMetadata | null> {
    try {
      return await this.files.agentMetadata(unit.runId);
    } catch (error) {
      console.warn(`Org unit ${unit.address} (agent run '${unit.runId}') is left out: its file cannot be read: ${errorText(error)}`);
      return null;
    }
  }
}

const within = (unit: AgentOrgUnit, address: string): boolean =>
  unit.address === address || (unit.kind === "agent_team" && address.startsWith(`${unit.address}/`));

/** Whether an Org address names something present now: a current unit, or a current member of a Team unit (unknown: present). */
const presentIn = (file: AgentOrgContainerFile, address: string, membersOf: (teamRunId: string) => ReadonlyMap<string, string> | null): boolean => {
  const unit = file.rootOrg.units.find((candidate) => within(candidate, address));
  if (!unit) return false;
  if (unit.kind === "agent" || unit.address === address) return true;
  const members = membersOf(unit.runId);
  return !members || members.has(address.slice(unit.address.length));
};

const rulesFromIn = (file: AgentOrgContainerFile, from: string, membersOf: (teamRunId: string) => ReadonlyMap<string, string> | null): CollaborationHandoff[] =>
  file.handoffs.filter((handoff) => handoff.from === from && presentIn(file, handoff.to, membersOf));

/** The agent run at an Org address: an agent unit's run, or a Team unit's member (its coordinator for the Team's own address). */
const agentAt = (file: AgentOrgContainerFile, address: string, membersOf: (teamRunId: string) => ReadonlyMap<string, string> | null): string | null => {
  const unit = file.rootOrg.units.find((candidate) => within(candidate, address));
  if (!unit) return null;
  if (unit.kind === "agent") return unit.runId;
  return membersOf(unit.runId)?.get(address.slice(unit.address.length)) || null;
};

/** The directory over a memory folder's stored files (the composition root's). */
export const createOrgContainerDirectory = (memoryDir: string): OrgContainerDirectory => {
  const layout = new AgentMemoryLayout(memoryDir);
  const containers = new AgentOrgContainerStore();
  const teams = new TeamRunExecutionTreeStore();
  const agents = new AgentRunMetadataStore(memoryDir);
  return new OrgContainerDirectory({
    storedContainer: (orgRunId) => containers.readIfContainer(layout.getOrgDirPath(orgRunId), orgRunId),
    teamTree: (teamRunId) => teams.read(layout.getTeamDirPath({ rootTeamRunId: teamRunId, ancestorTeamRunIds: [] }), teamRunId),
    agentMetadata: (agentRunId) => agents.readMetadata(agentRunId),
  });
};
