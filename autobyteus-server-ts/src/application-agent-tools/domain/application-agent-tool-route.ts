import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  ApplicationAgentToolDeclarationSnapshot,
} from "./application-agent-tool-declaration-snapshot.js";
import { cloneApplicationAgentToolDeclarationSnapshot } from "./application-agent-tool-declaration-snapshot.js";

export type ApplicationAgentToolExecutionIdentity = Readonly<{
  applicationId: string;
  bindingId: string;
  producer:
    | Readonly<{ kind: "agent"; agentRunId: string }>
    | Readonly<{
        kind: "team_member";
        rootTeamRunId: string;
        memberAddress: AgentTeamAddress;
        agentRunId: string;
      }>;
}>;

export type ApplicationAgentToolRoute = Readonly<{
  kind: "application_agent_tool";
  identity: ApplicationAgentToolExecutionIdentity;
  declarationSnapshot: ApplicationAgentToolDeclarationSnapshot;
}>;

export const cloneApplicationAgentToolRoute = (
  route: ApplicationAgentToolRoute,
): ApplicationAgentToolRoute => Object.freeze({
  kind: "application_agent_tool",
  identity: Object.freeze({
    applicationId: route.identity.applicationId,
    bindingId: route.identity.bindingId,
    producer: Object.freeze({ ...route.identity.producer }),
  }),
  declarationSnapshot: cloneApplicationAgentToolDeclarationSnapshot(
    route.declarationSnapshot,
  ),
});
