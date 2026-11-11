import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  messagePlacement,
  type CollaborationMessagePlacement,
  type MessageRecipientIndexPort,
  type SenderTeamInstance,
} from "../../agent-collaboration/collaborators/message-recipient-resolution.js";
import type { InstanceDefinitions, MentionViewerIndexPort } from "../../agent-collaboration/collaborators/mention-viewer.js";
import type { DelegationSourceIndexPort } from "../../agent-collaboration/collaborators/catalog-delegation.js";
import type { StandaloneRootHost } from "../domain/standalone-root-host.js";

/**
 * A standalone run's addresses (contract §2.3): its one agent at its own address. It has no team, so an address
 * resolves to the run's agent or to nothing in this run (a run that works on a Task continues with step 2,
 * `CrossRunAddressResolution`).
 */
export class StandaloneRootIndex implements MessageRecipientIndexPort, MentionViewerIndexPort, DelegationSourceIndexPort {
  constructor(private readonly host: StandaloneRootHost) {}

  teamInstancesOf(): readonly SenderTeamInstance[] { return Object.freeze([]); }
  memberOfInstance(): CollaborationMessagePlacement | null { return null; }
  getMessagePlacement(address: AgentTeamAddress): CollaborationMessagePlacement | null {
    return address === this.host.address ? messagePlacement("agent", address, { agentRunId: this.host.agentRunId, address }) : null;
  }
  /** Only the run's own address is its own. */
  isOwnTeamAddress(_senderAgentRunId: string, address: AgentTeamAddress): boolean { return address === this.host.address; }
  instanceDefinitionsOf(): InstanceDefinitions | null { return null; }
  agentAddressOf(agentRunId: string): AgentTeamAddress | null { return agentRunId === this.host.agentRunId ? this.host.address : null; }
  isHost(agentRunId: string): boolean { return agentRunId === this.host.agentRunId; }
}
