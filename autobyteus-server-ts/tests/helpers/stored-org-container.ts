import { AgentMemoryLayout } from "../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgContainerStore } from "../../src/run-history/store/agent-org-container-store.js";
import { AgentRunMetadataStore } from "../../src/run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../src/run-history/store/team-run-execution-tree-store.js";
import { TeamCommunicationStore } from "../../src/services/team-communication/team-communication-store.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";

/** One unit of a stored Org container fixture: a direct agent, or a mounted Team with its members in team space. */
export type StoredOrgUnit =
  | Readonly<{ kind: "agent"; address: string; runId: string; agentDefinitionId?: string; workspaceRootPath?: string }>
  | Readonly<{ kind: "agent_team"; address: string; runId: string; teamDefinitionId?: string; coordinatorAddress: string;
      members: readonly Readonly<{ address: string; agentRunId: string; agentDefinitionId?: string; workspaceRootPath?: string }>[] }>;

const launch = (workspaceRootPath = "/workspace") => ({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "test-model", llmConfig: null,
  autoExecuteTools: true, workspaceRootPath });

/**
 * Writes a stored Org container (org-teams-follow-definition, storage contract §1–§4) and its unit runs into a test memory
 * folder: the container file, each Team unit's tree (team space, `containedIn`) and empty log, each agent unit's run file.
 */
export const writeStoredOrgContainer = async (memoryDir: string, input: Readonly<{
  orgRunId: string; orgDefinitionId?: string; orgDefinitionName?: string; createdAt?: string; units: readonly StoredOrgUnit[];
  handoffs?: readonly Readonly<{ from: string; to: string; rules: readonly string[] }>[];
}>): Promise<void> => {
  const layout = new AgentMemoryLayout(memoryDir);
  const createdAt = input.createdAt ?? "2026-11-22T00:00:00.000Z";
  for (const unit of input.units) {
    const containedIn = { orgRunId: input.orgRunId, address: unit.address };
    if (unit.kind === "agent") {
      await new AgentRunMetadataStore(memoryDir).writeMetadata(unit.runId, { runId: unit.runId, agentDefinitionId: unit.agentDefinitionId ?? `${unit.runId}-def`,
        workspaceRootPath: unit.workspaceRootPath ?? "/workspace", memoryDir: layout.getStandaloneRunDirPath(unit.runId), llmModelIdentifier: "test-model", llmConfig: null,
        autoExecuteTools: true, runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: null, containedIn, address: unit.address } as never);
      continue;
    }
    const teamDir = layout.getTeamDirPath({ rootTeamRunId: unit.runId, ancestorTeamRunIds: [] });
    await new TeamRunExecutionTreeStore().write(teamDir, {
      createdAt, archivedAt: null, applicationBinding: null, handoffs: [], containedIn,
      rootTeam: { address: "/", teamDefinitionId: unit.teamDefinitionId ?? `${unit.runId}-def`, teamDefinitionName: unit.runId, teamRunId: unit.runId,
        coordinatorAddress: unit.coordinatorAddress, defaultLaunchConfiguration: launch(),
        members: unit.members.map((member) => ({ address: member.address, agentDefinitionId: member.agentDefinitionId ?? `${member.agentRunId}-def`,
          role: null, description: null, agentRunId: member.agentRunId, platformAgentRunId: null, launchConfiguration: launch(member.workspaceRootPath) })) },
    } as never);
    await new TeamCommunicationStore().write(teamDir, { schemaVersion: 1, rootTeamRunId: unit.runId, messages: [] });
  }
  await new AgentOrgContainerStore().write(layout.getOrgDirPath(input.orgRunId), {
    subjectKind: "agent_org", createdAt, archivedAt: null, applicationBinding: null, handoffs: input.handoffs ?? [],
    rootOrg: { address: "/", orgDefinitionId: input.orgDefinitionId ?? `${input.orgRunId}-def`, orgDefinitionName: input.orgDefinitionName ?? input.orgRunId,
      orgRunId: input.orgRunId, defaultLaunchConfiguration: launch(),
      units: input.units.map((unit) => ({ address: unit.address, kind: unit.kind, runId: unit.runId,
        definitionId: unit.kind === "agent" ? unit.agentDefinitionId ?? `${unit.runId}-def` : unit.teamDefinitionId ?? `${unit.runId}-def` })),
      formerUnits: [] },
  } as never);
};
