export const APPLICATION_MANIFEST_VERSION_V2 = "2" as const;
export const APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1 = "1" as const;
export const APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V1 = "1" as const;
export const APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V1 = "1" as const;
export const APPLICATION_EVENT_DELIVERY_SEMANTICS = "AT_LEAST_ONCE" as const;

export type ApplicationRuntimeTargetKind = "AGENT" | "AGENT_TEAM";
export type ApplicationRouteMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type ApplicationBackendSupportedExposures = {
  queries: boolean;
  commands: boolean;
  routes: boolean;
  graphql: boolean;
  notifications: boolean;
  eventHandlers: boolean;
};

export type ApplicationManifestV2 = {
  manifestVersion: typeof APPLICATION_MANIFEST_VERSION_V2;
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  ui: {
    entryHtml: string;
    frontendSdkContractVersion: typeof APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V1;
  };
  runtimeTarget: {
    kind: ApplicationRuntimeTargetKind;
    localId: string;
  };
  backend: {
    bundleManifest: string;
  };
};

export type ApplicationBackendBundleManifestV1 = {
  contractVersion: typeof APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1;
  entryModule: string;
  moduleFormat: "esm";
  distribution: "self-contained";
  targetRuntime: {
    engine: "node";
    semver: string;
  };
  sdkCompatibility: {
    backendDefinitionContractVersion: typeof APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V1;
    frontendSdkContractVersion: typeof APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V1;
  };
  supportedExposures: ApplicationBackendSupportedExposures;
  migrationsDir?: string | null;
  assetsDir?: string | null;
};

export type ApplicationRequestContext = {
  applicationId: string;
  applicationSessionId?: string | null;
};

export type ApplicationStorageContext = {
  rootPath: string;
  runtimePath: string;
  logsPath: string;
  appDatabasePath: string;
  appDatabaseUrl: string;
  assetsPath: string | null;
};

export type ApplicationNotificationMessage = {
  applicationId: string;
  topic: string;
  payload: unknown;
  publishedAt: string;
};

export type ApplicationHandlerContext = {
  requestContext: ApplicationRequestContext | null;
  storage: ApplicationStorageContext;
  publishNotification: (topic: string, payload: unknown) => Promise<void>;
};

export type ApplicationRouteRequest = {
  method: ApplicationRouteMethod;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  body: unknown;
};

export type ApplicationRouteResponse = {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
};

export type ApplicationGraphqlRequest = {
  query: string;
  operationName?: string | null;
  variables?: Record<string, unknown> | null;
};

export type ApplicationQueryHandler<TInput = unknown, TResult = unknown> = (
  input: TInput,
  context: ApplicationHandlerContext,
) => Promise<TResult> | TResult;

export type ApplicationCommandHandler<TInput = unknown, TResult = unknown> = (
  input: TInput,
  context: ApplicationHandlerContext,
) => Promise<TResult> | TResult;

export type ApplicationRouteHandler<TBody = unknown, TResult = unknown> = (
  request: ApplicationRouteRequest & { body: TBody },
  context: ApplicationHandlerContext,
) => Promise<ApplicationRouteResponse | TResult> | ApplicationRouteResponse | TResult;

export type ApplicationGraphqlExecutor = (
  request: ApplicationGraphqlRequest,
  context: ApplicationHandlerContext,
) => Promise<unknown> | unknown;

export type NormalizedPublicationEventFamily =
  | "SESSION_STARTED"
  | "SESSION_TERMINATED"
  | "ARTIFACT";

export type NormalizedPublicationEvent<TPayload = unknown> = {
  eventId: string;
  journalSequence: number;
  applicationId: string;
  applicationSessionId: string;
  family: NormalizedPublicationEventFamily;
  publishedAt: string;
  producer: {
    memberRouteKey: string;
    memberName?: string | null;
    role?: string | null;
  };
  payload: TPayload;
};

export type ApplicationEventDispatchEnvelope<TPayload = unknown> = {
  event: NormalizedPublicationEvent<TPayload>;
  delivery: {
    semantics: typeof APPLICATION_EVENT_DELIVERY_SEMANTICS;
    attemptNumber: number;
    dispatchedAt: string;
  };
};

export type ApplicationEventHandler = (
  event: ApplicationEventDispatchEnvelope,
  context: ApplicationHandlerContext,
) => Promise<void> | void;

export type ApplicationEventHandlerKey =
  | "sessionStarted"
  | "sessionTerminated"
  | "artifact";

export type ApplicationLifecycleHook = (
  context: Omit<ApplicationHandlerContext, "requestContext"> & { requestContext: null },
) => Promise<void> | void;

export type ApplicationRouteDefinition = {
  method: ApplicationRouteMethod;
  path: string;
  handler: ApplicationRouteHandler;
};

export type ApplicationBackendDefinition = {
  definitionContractVersion: typeof APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V1;
  lifecycle?: {
    onStart?: ApplicationLifecycleHook;
    onStop?: ApplicationLifecycleHook;
  };
  queries?: Record<string, ApplicationQueryHandler>;
  commands?: Record<string, ApplicationCommandHandler>;
  routes?: ApplicationRouteDefinition[];
  graphql?: {
    execute: ApplicationGraphqlExecutor;
  };
  eventHandlers?: Partial<Record<ApplicationEventHandlerKey, ApplicationEventHandler>>;
};

export type ApplicationBackendExposureSummary = {
  supportedExposures: ApplicationBackendSupportedExposures;
  queries: string[];
  commands: string[];
  routes: Array<Pick<ApplicationRouteDefinition, "method" | "path">>;
  graphql: boolean;
  notifications: boolean;
  eventHandlers: NormalizedPublicationEventFamily[];
};

export type ApplicationEngineState =
  | "stopped"
  | "preparing_storage"
  | "starting_worker"
  | "ready"
  | "failed"
  | "stopping";

export type ApplicationEngineStatus = {
  applicationId: string;
  state: ApplicationEngineState;
  ready: boolean;
  startedAt: string | null;
  lastFailure: string | null;
  exposures: ApplicationBackendExposureSummary | null;
};
