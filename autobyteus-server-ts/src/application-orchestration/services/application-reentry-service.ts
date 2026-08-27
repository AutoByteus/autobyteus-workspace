import type { ApplicationEngineLauncher } from "../../application-engine/services/application-engine-launcher.js";
import type { ApplicationAgentToolCallLifecycle } from "../../application-agent-tools/services/application-agent-tool-call-lifecycle.js";
import type {
  ApplicationAvailabilityRecord,
  ApplicationAvailabilityService,
} from "./application-availability-service.js";
import type { ApplicationExecutionEventDispatchService } from "./application-execution-event-dispatch-service.js";
import type { ApplicationOrchestrationRecoveryService } from "./application-orchestration-recovery-service.js";

type ParticipantRecord = Readonly<{
  applicationId: string;
  priorAvailability: ApplicationAvailabilityRecord | null;
}>;

export type ApplicationReentryParticipantToken = Readonly<{
  owner: ApplicationReentryService;
  participants: readonly ParticipantRecord[];
}>;

export class ApplicationReentryPreparationError extends AggregateError {
  constructor(
    readonly token: ApplicationReentryParticipantToken,
    errors: readonly unknown[],
  ) {
    super(errors, "Application catalog transition participant preparation failed.");
    this.name = "ApplicationReentryPreparationError";
  }
}

export class ApplicationReentryService {
  constructor(private readonly dependencies: {
    availabilityService: ApplicationAvailabilityService;
    recoveryService: Pick<ApplicationOrchestrationRecoveryService, "resumeApplication">;
    eventDispatchService: Pick<
      ApplicationExecutionEventDispatchService,
      "resumePendingEventsForApplication" | "suspendApplication"
    >;
    engineLauncher: Pick<ApplicationEngineLauncher, "ensureReady" | "stop">;
    applicationAgentToolCallLifecycle: ApplicationAgentToolCallLifecycle;
  }) {}

  async prepareParticipants(
    applicationIds: Iterable<string>,
  ): Promise<ApplicationReentryParticipantToken> {
    const participants: ParticipantRecord[] = [];
    const errors: unknown[] = [];
    for (const applicationId of [...new Set(applicationIds)].sort()) {
      let priorAvailability: ApplicationAvailabilityRecord | null = null;
      try {
        priorAvailability = await this.dependencies.availabilityService
          .getAvailability(applicationId);
      } catch (error) {
        errors.push(error);
      }
      participants.push(Object.freeze({ applicationId, priorAvailability }));
      try {
        this.dependencies.availabilityService.beginReentry(applicationId);
        this.dependencies.eventDispatchService.suspendApplication(applicationId);
        await this.dependencies.applicationAgentToolCallLifecycle
          .quiesceAndDrain(applicationId);
        await this.dependencies.engineLauncher.stop(applicationId);
      } catch (error) {
        errors.push(error);
      }
    }
    const token = Object.freeze({
      owner: this,
      participants: Object.freeze(participants),
    });
    if (errors.length > 0) throw new ApplicationReentryPreparationError(token, errors);
    return token;
  }

