import type {
  ApplicationConfiguredAgentLaunchProfile,
  ApplicationConfiguredLaunchProfile,
  ApplicationConfiguredTeamLaunchProfile,
  ApplicationConfiguredTeamMemberProfile,
  ApplicationResourceConfigurationView,
  ApplicationResourceSlotDeclaration,
  ApplicationRuntimeResourceRef,
  ApplicationRuntimeResourceSummary,
} from '@autobyteus/application-sdk-contracts'

export type ApplicationAgentLaunchProfileDraft = {
  kind: 'AGENT'
  runtimeKind: string
  llmModelIdentifier: string
  workspaceRootPath: string
}

export type ApplicationTeamMemberProfileDraft = {
  memberRouteKey: string
  memberName: string
  agentDefinitionId: string
  runtimeKind: string
  llmModelIdentifier: string
}

export type ApplicationTeamLaunchProfileDraft = {
  kind: 'AGENT_TEAM'
  defaults: {
    runtimeKind: string
    llmModelIdentifier: string
    workspaceRootPath: string
  }
  memberProfiles: ApplicationTeamMemberProfileDraft[]
}

export type ApplicationLaunchProfileDraft =
  | ApplicationAgentLaunchProfileDraft
  | ApplicationTeamLaunchProfileDraft
  | null

export type ApplicationSlotDraft = {
  selection: string
  launchProfile: ApplicationLaunchProfileDraft
}

export type ApplicationSlotEditorReadiness = {
  isReady: boolean
  blockingReason: string | null
  hasEffectiveResource: boolean
}

export type ApplicationLaunchSetupTranslate = (
  key: string,
  params?: Record<string, string | number>,
) => string

export const MANIFEST_DEFAULT_SELECTION = '__manifest_default__'

const normalizeOptionalString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

export const isSameResourceRef = (
  left: ApplicationRuntimeResourceRef | null | undefined,
  right: ApplicationRuntimeResourceRef | null | undefined,
): boolean => {
  if (!left || !right) {
    return left === right
  }
  if (left.owner !== right.owner || left.kind !== right.kind) {
    return false
  }
  if (left.owner === 'bundle' && right.owner === 'bundle') {
    return left.localId === right.localId
  }
  if (left.owner === 'shared' && right.owner === 'shared') {
    return left.definitionId === right.definitionId
  }
  return false
}

export const buildResourceRefKey = (resourceRef: ApplicationRuntimeResourceRef): string => (
  resourceRef.owner === 'bundle'
    ? `bundle:${resourceRef.kind}:${resourceRef.localId}`
    : `shared:${resourceRef.kind}:${resourceRef.definitionId}`
)

export const summaryToResourceRef = (resource: ApplicationRuntimeResourceSummary): ApplicationRuntimeResourceRef => (
  resource.owner === 'bundle'
    ? {
        owner: 'bundle',
        kind: resource.kind,
        localId: resource.localId ?? resource.definitionId,
      }
    : {
        owner: 'shared',
        kind: resource.kind,
        definitionId: resource.definitionId,
      }
)

export const resourcesForSlot = (
  slot: ApplicationResourceSlotDeclaration,
  availableResources: ApplicationRuntimeResourceSummary[],
): ApplicationRuntimeResourceSummary[] => {
  const allowedOwners = slot.allowedResourceOwners ?? ['bundle', 'shared']
  return availableResources.filter((resource) => (
    slot.allowedResourceKinds.includes(resource.kind)
    && allowedOwners.includes(resource.owner)
  ))
}

export const resolveSelectedResourceRef = (
  selection: string,
  availableResources: ApplicationRuntimeResourceSummary[],
): ApplicationRuntimeResourceRef | null => {
  if (!selection || selection === MANIFEST_DEFAULT_SELECTION) {
    return null
  }
  const matchedResource = availableResources.find(
    (resource) => buildResourceRefKey(summaryToResourceRef(resource)) === selection,
  )
  return matchedResource ? summaryToResourceRef(matchedResource) : null
}

export const resolveEffectiveResourceRef = (
  view: ApplicationResourceConfigurationView,
  draft: ApplicationSlotDraft | null | undefined,
  availableResources: ApplicationRuntimeResourceSummary[],
): ApplicationRuntimeResourceRef | null => {
  if (!draft) {
    return null
  }
  if (draft.selection === MANIFEST_DEFAULT_SELECTION) {
    return view.slot.defaultResourceRef ?? null
  }
  return resolveSelectedResourceRef(draft.selection, availableResources)
}

