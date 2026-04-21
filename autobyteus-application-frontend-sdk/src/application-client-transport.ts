import type {
  ApplicationGraphqlRequest,
  ApplicationNotificationMessage,
  ApplicationRequestContext,
  ApplicationRouteRequest,
  ApplicationRouteResponse,
} from "@autobyteus/application-sdk-contracts";

export type ApplicationClientTransport = {
  invokeQuery: (args: {
    applicationId: string;
    queryName: string;
    requestContext: ApplicationRequestContext | null;
    input: unknown;
  }) => Promise<unknown>;
  invokeCommand: (args: {
    applicationId: string;
    commandName: string;
    requestContext: ApplicationRequestContext | null;
    input: unknown;
  }) => Promise<unknown>;
  executeGraphql: (args: {
    applicationId: string;
    requestContext: ApplicationRequestContext | null;
    request: ApplicationGraphqlRequest;
  }) => Promise<unknown>;
  invokeRoute?: (args: {
    applicationId: string;
    requestContext: ApplicationRequestContext | null;
    request: ApplicationRouteRequest;
  }) => Promise<ApplicationRouteResponse | unknown>;
  subscribeNotifications?: (
    args: {
      applicationId: string;
      listener: (message: ApplicationNotificationMessage) => void;
    },
  ) => { close: () => void };
};
