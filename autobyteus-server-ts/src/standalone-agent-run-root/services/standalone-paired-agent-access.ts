import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { normalizeAgentApiStatus } from "../../agent-execution/domain/agent-status-payload.js";
import type { StandaloneRootStopResult } from "../../agent-execution/services/standalone-run-ports.js";
import { createCollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { CollaborationAgentPresentationEventAdapter } from "../../agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import {
  notLiveRefusal,
  notPairedRefusal,
  remoteOwnerUserMessage,
  type PairedAgentAccess,
  type PairedAgentObservation,
  type PairedAgentPresentationListener,
  type PairedAgentStatus,
  type RemoteOwner,
} from "../../agent-collaboration/execution/remote/paired-agent-access.js";
import type { RemoteOwnerCommand } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { StandaloneAgentRunRoot } from "../domain/standalone-agent-run-root.js";

type Roots = Readonly<{
  resolveRoot(hostRunId: string): Promise<StandaloneAgentRunRoot | null>;
  getActive(hostRunId: string): StandaloneAgentRunRoot | null;
  stopRoot(hostRunId: string): Promise<StandaloneRootStopResult | null>;
}>;

/**
 * autobyteus-278 (AR-401): a remote Agent, as its node serves the peer's owner. Its own agent is the root's host, a
 * separate AgentRun: the host's events, adapted by the same presentation adapter the root uses for its children,
 * are followed from host to host through the root's host-ready hook (idle shutdown replaces the host, the root
 * stays). Owner input goes through the host input path, the interrupt to the host, terminate to the root's Stop.
 */
export class StandalonePairedAgentAccess implements PairedAgentAccess {
  constructor(private readonly roots: Roots) {}

  async observePairedAgents(hostRunId: string, onPresentation: PairedAgentPresentationListener): Promise<PairedAgentObservation | null> {
    const root = await this.roots.resolveRoot(hostRunId);
    if (!root) return null;
    const identity = createCollaborationMemberExecutionIdentity({ root: root.rootIdentity, memberAddress: root.hostAddress, agentRunId: root.hostRunId });
    const adapter = new CollaborationAgentPresentationEventAdapter((agentRunId) => agentRunId === root.hostRunId ? identity : null);
    let watched: AgentRun | null = null;
    let unsubscribe: (() => void) | null = null;
    let closed = false;
    const attach = (run: AgentRun): void => {
      if (closed || run === watched) return;
      unsubscribe?.();
      watched = run;
      unsubscribe = run.subscribeToEvents((event) => {
        try {
          const adapted = adapter.adapt(identity, { kind: "agent_run", event });
          if (adapted.kind === "publish") onPresentation(root.hostRunId, adapted.message);
        } catch (error) {
          console.warn(`Agent run '${root.hostRunId}': an event was not sent to the peer that started it: ${String(error)}`);
        }
      });
    };
    const live = root.activeHostRun();
    if (live) attach(live);
    const offHostReady = root.onHostReady(attach);
    return Object.freeze({
      close: () => {
        closed = true;
        offHostReady();
        unsubscribe?.();
        unsubscribe = null;
      },
    });
  }

  async executeOwnerCommand(hostRunId: string, agentRunId: string, command: RemoteOwnerCommand, owner: RemoteOwner): Promise<AgentOperationResult> {
    if (agentRunId !== hostRunId) return notPairedRefusal(agentRunId);
    if (command.kind === "terminate") {
      const stopped = await this.roots.stopRoot(hostRunId);
      return stopped && stopped.host.outcome !== "rejected"
        ? { accepted: true }
        : { accepted: false, code: "AGENT_RUN_STOP_REJECTED", message: `Agent run '${hostRunId}' did not stop.` };
    }
    if (command.kind === "interrupt") {
      const run = this.roots.getActive(hostRunId)?.activeHostRun();
      return run ? run.interrupt() : notLiveRefusal(agentRunId);
    }
    const root = await this.roots.resolveRoot(hostRunId);
    if (!root) return notPairedRefusal(agentRunId);
    // A message makes the host ready (restoring it after idle shutdown), as any input does.
    const result = await root.postHostUserMessage({ message: remoteOwnerUserMessage(command, owner), postOptions: {} });
    return result.kind === "posted" ? result.post : { accepted: false, code: "AGENT_INPUT_REJECTED", message: "message" in result ? result.message : result.admission.message };
  }

  pairedAgentStatuses(hostRunId: string): readonly PairedAgentStatus[] {
    const run = this.roots.getActive(hostRunId)?.activeHostRun();
    return run?.isActive() ? [{ agentRunId: hostRunId, status: normalizeAgentApiStatus(run.getStatusSnapshot().status) }] : [];
  }
}
