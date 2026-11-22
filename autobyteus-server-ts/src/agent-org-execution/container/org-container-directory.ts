import { configuredPlacementSource } from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { ContainedIn } from "../../agent-collaboration/domain/contained-in.js";
import type { OrgContainerPort, OrgUnitPlacement } from "../../agent-collaboration/domain/org-container-port.js";
import {
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
  /** A live container's current file, without reading (`null`: not live); bound once the container manager exists. */
  private liveContainer: (orgRunId: string) => AgentOrgContainerFile | null = () => null;

  constructor(private readonly files: OrgContainerDirectoryFiles) {}

  /** The composition root binds the live containers (the container manager is created after the Task side). */
  bindLiveContainers(liveContainer: (orgRunId: string) => AgentOrgContainerFile | null): void { this.liveContainer = liveContainer; }

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
    for (const unit of (await this.container(orgRunId))?.rootOrg.units ?? []) {
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

  orgRulesFrom(orgRunId: string, orgAddress: string): readonly CollaborationHandoff[] {
    const file = this.liveContainer(orgRunId) ?? this.loaded.get(orgRunId) ?? null;
    return Object.freeze((file?.handoffs ?? []).filter((handoff) => handoff.from === orgAddress));
  }

  async loadContainer(orgRunId: string): Promise<Readonly<{ orgDefinitionId: string }> | null> {
    const file = await this.container(orgRunId);
    return file ? Object.freeze({ orgDefinitionId: file.rootOrg.orgDefinitionId }) : null;
  }

  /** The container's current file was written (a live container's change): later answers read it. */
  updated(file: AgentOrgContainerFile): void { this.loaded.set(file.rootOrg.orgRunId, file); }

  async orgAddressOf(identity: Pick<CollaborationMemberExecutionIdentity, "root" | "memberAddress">): Promise<AgentTeamAddress | null> {
    const containedIn = await this.containedInOf(identity.root);
    if (!containedIn) return null;
    return identity.root.rootSubjectKind === "agent" ? containedIn.address : ContainedTeamAddressSpace.of(containedIn)!.toOrg(identity.memberAddress);
  }

  private async container(orgRunId: string): Promise<AgentOrgContainerFile | null> {
    const live = this.liveContainer(orgRunId);
    if (live) return live;
    const stored = await this.files.storedContainer(orgRunId);
    if (stored) this.loaded.set(orgRunId, stored);
    return stored ?? this.loaded.get(orgRunId) ?? null;
  }

  private async teamTreeOf(unit: AgentOrgUnit): Promise<TeamRunExecutionTreeFile | null> {
    try {
      const tree = await this.files.teamTree(unit.runId);
      if (!tree) console.warn(`Org unit ${unit.address} (Team run '${unit.runId}') is left out: its file is absent.`);
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
