import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import type { RemoteAgentLaunch, RemoteStartedRunRef } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
import { AgentRunMetadataStore } from "../../run-history/store/agent-run-metadata-store.js";
import { TeamRunExecutionTreeStore } from "../../run-history/store/team-run-execution-tree-store.js";

/** A launch recorded before its source was: shown as the agent's default, as at the start answer. */
const UNRECORDED: LaunchConfigurationSource = Object.freeze({ origin: "agent_default", fallbacks: Object.freeze([]) });

/**
 * SR-038: each agent's launch of a run a peer started on this node, read from the run's own file when the peer's owner
 * views it (an agent run's `run_metadata.json`; a team run's members). The delegating node stores none: a launch is the
 * run's own fact here, and a Settings change shows on the next summary.
 */
export class PeerStartedRunLaunches {
  private readonly layout: AgentMemoryLayout;
  private readonly agents: AgentRunMetadataStore;

  constructor(memoryDir: string, private readonly teams = new TeamRunExecutionTreeStore()) {
    this.layout = new AgentMemoryLayout(memoryDir);
    this.agents = new AgentRunMetadataStore(memoryDir);
  }

  async of(run: RemoteStartedRunRef): Promise<readonly RemoteAgentLaunch[]> {
    if (run.kind === "agent") {
      const metadata = await this.agents.readMetadata(run.runId);
      return metadata?.address ? Object.freeze([Object.freeze({ address: metadata.address, runtimeKind: metadata.runtimeKind,
        llmModelIdentifier: metadata.llmModelIdentifier, source: metadata.launchSource ?? UNRECORDED })]) : Object.freeze([]);
    }
    const tree = await this.teams.readOwnParts(this.layout.getTeamDirPath({ rootTeamRunId: run.runId, ancestorTeamRunIds: [] }), run.runId);
    return Object.freeze((tree?.rootTeam.members ?? []).map((member) => Object.freeze({ address: member.address, runtimeKind: member.launchConfiguration.runtimeKind,
      llmModelIdentifier: member.launchConfiguration.llmModelIdentifier, source: member.launchSource ?? UNRECORDED })));
  }
}
