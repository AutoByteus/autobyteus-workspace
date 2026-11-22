import type { CatalogDefinitionRef } from "../collaborators/catalog-address-map.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import type { AgentTeamAddress } from "./agent-team-address.js";
import type { CollaborationHandoff } from "./collaboration-handoff.js";
import type { ContainedIn } from "./contained-in.js";

/**
 * One Org address a container's units answer (design R-2 `placementAt`): an agent unit's address (its agent), a Team
 * unit's address (its coordinator) or a Team unit member's Org address. `memberAddress` is the receiver's address in its
 * own run (team space for a Team unit member); `ref` is what stands at the address.
 */
export type OrgUnitPlacement = Readonly<{
  orgAddress: AgentTeamAddress;
  run: RootExecutionIdentity;
  agentRunId: string;
  memberAddress: AgentTeamAddress;
  ref: CatalogDefinitionRef;
}>;

/**
 * The narrow port through which a unit run asks its Org container (design R-2, N-1): read-only, answered by the container
 * directory the composition root creates; it delivers nothing. A unit run holds only its fixed `containedIn`.
 */
export interface OrgContainerPort {
  /** The run's fixed back-link to its container; `null` for a run outside any Org (or one whose file is absent). */
  containedInOf(run: RootExecutionIdentity): Promise<ContainedIn | null>;
  /** N-1: whether two different runs are units of one container: the one place this is decided. */
  sameContainer(a: RootExecutionIdentity, b: RootExecutionIdentity): Promise<boolean>;
  /**
   * The unit run of the container that has this agent (an agent unit's own agent, a Team unit's member, current or
   * former) and the agent's Org address; `null`: none.
   */
  unitOfAgent(orgRunId: string, agentRunId: string): Promise<Readonly<{ run: RootExecutionIdentity; orgAddress: AgentTeamAddress }> | null>;
  /** Every Org address the container's units answer, in unit order (step 2 for a unit run, design R-1). */
  placementsOf(orgRunId: string): Promise<readonly OrgUnitPlacement[]>;
  /**
   * The snapshot a copy delegated to a unit's Org address starts from (as an Org's configured placement answered before):
   * an agent unit's (or a Team unit member's) definition and launch; a Team unit's layout mounted at its address with its
   * members' rules (the Team's own and the Org rules from its members). `null` for an address no unit has.
   */
  delegationSourceAt(orgRunId: string, orgAddress: AgentTeamAddress): Promise<TaskExecutionSource | null>;
  /** The container's Org rules (Org addresses) from one Org address, as they are now (read after `loadContainer`). */
  orgRulesFrom(orgRunId: string, orgAddress: string): readonly CollaborationHandoff[];
  /**
   * Reads the container file so `orgRulesFrom` answers (a unit's agent context is built after this): the Org's definition,
   * whose instruction its direct agents read; `null` when the container file is absent.
   */
  loadContainer(orgRunId: string): Promise<Readonly<{ orgDefinitionId: string }> | null>;
  /** An agent of a unit run as the Org names it: an agent unit's address, a Team unit member's `P/x`; `null` outside. */
  orgAddressOf(identity: Pick<CollaborationMemberExecutionIdentity, "root" | "memberAddress">): Promise<AgentTeamAddress | null>;
}
