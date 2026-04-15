import { pathToFileURL } from "node:url";
import type {
  ApplicationBackendDefinition,
  ApplicationBackendExposureSummary,
  ApplicationHandlerContext,
  ApplicationRouteDefinition,
  ApplicationRouteRequest,
  ApplicationRouteResponse,
  ApplicationStorageContext,
  NormalizedPublicationEventFamily,
} from "@autobyteus/application-sdk-contracts";
import {
  APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V1,
} from "@autobyteus/application-sdk-contracts";
import type {
  ApplicationWorkerExecuteGraphqlInput,
  ApplicationWorkerInvokeCommandInput,
  ApplicationWorkerInvokeEventHandlerInput,
  ApplicationWorkerInvokeQueryInput,
  ApplicationWorkerLoadDefinitionInput,
  ApplicationWorkerLoadDefinitionResult,
  ApplicationWorkerNotificationParams,
  ApplicationWorkerRouteRequestInput,
  ApplicationWorkerStatusResult,
} from "../runtime/protocol.js";
import type { ApplicationPublicationDispatchResult } from "../runtime/protocol.js";

type NotificationPublisher = (params: ApplicationWorkerNotificationParams) => Promise<void>;

type LoadedApplicationDefinition = {
  definition: ApplicationBackendDefinition;
  storage: ApplicationStorageContext;
  exposures: ApplicationBackendExposureSummary;
};

const EVENT_HANDLER_KEY_BY_FAMILY: Record<
  NormalizedPublicationEventFamily,
  keyof NonNullable<ApplicationBackendDefinition["eventHandlers"]>
> = {
  SESSION_STARTED: "sessionStarted",
  SESSION_TERMINATED: "sessionTerminated",
  ARTIFACT: "artifact",
};

const EVENT_FAMILY_BY_HANDLER_KEY = {
  sessionStarted: "SESSION_STARTED",
  sessionTerminated: "SESSION_TERMINATED",
  artifact: "ARTIFACT",
} as const satisfies Record<string, NormalizedPublicationEventFamily>;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isRouteResponse = (value: unknown): value is ApplicationRouteResponse =>
  isObjectRecord(value) && (
    Object.prototype.hasOwnProperty.call(value, "status")
    || Object.prototype.hasOwnProperty.call(value, "headers")
    || Object.prototype.hasOwnProperty.call(value, "body")
  );

const normalizePath = (value: string): string => {
  const normalized = value.trim();
  if (!normalized.startsWith("/")) {
    return `/${normalized}`;
  }
  return normalized;
};

const matchRoute = (
  routes: ApplicationRouteDefinition[],
  request: ApplicationRouteRequest,
): { route: ApplicationRouteDefinition; params: Record<string, string> } | null => {
  const requestPath = normalizePath(request.path).split("/").filter(Boolean);
  for (const route of routes) {
    if (route.method !== request.method) {
      continue;
    }
    const routeParts = normalizePath(route.path).split("/").filter(Boolean);
    if (routeParts.length !== requestPath.length) {
      continue;
    }
    const params: Record<string, string> = {};
    let matches = true;
    for (let index = 0; index < routeParts.length; index += 1) {
      const routePart = routeParts[index]!;
      const requestPart = requestPath[index]!;
      if (routePart.startsWith(":")) {
        params[routePart.slice(1)] = requestPart;
        continue;
      }
      if (routePart !== requestPart) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return { route, params };
    }
  }
  return null;
};

const validateDefinitionContract = (definition: ApplicationBackendDefinition): void => {
  if (definition.definitionContractVersion !== APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V1) {
    throw new Error(
      `Unsupported application backend definitionContractVersion '${String(definition.definitionContractVersion)}'.`,
    );
  }
};

