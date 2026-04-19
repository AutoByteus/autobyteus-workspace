import type {
  ApplicationGraphqlRequest,
  ApplicationNotificationMessage,
  ApplicationRequestContext,
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
  subscribeNotifications?: (
    args: {
      applicationId: string;
      listener: (message: ApplicationNotificationMessage) => void;
    },
  ) => { close: () => void };
};

export type ApplicationClientOptions = {
  applicationId: string;
  requestContext?: ApplicationRequestContext | null;
  transport: ApplicationClientTransport;
};

export const createApplicationClient = (options: ApplicationClientOptions) => {
  const getRequestContext = (): ApplicationRequestContext | null =>
    options.requestContext ?? { applicationId: options.applicationId, launchInstanceId: null };

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

export type {
  ApplicationGraphqlRequest,
  ApplicationNotificationMessage,
  ApplicationRequestContext,
} from "@autobyteus/application-sdk-contracts";
