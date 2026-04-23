import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { InterAgentMessageDeliveryHandler } from "./inter-agent-message-delivery.js";
import type { TeamBackendKind } from "./team-backend-kind.js";

export type MemberTeamDescriptor = {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  role: string | null;
  description: string | null;
};

export class MemberTeamContext {
  readonly teamRunId: string;
  readonly teamDefinitionId: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly memberName: string;
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly teamInstruction: string | null;
  readonly members: MemberTeamDescriptor[];
  readonly allowedRecipientNames: string[];
  readonly sendMessageToEnabled: boolean;
  readonly deliverInterAgentMessage: InterAgentMessageDeliveryHandler | null;

  constructor(input: {
    teamRunId: string;
    teamDefinitionId: string;
    teamBackendKind: TeamBackendKind;
    memberName: string;
    memberRouteKey: string;
    memberRunId: string;
    teamInstruction?: string | null;
    members?: MemberTeamDescriptor[] | null;
    allowedRecipientNames?: string[] | null;
    sendMessageToEnabled?: boolean;
    deliverInterAgentMessage?: InterAgentMessageDeliveryHandler | null;
  }) {
    this.teamRunId = input.teamRunId;
    this.teamDefinitionId = input.teamDefinitionId;
    this.teamBackendKind = input.teamBackendKind;
    this.memberName = input.memberName;
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.teamInstruction = input.teamInstruction ?? null;
    this.members = [...(input.members ?? [])];
    this.allowedRecipientNames = [...(input.allowedRecipientNames ?? [])];
    this.sendMessageToEnabled = Boolean(input.sendMessageToEnabled);
    this.deliverInterAgentMessage = input.deliverInterAgentMessage ?? null;
  }
}
