import type { CatalogDefinitionRef } from "../collaborators/catalog-address-map.js";
import { sourcedPlacement, type DelegationPlacement } from "../collaborators/catalog-delegation.js";
import { configuredPlacementSource } from "../collaborators/collaborator-source-projector.js";
import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import { CollaborationContractError } from "../domain/collaboration-contract-error.js";
import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import {
  createAgentOrgRootExecutionIdentity,
  rootExecutionIdentityKey,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../execution/domain/root-execution-identity.js";
import type { OrgContainerPort } from "../domain/org-container-port.js";
import type { ContainedIn } from "../domain/contained-in.js";
import { runIdentityOf, runReferenceOf } from "../execution/task/task-execution-resource-port.js";
import type { ConfiguredAgentExecutionNode, ConfiguredTeamExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedChild, DelegationIndex } from "./delegation-index.js";
import type { RunPartsReader } from "./run-parts.js";

/** An org run's configured placements, from its own file: its definition, its direct agents' addresses, its handoffs. */
export type OrgPlacements = Readonly<{ orgDefinitionId: string; agentAddresses: readonly string[]; handoffs: readonly CollaborationHandoff[] }>;

/** A team's or org's configured placement at an address, from its own file, with the run's handoffs. */
export type ConfiguredPlacement = Readonly<{
  node: ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode;
  handoffs: readonly CollaborationHandoff[];
}>;

/**
 * Reads what a run's own file says (`null`: no file): its parts (the tree keeps them), an org's placements and a
 * configured placement at an address (read at use by the map). Created by the composition; run-history owns the files.
 */
export interface RunFilesReader extends RunPartsReader {
  orgPlacementsOf(orgRunId: string): Promise<OrgPlacements | null>;
  configuredPlacementOf(run: RootExecutionIdentity, address: string): Promise<ConfiguredPlacement | null>;
}

/**
 * One agent or team a run reaches by address step 2 (contract §2.3): at its address in an assigner's run, the agent
 * run that receives a message there, its definition (`null` when unknown), and its rank, as at base for a hosted copy:
 * an agent run's own agent (an agent the user started) is `run_agent`; a team's or org's configured placement is
 * `configured`. For a unit run of an Org container, `assigner` is its container and every unit is `configured`.
 */
export type ReachedPlacement = Readonly<{
  address: AgentTeamAddress;
  agentRunId: string;
  ref: CatalogDefinitionRef | null;
  rank: "run_agent" | "configured";
  assigner: RootExecutionIdentity;
}>;

/** What an agent run's own agent is for the prompt it reads, and what a copy of an org's configured agent inherits. */
export type AgentRunCollaboration = Readonly<{
  /**
   * `task_agent`: another run delegated this run (its `delegatedFrom`); `standalone_agent`: the user started it; `org_agent`:
   * a direct Org agent (an agent unit of an Org container, org-teams-follow-definition).
   */
  role: "standalone_agent" | "task_agent" | "org_agent";
  /**
   * A copy of an org's configured agent, or a direct Org agent: that address's handoff rules (read at each call: an Org's
   * rules follow its definition) and the org definition whose instruction it reads.
   */
  placement: Readonly<{ handoffs(): readonly CollaborationHandoff[]; orgDefinitionId: string }> | null;
  /** The organization line: a direct Org agent's (as in the Org before); a task agent's never was. */
  inOrganization: boolean;
  /**
   * Team-scoped (`get_handoff_rules`), as base's hosted copy was (CR-461-114, REQ-009): the run at the top of its tree, the
   * run base hosted the copy in, is a Team or an Org run. A copy whose tree starts at an Agent run is not, as base's task
   * agent under an Agent root was not.
   */
  teamScoped: boolean;
}>;

/** A unit run's Org, as its collaboration tree answers it (`orgUnit`). */
export type OrgUnitOfRun = Readonly<{
  containedIn: ContainedIn;
  orgDefinitionId: string;
  orgRulesFrom(address: string): readonly CollaborationHandoff[];
}>;

/** One row under a run (its open subtree, CR-461-033): the delegated run, and the run that delegated it. */
export type SubtreeRow = DelegatedChild & Readonly<{ parent: RootExecutionIdentity }>;

type MapTree = Pick<DelegationIndex, "tasksOf" | "assignersOf" | "standingOf" | "agentsOf" | "currentTaskOf" | "canMessage" | "subtreeOf" | "openChildrenOf" | "topOf">;

const NO_LONGER = (address: string) => `${address} is no longer an address: your team is addressed from its own root.`;
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
/** The model's order of runs: (kind, run ID), by code point. */
const byRun = (a: RootExecutionIdentity, b: RootExecutionIdentity): number =>
  compare(a.rootSubjectKind, b.rootSubjectKind) || compare(a.rootRunId, b.rootRunId);

/**
 * Where a row opens (autobyteus-461 SR-083, FU-024, FU-031): the run's own identity and the agent to focus. An agent run
 * focuses its own agent; a team run its coordinator, the member at its coordinator's address, in every view. A team run
 * whose coordinator is not one of its members is a row error: logged, and no target (never another member).
 */
export type RowOpenTarget = Readonly<{ runKind: "agent" | "agent_team"; runId: string; agentRunId: string }>;
export const openTargetOf = (
  run: Readonly<{ agentRunId: string } | { teamRunId: string }>,
  team?: Readonly<{ coordinatorAddress: string; members: readonly Readonly<{ address: string; agentRunId: string }>[] }>,
): RowOpenTarget | null => {
  if ("agentRunId" in run) return Object.freeze({ runKind: "agent", runId: run.agentRunId, agentRunId: run.agentRunId });
  const coordinator = team?.members.find((member) => member.address === team.coordinatorAddress);
  if (!coordinator) {
    console.warn(`Row error: team run '${run.teamRunId}' has no coordinator among its members (${team?.coordinatorAddress ?? "none recorded"}); its row has no open target.`);
    return null;
  }
  return Object.freeze({ runKind: "agent_team", runId: run.teamRunId, agentRunId: coordinator.agentRunId });
};

/**
 * A run's name, everywhere it is shown (autobyteus-461 SR-091, REQ-014): a delegated run is named after its slot, the last
 * segment of the address it was delegated to (`/squad/release_writer` → "release writer"), as its row names it and as at
 * base; `null` for a run nobody delegated, which its definition names. Given the run's own address (an agent run) or its
 * Task entry's `recipientAddress` (a team run, whose own root is `/`). The tree rows, the run's own resume config (its
 * context and header), the Task page and the run list take it from here; no client derives a delegated run's name.
 */
export const displayNameOf = (run: Readonly<{ delegated: boolean; address: string | null | undefined }>): string | null =>
  run.delegated ? slotNameOf(run.address) : null;

/** The one name rule (SR-091; the rows' too): an address's last segment, `_` and `-` read as spaces; null when it has none. */
export const slotNameOf = (address: string | null | undefined): string | null => {
  const leaf = (address ?? "").split("/").filter(Boolean).at(-1) ?? "";
  return leaf.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || null;
};

/**
 * A run's name on this node (SR-091), read as its tree row reads it: delegated when a Task names it (its current entry);
 * an agent run's own address (else the address it was delegated to), a team run's entry's `recipientAddress`. `null`
 * for a run nobody delegated (an Org run never is).
 */
export const runDisplayNameOf = async (index: Pick<DelegationIndex, "currentTaskOf" | "agentsOf">, run: RootExecutionIdentity): Promise<string | null> => {
  if (run.rootSubjectKind === "agent_org") return null;
  const entry = index.currentTaskOf(run.rootSubjectKind === "agent" ? { agentRunId: run.rootRunId } : { teamRunId: run.rootRunId });
  if (!entry) return null;
  const own = run.rootSubjectKind === "agent" ? (await index.agentsOf(run))[0]?.address ?? null : null;
  return displayNameOf({ delegated: true, address: own ?? entry.recipientAddress });
};

/**
 * A run's collaboration tree (autobyteus-461 SR-060, SR-061, contract §4): every cross-run answer for one run, derived
 * from the `DelegationIndex` when asked (`delegationIndex.collaborationTreeOf(run)`), never stored. Glossary: the design
 * called it the run's "collaboration map" (`RunCollaborationMap`) until SR-061; it is the tree the user sees under the
 * run, and the `DelegationIndex` (earlier `DelegationTree`) is the forest it is derived from. It works whether or not the run is loaded:
 * it reads only the tree's nodes, their per-run agents (read once) and, at use, the runs' own files. The questions
 * about a run's own parts (its members, its own addresses, steps 1 and 3) stay with its own index.
 */
export class CollaborationTree {
  constructor(private readonly tree: MapTree, private readonly files: Pick<RunFilesReader, "orgPlacementsOf" | "configuredPlacementOf">, readonly run: RootExecutionIdentity,
    /** The Org container directory: a unit run's step 2 is its container's other units (org-teams-follow-definition). */
    private readonly containers: OrgContainerPort | null = null) {}

  /**
   * The runs that assigned this run's Tasks, in step 2's order (contract §2.3, `model.py` `resolve`): its open Tasks in
   * Task-ID order, else all its Tasks; each Task's assigners in run order; each run once. Empty for a run no Task names.
   */
  assigners(): readonly RootExecutionIdentity[] {
    const entries = this.entries();
    const open = [...new Set(entries.filter((entry) => entry.open).map((entry) => entry.taskId))].sort();
    const taskIds = open.length ? open : [...new Set(entries.map((entry) => entry.taskId))].sort();
    const runs = new Map<string, RootExecutionIdentity>();
    for (const taskId of taskIds) {
      for (const assigner of [...this.tree.assignersOf(taskId)].sort(byRun)) runs.set(rootExecutionIdentityKey(assigner), runs.get(rootExecutionIdentityKey(assigner)) ?? assigner);
    }
    return [...runs.values()];
  }

  /**
   * Reach by step 2, by address, in its order (the first assigner with an address wins it); `null` when the run works
   * on no Task (step 2 does not apply). The one enumeration: the message route, the `@` note, `list_available_agents`,
   * `delegate_task`'s in-run placements and the addresses in use all read it. A unit run of an Org container (never
   * delegated) reaches its container's other units by their Org addresses (design R-1, R-2).
   */
  async stepTwo(): Promise<ReadonlyMap<string, ReachedPlacement> | null> {
    if (!this.entries().length) return this.containerStepTwo();
    const reached = new Map<string, ReachedPlacement>();
    for (const assigner of this.assigners()) {
      const standing = await this.tree.standingOf(assigner);
      if (!standing) continue;
      const agents = new Map((await this.tree.agentsOf(assigner)).map((agent) => [agent.agentRunId, agent]));
      for (const [address, agentRunId] of standing.agents) {
        if (reached.has(address)) continue;
        const agent = agents.get(agentRunId);
        reached.set(address, Object.freeze({ address: address as AgentTeamAddress, agentRunId, assigner,
          rank: assigner.rootSubjectKind === "agent" ? "run_agent" as const : "configured" as const,
          // An agent at its own address; else an org's mounted team, whose address its coordinator answers.
          ref: agent?.address === address
            ? (agent.agentDefinitionId ? Object.freeze({ kind: "agent" as const, definitionId: agent.agentDefinitionId }) : null)
            : await this.teamRefOf(assigner, address) }));
      }
    }
    return reached;
  }

  /**
   * Steps 1 and 3 from the run's own file (the file a loaded root's own index is built from, so the two agree): the
   * agent run a message to `address` reaches in this run; a team address answers by its coordinator. `null`: none.
   */
  async ownReceiverOf(address: string): Promise<string | null> {
    return (await this.tree.standingOf(this.run))?.agents.get(address) ?? null;
  }

  /**
   * `send_message_to(address)` beyond the run's own steps (its root resolved steps 1 and 3), for a run that works on a
   * Task: first, for a team run, the correction of an address that is the name the team was delegated to, or that name
   * and one of its own members (refused with the address to use, SR-036). It comes before step 2 (SR-081): such an
   * address means the team's own teammate, never the assigning run's namesake agent, which stays reachable by run ID.
   * Then step 2's receiver. `null` when step 2 does not apply or reaches no agent there.
   */
  async resolve(address: string): Promise<string | null> {
    const reached = await this.stepTwo();
    if (!reached) return null;
    if (this.run.rootSubjectKind === "agent_team") await this.correct(address);
    return reached.get(address)?.agentRunId ?? null;
  }

  /**
   * The sender's own address as this run (the receiver) may use it (contract §2.5, `model.py` `reaching_address`): only
   * when this run's resolution of it reaches the sender. Its own run's addresses come first, so an address its own run
   * has never reaches another run.
   */
  async reachingAddressOf(sender: CollaborationMemberExecutionIdentity): Promise<string | null> {
    // Two units of one container: the sender's Org address, which reaches it from every other unit (step 2, R-1'').
    if (this.containers && await this.containers.sameContainer(sender.root, this.run)) return this.containers.orgAddressOf(sender);
    const own = sender.memberAddress as string;
    if (await this.ownReceiverOf(own)) return null;
    return (await this.stepTwo())?.get(own)?.agentRunId === sender.agentRunId ? own : null;
  }

  /**
   * A sender of another unit of this unit run's container, by its Org address (the stored views' sender names, as the
   * received header named it); `null` when this run is no unit or the sender is no agent of another unit.
   */
  async containerSenderAddressOf(agentRunId: string): Promise<string | null> {
    const containedIn = await this.containedIn(this.run);
    const unit = containedIn ? await this.containers!.unitOfAgent(containedIn.orgRunId, agentRunId) : null;
    return unit && rootExecutionIdentityKey(unit.run) !== rootExecutionIdentityKey(this.run) ? unit.orgAddress : null;
  }

  /**
   * `delegate_task`'s placement at a configured placement step 2 reaches: a copy that starts from that placement's
   * snapshot, as base answered a hosted copy; `null` for any other address (an agent run's own agent is none).
   */
  async delegationPlacementAt(address: AgentTeamAddress): Promise<DelegationPlacement | null> {
    const reached = (await this.stepTwo())?.get(address);
    const containedIn = reached && !this.entries().length ? await this.containedIn(this.run) : null;
    if (containedIn) {
      // Another unit of the unit run's container, as the Org's configured placement answered before.
      const source = await this.containers!.delegationSourceAt(containedIn.orgRunId, address);
      return source ? sourcedPlacement(address, source, "configured_placement") : null;
    }
    const found = reached?.rank === "configured" ? await this.files.configuredPlacementOf(reached.assigner, address) : null;
    return found ? sourcedPlacement(address, configuredPlacementSource(found.node, found.handoffs), "configured_placement") : null;
  }

  /**
   * The collaboration context of an agent run's own agent (SR-058): a task agent when another run delegated it; a copy
   * of an org's configured agent keeps that address's handoff rules and reads the org's instruction.
   */
  async agentCollaboration(): Promise<AgentRunCollaboration> {
    const unit = await this.orgUnit();
    if (unit) {
      // A direct Org agent: the Org's rules from its Org address and the Org's instruction, team-scoped, as in the Org before.
      return Object.freeze({ role: "org_agent", teamScoped: true, inOrganization: true,
        placement: Object.freeze({ handoffs: () => unit.orgRulesFrom(unit.containedIn.address), orgDefinitionId: unit.orgDefinitionId }) });
    }
    const reference = runReferenceOf(this.run);
    const entry = reference ? this.tree.currentTaskOf(reference) : null;
    if (!entry) return Object.freeze({ role: "standalone_agent", placement: null, teamScoped: false, inOrganization: false });
    // The Org is the delegating run (an older entry) or the container of the unit run that delegated it.
    const delegatingRun = entry.delegatedFrom.delegatingRun;
    const address = entry.recipientAddress;
    const org = delegatingRun.rootSubjectKind === "agent_org" ? await this.files.orgPlacementsOf(delegatingRun.rootRunId)
      : await this.containerPlacementsOf(delegatingRun, address);
    const handoffs = Object.freeze((org?.handoffs ?? []).filter((handoff) => handoff.from === address));
    const topRun = this.tree.topOf(this.run);
    const top = topRun.rootSubjectKind;
    return Object.freeze({ role: "task_agent", inOrganization: false, placement: org && org.agentAddresses.includes(address)
      ? Object.freeze({ handoffs: () => handoffs, orgDefinitionId: org.orgDefinitionId }) : null,
    teamScoped: top === "agent_team" || top === "agent_org" || Boolean(await this.containedIn(topRun)) });
  }

  /**
   * The organization line: the run is a unit of an Org container, or works on a Task an org (or one of its units)
   * assigned, exactly when step 2 reaches the org.
   */
  async inOrganization(): Promise<boolean> {
    if (await this.containedIn(this.run)) return true;
    for (const assigner of this.assigners()) {
      if (assigner.rootSubjectKind === "agent_org" || await this.containedIn(assigner)) return true;
    }
    return false;
  }

  /**
   * The rows under the run (CR-461-033): its open subtree, each row with the run that delegated it, in delegation
   * order with each run's own rows after it. A peer's run is a row of its own; its delegations live on its node.
   */
  rows(): readonly SubtreeRow[] {
    const rows: SubtreeRow[] = [];
    const seen = new Set<string>([rootExecutionIdentityKey(this.run)]);
    const visit = (parent: RootExecutionIdentity): void => {
      for (const child of this.tree.openChildrenOf(parent)) {
        const key = rootExecutionIdentityKey(runIdentityOf(child.run));
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(Object.freeze({ ...child, parent }));
        if (child.nodeId === undefined) visit(runIdentityOf(child.run));
      }
    };
    visit(this.run);
    return rows;
  }

  /** Contract §10.2: whether this run and `other` may message each other. */
  canMessage(other: RootExecutionIdentity): boolean { return this.tree.canMessage(this.run, other); }

  /** Every local run below this run, open or closed (token totals, the restart notice). */
  subtree() { return this.tree.subtreeOf(this.run); }

  private entries() {
    const reference = runReferenceOf(this.run);
    return reference ? this.tree.tasksOf(reference) : [];
  }

  /**
   * A unit run's Org (org-teams-follow-definition): its fixed back-link, the Org's definition, and the container's Org
   * rules from an Org address, read at each call (they follow the Org's definition). `null` for a run outside any Org.
   */
  async orgUnit(): Promise<OrgUnitOfRun | null> {
    const containedIn = await this.containedIn(this.run);
    const org = containedIn ? await this.containers!.loadContainer(containedIn.orgRunId) : null;
    if (!containedIn || !org) return null;
    return Object.freeze({ containedIn, orgDefinitionId: org.orgDefinitionId,
      orgRulesFrom: (address: string) => this.containers!.orgRulesFrom(containedIn.orgRunId, address) });
  }

  private async containedIn(run: RootExecutionIdentity) {
    return this.containers ? this.containers.containedInOf(run) : null;
  }

  /** A unit run's Org as an Org's placements were read for a copy: its direct agents' addresses and its Org rules from `address`. */
  private async containerPlacementsOf(unitRun: RootExecutionIdentity, address: string): Promise<OrgPlacements | null> {
    const containedIn = await this.containedIn(unitRun);
    const org = containedIn ? await this.containers!.loadContainer(containedIn.orgRunId) : null;
    if (!containedIn || !org) return null;
    const agentAddresses = (await this.containers!.placementsOf(containedIn.orgRunId))
      .flatMap((placement) => placement.run.rootSubjectKind === "agent" ? [placement.orgAddress as string] : []);
    return Object.freeze({ orgDefinitionId: org.orgDefinitionId, agentAddresses, handoffs: this.containers!.orgRulesFrom(containedIn.orgRunId, address) });
  }

  /** Step 2 of a unit run: every Org address its container's other units answer; `null` for a run outside any Org. */
  private async containerStepTwo(): Promise<ReadonlyMap<string, ReachedPlacement> | null> {
    const containedIn = await this.containedIn(this.run);
    if (!containedIn) return null;
    const container = createAgentOrgRootExecutionIdentity(containedIn.orgRunId);
    const reached = new Map<string, ReachedPlacement>();
    for (const placement of await this.containers!.placementsOf(containedIn.orgRunId)) {
      if (rootExecutionIdentityKey(placement.run) === rootExecutionIdentityKey(this.run) || reached.has(placement.orgAddress)) continue;
      reached.set(placement.orgAddress, Object.freeze({ address: placement.orgAddress, agentRunId: placement.agentRunId, ref: placement.ref,
        rank: "configured" as const, assigner: container }));
    }
    return reached;
  }

  /** A mounted team's definition, from its org's own file. */
  private async teamRefOf(assigner: RootExecutionIdentity, address: string): Promise<CatalogDefinitionRef | null> {
    if (assigner.rootSubjectKind !== "agent_org") return null;
    const placement = await this.files.configuredPlacementOf(assigner, address);
    return placement && !("agentRunId" in placement.node) ? Object.freeze({ kind: "agent_team", definitionId: placement.node.teamDefinitionId }) : null;
  }

  private async correct(address: string): Promise<void> {
    const prefixes = [...new Set(this.entries().map((entry) => entry.recipientAddress))].sort();
    const own = await this.tree.standingOf(this.run);
    for (const prefix of prefixes) {
      if (address === prefix && own?.coordinatorAddress) {
        throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND",
          `${NO_LONGER(address)} Your team as a whole has no address; its coordinator is ${own.coordinatorAddress}.`);
      }
      const rest = address.slice(prefix.length);
      if (address.startsWith(`${prefix}/`) && own?.agents.has(rest)) {
        throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `${NO_LONGER(address)} Use ${rest}.`);
      }
    }
  }
}
