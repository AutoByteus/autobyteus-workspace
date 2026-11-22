import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { RootSnapshotConnection, RunViewStream } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { CollaborationCommunicationMessage } from "../../agent-collaboration/execution/communication/collaboration-communication-message.js";
import { createCollaborationAgentStatusSnapshot, type CollaborationAgentStatusSnapshot } from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import type { LiveAgentInputSnapshot } from "../../agent-collaboration/execution/domain/live-agent-input-snapshot.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgRunPackageSnapshot } from "../domain/agent-org-package-snapshot.js";
import type { AgentOrgRunEvent } from "../domain/agent-org-run-event.js";
import type { AgentOrgContainerFile, AgentOrgUnit } from "../domain/agent-org-container-file.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import { composeOrgExecutionTree, type OrgUnitFile } from "./org-execution-tree-composition.js";

/** One live agent's status, as its unit root reports it. */
export type UnitAgentStatus = Readonly<{ agentRunId: string; status: string; backgroundTasksRunning: number; trigger?: string | null;
  errorMessage?: string | null }>;

/** What a unit relays into the Org view, in the order its root published it (synchronously, as its root publishes). */
export type UnitViewFrame =
  | Readonly<{ kind: "presentation"; agentRunId: string; message: AgentPresentationMessage }>
  | Readonly<{ kind: "communication"; message: CollaborationCommunicationMessage }>
  /** The unit's own parts changed (a Team unit's membership): the Org view takes an in-band snapshot. */
  | Readonly<{ kind: "parts_changed" }>;

/** A live unit root, as the composition reads it: its parts now (read synchronously) and its frames from now on. */
export type LiveUnitView = Readonly<{
  /** A Team unit's tree as its root has it now; `null`: read the stored file (an agent unit's file holds no live state). */
  file(): OrgUnitFile | null;
  statuses(): readonly UnitAgentStatus[];
  inputStates(): readonly LiveAgentInputSnapshot[];
  /** Whether the unit has work running now (an agent running, initializing or in error). */
  hasOpenWork(): boolean;
  subscribe(listener: (frame: UnitViewFrame) => void): () => void;
}>;

/** The units' roots, as the composition root gives them to the composition. */
export type OrgUnitViews = Readonly<{
  /** A live unit's view; `null` when its root is not live (never restored to be viewed). */
  live(unit: AgentOrgUnit): LiveUnitView | null;
  /** A unit's own stored file (a unit that is not live). */
  stored(unit: AgentOrgUnit): Promise<OrgUnitFile>;
  /** The unit's root was registered or unregistered (restored, stopped, idle-shut-down). */
  onLivenessChanged(unit: AgentOrgUnit, listener: () => void): () => void;
}>;

const offline = (agentRunId: string): UnitAgentStatus => Object.freeze({ agentRunId, status: "offline", backgroundTasksRunning: 0 });

/** The agents of the composed tree by run ID: their Org address and their unit run. */
const agentsOf = (tree: AgentOrgRunExecutionTreeSnapshot): Map<string, Readonly<{ address: AgentTeamAddress; unitRunId: string }>> => {
  const agents = new Map<string, Readonly<{ address: AgentTeamAddress; unitRunId: string }>>();
  for (const member of tree.rootOrg.members) {
    if ("agentRunId" in member) agents.set(member.agentRunId, { address: member.address, unitRunId: member.agentRunId });
    else for (const agent of member.members) agents.set(agent.agentRunId, { address: agent.address, unitRunId: member.teamRunId });
  }
  return agents;
};

/**
 * The Org view of a live container (design DS-004, R-3, R-3''): its units' views composed into today's Org view, in the
 * container's own `RunViewStream` (the one sequenced stream the Org view reads; the web contract is unchanged).
 * - Relay: each live unit's frames are republished into the container stream as they are published (synchronously), in
 *   Org shape: an agent's presentation at its Org address; a message once: by the unit that has its receiver, or, for a
 *   message leaving the Org, by the sender's unit (the sender's copy of a message to another unit is dropped).
 * - Snapshot: taken at the container stream's base: the live units' parts are read in the same synchronous step (every
 *   frame relayed so far is in them, every later one follows the base: nothing lost or doubled), then the other units'
 *   stored files; composed into today's Org tree with every member's status (offline when its unit is not live).
 * - A unit's root registered or unregistered, or a unit's parts changed: `composition_changed` is published; each Org
 *   view session takes an in-band snapshot.
 */
