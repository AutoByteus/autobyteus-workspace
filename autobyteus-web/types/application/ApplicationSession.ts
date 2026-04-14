export type ApplicationRuntimeTargetKind = 'AGENT' | 'AGENT_TEAM'
export type ApplicationProducerRuntimeKind = 'AGENT' | 'AGENT_TEAM_MEMBER'
export type ApplicationSessionBootstrapState =
  | 'waiting_for_ready'
  | 'bootstrapped'
  | 'bootstrap_failed'

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

export type ApplicationDeliveryStateProjection = {
  publicationKey: string
  deliveryState: 'waiting' | 'in_progress' | 'ready' | 'blocked'
  title: string | null
  summary: string | null
  artifactType: string | null
  artifactRef: ApplicationArtifactRef | null
  updatedAt: string
  producer: ApplicationProducerProvenance
}

export type ApplicationMemberArtifactProjection = {
  publicationKey: string
  artifactType: string
  state: 'draft' | 'ready' | 'blocked' | 'superseded'
  title: string
  summary: string | null
  artifactRef: ApplicationArtifactRef
  isFinal: boolean
  updatedAt: string
  producer: ApplicationProducerProvenance
}

export type ApplicationMemberProgressProjection = {
  publicationKey: string
  phaseLabel: string
  state: 'queued' | 'working' | 'ready' | 'blocked'
  percent: number | null
  detailText: string | null
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
  artifactsByKey: Record<string, ApplicationMemberArtifactProjection>
  primaryArtifactKey: string | null
  progressByKey: Record<string, ApplicationMemberProgressProjection>
  primaryProgressKey: string | null
}

export type ApplicationSessionSnapshot = {
  applicationSessionId: string
  application: ApplicationSessionApplication
  runtime: ApplicationSessionRuntime
  view: {
    delivery: {
      current: ApplicationDeliveryStateProjection | null
    }
    members: ApplicationMemberProjection[]
  }
  createdAt: string
  terminatedAt: string | null
}

export type ApplicationSession = ApplicationSessionSnapshot & {
  bootstrapState: ApplicationSessionBootstrapState
  bootstrapError: string | null
}

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
}

export type ApplicationUserContextFile = {
  uri: string
  fileType?: string | null
  fileName?: string | null
  metadata?: Record<string, unknown> | null
}
