import type {
  ApplicationAgentLaunchOverride,
  ApplicationLaunchOverride,
  ApplicationTeamLaunchOverride,
  ApplicationTeamMemberLaunchOverride,
  ApplicationLaunchSlotView,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
} from '@autobyteus/application-sdk-contracts'

export type ApplicationAgentLaunchProfileDraft = {
  kind: 'AGENT'
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig?: Record<string, unknown> | null
  workspaceRootPath: string
}

export type ApplicationTeamMemberProfileDraft = {
  memberAddress: string
  displayName: string
  agentDefinitionId: string
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig?: Record<string, unknown> | null
}

export type ApplicationTeamLaunchProfileDraft = {
  kind: 'AGENT_TEAM'
  defaults: {
    runtimeKind: string
    llmModelIdentifier: string
    llmConfig?: Record<string, unknown> | null
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

const hasOwn = (value: object | null | undefined, key: string): boolean => (
  Boolean(value) && Object.prototype.hasOwnProperty.call(value, key)
)

const cloneLlmConfig = (
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => value ? structuredClone(value) : null

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
  view: ApplicationLaunchSlotView,
  draft: ApplicationSlotDraft | null | undefined,
  availableResources: ApplicationExecutionResourceSummary[],
): ApplicationExecutionResourceRef | null => {
  if (!draft) {
    return null
  }
  if (draft.selection === MANIFEST_DEFAULT_SELECTION) {
    return view.slot.defaultExecutionResourceRef ?? null
  }
  if (
    view.savedOverride
    && buildResourceRefKey(view.savedOverride.executionResourceRef) === draft.selection
  ) {
    return structuredClone(view.savedOverride.executionResourceRef)
  }
  return resolveSelectedResourceRef(draft.selection, availableResources)
}

export const hasEffectiveResourceSelection = (
  view: ApplicationLaunchSlotView,
  draft: ApplicationSlotDraft | null | undefined,
  availableResources: ApplicationExecutionResourceSummary[],
): boolean => Boolean(resolveEffectiveResourceRef(view, draft, availableResources))

const buildAgentLaunchProfileDraft = (
  launchProfile: ApplicationAgentLaunchOverride | null | undefined,
): ApplicationAgentLaunchProfileDraft => ({
  kind: 'AGENT',
  runtimeKind: normalizeOptionalString(launchProfile?.runtimeKind),
  llmModelIdentifier: normalizeOptionalString(launchProfile?.llmModelIdentifier),
  ...(hasOwn(launchProfile, 'llmConfig')
    ? { llmConfig: cloneLlmConfig(launchProfile?.llmConfig) }
    : {}),
  workspaceRootPath: normalizeOptionalString(launchProfile?.workspaceRootPath),
})

const buildTeamMemberProfileDraft = (
  memberProfile: ApplicationTeamMemberLaunchOverride,
): ApplicationTeamMemberProfileDraft => ({
  memberAddress: memberProfile.memberAddress,
  displayName: memberProfile.displayName,
  agentDefinitionId: memberProfile.agentDefinitionId,
  runtimeKind: normalizeOptionalString(memberProfile.runtimeKind),
  llmModelIdentifier: normalizeOptionalString(memberProfile.llmModelIdentifier),
  ...(hasOwn(memberProfile, 'llmConfig')
    ? { llmConfig: cloneLlmConfig(memberProfile.llmConfig) }
    : {}),
})

const buildTeamLaunchProfileDraft = (
  launchProfile: ApplicationTeamLaunchOverride | null | undefined,
): ApplicationTeamLaunchProfileDraft => ({
  kind: 'AGENT_TEAM',
  defaults: {
    runtimeKind: normalizeOptionalString(launchProfile?.defaults?.runtimeKind),
    llmModelIdentifier: normalizeOptionalString(launchProfile?.defaults?.llmModelIdentifier),
    ...(hasOwn(launchProfile?.defaults, 'llmConfig')
      ? { llmConfig: cloneLlmConfig(launchProfile?.defaults?.llmConfig) }
      : {}),
    workspaceRootPath: normalizeOptionalString(launchProfile?.defaults?.workspaceRootPath),
  },
  memberProfiles: [...(launchProfile?.memberProfiles ?? [])]
    .map((memberProfile) => buildTeamMemberProfileDraft(memberProfile))
    .sort((left, right) => left.memberAddress.localeCompare(right.memberAddress)),
})

const buildLaunchProfileDraft = (
  launchProfile: ApplicationLaunchOverride | null | undefined,
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
  view: ApplicationLaunchSlotView,
): ApplicationSlotDraft => {
  const currentResourceRef = view.savedOverride?.executionResourceRef
    ?? view.selectedResourceBaseline?.executionResourceRef
    ?? null
  const usingManifestDefault = Boolean(
    view.slot.defaultExecutionResourceRef
    && currentResourceRef
    && isSameResourceRef(currentResourceRef, view.slot.defaultExecutionResourceRef)
  )

  const launchProfile = view.savedOverride?.launchOverride
    ? buildLaunchProfileDraft(view.savedOverride.launchOverride)
    : view.selectedResourceBaseline?.resourceKind === 'AGENT_TEAM'
      ? {
          ...buildTeamLaunchProfileDraft(null),
          memberProfiles: view.selectedResourceBaseline.leaves.map((leaf) => ({
            memberAddress: leaf.memberAddress ?? '/',
            displayName: leaf.displayName,
            agentDefinitionId: leaf.agentDefinitionId,
            runtimeKind: '',
            llmModelIdentifier: '',
          })) ?? [],
        }
      : view.selectedResourceBaseline?.resourceKind === 'AGENT'
        ? buildAgentLaunchProfileDraft(null)
        : null

  return {
    selection: usingManifestDefault
      ? MANIFEST_DEFAULT_SELECTION
      : currentResourceRef
        ? buildResourceRefKey(currentResourceRef)
        : '',
    launchProfile,
  }
}

const buildAgentLaunchProfile = (
  draft: ApplicationAgentLaunchProfileDraft,
): ApplicationAgentLaunchOverride | null => {
  const llmModelIdentifier = normalizeOptionalString(draft.llmModelIdentifier)
  const runtimeKind = normalizeOptionalString(draft.runtimeKind)
  const workspaceRootPath = normalizeOptionalString(draft.workspaceRootPath)
  const llmConfigExplicit = hasOwn(draft, 'llmConfig')

  if (!llmModelIdentifier && !runtimeKind && !workspaceRootPath && !llmConfigExplicit) {
    return null
  }

  return {
    kind: 'AGENT',
    ...(llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(runtimeKind ? { runtimeKind } : {}),
    ...(llmConfigExplicit ? { llmConfig: cloneLlmConfig(draft.llmConfig) } : {}),
    ...(workspaceRootPath ? { workspaceRootPath } : {}),
  }
}

const buildTeamLaunchProfile = (
  draft: ApplicationTeamLaunchProfileDraft,
): ApplicationTeamLaunchOverride => {
  const defaults = {
    llmModelIdentifier: normalizeOptionalString(draft.defaults.llmModelIdentifier),
    runtimeKind: normalizeOptionalString(draft.defaults.runtimeKind),
    workspaceRootPath: normalizeOptionalString(draft.defaults.workspaceRootPath),
  }
  const defaultLlmConfigExplicit = hasOwn(draft.defaults, 'llmConfig')

  return {
    kind: 'AGENT_TEAM',
    defaults: defaults.llmModelIdentifier
      || defaults.runtimeKind
      || defaults.workspaceRootPath
      || defaultLlmConfigExplicit
      ? {
          ...(defaults.llmModelIdentifier ? { llmModelIdentifier: defaults.llmModelIdentifier } : {}),
          ...(defaults.runtimeKind ? { runtimeKind: defaults.runtimeKind } : {}),
          ...(defaultLlmConfigExplicit
            ? { llmConfig: cloneLlmConfig(draft.defaults.llmConfig) }
            : {}),
          ...(defaults.workspaceRootPath ? { workspaceRootPath: defaults.workspaceRootPath } : {}),
        }
      : null,
    memberProfiles: [...draft.memberProfiles]
      .map((memberProfile) => ({
        memberAddress: memberProfile.memberAddress,
        displayName: memberProfile.displayName,
        agentDefinitionId: memberProfile.agentDefinitionId,
        ...(normalizeOptionalString(memberProfile.llmModelIdentifier)
          ? { llmModelIdentifier: normalizeOptionalString(memberProfile.llmModelIdentifier) }
          : {}),
        ...(normalizeOptionalString(memberProfile.runtimeKind)
          ? { runtimeKind: normalizeOptionalString(memberProfile.runtimeKind) }
          : {}),
        ...(hasOwn(memberProfile, 'llmConfig')
          ? { llmConfig: cloneLlmConfig(memberProfile.llmConfig) }
          : {}),
      }))
      .sort((left, right) => left.memberAddress.localeCompare(right.memberAddress)),
  }
}

export const buildLaunchProfile = (
  draft: ApplicationLaunchProfileDraft,
): ApplicationLaunchOverride | null => {
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
  view: ApplicationLaunchSlotView,
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
  view: ApplicationLaunchSlotView,
  availableResources: ApplicationExecutionResourceSummary[],
  t: ApplicationLaunchSetupTranslate,
): string => {
  const candidateConfiguration = view.savedOverride
    ?? view.selectedResourceBaseline
    ?? view.packageBaseline
    ?? null
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
