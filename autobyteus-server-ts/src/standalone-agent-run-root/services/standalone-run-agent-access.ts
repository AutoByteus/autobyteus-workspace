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
  type RunAgentAccess,
  type RunAgentObservation,
  type RunAgentPresentationListener,
  type RunAgentStatusEntry,
  type RemoteOwner,
} from "../../agent-collaboration/execution/remote/run-agent-access.js";
import type { RemoteOwnerCommand } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { StandaloneAgentRunRoot } from "../domain/standalone-agent-run-root.js";

type Roots = Readonly<{
  resolveRoot(runId: string): Promise<StandaloneAgentRunRoot | null>;
  getActive(runId: string): StandaloneAgentRunRoot | null;
  stopRoot(runId: string): Promise<StandaloneRootStopResult | null>;
  onRunEnded(runId: string, listener: () => void): () => void;
}>;

/**
 * autobyteus-278 (AR-401): a remote Agent, as its node serves the peer's owner. Its own agent is a
 * separate AgentRun: the agent's events, adapted by the same presentation adapter the root uses for its children,
 * are followed from host to host through the root's agent-ready hook (idle shutdown replaces the host, the root
 * stays). Owner input goes through the agent input path, the interrupt to the agent, terminate to the root's Stop.
 */
export class StandaloneRunAgentAccess implements RunAgentAccess {
  constructor(private readonly roots: Roots) {}

  async observeRunAgents(runId: string, onPresentation: RunAgentPresentationListener, onEnded: () => void): Promise<RunAgentObservation | null> {
    const root = await this.roots.resolveRoot(runId);
    if (!root) return null;
    const identity = createCollaborationMemberExecutionIdentity({ root: root.rootIdentity, memberAddress: root.agentAddress, agentRunId: root.agentRunId });
    const adapter = new CollaborationAgentPresentationEventAdapter((agentRunId) => agentRunId === root.agentRunId ? identity : null);
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
          if (adapted.kind === "publish") onPresentation(root.agentRunId, adapted.message);
        } catch (error) {
          console.warn(`Agent run '${root.agentRunId}': an event was not sent to the peer that started it: ${String(error)}`);
        }
      });
    };
    const live = root.activeAgentRun();
    if (live) attach(live);
    const offAgentReady = root.onAgentReady(attach);
    const close = (): void => {
      if (closed) return;
      closed = true;
      offAgentReady();
      offEnded();
      unsubscribe?.();
      unsubscribe = null;
    };
    // Stop, terminate or delete by any path ends it (after the agent stopped); idle shutdown only replaces the agent.
    const offEnded = this.roots.onRunEnded(runId, () => { close(); onEnded(); });
    return Object.freeze({ close });
  }

  async executeOwnerCommand(runId: string, agentRunId: string, command: RemoteOwnerCommand, owner: RemoteOwner): Promise<AgentOperationResult> {
    if (agentRunId !== runId) return notPairedRefusal(agentRunId);
    if (command.kind === "terminate") {
      const stopped = await this.roots.stopRoot(runId);
      return stopped && stopped.agent.outcome !== "rejected"
        ? { accepted: true }
        : { accepted: false, code: "AGENT_RUN_STOP_REJECTED", message: `Agent run '${runId}' did not stop.` };
    }
    if (command.kind === "interrupt") {
      const run = this.roots.getActive(runId)?.activeAgentRun();
      return run ? run.interrupt() : notLiveRefusal(agentRunId);
    }
    const root = await this.roots.resolveRoot(runId);
    if (!root) return notPairedRefusal(agentRunId);
    // A message makes the agent ready (restoring it after idle shutdown), as any input does.
    const result = await root.postAgentUserMessage({ message: remoteOwnerUserMessage(command, owner), postOptions: {} });
    if (result.kind === "posted") return result.post;
    // DS-15: a run whose Task is closed refuses its delegator's owner too, as base fenced it.
    if (result.kind === "refused") return result.refusal;
    return { accepted: false, code: "AGENT_INPUT_REJECTED", message: "message" in result ? result.message : result.admission.message };
  }

  runAgentStatuses(runId: string): readonly RunAgentStatusEntry[] {
    const run = this.roots.getActive(runId)?.activeAgentRun();
    if (!run?.isActive()) return [];
    const snapshot = run.getStatusSnapshot();
    return [{ agentRunId: runId, status: normalizeAgentApiStatus(snapshot.status), backgroundTasksRunning: snapshot.background_tasks_running }];
  }
}
