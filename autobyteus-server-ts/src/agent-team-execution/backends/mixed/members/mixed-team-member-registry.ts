import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamRunMemberConfig } from "../../../domain/team-run-config.js";
import {
  getSelectorTopLevelName,
  resolveTeamMemberSelector,
  type TeamMemberSelector,
} from "../../../domain/team-run-member-identity.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import type { MixedSubTeamRunFactory } from "../mixed-sub-team-run-factory.js";
import { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import { MixedSubTeamMemberHandle } from "./mixed-sub-team-member-handle.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle, MixedTeamStatusChange } from "./mixed-team-member-handle.js";
import type { InterAgentMessageDeliveryRequest } from "../../../domain/inter-agent-message-delivery.js";

export class MixedTeamMemberRegistry {
  private readonly handles = new Map<string, MixedTeamMemberHandle>();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    subTeamRunFactory: MixedSubTeamRunFactory;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryRequest) => Promise<AgentOperationResult>;
  }) {}

  listHandles(): MixedTeamMemberHandle[] {
    return Array.from(this.handles.values());
  }

  resolveContext(selector: TeamMemberSelector): MixedTeamMemberContext | AgentOperationResult {
    const resolution = resolveTeamMemberSelector(selector, this.options.teamContext.runtimeContext.memberContexts);
    if (resolution.ok) {
      return resolution.member;
    }

    const topLevelName = getSelectorTopLevelName(selector);
    if (topLevelName) {
      const topLevelResolution = resolveTeamMemberSelector(
        { kind: "top_level_name", memberName: topLevelName },
        this.options.teamContext.runtimeContext.memberContexts,
      );
      if (topLevelResolution.ok && topLevelResolution.member.memberKind === "agent_team") {
        return topLevelResolution.member;
      }
    }

    return { accepted: false, code: resolution.code, message: resolution.message };
  }

  getOrCreate(context: MixedTeamMemberContext): MixedTeamMemberHandle {
    const existing = this.handles.get(context.memberRouteKey) ?? null;
    if (existing) {
      return existing;
    }
    const config = this.resolveConfig(context);
    const handle = context.memberKind === "agent"
      ? new MixedAgentMemberHandle({
          teamContext: this.options.teamContext,
          context,
          config: config as Extract<TeamRunMemberConfig, { memberKind: "agent" }>,
          publish: this.options.publish,
          notifyStatusChange: this.options.notifyStatusChange,
          deliverInterAgentMessage: this.options.deliverInterAgentMessage,
        })
      : new MixedSubTeamMemberHandle({
          parentContext: this.options.teamContext,
          context,
          config: config as Extract<TeamRunMemberConfig, { memberKind: "agent_team" }>,
          subTeamRunFactory: this.options.subTeamRunFactory,
          publish: this.options.publish,
          notifyStatusChange: this.options.notifyStatusChange,
          deliverInterAgentMessage: this.options.deliverInterAgentMessage,
        });
    this.handles.set(context.memberRouteKey, handle);
    return handle;
  }

  dispose(): void {
    for (const handle of this.handles.values()) {
      handle.dispose();
    }
    this.handles.clear();
  }

  private resolveConfig(context: MixedTeamMemberContext): TeamRunMemberConfig {
    const stack = [...(this.options.teamContext.config?.memberTree ?? [])];
    while (stack.length > 0) {
      const member = stack.shift()!;
      if (member.memberRouteKey === context.memberRouteKey || member.memberRunId === context.memberRunId) {
        return member;
      }
      if (member.memberKind === "agent_team") {
        stack.push(...member.memberConfigs);
      }
    }
    throw new Error(`Missing member config for '${context.memberRouteKey}'.`);
  }
}