const validateExposureCompatibility = (
  definition: ApplicationBackendDefinition,
  supportedExposures: ApplicationBackendExposureSummary["supportedExposures"],
): void => {
  if (!supportedExposures.queries && definition.queries && Object.keys(definition.queries).length > 0) {
    throw new Error("Backend manifest disables queries, but the app definition exposes queries.");
  }
  if (!supportedExposures.commands && definition.commands && Object.keys(definition.commands).length > 0) {
    throw new Error("Backend manifest disables commands, but the app definition exposes commands.");
  }
  if (!supportedExposures.routes && definition.routes && definition.routes.length > 0) {
    throw new Error("Backend manifest disables routes, but the app definition exposes routes.");
  }
  if (!supportedExposures.graphql && definition.graphql) {
    throw new Error("Backend manifest disables graphql, but the app definition exposes graphql.");
  }
  if (!supportedExposures.eventHandlers && definition.eventHandlers && Object.keys(definition.eventHandlers).length > 0) {
    throw new Error("Backend manifest disables eventHandlers, but the app definition exposes eventHandlers.");
  }
};

const buildExposureSummary = (
  definition: ApplicationBackendDefinition,
  supportedExposures: ApplicationBackendExposureSummary["supportedExposures"],
): ApplicationBackendExposureSummary => ({
  supportedExposures,
  queries: Object.keys(definition.queries ?? {}).sort((left, right) => left.localeCompare(right)),
  commands: Object.keys(definition.commands ?? {}).sort((left, right) => left.localeCompare(right)),
  routes: (definition.routes ?? []).map((route) => ({ method: route.method, path: route.path })),
  graphql: Boolean(definition.graphql),
  notifications: supportedExposures.notifications,
  eventHandlers: Object.keys(definition.eventHandlers ?? {})
    .map((key) => EVENT_FAMILY_BY_HANDLER_KEY[key as keyof typeof EVENT_FAMILY_BY_HANDLER_KEY])
    .filter((value): value is NormalizedPublicationEventFamily => Boolean(value)),
});

const createLifecycleContext = (
  storage: ApplicationStorageContext,
  supportedNotifications: boolean,
  publishNotification: NotificationPublisher,
): Omit<ApplicationHandlerContext, "requestContext"> & { requestContext: null } => ({
  requestContext: null,
  storage,
  publishNotification: async (topic, payload) => {
    if (!supportedNotifications) {
      throw new Error("Backend manifest disables notifications for this application.");
    }
    await publishNotification({
      topic,
      payload,
      publishedAt: new Date().toISOString(),
    });
  },
});

const createHandlerContext = (
  storage: ApplicationStorageContext,
  requestContext: ApplicationHandlerContext["requestContext"],
  supportedNotifications: boolean,
  publishNotification: NotificationPublisher,
): ApplicationHandlerContext => ({
  requestContext,
  storage,
  publishNotification: async (topic, payload) => {
    if (!supportedNotifications) {
      throw new Error("Backend manifest disables notifications for this application.");
    }
    await publishNotification({
      topic,
      payload,
      publishedAt: new Date().toISOString(),
    });
  },
});

const resolveDefinitionExport = (moduleNamespace: Record<string, unknown>): ApplicationBackendDefinition => {
  const candidate = (moduleNamespace.default ?? moduleNamespace.application ?? moduleNamespace) as unknown;
  if (!isObjectRecord(candidate)) {
    throw new Error("Application backend entry module must export an application definition object.");
  }
  return candidate as ApplicationBackendDefinition;
};

export class ApplicationWorkerRuntime {
  private loaded: LoadedApplicationDefinition | null = null;

  constructor(private readonly publishNotification: NotificationPublisher) {}

  async loadDefinition(input: ApplicationWorkerLoadDefinitionInput): Promise<ApplicationWorkerLoadDefinitionResult> {
    const moduleNamespace = await import(pathToFileURL(input.entryModulePath).href);
    const definition = resolveDefinitionExport(moduleNamespace as Record<string, unknown>);
    validateDefinitionContract(definition);
    validateExposureCompatibility(definition, input.supportedExposures);

    const exposures = buildExposureSummary(definition, input.supportedExposures);
    this.loaded = {
      definition,
      storage: input.storage,
      exposures,
    };

    if (definition.lifecycle?.onStart) {
      await definition.lifecycle.onStart(
        createLifecycleContext(input.storage, input.supportedExposures.notifications, this.publishNotification),
      );
    }

    return { exposures };
  }