export class OrgViewComposition {
  private readonly attached = new Map<string, () => void>();
  private readonly offLiveness = new Map<string, () => void>();
  private agents = new Map<string, Readonly<{ address: AgentTeamAddress; unitRunId: string }>>();
  private started = false;

  constructor(private readonly input: Readonly<{
    stream: RunViewStream<AgentOrgRunEvent>;
    file(): AgentOrgContainerFile;
    units: OrgUnitViews;
  }>) {}

  get orgRunId(): string { return this.input.file().rootOrg.orgRunId; }

  /** Starts relaying the live units; every unit's agents are learned first (a message's receiver may be in any unit). */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.snapshot();
    if (!this.started) return;
    for (const unit of this.viewUnits()) this.follow(unit);
  }

  /**
   * The container's units changed (it followed its definition, REQ-009): new units are followed, units gone are not (a
   * unit leaving the Org stays until it stopped); each Org view takes an in-band snapshot.
   */
  unitsChanged(): void {
    if (!this.started) return;
    const wanted = new Map(this.viewUnits().map((unit) => [unit.runId, unit]));
    for (const [runId, off] of [...this.attached]) if (!wanted.has(runId)) { off(); this.attached.delete(runId); }
    for (const [runId, off] of [...this.offLiveness]) if (!wanted.has(runId)) { off(); this.offLiveness.delete(runId); }
    for (const unit of wanted.values()) this.follow(unit);
    this.input.stream.publish({ kind: "composition_changed" });
  }

  stop(): void {
    this.started = false;
    for (const off of this.offLiveness.values()) off();
    this.offLiveness.clear();
    for (const unsubscribe of this.attached.values()) unsubscribe();
    this.attached.clear();
  }

  /** The view's snapshot connection (SR-063): `atBase` and the live units' parts are read at the base, in one step. */
  openViewSnapshotConnection<TAtBase, TSnapshot>(atBase: () => TAtBase,
    read: (own: AgentOrgRunPackageSnapshot, atBase: TAtBase) => Promise<TSnapshot> | TSnapshot): Promise<RootSnapshotConnection<TSnapshot, AgentOrgRunEvent>> {
    return this.input.stream.openSnapshotConnection(() => {
      // The live units' parts first, in the base's synchronous step: nothing can be relayed between the two.
      const own = this.snapshot();
      const rows = atBase();
      return own.then((parts) => read(parts, rows));
    });
  }

  /** A user's message the Org view sent to a direct Org agent, shown in its conversation (as the Org root showed it). */
  publishPresentation(agentRunId: string, message: AgentPresentationMessage): void {
    const agent = this.agents.get(agentRunId);
    if (agent) this.publishAgent(agentRunId, agent.address, message);
  }

  /** Whether any live unit has work running now (the Org's execution checkpoint). */
  hasOpenWork(): boolean {
    return this.viewUnits().some((unit) => this.input.units.live(unit)?.hasOpenWork() ?? false);
  }

  /** The live agents' statuses now, at their Org addresses (an agent whose unit is not live is offline: not listed). */
  liveStatuses(): readonly CollaborationAgentStatusSnapshot[] {
    return this.viewUnits().flatMap((unit) => this.input.units.live(unit)?.statuses() ?? []).flatMap((status) => {
      const agent = this.agents.get(status.agentRunId);
      return agent ? [createCollaborationAgentStatusSnapshot({ execution: this.identity(status.agentRunId, agent.address), status: status.status,
        backgroundTasksRunning: status.backgroundTasksRunning, trigger: status.trigger ?? null, errorMessage: status.errorMessage ?? null })] : [];
    });
  }

  /** The Org's own parts now; the live units' are read before the first await (at the caller's base). */
  snapshot(): Promise<AgentOrgRunPackageSnapshot> {
    const units = this.viewUnits();
    const file = { ...this.input.file(), rootOrg: { ...this.input.file().rootOrg, units } };
    const live = units.map((unit) => {
      const view = this.input.units.live(unit);
      return { unit, read: view ? { file: view.file(), statuses: view.statuses(), inputStates: view.inputStates() } : null };
    });
    return (async () => {
      const files = new Map<string, OrgUnitFile>();
      for (const { unit, read } of live) files.set(unit.runId, read?.file ?? await this.input.units.stored(unit));
      const tree = composeOrgExecutionTree(file, files);
      this.agents = agentsOf(tree);
      const reported = new Map(live.flatMap(({ read }) => read?.statuses ?? []).map((status) => [status.agentRunId, status]));
      const statuses: CollaborationAgentStatusSnapshot[] = [...this.agents].map(([agentRunId, agent]) => {
        const status = reported.get(agentRunId) ?? offline(agentRunId);
        return createCollaborationAgentStatusSnapshot({ execution: this.identity(agentRunId, agent.address), status: status.status,
          backgroundTasksRunning: status.backgroundTasksRunning, trigger: status.trigger ?? null, errorMessage: status.errorMessage ?? null });
      });
      return Object.freeze({ tree, statuses: Object.freeze(statuses), inputStates: Object.freeze(live.flatMap(({ read }) => read?.inputStates ?? [])) });
    })();
  }

  /**
   * The units the view shows: the current ones, then each unit leaving the Org while it finishes (REQ-009), unless a
   * current unit took its address (its rows are tagged leaving; it is shown until it stopped).
   */
  private viewUnits(): AgentOrgUnit[] {
    const root = this.input.file().rootOrg;
    const current = new Set(root.units.map((unit) => unit.address as string));
    return [...root.units, ...root.formerUnits.filter((unit) => unit.leaving && !current.has(unit.address))
      .map(({ leaving: _leaving, ...unit }) => Object.freeze(unit))];
  }

  private follow(unit: AgentOrgUnit): void {
    this.attach(unit);
    if (!this.offLiveness.has(unit.runId)) this.offLiveness.set(unit.runId, this.input.units.onLivenessChanged(unit, () => this.livenessChanged(unit)));
  }

  private attach(unit: AgentOrgUnit): void {
    if (this.attached.has(unit.runId)) return;
    const view = this.input.units.live(unit);
    if (!view) return;
    this.learnAgents(unit, view.file());
    this.attached.set(unit.runId, view.subscribe((frame) => this.relay(unit, frame)));
  }

  private livenessChanged(unit: AgentOrgUnit): void {
    if (!this.started) return;
    this.attached.get(unit.runId)?.();
    this.attached.delete(unit.runId);
    this.attach(unit);
    this.input.stream.publish({ kind: "composition_changed" });
  }

  private relay(unit: AgentOrgUnit, frame: UnitViewFrame): void {
    try {
      if (frame.kind === "parts_changed") {
        const view = this.input.units.live(unit);
        if (view) this.learnAgents(unit, view.file());
        this.input.stream.publish({ kind: "composition_changed" });
        return;
      }
      if (frame.kind === "communication") {
        if (this.relaysMessage(unit, frame.message)) this.input.stream.publish({ kind: "communication", message: frame.message });
        return;
      }
      const agent = this.agents.get(frame.agentRunId);
      if (agent) this.publishAgent(frame.agentRunId, agent.address, frame.message);
    } catch (error) {
      console.error(`AgentOrg '${this.orgRunId}': a frame of unit ${unit.address} was not shown: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** A message once: the unit that has its receiver relays it; a message leaving the Org, the unit that has its sender. */
  private relaysMessage(unit: AgentOrgUnit, message: CollaborationCommunicationMessage): boolean {
    const receiverUnit = this.agents.get(message.receiverAgentRunId)?.unitRunId;
    return receiverUnit === undefined || receiverUnit === unit.runId;
  }

  private publishAgent(agentRunId: string, address: AgentTeamAddress, message: AgentPresentationMessage): void {
    this.input.stream.publish({ kind: "agent_presentation", execution: this.identity(agentRunId, address), message });
  }

  private identity(agentRunId: string, address: AgentTeamAddress) {
    return createCollaborationMemberExecutionIdentity({ root: createAgentOrgRootExecutionIdentity(this.orgRunId), memberAddress: address, agentRunId });
  }

  /** The agents of one unit at their Org addresses (kept current as the unit's parts change). */
  private learnAgents(unit: AgentOrgUnit, own: OrgUnitFile | null): void {
    if (unit.kind === "agent") { this.agents.set(unit.runId, { address: unit.address, unitRunId: unit.runId }); return; }
    if (!own) return;
    const tree = composeOrgExecutionTree({ ...this.input.file(), rootOrg: { ...this.input.file().rootOrg, units: [unit] } }, new Map([[unit.runId, own]]));
    for (const [agentRunId, agent] of [...this.agents]) if (agent.unitRunId === unit.runId) this.agents.delete(agentRunId);
    for (const [agentRunId, agent] of agentsOf(tree)) this.agents.set(agentRunId, agent);
  }
}
