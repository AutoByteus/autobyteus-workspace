import type {
  TeamRoutingDispatchResult,
  TeamRoutingPort,
} from "autobyteus-ts";
import type {
  InterAgentMessageRequestEvent,
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent,
} from "autobyteus-ts/agent-team/events/agent-team-events.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/models.js";
import {
  MemberPlacementResolver,
  type PlacementByMember,
  type ResolvePlacementInput,
} from "../member-placement/member-placement-resolver.js";
import {
  TeamRoutingPortAdapterRegistry,
  type RoutingAdapterRegistration,
} from "../routing/team-routing-port-adapter-registry.js";
import { DependencyHydrationService } from "../dependency-hydration/dependency-hydration-service.js";
import { RunDegradationPolicy } from "../policies/run-degradation-policy.js";
import { TeamRunRepository, type TeamRunRecord } from "./team-run-repository.js";
import { UniqueIdGenerator } from "../../utils/unique-id-generator.js";

export type StartRunIfMissingInput = {
  teamDefinition: AgentTeamDefinition;
  hostNodeId: string;
  nodeSnapshots: ResolvePlacementInput["nodeSnapshots"];
  defaultNodeId?: string | null;
};

export type CreateRoutingAdapter = (registration: {
  teamRunId: string;
  teamDefinitionId: string;
  runVersion: number;
  hostNodeId: string;
  placementByMember: PlacementByMember;
}) => TeamRoutingPort;

export class TeamRunOrchestrator {
  private readonly teamRunRepository: TeamRunRepository;
  private readonly placementResolver: MemberPlacementResolver;
  private readonly dependencyHydrationService: DependencyHydrationService;
  private readonly routingRegistry: TeamRoutingPortAdapterRegistry;
  private readonly runDegradationPolicy: RunDegradationPolicy;
  private readonly createRoutingAdapter: CreateRoutingAdapter;

  constructor(options: {
    teamRunRepository?: TeamRunRepository;
    placementResolver?: MemberPlacementResolver;
    dependencyHydrationService?: DependencyHydrationService;
    routingRegistry?: TeamRoutingPortAdapterRegistry;
    runDegradationPolicy?: RunDegradationPolicy;
    createRoutingAdapter: CreateRoutingAdapter;
  }) {
    this.teamRunRepository = options.teamRunRepository ?? new TeamRunRepository();
    this.placementResolver = options.placementResolver ?? new MemberPlacementResolver();
    this.dependencyHydrationService =
      options.dependencyHydrationService ?? new DependencyHydrationService();
    this.routingRegistry = options.routingRegistry ?? new TeamRoutingPortAdapterRegistry();
    this.runDegradationPolicy = options.runDegradationPolicy ?? new RunDegradationPolicy();
    this.createRoutingAdapter = options.createRoutingAdapter;
  }

