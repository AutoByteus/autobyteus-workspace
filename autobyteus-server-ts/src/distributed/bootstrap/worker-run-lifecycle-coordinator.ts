import {
  AgentTeamEventStream,
  type AgentTeamStreamEvent,
} from "autobyteus-ts";
import type { RunVersion } from "../envelope/envelope-builder.js";
import type { RemoteExecutionEvent } from "../worker-execution/remote-member-execution-gateway.js";

type TeamEventForwarder = {
  close: () => Promise<void>;
  task: Promise<void>;
};

type ProjectedRemoteExecutionEvent = {
  sourceEventId: string;
  memberName: string;
  agentId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
};

type ProjectRemoteExecutionEvents = (input: {
  teamEvent: AgentTeamStreamEvent;
  routePrefix?: string | null;
}) => ProjectedRemoteExecutionEvent[];

export type WorkerRunLifecycleCoordinatorDependencies = {
  sourceNodeId: string;
  projectRemoteExecutionEventsFromTeamEvent: ProjectRemoteExecutionEvents;
  publishRemoteExecutionEventToHost: (event: RemoteExecutionEvent) => Promise<void>;
};

export class WorkerRunLifecycleCoordinator {
  private readonly sourceNodeId: string;
  private readonly projectRemoteExecutionEventsFromTeamEvent: ProjectRemoteExecutionEvents;
  private readonly publishRemoteExecutionEventToHost: (
    event: RemoteExecutionEvent,
  ) => Promise<void>;
  private readonly hostNodeIdByRunId = new Map<string, string>();
  private readonly workerManagedRunIds = new Set<string>();
  private readonly eventForwarderByRunId = new Map<string, TeamEventForwarder>();

  constructor(deps: WorkerRunLifecycleCoordinatorDependencies) {
    this.sourceNodeId = deps.sourceNodeId;
    this.projectRemoteExecutionEventsFromTeamEvent =
      deps.projectRemoteExecutionEventsFromTeamEvent;
    this.publishRemoteExecutionEventToHost = deps.publishRemoteExecutionEventToHost;
  }

  markWorkerManagedRun(teamRunId: string, hostNodeId: string): void {
    this.hostNodeIdByRunId.set(teamRunId, hostNodeId);
    this.workerManagedRunIds.add(teamRunId);
  }

  resolveHostNodeId(teamRunId: string, defaultHostNodeId: string): string {
    return this.hostNodeIdByRunId.get(teamRunId) ?? defaultHostNodeId;
  }

  isWorkerManagedRun(teamRunId: string): boolean {
    return this.workerManagedRunIds.has(teamRunId);
  }

  getWorkerManagedRunIds(): ReadonlySet<string> {
    return this.workerManagedRunIds;
  }

  async replaceEventForwarder(input: {
    teamRunId: string;
    runVersion: RunVersion;
    runtimeTeamId: string;
    eventStream: AgentTeamEventStream | null;
  }): Promise<void> {
    await this.stopEventForwarder(input.teamRunId);
    if (!input.eventStream) {
      return;
    }
    this.eventForwarderByRunId.set(
      input.teamRunId,
      this.startEventForwarder({
        teamRunId: input.teamRunId,
        runVersion: input.runVersion,
        runtimeTeamId: input.runtimeTeamId,
        eventStream: input.eventStream,
      }),
    );
  }

  async teardownRun(teamRunId: string): Promise<void> {
    await this.stopEventForwarder(teamRunId);
    this.clearRunTracking(teamRunId);
  }

  private clearRunTracking(teamRunId: string): void {
    this.hostNodeIdByRunId.delete(teamRunId);
    this.workerManagedRunIds.delete(teamRunId);
  }

  private async stopEventForwarder(teamRunId: string): Promise<void> {
    const forwarder = this.eventForwarderByRunId.get(teamRunId);
    if (!forwarder) {
      return;
    }
    this.eventForwarderByRunId.delete(teamRunId);
    await forwarder.close();
  }

  private startEventForwarder(input: {
    teamRunId: string;
    runVersion: RunVersion;
    runtimeTeamId: string;
    eventStream: AgentTeamEventStream;
  }): TeamEventForwarder {
    const task = (async () => {
      try {
        for await (const teamEvent of input.eventStream.allEvents()) {
          const projectedEvents = this.projectRemoteExecutionEventsFromTeamEvent({
            teamEvent,
          });
          for (const projectedEvent of projectedEvents) {
            try {
              await this.publishRemoteExecutionEventToHost({
                teamRunId: input.teamRunId,
                runVersion: input.runVersion,
                sourceNodeId: this.sourceNodeId,
                sourceEventId: projectedEvent.sourceEventId,
                memberName: projectedEvent.memberName,
                agentId: projectedEvent.agentId,
                eventType: projectedEvent.eventType,
                payload: projectedEvent.payload,
              });
            } catch (error) {
              console.error(
                `Failed to uplink remote member event for run '${input.teamRunId}' on worker team '${input.runtimeTeamId}': ${String(error)}`,
              );
            }
          }
        }
      } catch (error) {
        console.error(
          `Worker team event forwarding loop failed for run '${input.teamRunId}' and team '${input.runtimeTeamId}': ${String(error)}`,
        );
      }
    })();

    return {
      task,
      close: async () => {
        await input.eventStream.close();
        try {
          await task;
        } catch {
          // ignore
        }
      },
    };
  }
}
