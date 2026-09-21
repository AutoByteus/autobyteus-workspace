import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import {
  cloneCollaborationHandoffs,
  type CollaborationHandoff,
} from "../../domain/collaboration-handoff.js";
import {
  assertAgentTeamAddress,
  type AgentTeamAddress,
} from "../../domain/agent-team-address.js";
import {
  cloneCollaborationMemberExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "./root-execution-identity.js";
import {
  requireMemberTaskCommandCapability,
  type MemberTaskCommandCapability,
} from "../task/member-task-command-capability.js";

export type MemberLogicalMessageInput = Readonly<{
  recipientAddress: AgentTeamAddress;
  content: string;
  messageType?: string | null;
  referenceFiles?: readonly string[] | null;
}>;

export type MemberLogicalMessageDelivery = (
  input: MemberLogicalMessageInput,
) => Promise<AgentOperationResult>;

export class MemberCollaborationContext {
  readonly outgoingHandoffs: readonly CollaborationHandoff[];
  readonly deliverLogicalMessage: MemberLogicalMessageDelivery;

  constructor(input: {
    outgoingHandoffs?: readonly CollaborationHandoff[] | null;
    deliverLogicalMessage: MemberLogicalMessageDelivery;
  }) {
    if (typeof input.deliverLogicalMessage !== "function") {
      throw new Error("deliverLogicalMessage is required.");
    }
    this.outgoingHandoffs = Object.freeze(cloneCollaborationHandoffs(input.outgoingHandoffs ?? []));
    this.deliverLogicalMessage = async (message) => input.deliverLogicalMessage(normalizeMessage(message));
    Object.freeze(this);
  }
}

export class MemberExecutionContext {
  readonly identity: CollaborationMemberExecutionIdentity;
  readonly authoredEnclosingScopeInstruction: string | null;
  readonly collaboration: MemberCollaborationContext;
  readonly tasks: MemberTaskCommandCapability;

  constructor(input: {
    identity: CollaborationMemberExecutionIdentity;
    authoredEnclosingScopeInstruction?: string | null;
    collaboration: MemberCollaborationContext;
    tasks: MemberTaskCommandCapability;
  }) {
    this.identity = cloneCollaborationMemberExecutionIdentity(input.identity);
    this.authoredEnclosingScopeInstruction = optional(input.authoredEnclosingScopeInstruction);
    this.collaboration = new MemberCollaborationContext(input.collaboration);
    this.tasks = requireMemberTaskCommandCapability(input.tasks);
    if (!sameRootExecutionIdentity(this.identity.root, this.tasks.root)) {
      throw new Error("Member identity and task commands must belong to the same root.");
    }
    Object.freeze(this);
  }
}

const optional = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeMessage = (input: MemberLogicalMessageInput): MemberLogicalMessageInput => {
  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (!content) throw new Error("Logical message content is required.");
  return Object.freeze({
    recipientAddress: assertAgentTeamAddress(input.recipientAddress),
    content,
    messageType: optional(input.messageType),
    referenceFiles: Object.freeze((input.referenceFiles ?? []).map((entry, index) => {
      const normalized = typeof entry === "string" ? entry.trim() : "";
      if (!normalized) throw new Error(`referenceFiles[${index}] is required.`);
      return normalized;
    })),
  });
};
