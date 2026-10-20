import type { PrepareAgentRunInput, PrepareAgentRunResult } from "../../agent-execution/services/agent-run-service.js";
import type { DelegatedRunHandler, PeerHandlerRefusal } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { StartDelegatedRunRequest } from "../domain/remote-requests.js";
import type { PublishedAgentService } from "../settings/published-agent-service.js";
import type { PublishedLaunchCheck } from "../settings/published-launch-check.js";

const refuse = (code: string, message: string): PeerHandlerRefusal => Object.freeze({ accepted: false, code, message });

/**
 * B's side of `delegate_task` with `node` (DS-001): checks that an Agent is published at the address and can
 * run here with its launch settings, then prepares (does not activate) an ordinary standalone run of it with
 * the published launch settings and the `delegatedFrom` back-link, and returns its ID. The work packet that
 * follows activates it (N-2, N-6); a prepared run that never gets its packet expires after the prepared-run TTL.
 */
export class RemoteDelegationReceiver implements DelegatedRunHandler {
  constructor(private readonly dependencies: Readonly<{
    published: Pick<PublishedAgentService, "findByAddress">;
    launchCheck: Pick<PublishedLaunchCheck, "reasonItCannotRun">;
    agentRuns: Readonly<{ prepareAgentRun(input: PrepareAgentRunInput): Promise<PrepareAgentRunResult> }>;
  }>) {}

  async start(request: StartDelegatedRunRequest, from: PeerNode) {
    const published = await this.dependencies.published.findByAddress(request.publishedAddress);
    if (!published) return refuse(REMOTE_REFUSAL.AGENT_NOT_PUBLISHED, `No Agent is published at ${request.publishedAddress}.`);
    const agent = published.agent;
    const reason = await this.dependencies.launchCheck.reasonItCannotRun(agent);
    if (reason) return refuse(REMOTE_REFUSAL.AGENT_CANNOT_RUN, reason);
    try {
      const prepared = await this.dependencies.agentRuns.prepareAgentRun({
        agentDefinitionId: agent.agentDefinitionId,
        workspaceRootPath: agent.workspaceRootPath,
        llmModelIdentifier: agent.llmModelIdentifier,
        llmConfig: agent.llmConfig === null ? null : structuredClone(agent.llmConfig) as Record<string, unknown>,
        autoExecuteTools: agent.autoExecuteTools,
        runtimeKind: agent.runtimeKind,
        delegatedFrom: {
          nodeId: from.nodeId,
          coordinatingRun: { kind: request.coordinatingRun.kind, runId: request.coordinatingRun.runId },
          delegatorAgentRunId: request.delegator.agentRunId,
        },
      });
      return Object.freeze({ accepted: true as const, agentRunId: prepared.runId });
    } catch (error) {
      return refuse(REMOTE_REFUSAL.AGENT_CANNOT_RUN, error instanceof Error ? error.message : String(error));
    }
  }
}
