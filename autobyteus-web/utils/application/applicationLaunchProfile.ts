import type {
  ApplicationConfiguredAgentLaunchProfile,
  ApplicationConfiguredLaunchProfile,
  ApplicationConfiguredTeamLaunchProfile,
  ApplicationConfiguredTeamMemberProfile,
  ApplicationExecutionResourceConfigurationView,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
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
  left: ApplicationExecutionResourceRef | null | undefined,
  right: ApplicationExecutionResourceRef | null | undefined,
): boolean => {
  if (!left || !right) {
    return left === right
  }
  if (left.source !== right.source || left.kind !== right.kind) {
    return false
  }
  if (left.source === 'bundle' && right.source === 'bundle') {
    return left.localId === right.localId
  }
  if (left.source === 'shared' && right.source === 'shared') {
    return left.definitionId === right.definitionId
  }
  return false
}

export const buildResourceRefKey = (executionResourceRef: ApplicationExecutionResourceRef): string => (
  executionResourceRef.source === 'bundle'
    ? `bundle:${executionResourceRef.kind}:${executionResourceRef.localId}`
    : `shared:${executionResourceRef.kind}:${executionResourceRef.definitionId}`
)

export const summaryToResourceRef = (resource: ApplicationExecutionResourceSummary): ApplicationExecutionResourceRef => (
  resource.source === 'bundle'
    ? {
        source: 'bundle',
        kind: resource.kind,
        localId: resource.localId ?? resource.definitionId,
      }
    : {
        source: 'shared',
        kind: resource.kind,
        definitionId: resource.definitionId,
      }
)

export const resourcesForSlot = (
  slot: ApplicationExecutionResourceSlotDeclaration,
  availableResources: ApplicationExecutionResourceSummary[],
): ApplicationExecutionResourceSummary[] => {
  const allowedSources = slot.allowedExecutionResourceSources ?? ['bundle', 'shared']
  return availableResources.filter((resource) => (
    slot.allowedExecutionResourceKinds.includes(resource.kind)
    && allowedSources.includes(resource.source)
  ))
}

export const resolveSelectedResourceRef = (
  selection: string,
  availableResources: ApplicationExecutionResourceSummary[],
): ApplicationExecutionResourceRef | null => {
  if (!selection || selection === MANIFEST_DEFAULT_SELECTION) {
    return null
  }
  const matchedResource = availableResources.find(
    (resource) => buildResourceRefKey(summaryToResourceRef(resource)) === selection,
  )
  return matchedResource ? summaryToResourceRef(matchedResource) : null
}

export const resolveEffectiveResourceRef = (
  view: ApplicationExecutionResourceConfigurationView,
  draft: ApplicationSlotDraft | null | undefined,
  availableResources: ApplicationExecutionResourceSummary[],
): ApplicationExecutionResourceRef | null => {
  if (!draft) {
    return null
  }
  if (draft.selection === MANIFEST_DEFAULT_SELECTION) {
    return view.slot.defaultExecutionResourceRef ?? null
  }
  return resolveSelectedResourceRef(draft.selection, availableResources)
}

export const hasEffectiveResourceSelection = (
  view: ApplicationExecutionResourceConfigurationView,
  draft: ApplicationSlotDraft | null | undefined,
  availableResources: ApplicationExecutionResourceSummary[],
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
  resourceKind: ApplicationExecutionResourceRef['kind'],
): ApplicationLaunchProfileDraft => (
  resourceKind === 'AGENT'
    ? buildAgentLaunchProfileDraft(null)
    : buildTeamLaunchProfileDraft(null)
)

export const buildDraftFromView = (
  view: ApplicationExecutionResourceConfigurationView,
): ApplicationSlotDraft => {
  const candidateConfiguration = view.configuration ?? view.invalidSavedConfiguration ?? null
  const currentResourceRef = candidateConfiguration?.executionResourceRef ?? null
  const usingManifestDefault = Boolean(
    view.slot.defaultExecutionResourceRef
    && currentResourceRef
    && isSameResourceRef(currentResourceRef, view.slot.defaultExecutionResourceRef)
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
  view: ApplicationExecutionResourceConfigurationView,
  draft: ApplicationSlotDraft | null | undefined,
): boolean => {
  if (!draft) {
    return false
  }
  return JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(buildDraftFromView(view)))
}

export const describeResourceSummary = (
  resource: ApplicationExecutionResourceSummary,
  t: ApplicationLaunchSetupTranslate,
): string => {
  const sourceLabel = resource.source === 'bundle'
    ? t('applications.components.applications.ApplicationLaunchSetupPanel.bundleResource')
    : t('applications.components.applications.ApplicationLaunchSetupPanel.sharedResource')
  const kindLabel = resource.kind === 'AGENT_TEAM'
    ? t('applications.shared.agentTeam')
    : t('applications.shared.singleAgent')
  return `${resource.name} · ${sourceLabel} · ${kindLabel}`
}

export const describeResourceRef = (
  executionResourceRef: ApplicationExecutionResourceRef,
  availableResources: ApplicationExecutionResourceSummary[],
  t: ApplicationLaunchSetupTranslate,
): string => {
  const matched = availableResources.find((resource) => isSameResourceRef(summaryToResourceRef(resource), executionResourceRef))
  if (matched) {
    return describeResourceSummary(matched, t)
  }

  const identifier = executionResourceRef.source === 'bundle' ? executionResourceRef.localId : executionResourceRef.definitionId
  return `${executionResourceRef.kind} · ${executionResourceRef.source} · ${identifier}`
}

export const describeCurrentSelection = (
  view: ApplicationExecutionResourceConfigurationView,
  availableResources: ApplicationExecutionResourceSummary[],
  t: ApplicationLaunchSetupTranslate,
): string => {
  const candidateConfiguration = view.configuration ?? view.invalidSavedConfiguration ?? null
  if (candidateConfiguration?.executionResourceRef) {
    return describeResourceRef(candidateConfiguration.executionResourceRef, availableResources, t)
  }
  if (view.slot.defaultExecutionResourceRef) {
    return t('applications.components.applications.ApplicationLaunchSetupPanel.usingManifestDefault', {
      resource: describeResourceRef(view.slot.defaultExecutionResourceRef, availableResources, t),
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
