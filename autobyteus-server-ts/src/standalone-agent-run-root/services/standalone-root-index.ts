import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  messagePlacement,
  type CollaborationMessagePlacement,
  type MessageRecipientIndexPort,
  type SenderTeamInstance,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { InstanceDefinitions, MentionViewerIndexPort } from "../../agent-collaboration/collaborators/mention-viewer.js";
import type { DelegationSourceIndexPort } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import type { StandaloneRunAgent } from "../domain/standalone-run-agent.js";

/**
 * A standalone run's addresses (contract §2.3): its one agent at its own address. It has no team, so an address
 * resolves to the run's agent or to nothing in this run (a run that works on a Task continues with step 2, from its
 * collaboration tree).
 */
export class StandaloneRootIndex implements MessageRecipientIndexPort, MentionViewerIndexPort, DelegationSourceIndexPort {
  constructor(private readonly agent: StandaloneRunAgent) {}

  teamInstancesOf(): readonly SenderTeamInstance[] { return Object.freeze([]); }
  memberOfInstance(): CollaborationMessagePlacement | null { return null; }
  getMessagePlacement(address: AgentTeamAddress): CollaborationMessagePlacement | null {
    return address === this.agent.address ? messagePlacement("agent", address, { agentRunId: this.agent.agentRunId, address }) : null;
  }
  /** Only the run's own address is its own. */
  isOwnTeamAddress(_senderAgentRunId: string, address: AgentTeamAddress): boolean { return address === this.agent.address; }
  /** A standalone run has no team members that could leave. */
  formerMemberAt(_address: AgentTeamAddress): null { return null; }
  instanceDefinitionsOf(): InstanceDefinitions | null { return null; }
  agentAddressOf(agentRunId: string): AgentTeamAddress | null { return agentRunId === this.agent.agentRunId ? this.agent.address : null; }
  isRunAgent(agentRunId: string): boolean { return agentRunId === this.agent.agentRunId; }
}
