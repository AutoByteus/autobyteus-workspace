export type ApplicationRuntimeTargetKind = 'AGENT' | 'AGENT_TEAM'
export type ApplicationProducerRuntimeKind = 'AGENT' | 'AGENT_TEAM_MEMBER'

export type ApplicationSessionApplication = {
  applicationId: string
  localApplicationId: string
  packageId: string
  name: string
  description: string | null
  iconAssetPath: string | null
  entryHtmlAssetPath: string
  writable: boolean
}

export type ApplicationSessionRuntime = {
  kind: ApplicationRuntimeTargetKind
  runId: string
  definitionId: string
}

export type ApplicationArtifactRef =
  | { kind: 'WORKSPACE_FILE'; workspaceId?: string | null; path: string }
  | { kind: 'URL'; url: string }
  | { kind: 'BUNDLE_ASSET'; assetPath: string }
  | { kind: 'INLINE_JSON'; mimeType: string; value: unknown }

export type ApplicationProducerProvenance = {
  memberRouteKey: string
  displayName: string
  teamPath: string[]
  runId: string
  runtimeKind: ApplicationProducerRuntimeKind
}

export type ApplicationArtifactProjection = {
  artifactKey: string
  artifactType: string
  title: string | null
  summary: string | null
  artifactRef: ApplicationArtifactRef
  metadata: Record<string, unknown> | null
  isFinal: boolean
  updatedAt: string
  producer: ApplicationProducerProvenance
}

export type ApplicationMemberProjection = {
  memberRouteKey: string
  displayName: string
  teamPath: string[]
  runtimeTarget: {
    runId: string
    runtimeKind: ApplicationProducerRuntimeKind
  } | null
  artifactsByKey: Record<string, ApplicationArtifactProjection>
  primaryArtifactKey: string | null
}

export type ApplicationSessionSnapshot = {
  applicationSessionId: string
  application: ApplicationSessionApplication
  runtime: ApplicationSessionRuntime
  view: {
    members: ApplicationMemberProjection[]
  }
  createdAt: string
  terminatedAt: string | null
}

export type ApplicationSession = ApplicationSessionSnapshot

export type ApplicationSessionBindingResolution = 'requested_live' | 'application_active' | 'none'

export type ApplicationSessionBinding = {
  applicationId: string
  requestedSessionId: string | null
  resolvedSessionId: string | null
  resolution: ApplicationSessionBindingResolution
  session: ApplicationSession | null
}

export type ApplicationSessionTransport = {
  graphqlUrl: string
  restBaseUrl: string
  websocketUrl: string
  sessionStreamUrl: string
  backendStatusUrl: string | null
  backendQueriesBaseUrl: string | null
  backendCommandsBaseUrl: string | null
  backendGraphqlUrl: string | null
  backendRoutesBaseUrl: string | null
  backendNotificationsUrl: string | null
}

export type ApplicationUserContextFile = {
  uri: string
  fileType?: string | null
  fileName?: string | null
  metadata?: Record<string, unknown> | null
}