  startRunIfMissing(input: StartRunIfMissingInput): TeamRunRecord {
    if (!input.teamDefinition.id) {
      throw new Error("teamDefinition.id is required to start a distributed team run.");
    }

    const existing = this.teamRunRepository.getActiveRunByDefinitionId(input.teamDefinition.id);
    if (existing) {
      return existing;
    }

    const placementByMember = this.placementResolver.resolvePlacement({
      teamDefinition: input.teamDefinition,
      nodeSnapshots: input.nodeSnapshots,
      defaultNodeId: input.defaultNodeId ?? null,
    });
    this.dependencyHydrationService.ensureMemberDependenciesAvailable({
      teamDefinition: input.teamDefinition,
      placementByMember,
    });

    const runVersion = this.teamRunRepository.allocateNextRunVersion(input.teamDefinition.id);
    const nowIso = new Date().toISOString();
    const teamRunRecord: TeamRunRecord = {
      teamRunId: UniqueIdGenerator.generateId(),
      teamDefinitionId: input.teamDefinition.id,
      coordinatorMemberName: input.teamDefinition.coordinatorMemberName,
      runVersion,
      hostNodeId: input.hostNodeId,
      placementByMember,
      status: "running",
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    this.teamRunRepository.createRunRecord(teamRunRecord);
    this.routingRegistry.initialize(
      this.buildRegistration(teamRunRecord, placementByMember, runVersion)
    );

    return teamRunRecord;
  }

  async dispatchUserMessage(
    teamRunId: string,
    event: ProcessUserMessageEvent
  ): Promise<TeamRoutingDispatchResult> {
    return this.dispatchWithFailurePolicy(
      teamRunId,
      this.isCoordinatorTarget(teamRunId, event.targetAgentName),
      () => this.routingRegistry.resolve(teamRunId).dispatchUserMessage(event)
    );
  }

  async dispatchInterAgentMessage(
    teamRunId: string,
    event: InterAgentMessageRequestEvent
  ): Promise<TeamRoutingDispatchResult> {
    return this.dispatchWithFailurePolicy(
      teamRunId,
      this.isCoordinatorTarget(teamRunId, event.recipientName),
      () => this.routingRegistry.resolve(teamRunId).dispatchInterAgentMessageRequest(event)
    );
  }

  async dispatchToolApproval(
    teamRunId: string,
    event: ToolApprovalTeamEvent
  ): Promise<TeamRoutingDispatchResult> {
    return this.dispatchWithFailurePolicy(
      teamRunId,
      this.isCoordinatorTarget(teamRunId, event.agentName),
      () => this.routingRegistry.resolve(teamRunId).dispatchToolApproval(event)
    );
  }

  async dispatchControlStop(teamRunId: string): Promise<TeamRoutingDispatchResult> {
    const runRecord = this.teamRunRepository.getRunById(teamRunId);
    if (!runRecord || runRecord.status === "stopped") {
      return this.rejected(
        "TEAM_RUN_NOT_FOUND",
        `No active team run '${teamRunId}' was found for stop dispatch.`
      );
    }

    let result: TeamRoutingDispatchResult;
    try {
      result = await this.routingRegistry.resolve(teamRunId).dispatchControlStop();
    } catch (error) {
      return this.rejected(
        "STOP_DISPATCH_FAILED",
        `Failed to dispatch stop command for run '${teamRunId}': ${String(error)}`
      );
    }

    if (result.accepted) {
      this.teamRunRepository.updateRunStatus(teamRunId, "stopped");
      this.runDegradationPolicy.clearRun(teamRunId);
      this.routingRegistry.dispose(teamRunId);
      this.teamRunRepository.deleteRun(teamRunId);
    }
    return result;
  }

  markRunDegraded(teamRunId: string): TeamRunRecord | null {
    return this.teamRunRepository.updateRunStatus(teamRunId, "degraded");
  }

  getRunRecord(teamRunId: string): TeamRunRecord | null {
    return this.teamRunRepository.getRunById(teamRunId);
  }

  resolveRoutingPort(teamRunId: string): TeamRoutingPort | null {
    return this.routingRegistry.tryResolve(teamRunId);
  }

  getActiveRunByDefinitionId(teamDefinitionId: string): TeamRunRecord | null {
    return this.teamRunRepository.getActiveRunByDefinitionId(teamDefinitionId);
  }

  resolveCurrentRunVersion(teamRunId: string): number | null {
    const value = this.teamRunRepository.resolveCurrentRunVersion(teamRunId);
    return value === null ? null : Number(value);
  }

  private async dispatchWithFailurePolicy(
    teamRunId: string,
    isCoordinatorTarget: boolean,
    dispatch: () => Promise<TeamRoutingDispatchResult>
  ): Promise<TeamRoutingDispatchResult> {
    const runRecord = this.teamRunRepository.getRunById(teamRunId);
    if (!runRecord || runRecord.status === "stopped") {
      return this.rejected(
        "TEAM_RUN_NOT_FOUND",
        `No active team run '${teamRunId}' was found for dispatch.`
      );
    }

    let result: TeamRoutingDispatchResult;
    try {
      result = await dispatch();
    } catch (error) {
      return this.handleRouteFailure(teamRunId, isCoordinatorTarget, "DISPATCH_FAILED", String(error));
    }

    if (result.accepted) {
      this.runDegradationPolicy.recordRouteSuccess({ teamRunId, isCoordinatorTarget });
      return result;
    }

    return this.handleRouteFailure(
      teamRunId,
      isCoordinatorTarget,
      result.errorCode ?? "DISPATCH_REJECTED",
      result.errorMessage ?? "Distributed dispatch rejected by routing adapter."
    );
  }

  private async handleRouteFailure(
    teamRunId: string,
    isCoordinatorFailure: boolean,
    errorCode: string,
    errorMessage: string
  ): Promise<TeamRoutingDispatchResult> {
    const transition = this.runDegradationPolicy.recordRouteFailure({
      teamRunId,
      isCoordinatorFailure,
    });

    if (transition === "degraded") {
      this.teamRunRepository.updateRunStatus(teamRunId, "degraded");
      return this.rejected(errorCode, errorMessage);
    }

    if (transition === "stop") {
      const stopResult = await this.dispatchControlStop(teamRunId);
      if (stopResult.accepted) {
        return this.rejected(
          "RUN_AUTO_STOPPED",
          `Run '${teamRunId}' was auto-stopped after repeated routing failures. Last failure: ${errorMessage}`
        );
      }
      return this.rejected(
        "RUN_AUTO_STOP_FAILED",
        `Run '${teamRunId}' hit auto-stop threshold but stop dispatch failed: ${stopResult.errorMessage ?? "unknown error"}`
      );
    }

    return this.rejected(errorCode, errorMessage);
  }

  private isCoordinatorTarget(teamRunId: string, targetMemberName: string): boolean {
    const record = this.teamRunRepository.getRunById(teamRunId);
    return !!record && record.coordinatorMemberName === targetMemberName;
  }

  private rejected(errorCode: string, errorMessage: string): TeamRoutingDispatchResult {
    return {
      accepted: false,
      errorCode,
      errorMessage,
    };
  }

  private buildRegistration(
    record: TeamRunRecord,
    placementByMember: PlacementByMember,
    runVersion: number
  ): RoutingAdapterRegistration {
    return {
      teamRunId: record.teamRunId,
      runVersion,
      adapter: this.createRoutingAdapter({
        teamRunId: record.teamRunId,
        teamDefinitionId: record.teamDefinitionId,
        runVersion,
        hostNodeId: record.hostNodeId,
        placementByMember,
      }),
    };
  }
}
