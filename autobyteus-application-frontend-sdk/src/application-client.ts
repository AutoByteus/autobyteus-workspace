import type {
  ApplicationGraphqlRequest,
  ApplicationNotificationMessage,
  ApplicationRequestContext,
  ApplicationRouteRequest,
  ApplicationRouteResponse,
} from "@autobyteus/application-sdk-contracts";
import type { ApplicationClientTransport } from "./application-client-transport.js";

export type ApplicationClientOptions = {
  applicationId: string;
  requestContext?: ApplicationRequestContext | null;
  transport: ApplicationClientTransport;
};

export const createApplicationClient = (options: ApplicationClientOptions) => {
  const getRequestContext = (): ApplicationRequestContext | null =>
    options.requestContext ?? { applicationId: options.applicationId };

  return {
    getApplicationInfo: () => ({
      applicationId: options.applicationId,
      requestContext: getRequestContext(),
    }),
    query: (queryName: string, input?: unknown) =>
      options.transport.invokeQuery({
        applicationId: options.applicationId,
        queryName,
        requestContext: getRequestContext(),
        input: input ?? null,
      }),
    command: (commandName: string, input?: unknown) =>
      options.transport.invokeCommand({
        applicationId: options.applicationId,
        commandName,
        requestContext: getRequestContext(),
        input: input ?? null,
      }),
    graphql: (request: ApplicationGraphqlRequest) =>
      options.transport.executeGraphql({
        applicationId: options.applicationId,
        requestContext: getRequestContext(),
        request,
      }),
    route: (request: ApplicationRouteRequest): Promise<ApplicationRouteResponse | unknown> => {
      if (!options.transport.invokeRoute) {
        throw new Error("The application transport does not support route invocation.");
      }
      return options.transport.invokeRoute({
        applicationId: options.applicationId,
        requestContext: getRequestContext(),
        request,
      });
    },
    subscribeNotifications: (
      listener: (message: ApplicationNotificationMessage) => void,
    ): { close: () => void } => {
      if (!options.transport.subscribeNotifications) {
        return { close: () => undefined };
      }
      return options.transport.subscribeNotifications({
        applicationId: options.applicationId,
        listener,
      });
    },
  };
};

export type ApplicationClient = ReturnType<typeof createApplicationClient>;
