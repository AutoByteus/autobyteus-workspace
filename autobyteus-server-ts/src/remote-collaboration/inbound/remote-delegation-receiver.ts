import type { CatalogTaskSource, CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import { CollaboratorAddError, CollaboratorNoDefaultLaunchError } from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { PrepareAgentRunInput, PrepareAgentRunResult } from "../../agent-execution/services/agent-run-service.js";
import type { DelegatedRunHandler, PeerHandlerRefusal } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { RemoteRefusalTarget, StartDelegatedRunRequest } from "../domain/remote-requests.js";
import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { RemoteTeamRunStarter } from "./remote-team-run-starter.js";

type Admission = Pick<CollaboratorAdmission, "catalogDefinitionAt" | "catalogTaskSourceOf">;

const refuse = (code: string, message: string, target?: RemoteRefusalTarget): PeerHandlerRefusal =>
  Object.freeze({ accepted: false, code, message, ...(target ? { target: Object.freeze({ kind: target.kind, name: target.name }) } : {}) });

/**
 * B's side of `delegate_task` with `node` (DS-001). The target is resolved exactly as a local catalog copy is,
 * through `CollaboratorAdmission`, with this node's catalog port (no run: nothing inherited, the temp workspace,
 * auto-approve on). Nothing at the address is `AGENT_NOT_FOUND`; a target whose launch fails is
 * `NO_DEFAULT_RUNTIME` or `AGENT_CANNOT_RUN`. Every refusal comes before a run is created.
 * - An Agent: an ordinary standalone run is prepared (not activated) with the resolved launch and the
 *   `delegatedFrom` back-link; the answer is its run ID. A prepared run that never gets its packet expires.
 * - An Agent Team (autobyteus-247): `RemoteTeamRunStarter` creates the Team run with `delegatedFrom` on its tree;
 *   the answer is its team run ID, coordinator and members. A Team never given work is shut down when idle.
 * The work packet that follows starts the Agent, or the Team's coordinator.
 */
export class RemoteDelegationReceiver implements DelegatedRunHandler {
  constructor(private readonly dependencies: Readonly<{
    admission(): Admission;
    catalogPort: CollaboratorRootPort;
    agentRuns: Readonly<{ prepareAgentRun(input: PrepareAgentRunInput): Promise<PrepareAgentRunResult> }>;
    teams: Pick<RemoteTeamRunStarter, "start">;
  }>) {}

  async start(request: StartDelegatedRunRequest, from: PeerNode) {
    const admission = this.dependencies.admission();
    const port = this.dependencies.catalogPort;
    const ref = await admission.catalogDefinitionAt(port, request.address);
    // The detail is the address nothing was found at; the delegating node words it.
    if (!ref) return refuse(REMOTE_REFUSAL.AGENT_NOT_FOUND, request.address);
    let resolved: CatalogTaskSource;
    try {
      resolved = await admission.catalogTaskSourceOf(port, { ref, address: request.address });
    } catch (error) {
      if (!(error instanceof CollaboratorAddError)) throw error;
      // The target's kind is the resolved definition's (autobyteus-261 DEC-407): the delegating node words it.
      const code = error instanceof CollaboratorNoDefaultLaunchError ? REMOTE_REFUSAL.NO_DEFAULT_RUNTIME : REMOTE_REFUSAL.AGENT_CANNOT_RUN;
      return refuse(code, error.reason, { kind: ref.kind, name: error.collaboratorName });
    }
    const source = resolved.source;
    const delegatedFrom = {
      nodeId: from.nodeId,
      coordinatingRun: { kind: request.coordinatingRun.kind, runId: request.coordinatingRun.runId },
      delegatorAgentRunId: request.delegator.agentRunId,
    };
    if (source.kind === "agent_team") {
      return this.dependencies.teams.start({ source, address: assertAgentTeamAddress(request.address), name: resolved.name, delegatedFrom });
    }
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
        delegatedFrom,
      });
      return Object.freeze({ accepted: true as const, kind: "agent" as const, agentRunId: prepared.runId });
    } catch (error) {
      return refuse(REMOTE_REFUSAL.AGENT_CANNOT_RUN, error instanceof Error ? error.message : String(error), { kind: "agent", name: resolved.name });
    }
  }
}
