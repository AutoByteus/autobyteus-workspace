import type { AgentOperationResult } from "../../../../agent-execution/domain/agent-operation-result.js";
import type { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import { getParentAgentTeamAddress, type AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryIntent } from "../../../domain/inter-agent-message-delivery.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import { MixedSubTeamMemberHandle } from "./mixed-sub-team-member-handle.js";
import type { MixedTeamEventPublish, MixedTeamMemberHandle } from "./mixed-team-member-handle.js";
import { MixedTeamMemberConfigResolver } from "./mixed-team-member-config-resolver.js";

export type PersistentMemberRegistryAccess = {
  resolveContext(address: AgentTeamAddress): MixedTeamMemberContext | AgentOperationResult;
  getOrCreate(context: MixedTeamMemberContext): MixedTeamMemberHandle;
};

export class MixedPersistentMemberRegistry implements PersistentMemberRegistryAccess {
  private readonly handles = new Map<AgentTeamAddress, MixedTeamMemberHandle>();

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    configResolver: MixedTeamMemberConfigResolver;
    subTeamRunFactory: import("../mixed-sub-team-run-factory.js").MixedSubTeamRunFactory;
    agentRunManager?: AgentRunManager;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<AgentOperationResult>;
  }) {}

  listHandles(): MixedTeamMemberHandle[] { return [...this.handles.values()]; }

  remove(address: AgentTeamAddress): boolean {
    const handle = this.handles.get(address);
    if (!handle) return false;
    handle.dispose();
    return this.handles.delete(address);
  }

  resolveContext(address: AgentTeamAddress): MixedTeamMemberContext | AgentOperationResult {
    let candidate: AgentTeamAddress | null = address;
    while (candidate && getParentAgentTeamAddress(candidate) !== this.options.teamContext.teamAddress) {
      candidate = getParentAgentTeamAddress(candidate);
    }
    const context = candidate
      ? this.options.teamContext.runtimeContext.memberContexts.find((item) => item.address === candidate) ?? null
      : null;
    return context ?? {
      accepted: false,
      code: "TARGET_MEMBER_NOT_FOUND",
      message: `Team member '${address}' was not found below AgentTeam '${this.options.teamContext.teamAddress}'.`,
    };
  }

  getOrCreate(context: MixedTeamMemberContext): MixedTeamMemberHandle {
    const existing = this.handles.get(context.address);
    if (existing) return existing;
    const node = this.options.configResolver.resolve(context);
    const handle = context.kind === "agent" && node.kind === "agent"
      ? new MixedAgentMemberHandle({
          teamContext: this.options.teamContext,
          context,
          config: node,
          agentRunManager: this.options.agentRunManager,
          publish: this.options.publish,
          deliverInterAgentMessage: this.options.deliverInterAgentMessage,
        })
      : context.kind === "agent_team" && node.kind === "agent_team"
        ? new MixedSubTeamMemberHandle({
            parentContext: this.options.teamContext,
            context,
            config: node,
            subTeamRunFactory: this.options.subTeamRunFactory,
            publish: this.options.publish,
            deliverInterAgentMessage: this.options.deliverInterAgentMessage,
          })
        : null;
    if (!handle) throw new Error(`Runtime/config kind mismatch at '${context.address}'.`);
    this.handles.set(context.address, handle);
    return handle;
  }

  dispose(): void {
    for (const handle of this.handles.values()) handle.dispose();
    this.handles.clear();
  }
}
