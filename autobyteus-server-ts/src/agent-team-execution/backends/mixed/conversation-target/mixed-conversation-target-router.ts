import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import {
  buildConversationAddressFromSegments,
  buildInvalidConversationTargetResult,
  conversationTargetMemberSegmentToSelector,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetMemberSegment,
  type ConversationTargetSegment,
} from "../../../domain/conversation-target-address.js";
import {
  selectorToRouteKey,
  stripSelectorTopLevel,
} from "../../../domain/team-run-member-identity.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import type { PersistentMemberRegistryAccess } from "../members/mixed-persistent-member-registry.js";
import type { MixedTaskAgentInstanceRegistry } from "../members/mixed-task-agent-instance-registry.js";
import type { MixedTaskTeamInstanceRegistry } from "../members/mixed-task-team-instance-registry.js";

const isOperationResult = (
  value: MixedTeamMemberContext | AgentOperationResult,
): value is AgentOperationResult => "accepted" in value;

type MixedConversationTargetRouterOptions = {
  getTeamContext: () => import("../../../domain/team-run-context.js").TeamRunContext<MixedTeamRunContext> | null;
  persistentMembers: PersistentMemberRegistryAccess;
  taskAgentInstances: MixedTaskAgentInstanceRegistry;
  taskTeamInstances: MixedTaskTeamInstanceRegistry;
};

type SegmentCursor = {
  current: ConversationTargetSegment;
  remaining: ConversationTargetSegment[];
};

export class MixedConversationTargetRouter {
  constructor(private readonly options: MixedConversationTargetRouterOptions) {}

  async postMessage(
    message: AgentInputUserMessage,
    address: ConversationTargetAddress,
  ): Promise<AgentOperationResult> {
    if (!this.options.getTeamContext()) {
      return {
        accepted: false,
        code: "RUN_NOT_FOUND",
        message: "Run 'unknown' is not active.",
      };
    }
    const normalizedAddress = normalizeConversationTargetAddress(address);
    if (normalizedAddress.segments.length === 0) {
      return buildInvalidConversationTargetResult("Conversation target requires at least one segment.");
    }
    return this.postToSegments(message, normalizedAddress.segments);
  }

  private async postToSegments(
    message: AgentInputUserMessage,
    segments: ConversationTargetSegment[],
  ): Promise<AgentOperationResult> {
    const cursor = this.readCursor(segments);
    if (!cursor) {
      return buildInvalidConversationTargetResult("Conversation target requires at least one segment.");
    }
    if (cursor.current.kind !== "member") {
      return buildInvalidConversationTargetResult("Conversation target must start with a member segment.");
    }
    return this.postToMemberSegment(message, cursor.current, cursor.remaining);
  }

  private async postToMemberSegment(
    message: AgentInputUserMessage,
    memberSegment: ConversationTargetMemberSegment,
    remaining: ConversationTargetSegment[],
  ): Promise<AgentOperationResult> {
    const selector = conversationTargetMemberSegmentToSelector(memberSegment);
    const requestedRouteKey = selectorToRouteKey(selector);
    const resolved = this.options.persistentMembers.resolveContext(selector);
    if (isOperationResult(resolved)) {
      return resolved;
    }

    if (resolved.memberRouteKey !== requestedRouteKey) {
      return this.enterStructuralSubteamRemainder(
        message,
        resolved,
        selector,
        remaining,
      );
    }

    const next = this.readCursor(remaining);
    if (!next) {
      const result = await this.options.persistentMembers.getOrCreate(resolved).postMessage(message);
      return result;
    }

    if (next.current.kind === "member") {
      if (resolved.memberKind !== "agent_team") {
        return buildInvalidConversationTargetResult(
          `Member '${resolved.memberRouteKey}' is an agent and cannot contain child member segments.`,
        );
      }
      return this.options.persistentMembers.getOrCreate(resolved).postMessageToConversationTarget(
        message,
        buildConversationAddressFromSegments(remaining),
      );
    }

    if (next.current.kind === "task_agent") {
      if (resolved.memberKind !== "agent") {
        return buildInvalidConversationTargetResult(
          `Task-agent segment must follow an agent member; '${resolved.memberRouteKey}' is not an agent.`,
        );
      }
      if (next.remaining.length > 0) {
        return buildInvalidConversationTargetResult("Task-agent segment must be terminal.");
      }
      return this.options.taskAgentInstances.postMessage(
        resolved.memberRouteKey,
        next.current.taskAgentRunId,
        message,
      );
    }

    if (resolved.memberKind !== "agent_team") {
      return buildInvalidConversationTargetResult(
        `Task-team segment must follow a team member; '${resolved.memberRouteKey}' is not a team.`,
      );
    }
    return this.options.taskTeamInstances.postMessageToConversationTarget(
      resolved.memberRouteKey,
      next.current.taskTeamRunId,
      buildConversationAddressFromSegments(next.remaining),
      message,
    );
  }

  private enterStructuralSubteamRemainder(
    message: AgentInputUserMessage,
    resolved: MixedTeamMemberContext,
    selector: import("../../../domain/team-run-member-identity.js").TeamMemberSelector,
    remaining: ConversationTargetSegment[],
  ): Promise<AgentOperationResult> {
    if (resolved.memberKind !== "agent_team") {
      return Promise.resolve(
        buildInvalidConversationTargetResult(
          `Member selector '${selectorToRouteKey(selector)}' cannot be resolved through non-team member '${resolved.memberRouteKey}'.`,
        ),
      );
    }
    const childSelector = stripSelectorTopLevel(selector);
    if (!childSelector) {
      return Promise.resolve(
        buildInvalidConversationTargetResult(
          `Member selector '${selectorToRouteKey(selector)}' did not contain a child path.`,
        ),
      );
    }
    return this.options.persistentMembers.getOrCreate(resolved).postMessageToConversationTarget(
      message,
      buildConversationAddressFromSegments([
        { kind: "member", memberRouteKey: selectorToRouteKey(childSelector) },
        ...remaining,
      ]),
    );
  }

  private readCursor(segments: ConversationTargetSegment[]): SegmentCursor | null {
    const [current, ...remaining] = segments;
    return current ? { current, remaining } : null;
  }
}
