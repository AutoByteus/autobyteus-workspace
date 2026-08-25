import { toPublicApplicationAgentBinding, type ApplicationAgentBindingRecord } from "../domain/models.js";
import type {
  ApplicationPublishedArtifactEvent,
} from "@autobyteus/application-sdk-contracts";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import {
  ApplicationPublishedArtifactDeliveryQueue,
  type ApplicationPublishedArtifactDeliveryCommand,
} from "./application-published-artifact-delivery-queue.js";
import type { ApplicationExecutionContext } from "../domain/models.js";
import type { PublishedArtifactSummary } from "../../services/published-artifacts/published-artifact-types.js";

export interface ApplicationPublishedArtifactBindingReader {
  getBinding(
    applicationId: string,
    bindingId: string,
  ): Promise<ApplicationAgentBindingRecord | null>;
}

export interface ApplicationPublishedArtifactDeliverySink {
  accept(command: ApplicationPublishedArtifactDeliveryCommand): Promise<void>;
}

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const isPublishedArtifactSummary = (value: unknown): value is PublishedArtifactSummary => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string"
    && typeof record.runId === "string"
    && typeof record.path === "string"
    && typeof record.type === "string"
    && typeof record.revisionId === "string"
    && typeof record.updatedAt === "string"
  );
};

export class ApplicationPublishedArtifactRelayService {
  constructor(
    private readonly dependencies: {
      bindingReader: ApplicationPublishedArtifactBindingReader;
      artifactDeliverySink: ApplicationPublishedArtifactDeliverySink;
    },
  ) {}

  private get bindingReader(): ApplicationPublishedArtifactBindingReader {
    return this.dependencies.bindingReader;
  }

  private get artifactDeliverySink(): ApplicationPublishedArtifactDeliverySink {
    return this.dependencies.artifactDeliverySink;
  }

  attachToRun(run: AgentRun): () => void {
    const unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event) || event.eventType !== AgentRunEventType.ARTIFACT_PERSISTED) {
        return;
      }
      void this.relayIfBound(run, event).catch((error: unknown) => {
        logger.warn(
          `ApplicationPublishedArtifactRelayService: live artifact relay failed for run '${run.runId}': ${String(error)}`,
        );
      });
    });

    return unsubscribe;
  }

  async relayIfBound(run: AgentRun, event: AgentRunEvent): Promise<void> {
    const applicationExecutionContext = run.config.applicationExecutionContext;
    if (!applicationExecutionContext) {
      return;
    }

    if (!isPublishedArtifactSummary(event.payload)) {
      logger.warn(
        `ApplicationPublishedArtifactRelayService: run '${run.runId}' emitted a malformed ARTIFACT_PERSISTED payload.`,
      );
      return;
    }

    await this.relayArtifactForExecutionContext({
      runId: run.runId,
      applicationExecutionContext,
      artifact: event.payload,
    });
  }

  async relayArtifactForExecutionContext(input: {
    runId: string;
    applicationExecutionContext: ApplicationExecutionContext;
    artifact: PublishedArtifactSummary;
  }): Promise<void> {
    const binding = await this.bindingReader.getBinding(
      input.applicationExecutionContext.applicationId,
      input.applicationExecutionContext.bindingId,
    );
    if (!binding) {
      logger.warn(
        `ApplicationPublishedArtifactRelayService: binding '${input.applicationExecutionContext.bindingId}' was not found for run '${input.runId}'.`,
      );
      return;
    }

    const artifactEvent = this.buildArtifactEvent(
      binding,
      input.applicationExecutionContext.producer,
      input.artifact,
    );

    await this.artifactDeliverySink.accept({
      runId: input.runId,
      applicationId: binding.applicationId,
      bindingId: binding.bindingId,
      revisionId: artifactEvent.revisionId,
      event: artifactEvent,
    });
  }

  private buildArtifactEvent(
    binding: ApplicationAgentBindingRecord,
    producer: NonNullable<AgentRun["config"]["applicationExecutionContext"]>["producer"],
    artifact: PublishedArtifactSummary,
  ): ApplicationPublishedArtifactEvent {
    return {
      runId: artifact.runId,
      artifactId: artifact.id,
      revisionId: artifact.revisionId,
      path: artifact.path,
      description: artifact.description ?? null,
      fileKind: artifact.type,
      publishedAt: artifact.updatedAt,
      binding: toPublicApplicationAgentBinding(binding),
      producer: structuredClone(producer),
    };
  }
}

export const createGeneralProcessPublishedArtifactRelayService =
(): ApplicationPublishedArtifactRelayService => {
  const deliveryQueue = new ApplicationPublishedArtifactDeliveryQueue();
  deliveryQueue.stopAccepting();
  return new ApplicationPublishedArtifactRelayService({
    bindingReader: {
      getBinding: async () => null,
    },
    artifactDeliverySink: deliveryQueue,
  });
};
