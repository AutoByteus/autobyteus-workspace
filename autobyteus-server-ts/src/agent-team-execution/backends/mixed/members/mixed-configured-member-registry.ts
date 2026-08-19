import type { AgentRunManager } from "../../../../agent-execution/services/agent-run-manager.js";
import type { AgentTeamAddress } from "../../../../agent-collaboration/domain/agent-team-address.js";
import type { TeamRunContext } from "../../../domain/team-run-context.js";
import type { InterAgentMessageDeliveryIntent } from "../../../domain/inter-agent-message-delivery.js";
import type { MixedTeamRunContext, MixedTeamMemberContext } from "../mixed-team-run-context.js";
import { MixedAgentMemberHandle } from "./mixed-agent-member-handle.js";
import { MixedSubTeamMemberHandle } from "./mixed-sub-team-member-handle.js";
import type { MixedConfiguredMemberHandle, MixedTeamEventPublish } from "./mixed-team-member-handle.js";
import { MixedTeamMemberConfigResolver } from "./mixed-team-member-config-resolver.js";
import type { TeamAgentPlatformBinding } from "../../../domain/team-agent-platform-binding.js";

export type ConfiguredMemberRegistryAccess = {
  getOrCreate(context: MixedTeamMemberContext): MixedConfiguredMemberHandle;
};

export class MixedConfiguredMemberRegistry implements ConfiguredMemberRegistryAccess {
  private readonly handles = new Map<AgentTeamAddress, MixedConfiguredMemberHandle>();
  private materializationOpen = true;

  constructor(private readonly options: {
    teamContext: TeamRunContext<MixedTeamRunContext>;
    configResolver: MixedTeamMemberConfigResolver;
    subTeamRunFactory: import("../mixed-sub-team-run-factory.js").MixedSubTeamRunFactory;
    agentRunManager?: AgentRunManager;
    publish: MixedTeamEventPublish;
    deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<import("../../../../agent-execution/domain/agent-operation-result.js").AgentOperationResult>;
    acceptPlatformBinding: (binding: TeamAgentPlatformBinding) => Promise<void>;
  }) {}

  listHandles(): MixedConfiguredMemberHandle[] { return [...this.handles.values()]; }
  freezeMaterialization(): void { this.materializationOpen = false; }

  remove(address: AgentTeamAddress): boolean {
    const handle = this.handles.get(address);
    if (!handle) return false;
    handle.dispose();
    return this.handles.delete(address);
  }

  getOrCreate(context: MixedTeamMemberContext): MixedConfiguredMemberHandle {
    const existing = this.handles.get(context.address);
    if (existing) return existing;
    if (!this.materializationOpen) {
      throw new Error(`Configured member '${context.address}' cannot materialize after TeamRun freeze.`);
    }
    const node = this.options.configResolver.resolve(context);
    const handle = context.kind === "agent" && node.kind === "agent"
      ? new MixedAgentMemberHandle({
          teamContext: this.options.teamContext,
          context,
          config: node,
          activationMode: this.options.teamContext.runtimeContext.configuredMemberActivationMode,
          agentRunManager: this.options.agentRunManager,
          publish: this.options.publish,
          deliverInterAgentMessage: this.options.deliverInterAgentMessage,
          acceptPlatformBinding: this.options.acceptPlatformBinding,
        })
      : context.kind === "agent_team" && node.kind === "agent_team"
        ? new MixedSubTeamMemberHandle({
            parentContext: this.options.teamContext,
            context,
            config: node,
            subTeamRunFactory: this.options.subTeamRunFactory,
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
