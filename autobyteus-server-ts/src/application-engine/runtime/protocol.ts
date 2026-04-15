import type {
  ApplicationBackendExposureSummary,
  ApplicationGraphqlRequest,
  ApplicationRequestContext,
  ApplicationRouteRequest,
  ApplicationStorageContext,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationPublicationDispatchEnvelope, ApplicationPublicationDispatchResult } from "../../application-sessions/domain/models.js";

export const APPLICATION_ENGINE_NOTIFICATION_METHOD = "application.notification" as const;
export const APPLICATION_ENGINE_METHOD_LOAD_DEFINITION = "loadApplicationDefinition" as const;
export const APPLICATION_ENGINE_METHOD_GET_STATUS = "getApplicationStatus" as const;
export const APPLICATION_ENGINE_METHOD_INVOKE_QUERY = "invokeApplicationQuery" as const;
export const APPLICATION_ENGINE_METHOD_INVOKE_COMMAND = "invokeApplicationCommand" as const;
export const APPLICATION_ENGINE_METHOD_ROUTE_REQUEST = "routeApplicationRequest" as const;
export const APPLICATION_ENGINE_METHOD_EXECUTE_GRAPHQL = "executeApplicationGraphql" as const;
export const APPLICATION_ENGINE_METHOD_INVOKE_EVENT_HANDLER = "invokeApplicationEventHandler" as const;
export const APPLICATION_ENGINE_METHOD_STOP = "stopApplication" as const;

export type ApplicationWorkerLoadDefinitionInput = {
  applicationId: string;
  entryModulePath: string;
  supportedExposures: ApplicationBackendExposureSummary["supportedExposures"];
  storage: ApplicationStorageContext;
};

export type ApplicationWorkerLoadDefinitionResult = {
  exposures: ApplicationBackendExposureSummary;
};

export type ApplicationWorkerInvokeQueryInput = {
  queryName: string;
  requestContext: ApplicationRequestContext | null;
  input: unknown;
};

export type ApplicationWorkerInvokeCommandInput = {
  commandName: string;
  requestContext: ApplicationRequestContext | null;
  input: unknown;
};

export type ApplicationWorkerRouteRequestInput = {
  requestContext: ApplicationRequestContext | null;
  request: ApplicationRouteRequest;
};

export type ApplicationWorkerExecuteGraphqlInput = {
  requestContext: ApplicationRequestContext | null;
  request: ApplicationGraphqlRequest;
};

export type ApplicationWorkerInvokeEventHandlerInput = {
  envelope: ApplicationPublicationDispatchEnvelope;
};

export type ApplicationWorkerNotificationParams = {
  topic: string;
  payload: unknown;
  publishedAt: string;
};

export type ApplicationWorkerStatusResult = {
  exposures: ApplicationBackendExposureSummary | null;
};

export type { ApplicationPublicationDispatchResult };