  async recoverParticipants(
    token: ApplicationReentryParticipantToken,
    currentApplicationIds: Iterable<string>,
    recoverableApplicationIds: Iterable<string> = currentApplicationIds,
    options: Readonly<{ recoverPreviouslyInactive?: boolean }> = {},
  ): Promise<ReadonlyMap<string, ApplicationAvailabilityRecord>> {
    this.assertToken(token);
    const current = new Set(currentApplicationIds);
    const recoverable = new Set(recoverableApplicationIds);
    const participantByApplicationId = new Map(
      token.participants.map((participant) => [participant.applicationId, participant]),
    );
    const results = new Map<string, ApplicationAvailabilityRecord>();

    for (const participant of token.participants) {
      if (current.has(participant.applicationId)) continue;
      this.dependencies.applicationAgentToolCallLifecycle.close(participant.applicationId);
      results.set(
        participant.applicationId,
        this.dependencies.availabilityService.quarantineApplication(
          participant.applicationId,
          participant.priorAvailability?.state === "QUARANTINED"
            && participant.priorAvailability.detail
            ? participant.priorAvailability.detail
            : "Application is no longer present in the current catalog.",
        ),
      );
    }

    for (const applicationId of [...current].sort()) {
      const participant = participantByApplicationId.get(applicationId);
      if (!recoverable.has(applicationId)) {
        this.dependencies.applicationAgentToolCallLifecycle.close(applicationId);
        results.set(
          applicationId,
          this.dependencies.availabilityService.quarantineApplication(
            applicationId,
            "Application setup is required after catalog transition.",
          ),
        );
        continue;
      }
      if (!participant) {
        try {
          const record = this.dependencies.availabilityService
            .activateApplication(applicationId);
          this.dependencies.applicationAgentToolCallLifecycle.open(applicationId);
          results.set(applicationId, record);
        } catch (error) {
          this.dependencies.applicationAgentToolCallLifecycle.close(applicationId);
          results.set(
            applicationId,
            this.dependencies.availabilityService.quarantineApplication(
              applicationId,
              error instanceof Error ? error.message : String(error),
            ),
          );
        }
        continue;
      }
      if (
        participant.priorAvailability?.state !== "ACTIVE"
        && !options.recoverPreviouslyInactive
      ) {
        this.dependencies.applicationAgentToolCallLifecycle.close(applicationId);
        results.set(
          applicationId,
          this.dependencies.availabilityService.quarantineApplication(
            applicationId,
            participant.priorAvailability?.detail
              ?? "Application was not active before the catalog transition.",
          ),
        );
        continue;
      }
      try {
        await this.dependencies.recoveryService.resumeApplication(applicationId);
        await this.dependencies.engineLauncher.ensureReady(applicationId);
        await this.dependencies.eventDispatchService
          .resumePendingEventsForApplication(applicationId);
        const record = this.dependencies.availabilityService
          .activateApplication(applicationId);
        this.dependencies.applicationAgentToolCallLifecycle.open(applicationId);
        results.set(applicationId, record);
      } catch (error) {
        let detail = error instanceof Error ? error.message : String(error);
        try {
          await this.dependencies.engineLauncher.stop(applicationId);
        } catch (stopError) {
          detail += `; worker stop failed: ${stopError instanceof Error
            ? stopError.message
            : String(stopError)}`;
        }
        this.dependencies.applicationAgentToolCallLifecycle.close(applicationId);
        results.set(
          applicationId,
          this.dependencies.availabilityService.quarantineApplication(
            applicationId,
            detail,
          ),
        );
      }
    }
    return results;
  }

  async quarantineParticipants(
    token: ApplicationReentryParticipantToken,
    error: unknown,
  ): Promise<void> {
    this.assertToken(token);
    const failureDetail = error instanceof Error ? error.message : String(error);
    for (const participant of token.participants) {
      let detail = failureDetail;
      this.dependencies.eventDispatchService.suspendApplication(participant.applicationId);
      try {
        await this.dependencies.applicationAgentToolCallLifecycle
          .quiesceAndDrain(participant.applicationId);
      } catch (drainError) {
        detail += `; application tool drain failed: ${drainError instanceof Error
          ? drainError.message
          : String(drainError)}`;
      }
      try {
        await this.dependencies.engineLauncher.stop(participant.applicationId);
      } catch (stopError) {
        detail += `; worker stop failed: ${stopError instanceof Error
          ? stopError.message
          : String(stopError)}`;
      }
      this.dependencies.availabilityService.quarantineApplication(
        participant.applicationId,
        detail,
      );
    }
  }

  private assertToken(token: ApplicationReentryParticipantToken): void {
    if (token.owner !== this) {
      throw new Error("Application reentry participant token belongs to another service.");
    }
  }
}
