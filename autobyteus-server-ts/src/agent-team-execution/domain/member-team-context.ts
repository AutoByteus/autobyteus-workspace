import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  InterAgentMessageDeliveryHandler,
  InterAgentMessageParticipant,
  TeamMemberAddress,
  TeamRepresentedSubTeam,
} from "./inter-agent-message-delivery.js";
import type { TeamBackendKind } from "./team-backend-kind.js";
import type { TeamMemberSelector } from "./team-run-member-identity.js";

export type AgentMemberTeamDescriptor = {
  memberKind: "agent";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  role: string | null;
  description: string | null;
  address: TeamMemberAddress;
};

export type SubTeamRepresentativeDescriptor = {
  memberKind: "agent";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind?: RuntimeKind | null;
  role: string | null;
  description: string | null;
};

export type SubTeamMemberTeamDescriptor = {
  memberKind: "agent_team";
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
  teamDefinitionId: string;
  childTeamRunId?: string | null;
  coordinatorMemberRouteKey: string | null;
  representative: SubTeamRepresentativeDescriptor | null;
  role: string | null;
  description: string | null;
  address: TeamMemberAddress;
};

export type MemberTeamDescriptor = AgentMemberTeamDescriptor | SubTeamMemberTeamDescriptor;

export type MemberCommunicationRecipientScope =
  | "local_agent"
  | "subteam_representative"
  | "parent_boundary_agent";

export type MemberTeamRecipientDescriptor = {
  recipientName: string;
  scope: MemberCommunicationRecipientScope;
  participant: InterAgentMessageParticipant;
  delivery: {
    teamRunId: string;
    selector: TeamMemberSelector;
  };
  description: string | null;
  role: string | null;
};

export type ParentBoundaryCommunicationContext = {
  parentTeamRunId: string;
  representedSubTeam: TeamRepresentedSubTeam;
  parentMembers: AgentMemberTeamDescriptor[];
};

export class MemberTeamContext {
  readonly teamRunId: string;
  readonly teamDefinitionId: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly memberName: string;
  readonly memberPath: string[];
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly teamInstruction: string | null;
  readonly members: MemberTeamDescriptor[];
  readonly communicationRecipients: MemberTeamRecipientDescriptor[];
  readonly allowedRecipientNames: string[];
  readonly sendMessageToEnabled: boolean;
  readonly deliverInterAgentMessage: InterAgentMessageDeliveryHandler | null;

  constructor(input: {
    teamRunId: string;
    teamDefinitionId: string;
    teamBackendKind: TeamBackendKind;
    memberName: string;
    memberPath?: string[] | null;
    memberRouteKey: string;
    memberRunId: string;
    teamInstruction?: string | null;
    members?: MemberTeamDescriptor[] | null;
    communicationRecipients?: MemberTeamRecipientDescriptor[] | null;
    allowedRecipientNames?: string[] | null;
    sendMessageToEnabled?: boolean;
    deliverInterAgentMessage?: InterAgentMessageDeliveryHandler | null;
  }) {
    this.teamRunId = input.teamRunId;
    this.teamDefinitionId = input.teamDefinitionId;
    this.teamBackendKind = input.teamBackendKind;
    this.memberName = input.memberName;
    this.memberPath = input.memberPath?.length ? [...input.memberPath] : [input.memberName];
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.teamInstruction = input.teamInstruction ?? null;
    this.members = [...(input.members ?? [])];
    this.communicationRecipients = [...(input.communicationRecipients ?? [])];
    this.allowedRecipientNames = [...(input.allowedRecipientNames ?? this.communicationRecipients.map((recipient) => recipient.recipientName))];
    this.sendMessageToEnabled = Boolean(input.sendMessageToEnabled);
    this.deliverInterAgentMessage = input.deliverInterAgentMessage ?? null;
  }
}
