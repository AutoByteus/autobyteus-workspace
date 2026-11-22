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
import type { AgentOrgContainerManager, CreateAgentOrgContainerInput, OrgFollowResult } from "./agent-org-container-manager.js";
import type { AgentOrgUnit } from "../domain/agent-org-container-file.js";
import type { TeamChangeNoticeSource } from "../../agent-team-execution/membership/team-change-notice-source.js";
import type { OrgMembershipPlanner } from "../membership/org-membership-planner.js";
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

  /** What following the Org definition needs, bound by the composition root once they exist (DS-006). */
  private following: Readonly<{
    planner: Pick<OrgMembershipPlanner, "viewFor">;
    notices: Pick<TeamChangeNoticeSource, "recordOrgChange"> | null;
    runPartsChanged(run: RootExecutionIdentity): void;
  }> | null = null;

  bindFollowing(following: NonNullable<AgentOrgContainers["following"]>): void { this.following = following; }

  /** Every live container, for the definition listener (one after another). */
  listLive(): readonly LiveAgentOrgContainer[] { return [...this.live.values()].filter((live) => live.isActive()); }

  /**
   * DS-006 (REQ-009): a live Org follows its Org definition now: its view is read outside the transition, then the
   * container commits the change; units that left stop (a working one finishes first, shown leaving), the agents still in
   * the Org are told, its view and rows follow. A failure is logged naming the Org and leaves it as it is.
   */
  async followDefinition(orgRunId: string): Promise<OrgFollowResult | null> {
    const live = this.getLive(orgRunId);
    if (!live || !this.following) return null;
    try {
      const view = await this.following.planner.viewFor(live.container.getFile());
      if (!view) return null;
      const result = await this.dependencies.manager.follow(orgRunId, view, (unit) => this.dependencies.unitViews.live(unit) !== null);
      if (!result) return null;
      this.dependencies.directory.updated(result.file);
      for (const unit of result.left) if (result.leaving.has(unit.runId)) this.retire(orgRunId, unit);
      this.tell(result);
      await this.getLive(orgRunId)?.unitsChanged();
      this.following.runPartsChanged(createAgentOrgRootExecutionIdentity(orgRunId));
      return result;
    } catch (error) {
      console.warn(`AGENT_ORG_DEFINITION_NOT_FOLLOWED: AgentOrg '${orgRunId}' keeps its units (${error instanceof Error ? error.message : String(error)}).`);
      return null;
    }
  }

  /**
   * The agents of the units still in the Org hear which units joined and left (at their Org addresses) and whether their
   * Org rules changed (one net notice with any Team change, R-6); a unit that joined starts with the Org as it is now.
   */
  private tell(result: OrgFollowResult): void {
    if (!this.following?.notices) return;
    const directory = this.dependencies.directory;
    const joined = new Set(result.joined.map((unit) => unit.runId));
    const recipients = directory.agentsOfContainer({ ...result.file, rootOrg: { ...result.file.rootOrg,
      units: result.file.rootOrg.units.filter((unit) => !joined.has(unit.runId)) } }).map((agent) => Object.freeze({
      agentRunId: agent.agentRunId, rulesBefore: directory.rulesFromIn(result.before, agent.orgAddress), rulesAfter: directory.rulesFromIn(result.file, agent.orgAddress) }));
    const ref = (unit: AgentOrgUnit) => Object.freeze({ agentRunId: unit.runId, address: unit.address });
    this.following.notices.recordOrgChange({ recipients, joined: result.joined.map(ref), left: result.left.map(ref) });
  }

  /**
   * A unit that left while it was running (as autobyteus-22's leaving member): it finishes its work, then its run stops and
   * its marker is cleared; its rows show it leaving meanwhile. One that is idle stops now.
   */
  private retire(orgRunId: string, unit: AgentOrgUnit): void {
    const views = this.dependencies.unitViews;
    let done = false;
    const offs: Array<() => void> = [];
    const release = async () => {
      if (done) return;
      done = true;
      offs.forEach((off) => off());
      try {
        const stopped = await this.dependencies.manager.stopUnit(unit);
        if (!stopped) console.warn(`AGENT_ORG_UNIT_NOT_STOPPED: AgentOrg '${orgRunId}': unit ${unit.address} did not stop; it stays marked leaving until the Org stops.`);
        // The unit just stopped is not running, whatever its view reports while its root unregisters.
        const file = await this.dependencies.manager.releaseStopped(orgRunId,
          (candidate) => (candidate.runId === unit.runId ? !stopped : views.live(candidate) !== null));
        if (file) this.dependencies.directory.updated(file);
        await this.getLive(orgRunId)?.unitsChanged();
        this.following?.runPartsChanged(createAgentOrgRootExecutionIdentity(orgRunId));
      } catch (error) {
        console.warn(`AGENT_ORG_UNIT_RELEASE_NOT_SAVED: AgentOrg '${orgRunId}': unit ${unit.address} stays marked leaving until the next change (${error instanceof Error ? error.message : String(error)}).`);
      }
    };
    const view = views.live(unit);
    if (!view || !view.hasOpenWork()) { void release(); return; }
    offs.push(view.subscribe(() => { if (!view.hasOpenWork()) void release(); }));
    offs.push(views.onLivenessChanged(unit, () => { if (!views.live(unit)) void release(); }));
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
    const restored = await this.start(await this.dependencies.manager.restore(orgRunId));
    // A reopened Org follows its definition as it is now (as a restored Team run does).
    await this.followDefinition(orgRunId);
    return restored;
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
