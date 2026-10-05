import { TaskAgentDurabilityEventGate } from "../../agent-collaboration/execution/services/task-agent-durability-event-gate.js";
import type { FlatTeamExecutionCallbacks } from "./flat-team-execution-callbacks.js";
import { beginFlatTeamPreparation, type FlatTeamPreparationOperation } from "./flat-team-execution-factory.js";
import { TeamRun } from "../domain/team-run.js";
import type { TeamRunAgentTeamNode, TeamRunApplicationBinding } from "../domain/team-run-config.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import { FlatTeamRunBackend } from "./flat-team-run-backend.js";
import type { FlatTeamExecutionManager } from "./flat-team-execution-manager.js";
import type {
  ConfiguredMemberActivationMode,
  FlatTeamExecutionContext,
} from "./flat-team-execution-context.js";
import {
  createRootExecutionPhysicalScope,
  type RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";

export type TaskTeamExecutionFactoryOptions = {
  buildContext: (input: {
    handoffs: readonly CollaborationHandoff[];
    applicationBinding?: TeamRunApplicationBinding | null;
    physicalScope: RootExecutionPhysicalScope;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: ConfiguredMemberActivationMode;
  }) => TeamRunContext<FlatTeamExecutionContext>;
  publishAgentEvent: FlatTeamExecutionCallbacks["publishAgentEvent"];
  createTeamManager: (context: TeamRunContext<FlatTeamExecutionContext>, publishAgentEvent: FlatTeamExecutionCallbacks["publishAgentEvent"]) => FlatTeamExecutionManager;
};

export class TaskTeamExecutionFactory {
  constructor(private readonly options: TaskTeamExecutionFactoryOptions) {}

  beginTaskTeam(input: {
    handoffs: readonly CollaborationHandoff[];
    parentContext: TeamRunContext<FlatTeamExecutionContext>;
    teamNode: TeamRunAgentTeamNode;
    activationMode: ConfiguredMemberActivationMode;
    prepareConfiguredAgents: boolean;
  }): FlatTeamPreparationOperation {
    return this.materialize({ ...input, applicationBinding: null,
      configuredMemberActivationMode: input.activationMode });
  }

  private materialize(input: {
    parentContext: TeamRunContext<FlatTeamExecutionContext>;
    handoffs: readonly CollaborationHandoff[];
    applicationBinding: TeamRunApplicationBinding | null;
    teamNode: TeamRunAgentTeamNode;
    configuredMemberActivationMode: ConfiguredMemberActivationMode;
    prepareConfiguredAgents: boolean;
  }): FlatTeamPreparationOperation {
    const context = this.options.buildContext({
      handoffs: input.handoffs,
      applicationBinding: input.applicationBinding,
      physicalScope: createRootExecutionPhysicalScope({
        root: input.parentContext.physicalScope.root,
        ancestorTeamRunIds: [
          ...input.parentContext.physicalScope.ancestorTeamRunIds,
          input.teamNode.teamRunId,
        ],
      }),
      teamNode: input.teamNode,
      configuredMemberActivationMode: input.configuredMemberActivationMode,
    });
    const events = new TaskAgentDurabilityEventGate(this.options.publishAgentEvent);
    const manager = this.options.createTeamManager(context, events.publish);
    const teamRun = new TeamRun(context, new FlatTeamRunBackend(context, manager));
    const operation = beginFlatTeamPreparation({ teamRun, manager, prepareConfiguredAgents: input.prepareConfiguredAgents });
    let committed = false;
    return Object.freeze({
      // Cancellation fences acquisition/input; only unpublished events are discarded.
      cancel: () => { if (!committed) events.abort(); operation.cancel(); },
      release: () => { if (!committed) events.abort(); return operation.release(); },
      prepare: async () => {
        const prepared = await operation.prepare();
        return Object.freeze({ ...prepared, commitAfterDurability: () => {
          prepared.commitAfterDurability();
          committed = true;
          if (!events.releaseToLive()) throw new Error("Task Team event publication was closed.");
        } });
      },
    });
  }
}
