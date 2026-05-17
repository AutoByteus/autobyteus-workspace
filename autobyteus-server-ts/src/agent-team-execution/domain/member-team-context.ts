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
  parentTeamDefinitionId?: string | null;
  parentTeamName?: string | null;
  representedSubTeam: TeamRepresentedSubTeam;
  parentMembers: AgentMemberTeamDescriptor[];
};

export class MemberTeamContext {
  readonly teamRunId: string;
  readonly teamDefinitionId: string;
  readonly teamName: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly memberName: string;
  readonly memberPath: string[];
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly coordinatorMemberRouteKey: string | null;
  readonly teamInstruction: string | null;
  readonly members: MemberTeamDescriptor[];
  readonly parentBoundary: ParentBoundaryCommunicationContext | null;
  readonly communicationRecipients: MemberTeamRecipientDescriptor[];
  readonly allowedRecipientNames: string[];
  readonly sendMessageToEnabled: boolean;
  readonly deliverInterAgentMessage: InterAgentMessageDeliveryHandler | null;

  constructor(input: {
    teamRunId: string;
    teamDefinitionId: string;
    teamName?: string | null;
    teamBackendKind: TeamBackendKind;
    memberName: string;
    memberPath?: string[] | null;
    memberRouteKey: string;
    memberRunId: string;
    coordinatorMemberRouteKey?: string | null;
    teamInstruction?: string | null;
    members?: MemberTeamDescriptor[] | null;
    parentBoundary?: ParentBoundaryCommunicationContext | null;
    communicationRecipients?: MemberTeamRecipientDescriptor[] | null;
    allowedRecipientNames?: string[] | null;
    sendMessageToEnabled?: boolean;
    deliverInterAgentMessage?: InterAgentMessageDeliveryHandler | null;
  }) {
    this.teamRunId = input.teamRunId;
    this.teamDefinitionId = input.teamDefinitionId;
    this.teamName = input.teamName?.trim() || input.teamDefinitionId;
    this.teamBackendKind = input.teamBackendKind;
    this.memberName = input.memberName;
    this.memberPath = input.memberPath?.length ? [...input.memberPath] : [input.memberName];
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.coordinatorMemberRouteKey = input.coordinatorMemberRouteKey?.trim() || null;
    this.teamInstruction = input.teamInstruction ?? null;
    this.members = [...(input.members ?? [])];
    this.parentBoundary = input.parentBoundary ?? null;
    this.communicationRecipients = [...(input.communicationRecipients ?? [])];
    this.allowedRecipientNames = [...(input.allowedRecipientNames ?? this.communicationRecipients.map((recipient) => recipient.recipientName))];
    this.sendMessageToEnabled = Boolean(input.sendMessageToEnabled);
    this.deliverInterAgentMessage = input.deliverInterAgentMessage ?? null;
  }
}
