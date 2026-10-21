import type { CatalogTaskSource, CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import { CollaboratorAddError, CollaboratorNoDefaultLaunchError } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { PrepareAgentRunInput, PrepareAgentRunResult } from "../../agent-execution/services/agent-run-service.js";
import type { DelegatedRunHandler, PeerHandlerRefusal } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { StartDelegatedRunRequest } from "../domain/remote-requests.js";

type Admission = Pick<CollaboratorAdmission, "catalogDefinitionAt" | "catalogTaskSourceOf" | "policy">;

const refuse = (code: string, message: string, targetName?: string): PeerHandlerRefusal =>
  Object.freeze({ accepted: false, code, message, ...(targetName ? { targetName } : {}) });

/**
 * B's side of `delegate_task` with `node` (DS-001). The target is resolved exactly as a local catalog copy is,
 * through `CollaboratorAdmission`, with this node's catalog port (no run: nothing inherited, the temp workspace,
 * auto-approve on). The kind is decided first (AR-201): nothing at the address is `AGENT_NOT_FOUND`; an Agent
 * Team is `REMOTE_TEAMS_NOT_SUPPORTED` (until autobyteus-247), and no launch is resolved for it. An Agent whose
 * launch fails is `NO_DEFAULT_RUNTIME` or `AGENT_CANNOT_RUN`. Every refusal comes before a run is prepared.
 * Otherwise it prepares (does not activate) an ordinary standalone run with the resolved launch and the
 * `delegatedFrom` back-link, and returns its ID. The work packet that follows activates it; a prepared run that
 * never gets its packet expires after the prepared-run TTL.
 */
export class RemoteDelegationReceiver implements DelegatedRunHandler {
  constructor(private readonly dependencies: Readonly<{
    admission(): Admission;
    catalogPort: CollaboratorRootPort;
    agentRuns: Readonly<{ prepareAgentRun(input: PrepareAgentRunInput): Promise<PrepareAgentRunResult> }>;
  }>) {}

  async start(request: StartDelegatedRunRequest, from: PeerNode) {
    const admission = this.dependencies.admission();
    const port = this.dependencies.catalogPort;
    const ref = await admission.catalogDefinitionAt(port, request.address);
    // The detail is the address nothing was found at; the delegating node words it.
    if (!ref) return refuse(REMOTE_REFUSAL.AGENT_NOT_FOUND, request.address);
    if (ref.kind === "agent_team") {
      // The Team's name comes from the eligibility owner (N-201), not from launch resolution.
      const team = await admission.policy.requireEligible(port, ref);
      return refuse(REMOTE_REFUSAL.REMOTE_TEAMS_NOT_SUPPORTED, `${team.definition.name} is an Agent Team.`, team.definition.name);
    }
    let resolved: CatalogTaskSource;
    try {
      resolved = await admission.catalogTaskSourceOf(port, { ref, address: request.address });
    } catch (error) {
      if (error instanceof CollaboratorNoDefaultLaunchError) return refuse(REMOTE_REFUSAL.NO_DEFAULT_RUNTIME, error.reason, error.collaboratorName);
      if (error instanceof CollaboratorAddError) return refuse(REMOTE_REFUSAL.AGENT_CANNOT_RUN, error.reason, error.collaboratorName);
      throw error;
    }
    const source = resolved.source;
    if (source.kind !== "agent") throw new Error(`The catalog source at ${request.address} is not an Agent.`);
    const launch = source.launchConfiguration;
    // The node catalog port's `defaults_only` base always gives the workspace.
    if (!launch.workspaceRootPath) throw new Error(`The resolved launch at ${request.address} has no workspace.`);
    try {
      const prepared = await this.dependencies.agentRuns.prepareAgentRun({
        agentDefinitionId: source.agentDefinitionId,
        workspaceRootPath: launch.workspaceRootPath,
        llmModelIdentifier: launch.llmModelIdentifier,
        llmConfig: launch.llmConfig === null ? null : structuredClone(launch.llmConfig) as Record<string, unknown>,
        autoExecuteTools: launch.autoExecuteTools,
        runtimeKind: launch.runtimeKind,
        delegatedFrom: {
          nodeId: from.nodeId,
          coordinatingRun: { kind: request.coordinatingRun.kind, runId: request.coordinatingRun.runId },
          delegatorAgentRunId: request.delegator.agentRunId,
        },
      });
      return Object.freeze({ accepted: true as const, agentRunId: prepared.runId });
    } catch (error) {
      return refuse(REMOTE_REFUSAL.AGENT_CANNOT_RUN, error instanceof Error ? error.message : String(error), resolved.name);
    }
  }
}
