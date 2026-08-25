import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { assertAgentTeamAddress, getAgentTeamAddressBasename, type AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import { getTeamRunService, type TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { getTeamLiveMessagePublisher, type TeamLiveMessagePublisher } from "../../services/agent-streaming/team-live-message-publisher.js";
import type { ChannelBinding } from "../domain/models.js";
import { resolveTeamBindingCurrentOutputIdentity } from "../services/channel-team-output-target-identity.js";
import { buildAgentInputMessage } from "./channel-agent-input-message-builder.js";
import { ChannelBindingRunLauncher } from "./channel-binding-run-launcher.js";
import { ChannelDispatchLockRegistry, getChannelDispatchLockRegistry } from "./channel-dispatch-lock-registry.js";
import { startTeamDispatchTurnCapture } from "./channel-dispatch-turn-capture.js";
import type { ChannelRunDispatchResult } from "./channel-run-dispatch-result.js";

export type ChannelTeamRunFacadeDependencies = ConstructorParameters<typeof ChannelTeamRunFacade>[0];

export class ChannelTeamRunFacade {
  private readonly launcher: ChannelBindingRunLauncher;
  private readonly teams: TeamRunService;
  private readonly publisher: TeamLiveMessagePublisher;
  private readonly locks: ChannelDispatchLockRegistry;
  constructor(deps: { runLauncher?: ChannelBindingRunLauncher; teamRunService?: TeamRunService; teamLiveMessagePublisher?: TeamLiveMessagePublisher; dispatchLockRegistry?: ChannelDispatchLockRegistry } = {}) {
    this.launcher = deps.runLauncher ?? new ChannelBindingRunLauncher();
    this.teams = deps.teamRunService ?? getTeamRunService();
    this.publisher = deps.teamLiveMessagePublisher ?? getTeamLiveMessagePublisher();
    this.locks = deps.dispatchLockRegistry ?? getChannelDispatchLockRegistry();
  }

  async dispatchToTeamBinding(binding: ChannelBinding, envelope: ExternalMessageEnvelope): Promise<ChannelRunDispatchResult> {
    const teamRunId = await this.launcher.resolveOrStartTeamRun(binding);
    return this.locks.runExclusive(`team:${teamRunId}`, async () => {
      const run = await this.teams.resolveActiveTeamRun(teamRunId);
      if (!run) throw new Error(`Team run '${teamRunId}' is not active.`);
      const target = this.targetExecution(binding, run);
      const capture = startTeamDispatchTurnCapture(run.subscribeToEvents.bind(run), target.memberAddress);
      let result;
      try { result = await run.postMessage(buildAgentInputMessage(envelope), target.agentRunId); }
      catch (error) { capture.dispose(); throw error; }
      if (!result.accepted) { capture.dispose(); throw new Error(result.message ?? `Team run '${teamRunId}' rejected the message.`); }
      const directTurnId = result.turnId?.trim() || null;
      const directAgentRunId = result.agentRunId?.trim() || null;
      const captured = directTurnId && directAgentRunId
        ? (capture.dispose(), { turnId: directTurnId, agentRunId: directAgentRunId })
        : await capture.promise;
      const turnId = captured?.turnId ?? directTurnId;
      const agentRunId = captured?.agentRunId ?? directAgentRunId;
      if (!turnId || !agentRunId) throw new Error(`Team run '${teamRunId}' accepted external channel dispatch without authoritative execution/turn correlation.`);
      await this.teams.recordRunActivity(run, { summary: envelope.content });
      try {
        this.publisher.publishExternalUserMessage({
          teamRunId,
          envelope,
          agentRunId,
          memberAddress: run.getAgentExecution(agentRunId)?.identity.memberAddress ?? target.memberAddress,
          displayName: getAgentTeamAddressBasename(run.getAgentExecution(agentRunId)?.identity.memberAddress ?? target.memberAddress),
        });
      } catch (error) { console.warn(`Team run '${teamRunId}': failed to publish external input to the live stream.`, error); }
      return { dispatchTargetType: "TEAM", teamRunId, agentRunId, turnId, dispatchedAt: new Date() };
    });
  }

  private targetExecution(binding: ChannelBinding, run: RootTeamRun): Readonly<{
    agentRunId: string;
    memberAddress: AgentTeamAddress;
  }> {
    if (binding.targetMemberAddress) assertAgentTeamAddress(binding.targetMemberAddress);
    const agentRunId = resolveTeamBindingCurrentOutputIdentity(binding, run).entryAgentRunId;
    const execution = agentRunId ? run.getAgentExecution(agentRunId) : null;
    if (!execution) throw new Error(`Team run '${run.teamRunId}' has no configured entry Agent.`);
    return Object.freeze({
      agentRunId: execution.identity.agentRunId,
      memberAddress: execution.identity.memberAddress,
    });
  }
}
