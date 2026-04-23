import type { ApplicationConfiguredResource, ApplicationRuntimeResourceKind, ApplicationRuntimeResourceOwner, ApplicationRuntimeResourceRef, ApplicationRuntimeResourceSummary } from "./runtime-resources.js";
export * from "./manifests.js";
export * from "./runtime-resources.js";
export declare const APPLICATION_BACKEND_BUNDLE_CONTRACT_VERSION_V1: "1";
export declare const APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2: "2";
export declare const APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2: "2";
export declare const APPLICATION_EVENT_DELIVERY_SEMANTICS: "AT_LEAST_ONCE";
export type ApplicationRouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type ApplicationSkillAccessMode = "GLOBAL_DISCOVERY" | "PRELOADED_ONLY" | "NONE";
export type ApplicationBackendSupportedExposures = {
    queries: boolean;
    commands: boolean;
    routes: boolean;
    graphql: boolean;
    notifications: boolean;
    eventHandlers: boolean;
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
        backendDefinitionContractVersion: typeof APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2;
        frontendSdkContractVersion: typeof APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2;
    };
    supportedExposures: ApplicationBackendSupportedExposures;
    migrationsDir?: string | null;
    assetsDir?: string | null;
};
export type ApplicationRequestContext = {
    applicationId: string;
    launchInstanceId?: string | null;
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
export type ApplicationRuntimeInputContextFile = {
    uri: string;
    fileType?: string | null;
    fileName?: string | null;
    metadata?: Record<string, unknown> | null;
};
export type ApplicationRuntimeInput = {
    text: string;
    targetMemberName?: string | null;
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
    memberName: string;
    memberRouteKey?: string | null;
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
export type ApplicationStartRunInput = {
    bindingIntentId: string;
    resourceRef: ApplicationRuntimeResourceRef;
    launch: ApplicationAgentRunLaunch | ApplicationTeamRunLaunch;
    initialInput?: ApplicationRuntimeInput | null;
};
export type ApplicationRunBindingStatus = "ATTACHED" | "TERMINATING" | "TERMINATED" | "FAILED" | "ORPHANED";
export type ApplicationRunBindingRuntimeSubject = "AGENT_RUN" | "TEAM_RUN";
export type ApplicationExecutionProducerRuntimeKind = "AGENT" | "AGENT_TEAM_MEMBER";
export type ApplicationRunBindingMemberSummary = {
    memberName: string;
    memberRouteKey: string;
    displayName: string;
    teamPath: string[];
    runId: string;
    runtimeKind: ApplicationExecutionProducerRuntimeKind;
};
export type ApplicationRunBindingSummary = {
    bindingId: string;
    applicationId: string;
    bindingIntentId: string;
    status: ApplicationRunBindingStatus;
    resourceRef: ApplicationRuntimeResourceRef;
    runtime: {
        subject: ApplicationRunBindingRuntimeSubject;
        runId: string;
        definitionId: string;
        members: ApplicationRunBindingMemberSummary[];
    };
    createdAt: string;
    updatedAt: string;
    terminatedAt: string | null;
    lastErrorMessage: string | null;
};
export type ApplicationRunBindingListFilter = {
    status?: ApplicationRunBindingStatus | null;
};
export type ApplicationExecutionProducer = {
    runId: string;
    memberRouteKey: string;
    memberName: string | null;
    displayName: string | null;
    runtimeKind: ApplicationExecutionProducerRuntimeKind;
    teamPath: string[];
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
    binding: ApplicationRunBindingSummary;
    producer: ApplicationExecutionProducer | null;
};
export type ApplicationExecutionEventFamily = "RUN_STARTED" | "RUN_TERMINATED" | "RUN_FAILED" | "RUN_ORPHANED";
export type ApplicationExecutionEvent<TPayload = unknown> = {
    eventId: string;
    journalSequence: number;
    applicationId: string;
    family: ApplicationExecutionEventFamily;
    publishedAt: string;
    binding: ApplicationRunBindingSummary;
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
export type ApplicationRuntimeControl = {
    listAvailableResources: (filter?: {
        owner?: ApplicationRuntimeResourceOwner | null;
        kind?: ApplicationRuntimeResourceKind | null;
    } | null) => Promise<ApplicationRuntimeResourceSummary[]>;
    getConfiguredResource: (slotKey: string) => Promise<ApplicationConfiguredResource | null>;
    startRun: (input: ApplicationStartRunInput) => Promise<ApplicationRunBindingSummary>;
    getRunBinding: (bindingId: string) => Promise<ApplicationRunBindingSummary | null>;
    getRunBindingByIntentId: (bindingIntentId: string) => Promise<ApplicationRunBindingSummary | null>;
    listRunBindings: (filter?: ApplicationRunBindingListFilter | null) => Promise<ApplicationRunBindingSummary[]>;
    getRunPublishedArtifacts: (runId: string) => Promise<Array<{
        id: string;
        runId: string;
        path: string;
        type: ApplicationPublishedArtifactFileKind;
        status: "available";
        description: string | null;
        revisionId: string;
        createdAt: string;
        updatedAt: string;
    }>>;
    getPublishedArtifactRevisionText: (input: {
        runId: string;
        revisionId: string;
    }) => Promise<string | null>;
    postRunInput: (input: {
        bindingId: string;
        text: string;
        targetMemberName?: string | null;
        contextFiles?: ApplicationRuntimeInputContextFile[] | null;
        metadata?: Record<string, unknown> | null;
    }) => Promise<ApplicationRunBindingSummary>;
    terminateRunBinding: (bindingId: string) => Promise<ApplicationRunBindingSummary | null>;
};
export type ApplicationHandlerContext = {
    requestContext: ApplicationRequestContext | null;
    storage: ApplicationStorageContext;
    publishNotification: (topic: string, payload: unknown) => Promise<void>;
    runtimeControl: ApplicationRuntimeControl;
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
    definitionContractVersion: typeof APPLICATION_BACKEND_DEFINITION_CONTRACT_VERSION_V2;
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
    artifactHandlers?: {
        persisted?: ApplicationArtifactHandler;
    };
};
export type ApplicationBackendExposureSummary = {
    supportedExposures: ApplicationBackendSupportedExposures;
    queries: string[];
    commands: string[];
    routes: Array<Pick<ApplicationRouteDefinition, "method" | "path">>;
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