  getStatus(): ApplicationWorkerStatusResult {
    return {
      exposures: this.loaded?.exposures ?? null,
    };
  }

  async invokeQuery(input: ApplicationWorkerInvokeQueryInput): Promise<unknown> {
    const loaded = this.requireLoaded();
    const handler = loaded.definition.queries?.[input.queryName];
    if (!handler) {
      throw new Error(`Application query handler '${input.queryName}' was not found.`);
    }
    return handler(
      input.input,
      createHandlerContext(loaded.storage, input.requestContext, loaded.exposures.supportedExposures.notifications, this.publishNotification),
    );
  }

  async invokeCommand(input: ApplicationWorkerInvokeCommandInput): Promise<unknown> {
    const loaded = this.requireLoaded();
    const handler = loaded.definition.commands?.[input.commandName];
    if (!handler) {
      throw new Error(`Application command handler '${input.commandName}' was not found.`);
    }
    return handler(
      input.input,
      createHandlerContext(loaded.storage, input.requestContext, loaded.exposures.supportedExposures.notifications, this.publishNotification),
    );
  }

  async routeRequest(input: ApplicationWorkerRouteRequestInput): Promise<ApplicationRouteResponse> {
    const loaded = this.requireLoaded();
    const matched = matchRoute(loaded.definition.routes ?? [], input.request);
    if (!matched) {
      throw new Error(`No application route matched '${input.request.method} ${input.request.path}'.`);
    }

    const response = await matched.route.handler(
      { ...input.request, params: matched.params },
      createHandlerContext(loaded.storage, input.requestContext, loaded.exposures.supportedExposures.notifications, this.publishNotification),
    );
    if (isRouteResponse(response)) {
      return {
        status: response.status ?? 200,
        headers: response.headers ?? {},
        body: response.body ?? null,
      };
    }
    return {
      status: 200,
      headers: { "content-type": "application/json" },
      body: response ?? null,
    };
  }

  async executeGraphql(input: ApplicationWorkerExecuteGraphqlInput): Promise<unknown> {
    const loaded = this.requireLoaded();
    const executor = loaded.definition.graphql?.execute;
    if (!executor) {
      throw new Error("Application graphql executor was not found.");
    }
    return executor(
      input.request,
      createHandlerContext(loaded.storage, input.requestContext, loaded.exposures.supportedExposures.notifications, this.publishNotification),
    );
  }

  async invokeEventHandler(
    input: ApplicationWorkerInvokeEventHandlerInput,
  ): Promise<ApplicationPublicationDispatchResult> {
    const loaded = this.requireLoaded();
    const handlerKey = EVENT_HANDLER_KEY_BY_FAMILY[input.envelope.event.family];
    const handler = loaded.definition.eventHandlers?.[handlerKey];
    if (!handler) {
      return { status: "missing_handler" };
    }
    await handler(
      input.envelope,
      createHandlerContext(
        loaded.storage,
        {
          applicationId: input.envelope.event.applicationId,
          applicationSessionId: input.envelope.event.applicationSessionId,
        },
        loaded.exposures.supportedExposures.notifications,
        this.publishNotification,
      ),
    );
    return { status: "acknowledged" };
  }

  async stop(): Promise<void> {
    if (this.loaded?.definition.lifecycle?.onStop) {
      await this.loaded.definition.lifecycle.onStop(
        createLifecycleContext(
          this.loaded.storage,
          this.loaded.exposures.supportedExposures.notifications,
          this.publishNotification,
        ),
      );
    }
  }

  private requireLoaded(): LoadedApplicationDefinition {
    if (!this.loaded) {
      throw new Error("Application worker runtime is not loaded.");
    }
    return this.loaded;
  }
}