export const hasEffectiveResourceSelection = (
  view: ApplicationResourceConfigurationView,
  draft: ApplicationSlotDraft | null | undefined,
  availableResources: ApplicationRuntimeResourceSummary[],
): boolean => Boolean(resolveEffectiveResourceRef(view, draft, availableResources))

const buildAgentLaunchProfileDraft = (
  launchProfile: ApplicationConfiguredAgentLaunchProfile | null | undefined,
): ApplicationAgentLaunchProfileDraft => ({
  kind: 'AGENT',
  runtimeKind: normalizeOptionalString(launchProfile?.runtimeKind),
  llmModelIdentifier: normalizeOptionalString(launchProfile?.llmModelIdentifier),
  workspaceRootPath: normalizeOptionalString(launchProfile?.workspaceRootPath),
})

const buildTeamMemberProfileDraft = (
  memberProfile: ApplicationConfiguredTeamMemberProfile,
): ApplicationTeamMemberProfileDraft => ({
  memberRouteKey: memberProfile.memberRouteKey,
  memberName: memberProfile.memberName,
  agentDefinitionId: memberProfile.agentDefinitionId,
  runtimeKind: normalizeOptionalString(memberProfile.runtimeKind),
  llmModelIdentifier: normalizeOptionalString(memberProfile.llmModelIdentifier),
})

const buildTeamLaunchProfileDraft = (
  launchProfile: ApplicationConfiguredTeamLaunchProfile | null | undefined,
): ApplicationTeamLaunchProfileDraft => ({
  kind: 'AGENT_TEAM',
  defaults: {
    runtimeKind: normalizeOptionalString(launchProfile?.defaults?.runtimeKind),
    llmModelIdentifier: normalizeOptionalString(launchProfile?.defaults?.llmModelIdentifier),
    workspaceRootPath: normalizeOptionalString(launchProfile?.defaults?.workspaceRootPath),
  },
  memberProfiles: [...(launchProfile?.memberProfiles ?? [])]
    .map((memberProfile) => buildTeamMemberProfileDraft(memberProfile))
    .sort((left, right) => left.memberRouteKey.localeCompare(right.memberRouteKey)),
})

const buildLaunchProfileDraft = (
  launchProfile: ApplicationConfiguredLaunchProfile | null | undefined,
): ApplicationLaunchProfileDraft => {
  if (!launchProfile) {
    return null
  }
  return launchProfile.kind === 'AGENT'
    ? buildAgentLaunchProfileDraft(launchProfile)
    : buildTeamLaunchProfileDraft(launchProfile)
}

export const buildEmptyLaunchProfileDraft = (
  resourceKind: ApplicationRuntimeResourceRef['kind'],
): ApplicationLaunchProfileDraft => (
  resourceKind === 'AGENT'
    ? buildAgentLaunchProfileDraft(null)
    : buildTeamLaunchProfileDraft(null)
)

export const buildDraftFromView = (
  view: ApplicationResourceConfigurationView,
): ApplicationSlotDraft => {
  const candidateConfiguration = view.configuration ?? view.invalidSavedConfiguration ?? null
  const currentResourceRef = candidateConfiguration?.resourceRef ?? null
  const usingManifestDefault = Boolean(
    view.slot.defaultResourceRef
    && currentResourceRef
    && isSameResourceRef(currentResourceRef, view.slot.defaultResourceRef)
  )

  return {
    selection: usingManifestDefault
      ? MANIFEST_DEFAULT_SELECTION
      : currentResourceRef
        ? buildResourceRefKey(currentResourceRef)
        : '',
    launchProfile: buildLaunchProfileDraft(candidateConfiguration?.launchProfile ?? null),
  }
}

