import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { TeamRunMemberConfig } from "../../../domain/team-run-config.js";
import {
  getSelectorTopLevelName,
  resolveTeamMemberSelector,
  selectorFromMemberPath,
  selectorFromMemberRouteKey,
  type TeamMemberSelector,
} from "../../../domain/team-run-member-identity.js";
import type { InterAgentMessageDeliveryIntent } from "../../../domain/inter-agent-message-delivery.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import { MixedSubTeamMemberHandle } from "./mixed-sub-team-member-handle.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle, MixedTeamStatusChange } from "./mixed-team-member-handle.js";
import { MixedTeamMemberConfigResolver } from "./mixed-team-member-config-resolver.js";
import type { MemberTeamContextBuilder } from "../../../services/member-team-context-builder.js";
import type {
  AgentToolMcpSessionAuthority,
} from "../../../../agent-tools/mcp/agent-tool-mcp-session-service.js";

export type PersistentMemberRegistryAccess = {
  resolveContext(selector: TeamMemberSelector): MixedTeamMemberContext | AgentOperationResult;
  getOrCreate(context: MixedTeamMemberContext): MixedTeamMemberHandle;
};

export class MixedPersistentMemberRegistry implements PersistentMemberRegistryAccess {
  private readonly handles = new Map<string, MixedTeamMemberHandle>();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    configResolver: MixedTeamMemberConfigResolver;
    subTeamRunFactory: import("../mixed-sub-team-run-factory.js").MixedSubTeamRunFactory;
    agentRunManager?: AgentRunManager;
    agentToolMcpSessionAuthority?: AgentToolMcpSessionAuthority;
    memberTeamContextBuilder: MemberTeamContextBuilder;
    publish: MixedTeamEventPublish;
    notifyStatusChange: MixedTeamStatusChange;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
  }) {}

  listHandles(): MixedTeamMemberHandle[] { return [...this.handles.values()]; }

  remove(memberRouteKey: string): boolean {
    const normalized = memberRouteKey.trim();
    const handle = this.handles.get(normalized) ?? null;
    if (!handle) return false;
    handle.dispose();
    this.handles.delete(normalized);
    return true;
  }

  resolveContext(selector: TeamMemberSelector): MixedTeamMemberContext | AgentOperationResult {
    const resolution = resolveTeamMemberSelector(
      selector,
      this.options.teamContext.runtimeContext.memberContexts,
    );
    if (resolution.ok) return resolution.member;

    const topLevelName = getSelectorTopLevelName(selector);
    if (topLevelName) {
      const topLevelSelector = selector.kind === "path"
        ? selectorFromMemberPath([topLevelName])
        : selectorFromMemberRouteKey(topLevelName);
      const topLevelResolution = resolveTeamMemberSelector(
        topLevelSelector,
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
    if (existing) return existing;

    const config = this.options.configResolver.resolve(context);
    const handle = context.memberKind === "agent"
      ? new MixedAgentMemberHandle({
          teamContext: this.options.teamContext,
          context,
          config: config as Extract<TeamRunMemberConfig, { memberKind: "agent" }>,
          agentRunManager: this.options.agentRunManager,
          agentToolMcpSessionAuthority:
            this.options.agentToolMcpSessionAuthority,
          memberTeamContextBuilder: this.options.memberTeamContextBuilder,
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
    for (const handle of this.handles.values()) handle.dispose();
    this.handles.clear();
  }
}
