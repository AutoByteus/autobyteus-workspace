import type {
  ApplicationPublishedArtifactEvent,
  ApplicationRunBindingSummary,
} from "@autobyteus/application-sdk-contracts";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  AgentRunEventType,
  isAgentRunEvent,
  type AgentRunEvent,
} from "../../agent-execution/domain/agent-run-event.js";
import { ApplicationEngineHostService, getApplicationEngineHostService } from "../../application-engine/services/application-engine-host-service.js";
import type { ApplicationExecutionContext } from "../domain/models.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import type { PublishedArtifactSummary } from "../../services/published-artifacts/published-artifact-types.js";

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
  private readonly operationQueueByRunId = new Map<string, Promise<void>>();

  constructor(
    private readonly dependencies: {
      bindingStore?: ApplicationRunBindingStore;
      engineHostService?: ApplicationEngineHostService;
    } = {},
  ) {}

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore ?? new ApplicationRunBindingStore();
  }

  private get engineHostService(): ApplicationEngineHostService {
    return this.dependencies.engineHostService ?? getApplicationEngineHostService();
  }

  attachToRun(run: AgentRun): () => void {
    const unsubscribe = run.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event) || event.eventType !== AgentRunEventType.ARTIFACT_PERSISTED) {
        return;
      }
      void this.enqueueRelay(run, event);
    });

    return () => {
      unsubscribe();
      this.operationQueueByRunId.delete(run.runId);
    };
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
    const binding = await this.bindingStore.getBinding(
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

    try {
      await this.engineHostService.invokeApplicationArtifactHandler(binding.applicationId, {
        event: artifactEvent,
      });
    } catch (error) {
      logger.warn(
        `ApplicationPublishedArtifactRelayService: live artifact relay failed for binding '${binding.bindingId}' revision '${artifactEvent.revisionId}': ${String(error)}`,
      );
    }
  }

  private enqueueRelay(run: AgentRun, event: AgentRunEvent): Promise<void> {
    const previous = this.operationQueueByRunId.get(run.runId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => this.relayIfBound(run, event));
    this.operationQueueByRunId.set(run.runId, next);
    void next.finally(() => {
      if (this.operationQueueByRunId.get(run.runId) === next) {
        this.operationQueueByRunId.delete(run.runId);
      }
    });
    return next;
  }

  private buildArtifactEvent(
    binding: ApplicationRunBindingSummary,
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
      binding: structuredClone(binding),
      producer: structuredClone(producer),
    };
  }
}

let cachedApplicationPublishedArtifactRelayService: ApplicationPublishedArtifactRelayService | null = null;

export const getApplicationPublishedArtifactRelayService = (): ApplicationPublishedArtifactRelayService => {
  if (!cachedApplicationPublishedArtifactRelayService) {
    cachedApplicationPublishedArtifactRelayService = new ApplicationPublishedArtifactRelayService();
  }
  return cachedApplicationPublishedArtifactRelayService;
};