const buildAgentLaunchProfile = (
  draft: ApplicationAgentLaunchProfileDraft,
): ApplicationConfiguredAgentLaunchProfile | null => {
  const llmModelIdentifier = normalizeOptionalString(draft.llmModelIdentifier)
  const runtimeKind = normalizeOptionalString(draft.runtimeKind)
  const workspaceRootPath = normalizeOptionalString(draft.workspaceRootPath)

  if (!llmModelIdentifier && !runtimeKind && !workspaceRootPath) {
    return null
  }

  return {
    kind: 'AGENT',
    ...(llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(runtimeKind ? { runtimeKind } : {}),
    ...(workspaceRootPath ? { workspaceRootPath } : {}),
  }
}

const buildTeamLaunchProfile = (
  draft: ApplicationTeamLaunchProfileDraft,
): ApplicationConfiguredTeamLaunchProfile => {
  const defaults = {
    llmModelIdentifier: normalizeOptionalString(draft.defaults.llmModelIdentifier),
    runtimeKind: normalizeOptionalString(draft.defaults.runtimeKind),
    workspaceRootPath: normalizeOptionalString(draft.defaults.workspaceRootPath),
  }

  return {
    kind: 'AGENT_TEAM',
    defaults: defaults.llmModelIdentifier || defaults.runtimeKind || defaults.workspaceRootPath
      ? {
          ...(defaults.llmModelIdentifier ? { llmModelIdentifier: defaults.llmModelIdentifier } : {}),
          ...(defaults.runtimeKind ? { runtimeKind: defaults.runtimeKind } : {}),
          ...(defaults.workspaceRootPath ? { workspaceRootPath: defaults.workspaceRootPath } : {}),
        }
      : null,
    memberProfiles: [...draft.memberProfiles]
      .map((memberProfile) => ({
        memberRouteKey: memberProfile.memberRouteKey,
        memberName: memberProfile.memberName,
        agentDefinitionId: memberProfile.agentDefinitionId,
        ...(normalizeOptionalString(memberProfile.llmModelIdentifier)
          ? { llmModelIdentifier: normalizeOptionalString(memberProfile.llmModelIdentifier) }
          : {}),
        ...(normalizeOptionalString(memberProfile.runtimeKind)
          ? { runtimeKind: normalizeOptionalString(memberProfile.runtimeKind) }
          : {}),
      }))
      .sort((left, right) => left.memberRouteKey.localeCompare(right.memberRouteKey)),
  }
}

export const buildLaunchProfile = (
  draft: ApplicationLaunchProfileDraft,
): ApplicationConfiguredLaunchProfile | null => {
  if (!draft) {
    return null
  }
  return draft.kind === 'AGENT'
    ? buildAgentLaunchProfile(draft)
    : buildTeamLaunchProfile(draft)
}

const normalizeDraft = (
  draft: ApplicationSlotDraft,
): ApplicationSlotDraft => ({
  selection: draft.selection,
  launchProfile: draft.launchProfile
    ? buildLaunchProfileDraft(buildLaunchProfile(draft.launchProfile))
    : null,
})

export const hasUnsavedDraftChanges = (
  view: ApplicationResourceConfigurationView,
  draft: ApplicationSlotDraft | null | undefined,
): boolean => {
  if (!draft) {
    return false
  }
  return JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(buildDraftFromView(view)))
}

export const describeResourceSummary = (
  resource: ApplicationRuntimeResourceSummary,
  t: ApplicationLaunchSetupTranslate,
): string => {
  const ownerLabel = resource.owner === 'bundle'
    ? t('applications.components.applications.ApplicationLaunchSetupPanel.bundleResource')
    : t('applications.components.applications.ApplicationLaunchSetupPanel.sharedResource')
  const kindLabel = resource.kind === 'AGENT_TEAM'
    ? t('applications.shared.agentTeam')
    : t('applications.shared.singleAgent')
  return `${resource.name} · ${ownerLabel} · ${kindLabel}`
}

export const describeResourceRef = (
  resourceRef: ApplicationRuntimeResourceRef,
  availableResources: ApplicationRuntimeResourceSummary[],
  t: ApplicationLaunchSetupTranslate,
): string => {
  const matched = availableResources.find((resource) => isSameResourceRef(summaryToResourceRef(resource), resourceRef))
  if (matched) {
    return describeResourceSummary(matched, t)
  }

  const identifier = resourceRef.owner === 'bundle' ? resourceRef.localId : resourceRef.definitionId
  return `${resourceRef.kind} · ${resourceRef.owner} · ${identifier}`
}

export const describeCurrentSelection = (
  view: ApplicationResourceConfigurationView,
  availableResources: ApplicationRuntimeResourceSummary[],
  t: ApplicationLaunchSetupTranslate,
): string => {
  const candidateConfiguration = view.configuration ?? view.invalidSavedConfiguration ?? null
  if (candidateConfiguration?.resourceRef) {
    return describeResourceRef(candidateConfiguration.resourceRef, availableResources, t)
  }
  if (view.slot.defaultResourceRef) {
    return t('applications.components.applications.ApplicationLaunchSetupPanel.usingManifestDefault', {
      resource: describeResourceRef(view.slot.defaultResourceRef, availableResources, t),
    })
  }
  return t('applications.components.applications.ApplicationLaunchSetupPanel.notConfigured')
}

export const formatUpdatedAt = (
  updatedAt: string | null,
  t: ApplicationLaunchSetupTranslate,
): string => {
  if (!updatedAt) {
    return t('applications.components.applications.ApplicationLaunchSetupPanel.notSavedYet')
  }
  return t('applications.components.applications.ApplicationLaunchSetupPanel.lastUpdated', {
    value: new Date(updatedAt).toLocaleString(),
  })
}
