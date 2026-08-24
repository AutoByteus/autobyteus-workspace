import type { ApplicationConfiguredExecutionResource, ApplicationExecutionResourceKind, ApplicationExecutionResourceSource, ApplicationExecutionResourceRef, ApplicationExecutionResourceSummary } from "./execution-resources.js";
import type { ApplicationAgentEventStreamObserver, ApplicationAgentEventStreamOptions, ApplicationAgentEventStreamSubscription } from "./application-agent-communication.js";
import type { ApplicationAgentBinding, ApplicationAgentBindingListFilter, ApplicationAgentInput, ApplicationAgentTeamBinding, ApplicationAgentTargetAddress, ApplicationExecutionProducer, ApplicationRuntimeInputContextFile } from "./application-agent-bindings.js";
import type { ApplicationWebSocketRouteDefinition } from "./application-websockets.js";
export * from "./manifests.js";
export * from "./execution-resources.js";
export * from "./application-iframe-contract.js";
export * from "./application-agent-bindings.js";
export * from "./application-agent-events.js";
export * from "./application-agent-communication.js";
export * from "./application-agent-target-url.js";
export * from "./application-websockets.js";
export declare const APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1: "1";
export declare const APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6: "6";
export declare const APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6: "6";
export declare const APPLICATION_EVENT_DELIVERY_SEMANTICS: "AT_LEAST_ONCE";
export type ApplicationRouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type ApplicationSkillAccessMode = "PRELOADED_ONLY" | "NONE";
export type ApplicationBackendSupportedExposures = {
    queries: boolean;
    commands: boolean;
    routes: boolean;
    graphql: boolean;
    notifications: boolean;
    eventHandlers: boolean;
    webSockets: boolean;
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
        backendDefinitionContractVersion: typeof APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6;
        frontendSdkContractVersion: typeof APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V6;
    };
    supportedExposures: ApplicationBackendSupportedExposures;
    migrationsDir?: string | null;
    assetsDir?: string | null;
};
export type ApplicationRequestContext = {
    applicationId: string;
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
export type ApplicationRuntimeInput = {
    text: string;
    targetMemberAddress?: string | null;
    contextFiles?: ApplicationRuntimeInputContextFile[] | null;
    metadata?: Record<string, unknown> | null;
};
export type ApplicationAgentRunLaunch = {
    kind: "AGENT";
    workspaceRootPath: string;
    workspaceId?: string | null;
    llmModelIdentifier: string;
    autoExecuteTools?: boolean | null;
    llmConfig?: Record<string, unknown> | null;
    skillAccessMode?: ApplicationSkillAccessMode | null;
    runtimeKind?: string | null;
};
export type ApplicationTeamRunPreset = {
    workspaceRootPath: string;
    llmModelIdentifier: string;
    autoExecuteTools?: boolean | null;
    skillAccessMode?: ApplicationSkillAccessMode | null;
    runtimeKind?: string | null;
    llmConfig?: Record<string, unknown> | null;
};
export type ApplicationTeamMemberLaunchConfig = {
    memberAddress: string;
    agentDefinitionId?: string | null;
    llmModelIdentifier: string;
    autoExecuteTools: boolean;
    skillAccessMode: ApplicationSkillAccessMode;
    workspaceId?: string | null;
    workspaceRootPath?: string | null;
    llmConfig?: Record<string, unknown> | null;
    runtimeKind?: string | null;
};
export type ApplicationTeamRunLaunch = {
    kind: "AGENT_TEAM";
    mode: "preset";
    launchPreset: ApplicationTeamRunPreset;
} | {
    kind: "AGENT_TEAM";
    mode: "memberConfigs";
    memberConfigs: ApplicationTeamMemberLaunchConfig[];
};
export type ApplicationStartAgentInput = {
    launchRequestId: string;
    executionResourceRef: ApplicationExecutionResourceRef;
    launch: ApplicationAgentRunLaunch;
    initialInput?: ApplicationRuntimeInput | null;
};
export type ApplicationStartAgentTeamInput = {
    launchRequestId: string;
    executionResourceRef: ApplicationExecutionResourceRef;
    launch: ApplicationTeamRunLaunch;
    initialInput?: ApplicationRuntimeInput | null;
};
export type ApplicationPublishedArtifactFileKind = "file" | "image" | "audio" | "video" | "pdf" | "csv" | "excel" | "other";
export type ApplicationPublishedArtifactEvent = {
    runId: string;
    artifactId: string;
    revisionId: string;
    path: string;
    description: string | null;
    fileKind: ApplicationPublishedArtifactFileKind;
    publishedAt: string;
    binding: ApplicationAgentBinding | ApplicationAgentTeamBinding;
    producer: ApplicationExecutionProducer | null;
};
export type ApplicationExecutionEventFamily = "RUN_STARTED" | "RUN_TERMINATED" | "RUN_FAILED" | "RUN_ORPHANED";
export type ApplicationExecutionEvent<TPayload = unknown> = {
    eventId: string;
    journalSequence: number;
    applicationId: string;
    family: ApplicationExecutionEventFamily;
    publishedAt: string;
    binding: ApplicationAgentBinding | ApplicationAgentTeamBinding;
    producer: ApplicationExecutionProducer | null;
    payload: TPayload;
};
export type ApplicationExecutionEventEnvelope<TPayload = unknown> = {
    event: ApplicationExecutionEvent<TPayload>;
    delivery: {
        semantics: typeof APPLICATION_EVENT_DELIVERY_SEMANTICS;
        attemptNumber: number;
        dispatchedAt: string;
    };
};
export type ApplicationAgentExecution = {
    startAgent: (input: ApplicationStartAgentInput) => Promise<ApplicationAgentBinding>;
    startAgentTeam: (input: ApplicationStartAgentTeamInput) => Promise<ApplicationAgentTeamBinding>;
    sendInput: (input: {
        address: ApplicationAgentTargetAddress;
        input: ApplicationAgentInput;
    }) => Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding>;
    subscribeEventStream: (address: ApplicationAgentTargetAddress, observer: ApplicationAgentEventStreamObserver, options?: ApplicationAgentEventStreamOptions) => Promise<ApplicationAgentEventStreamSubscription>;
    terminate: (bindingId: string) => Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null>;
    get: (bindingId: string) => Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null>;
    list: (filter?: ApplicationAgentBindingListFilter | null) => Promise<Array<ApplicationAgentBinding | ApplicationAgentTeamBinding>>;
    findByLaunchRequestId: (launchRequestId: string) => Promise<ApplicationAgentBinding | ApplicationAgentTeamBinding | null>;
};
export type ApplicationAgentResources = {
    listAvailable: (filter?: {
        source?: ApplicationExecutionResourceSource | null;
        kind?: ApplicationExecutionResourceKind | null;
    } | null) => Promise<ApplicationExecutionResourceSummary[]>;
    getConfigured: (slotKey: string) => Promise<ApplicationConfiguredExecutionResource | null>;
};
export type ApplicationPublishedArtifactSummary = {
    id: string;
    runId: string;
    path: string;
    type: ApplicationPublishedArtifactFileKind;
    status: "available";
    description: string | null;
    revisionId: string;
    createdAt: string;
    updatedAt: string;
};
export type ApplicationPublishedArtifacts = {
    list: (runId: string) => Promise<ApplicationPublishedArtifactSummary[]>;
    readRevision: (input: {
        runId: string;
        revisionId: string;
    }) => Promise<string | null>;
};
export type ApplicationHandlerContext = {
    requestContext: ApplicationRequestContext | null;
    storage: ApplicationStorageContext;
    publishNotification: (topic: string, payload: unknown) => Promise<void>;
    agentExecution: ApplicationAgentExecution;
    agentResources: ApplicationAgentResources;
    publishedArtifacts: ApplicationPublishedArtifacts;
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
export type ApplicationQueryHandler<TInput = unknown, TResult = unknown> = (input: TInput, context: ApplicationHandlerContext) => Promise<TResult> | TResult;
export type ApplicationCommandHandler<TInput = unknown, TResult = unknown> = (input: TInput, context: ApplicationHandlerContext) => Promise<TResult> | TResult;
export type ApplicationRouteHandler<TBody = unknown, TResult = unknown> = (request: ApplicationRouteRequest & {
    body: TBody;
}, context: ApplicationHandlerContext) => Promise<ApplicationRouteResponse | TResult> | ApplicationRouteResponse | TResult;
export type ApplicationGraphqlExecutor = (request: ApplicationGraphqlRequest, context: ApplicationHandlerContext) => Promise<unknown> | unknown;
export type ApplicationEventHandler = (event: ApplicationExecutionEventEnvelope, context: ApplicationHandlerContext) => Promise<void> | void;
export type ApplicationArtifactHandler = (event: ApplicationPublishedArtifactEvent, context: ApplicationHandlerContext) => Promise<void> | void;
export type ApplicationEventHandlerKey = "runStarted" | "runTerminated" | "runFailed" | "runOrphaned";
export type ApplicationLifecycleHook = (context: Omit<ApplicationHandlerContext, "requestContext"> & {
    requestContext: null;
}) => Promise<void> | void;
export type ApplicationRouteDefinition = {
    method: ApplicationRouteMethod;
    path: string;
    handler: ApplicationRouteHandler;
};
export type ApplicationBackendDefinition = {
    definitionContractVersion: typeof APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V6;
    lifecycle?: {
        onStart?: ApplicationLifecycleHook;
        onStop?: ApplicationLifecycleHook;
    };
    queries?: Record<string, ApplicationQueryHandler>;
    commands?: Record<string, ApplicationCommandHandler>;
    routes?: ApplicationRouteDefinition[];
    webSocketRoutes?: ApplicationWebSocketRouteDefinition[];
    graphql?: {
        execute: ApplicationGraphqlExecutor;
    };
    eventHandlers?: Partial<Record<ApplicationEventHandlerKey, ApplicationEventHandler>>;
    artifactHandlers?: {
        persisted?: ApplicationArtifactHandler;
    };
};
export type ApplicationBackendExposureSummary = {
    supportedExposures: ApplicationBackendSupportedExposures;
    queries: string[];
    commands: string[];
    routes: Array<Pick<ApplicationRouteDefinition, "method" | "path">>;
    webSocketRoutes: Array<Pick<ApplicationWebSocketRouteDefinition, "path">>;
    graphql: boolean;
    notifications: boolean;
    eventHandlers: ApplicationExecutionEventFamily[];
};
export type ApplicationEngineState = "stopped" | "preparing_storage" | "starting_worker" | "ready" | "failed" | "stopping";
export type ApplicationEngineStatus = {
    applicationId: string;
    state: ApplicationEngineState;
    ready: boolean;
    startedAt: string | null;
    lastFailure: string | null;
    exposures: ApplicationBackendExposureSummary | null;
};
//# sourceMappingURL=index.d.ts.map