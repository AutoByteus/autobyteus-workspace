import type { RunViewStreams } from "../../agent-collaboration/delegation/run-view-stream.js";
import {
  createAgentOrgRootExecutionIdentity,
  createAgentRootExecutionIdentity,
  createTeamRootExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgRunPackageSnapshot } from "../domain/agent-org-package-snapshot.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { AgentOrgContainer } from "./agent-org-container.js";
import type { AgentOrgContainerManager, CreateAgentOrgContainerInput } from "./agent-org-container-manager.js";
import { LiveAgentOrgContainer, type OrgUnitRoots } from "./live-agent-org-container.js";
import type { OrgContainerDirectory } from "./org-container-directory.js";
import { OrgViewComposition, type OrgUnitViews } from "./org-view-composition.js";

/**
 * The Org containers of this node (org-teams-follow-definition, DS-001, DS-003, DS-004): the container lifecycle
 * (`AgentOrgContainerManager`), each live container's view composition and command routing (`LiveAgentOrgContainer`),
 * and the container directory's view of the live containers' files. The Org run manager registers what this returns.
 */
export class AgentOrgContainers {
  private readonly live = new Map<string, LiveAgentOrgContainer>();

  constructor(private readonly dependencies: Readonly<{
    manager: AgentOrgContainerManager;
    streams: Pick<RunViewStreams, "streamOf">;
    unitViews: OrgUnitViews;
    roots: OrgUnitRoots;
    directory: OrgContainerDirectory;
  }>) {
    dependencies.directory.bindLiveContainers((orgRunId) => dependencies.manager.getLive(orgRunId)?.getFile() ?? null);
  }

  /** DS-001: every unit created as its own run (Offline), then the container file; then its view starts. */
  async create(input: CreateAgentOrgContainerInput): Promise<LiveAgentOrgContainer> {
    const container = await this.dependencies.manager.create(input);
    try {
      return await this.start(container);
    } catch (error) {
      await this.dependencies.manager.stop(container.orgRunId).catch(() => false);
      throw error;
    }
  }

  /** DS-003: a stopped Org reopens from its container file; its units are restored when first needed. */
  async restore(orgRunId: string): Promise<LiveAgentOrgContainer> {
    const live = this.getLive(orgRunId);
    if (live) return live;
    return this.start(await this.dependencies.manager.restore(orgRunId));
  }

  /** DS-003: Stop stops every unit run; the view composition ends once all stopped (`false`: one did not, retry). */
  async stop(orgRunId: string): Promise<boolean> {
    const stopped = await this.dependencies.manager.stop(orgRunId);
    if (!stopped) return false;
    this.live.get(orgRunId)?.compositionStopped();
    this.live.delete(orgRunId);
    return true;
  }

  getLive(orgRunId: string): LiveAgentOrgContainer | null {
    const live = this.live.get(orgRunId) ?? null;
    return live?.isActive() ? live : null;
  }

  /** Whether the Org run is stored as a container (not a released Org tree waiting for its conversion). */
  isStored(orgRunId: string): Promise<boolean> { return this.dependencies.manager.isStored(orgRunId); }

  /** A stored container's unit runs (current and former); none when it is not a container. */
  async storedUnitRuns(orgRunId: string): Promise<readonly RootExecutionIdentity[]> {
    const file = await this.dependencies.manager.readStored(orgRunId);
    return (file ? [...file.rootOrg.units, ...file.rootOrg.formerUnits] : []).map((unit) =>
      unit.kind === "agent" ? createAgentRootExecutionIdentity(unit.runId) : createTeamRootExecutionIdentity(unit.runId));
  }

  /** A stopped container's view parts: its stored file composed with its units' files (and any unit that is live). */
  async storedSnapshot(orgRunId: string): Promise<AgentOrgRunPackageSnapshot | null> {
    const file = await this.dependencies.manager.readStored(orgRunId);
    if (!file) return null;
    const composition = new OrgViewComposition({ stream: this.stream(orgRunId), file: () => file, units: this.dependencies.unitViews });
    return composition.snapshot();
  }

  private async start(container: AgentOrgContainer): Promise<LiveAgentOrgContainer> {
    this.dependencies.directory.updated(container.getFile());
    const stream = this.stream(container.orgRunId);
    const composition = new OrgViewComposition({ stream, file: () => container.getFile(), units: this.dependencies.unitViews });
    const live = new LiveAgentOrgContainer({ container, composition, stream, directory: this.dependencies.directory, roots: this.dependencies.roots });
    await composition.start();
    await live.refreshExecutionTree();
    this.live.set(container.orgRunId, live);
    return live;
  }

  private stream(orgRunId: string) {
    return this.dependencies.streams.streamOf<AgentOrgRunEvent>(createAgentOrgRootExecutionIdentity(orgRunId));
  }
}
