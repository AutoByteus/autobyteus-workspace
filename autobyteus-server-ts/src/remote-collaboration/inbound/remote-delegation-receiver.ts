import type { CatalogTaskSource, CollaboratorAdmission } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import {
  CollaboratorAddError, CollaboratorNoDefaultLaunchError, CollaboratorRouterFailedError, type CopyRouterState,
} from "../../agent-collaboration/collaborators/collaborator-errors.js";
import type { RemoteAgentLaunch } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { decisionRecordsOf, type DelegationWork } from "../../model-routing/domain/model-routing-types.js";
import type { PeerStartedRunDecisions } from "./peer-started-run-decisions.js";
import type { CollaboratorRootPort } from "../../agent-collaboration/collaborators/collaborator-root-port.js";
import type { PrepareAgentRunInput, PrepareAgentRunResult } from "../../agent-execution/services/agent-run-service.js";
import type { DelegatedRunHandler, PeerHandlerRefusal } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { RemoteModelRoutingState, RemoteRefusalTarget, StartDelegatedRunRequest } from "../domain/remote-requests.js";
import { assertAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { RemoteTeamRunStarter } from "./remote-team-run-starter.js";

type Admission = Pick<CollaboratorAdmission, "catalogDefinitionAt" | "catalogTaskSourceOf">;

const refuse = (code: string, message: string, target?: RemoteRefusalTarget, routing: Pick<PeerHandlerRefusal, "modelRouting" | "agentName"> = {}): PeerHandlerRefusal =>
  Object.freeze({ accepted: false, code, message, ...(target ? { target: Object.freeze({ kind: target.kind, name: target.name }) } : {}), ...routing });

const modelRoutingOf = (state: CopyRouterState | undefined): Pick<PeerHandlerRefusal, "modelRouting"> => !state ? {}
  : { modelRouting: (state.kind === "off" ? { state: "off" } : { state: "not_active", reason: state.reason }) as RemoteModelRoutingState };

/** Each agent's launch as the delegating node shows it (autobyteus-32 REQ-009): the Agent, or every Team member. */
const launchesOf = (address: string, source: TaskExecutionSource): readonly RemoteAgentLaunch[] => Object.freeze(source.kind === "agent"
  ? [Object.freeze({ address, runtimeKind: source.launchConfiguration.runtimeKind, llmModelIdentifier: source.launchConfiguration.llmModelIdentifier,
    source: source.launchSource ?? { origin: "agent_default" as const, fallbacks: [] } })]
  : source.members.map((member) => Object.freeze({ address: member.address, runtimeKind: member.launchConfiguration.runtimeKind,
    llmModelIdentifier: member.launchConfiguration.llmModelIdentifier,
    source: member.launchSource ?? source.defaultLaunchSource ?? { origin: "agent_default" as const, fallbacks: [] } })));

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
    /** Decision records of a copy resolved while Model Routing is on, written when its work packet arrives. */
    decisions: Pick<PeerStartedRunDecisions, "hold">;
  }>) {}

  async start(request: StartDelegatedRunRequest, from: PeerNode) {
    const admission = this.dependencies.admission();
    const port = this.dependencies.catalogPort;
    const ref = await admission.catalogDefinitionAt(port, request.address);
    // The detail is the address nothing was found at; the delegating node words it.
    if (!ref) return refuse(REMOTE_REFUSAL.AGENT_NOT_FOUND, request.address);
    const work: DelegationWork = { text: request.task.text, task: { taskId: request.task.taskId, taskKey: request.task.taskKey,
      projectId: request.task.projectId, title: request.task.title } };
    let resolved: CatalogTaskSource;
    try {
      resolved = await admission.catalogTaskSourceOf(port, { ref, address: request.address, work });
    } catch (error) {
      if (!(error instanceof CollaboratorAddError)) throw error;
      const target = { kind: ref.kind, name: error.collaboratorName };
      if (error instanceof CollaboratorRouterFailedError) return refuse(REMOTE_REFUSAL.MODEL_ROUTER_FAILED, error.failure, target, { agentName: error.agentName });
      // The target's kind is the resolved definition's (autobyteus-261 DEC-407): the delegating node words it.
      const code = error instanceof CollaboratorNoDefaultLaunchError ? REMOTE_REFUSAL.NO_DEFAULT_RUNTIME : REMOTE_REFUSAL.AGENT_CANNOT_RUN;
      return refuse(code, error.reason, target, modelRoutingOf(error.routerState));
    }
    const source = resolved.source;
    const delegatedFrom = {
      nodeId: from.nodeId,
      coordinatingRun: { kind: request.coordinatingRun.kind, runId: request.coordinatingRun.runId },
      delegatorAgentRunId: request.delegator.agentRunId,
    };
    const launches = launchesOf(request.address, source);
    // B records the copies it resolved (with the delegating node's name, and no run of its own to open) when the work arrives.
    const hold = (runId: string) => {
      if (resolved.routingDecision) this.dependencies.decisions.hold(runId, decisionRecordsOf(resolved.routingDecision, {
        recordedAt: new Date().toISOString(), task: work.task, delegatingRunId: null,
        delegatingAgentName: null, fromNode: from.name,
      }));
    };
    if (source.kind === "agent_team") {
      const started = await this.dependencies.teams.start({ source, address: assertAgentTeamAddress(request.address), name: resolved.name, delegatedFrom });
      if (!started.accepted) return started;
      hold(started.teamRunId);
      return Object.freeze({ ...started, launches });
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
      hold(prepared.runId);
      return Object.freeze({ accepted: true as const, kind: "agent" as const, agentRunId: prepared.runId, launches });
    } catch (error) {
      return refuse(REMOTE_REFUSAL.AGENT_CANNOT_RUN, error instanceof Error ? error.message : String(error), { kind: "agent", name: resolved.name });
    }
  }
}
