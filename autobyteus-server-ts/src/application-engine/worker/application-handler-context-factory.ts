import { randomUUID } from "node:crypto";
import type {
  ApplicationAgentExecution,
  ApplicationAgentBinding,
  ApplicationAgentTeamBinding,
  ApplicationEffectiveLaunchConfiguration,
  ApplicationHandlerContext,
  ApplicationPublishedArtifactSummary,
  ApplicationStorageContext,
  ApplicationExecutionResourceSummary,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationAgentEventStreamSubscribeError } from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationWorkerContextCapabilityInput,
  ApplicationWorkerNotificationParams,
} from "../runtime/protocol.js";
import { ApplicationAgentStreamObserverRegistry } from "./application-agent-stream-observer-registry.js";

export type ApplicationNotificationPublisher = (params: ApplicationWorkerNotificationParams) => Promise<void>;
export type ApplicationContextCapabilityInvoker = (input: ApplicationWorkerContextCapabilityInput) => Promise<unknown>;

export class ApplicationHandlerContextFactory {
  constructor(private readonly input: {
    storage: ApplicationStorageContext;
    supportedNotifications: boolean;
    publishNotification: ApplicationNotificationPublisher;
    invokeContextCapability: ApplicationContextCapabilityInvoker;
    observerRegistry: ApplicationAgentStreamObserverRegistry;
  }) {}

  create(requestContext: ApplicationHandlerContext["requestContext"]): ApplicationHandlerContext {
    return {
      requestContext,
      storage: this.input.storage,
      agentExecution: this.createAgentExecution(),
      agentResources: {
        listAvailable: async (filter) => this.input.invokeContextCapability({
          capability: "agentResources", operation: "listAvailable", input: filter ?? null,
        }) as Promise<ApplicationExecutionResourceSummary[]>,
        requireRunnable: async (slotKey) => this.input.invokeContextCapability({
          capability: "agentResources", operation: "requireRunnable", input: { slotKey },
        }) as Promise<ApplicationEffectiveLaunchConfiguration>,
      },
      publishedArtifacts: {
        list: async (runId) => this.input.invokeContextCapability({
          capability: "publishedArtifacts", operation: "list", input: { runId },
        }) as Promise<ApplicationPublishedArtifactSummary[]>,
        readRevision: async (revisionInput) => this.input.invokeContextCapability({
          capability: "publishedArtifacts", operation: "readRevision", input: revisionInput,
        }) as Promise<string | null>,
      },
      publishNotification: async (topic, payload) => {
        if (!this.input.supportedNotifications) throw new Error("Backend manifest disables notifications for this application.");
        await this.input.publishNotification({ topic, payload, publishedAt: new Date().toISOString() });
      },
    };
  }

  createLifecycle(): Omit<ApplicationHandlerContext, "requestContext"> & { requestContext: null } {
    return this.create(null) as Omit<ApplicationHandlerContext, "requestContext"> & { requestContext: null };
  }

  private createAgentExecution(): ApplicationAgentExecution {
    return {
      startAgent: async (input) => this.input.invokeContextCapability({ capability: "agentExecution", operation: "startAgent", input }) as Promise<ApplicationAgentBinding>,
      startAgentTeam: async (input) => this.input.invokeContextCapability({ capability: "agentExecution", operation: "startAgentTeam", input }) as Promise<ApplicationAgentTeamBinding>,
      sendInput: async (input) => this.input.invokeContextCapability({ capability: "agentExecution", operation: "sendInput", input }) as Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding>,
      terminate: async (bindingId) => this.input.invokeContextCapability({ capability: "agentExecution", operation: "terminate", input: { bindingId } }) as Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null>,
      get: async (bindingId) => this.input.invokeContextCapability({ capability: "agentExecution", operation: "get", input: { bindingId } }) as Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null>,
      list: async (filter) => this.input.invokeContextCapability({ capability: "agentExecution", operation: "list", input: filter ?? null }) as Promise<Array<ApplicationAgentBinding | ApplicationAgentTeamBinding>>,
      findByLaunchRequestId: async (launchRequestId) => this.input.invokeContextCapability({ capability: "agentExecution", operation: "findByLaunchRequestId", input: { launchRequestId } }) as Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null>,
      subscribeEventStream: async (address, observer, options) => {
        if (options?.signal?.aborted) {
          throw new ApplicationAgentEventStreamSubscribeError({
            code: "SUBSCRIPTION_ABORTED",
            message: "Application agent event stream subscription was aborted.",
            recoverable: true,
          });
        }
        const subscriptionId = randomUUID();
        let unsubscribePromise: Promise<void> | null = null;
        let abortedBeforeActivation = false;
        let active = false;
        const requestUnsubscribe = (reason: "UNSUBSCRIBED" | "ABORTED"): Promise<void> => {
          unsubscribePromise ??= this.input.invokeContextCapability({
            capability: "agentExecution",
            operation: "unsubscribeEventStream",
            input: { subscriptionId, reason },
          }).then(() => undefined);
          return unsubscribePromise;
        };
        const unsubscribe = () => requestUnsubscribe("UNSUBSCRIBED");
        const abort = () => {
          if (!active) {
            abortedBeforeActivation = true;
            this.input.observerRegistry.remove(subscriptionId);
          }
          void requestUnsubscribe("ABORTED");
        };
        const removeAbortListener = () => options?.signal?.removeEventListener("abort", abort);
        this.input.observerRegistry.registerPending(
          subscriptionId,
          observer,
          unsubscribe,
          removeAbortListener,
        );
        options?.signal?.addEventListener("abort", abort, { once: true });
        if (options?.signal?.aborted) abort();
        try {
          await this.input.invokeContextCapability({
            capability: "agentExecution",
            operation: "subscribeEventStream",
            input: { subscriptionId, address },
          });
          if (abortedBeforeActivation || options?.signal?.aborted) {
            await requestUnsubscribe("ABORTED");
            throw new ApplicationAgentEventStreamSubscribeError({
              code: "SUBSCRIPTION_ABORTED",
              message: "Application agent event stream subscription was aborted.",
              recoverable: true,
            });
          }
          if (!this.input.observerRegistry.activate(subscriptionId)) {
            await unsubscribe();
            throw new ApplicationAgentEventStreamSubscribeError({
              code: "SUBSCRIPTION_ABORTED",
              message: "Application agent event stream subscription was aborted.",
              recoverable: true,
            });
          }
          active = true;
          return { subscriptionId, unsubscribe };
        } catch (error) {
          this.input.observerRegistry.remove(subscriptionId);
          throw error;
        }
      },
    };
  }
}
