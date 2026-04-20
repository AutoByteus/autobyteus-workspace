import type { ApplicationRuntimeResourceKind } from '~/stores/applicationStore'

export type ApplicationRuntimeResourceOwner = 'bundle' | 'shared'
export type ApplicationSupportedLaunchDefaultsDeclaration = {
  llmModelIdentifier?: boolean | null
  runtimeKind?: boolean | null
  workspaceRootPath?: boolean | null
}
export type ApplicationConfiguredLaunchDefaults = {
  llmModelIdentifier?: string | null
  runtimeKind?: string | null
  workspaceRootPath?: string | null
  autoExecuteTools?: boolean | null
}

export type ApplicationRuntimeResourceRef =
  | {
      owner: 'bundle'
      kind: ApplicationRuntimeResourceKind
      localId: string
    }
  | {
      owner: 'shared'
      kind: ApplicationRuntimeResourceKind
      definitionId: string
    }

export type ApplicationRuntimeResourceSummary = {
  owner: ApplicationRuntimeResourceOwner
  kind: ApplicationRuntimeResourceKind
  localId: string | null
  definitionId: string
  name: string
  applicationId: string | null
}

export type ApplicationResourceSlotDeclaration = {
  slotKey: string
  name: string
  description?: string | null
  allowedResourceKinds: ApplicationRuntimeResourceKind[]
  allowedResourceOwners?: ApplicationRuntimeResourceOwner[] | null
  required?: boolean | null
  supportedLaunchDefaults?: ApplicationSupportedLaunchDefaultsDeclaration | null
  defaultResourceRef?: ApplicationRuntimeResourceRef | null
}

export type ApplicationConfiguredResource = {
  slotKey: string
  resourceRef: ApplicationRuntimeResourceRef
  launchDefaults?: ApplicationConfiguredLaunchDefaults | null
}

export type ApplicationResourceConfigurationView = {
  slot: ApplicationResourceSlotDeclaration
  configuration: ApplicationConfiguredResource | null
  updatedAt: string | null
}

export type SlotDraft = {
  selection: string
  runtimeKind: string
  llmModelIdentifier: string
  workspaceRootPath: string
}

export type ApplicationLaunchSetupGateState = {
  phase: 'loading' | 'error' | 'ready'
  isLaunchReady: boolean
  blockingReason: string | null
}
export type ApplicationLaunchSetupTranslate = (
  key: string,
  params?: Record<string, string | number>,
) => string

export const MANIFEST_DEFAULT_SELECTION = '__manifest_default__'

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

export const buildDraftFromView = (view: ApplicationResourceConfigurationView): SlotDraft => {
  const currentResourceRef = view.configuration?.resourceRef ?? null
  const launchDefaults = view.configuration?.launchDefaults ?? null
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
    runtimeKind: typeof launchDefaults?.runtimeKind === 'string' ? launchDefaults.runtimeKind : '',
    llmModelIdentifier:
      typeof launchDefaults?.llmModelIdentifier === 'string'
        ? launchDefaults.llmModelIdentifier
        : '',
    workspaceRootPath:
      typeof launchDefaults?.workspaceRootPath === 'string'
        ? launchDefaults.workspaceRootPath
        : '',
  }
}

export const slotSupportsLaunchDefault = (
  slot: ApplicationResourceSlotDeclaration,
  key: keyof Omit<ApplicationConfiguredLaunchDefaults, 'autoExecuteTools'>,
): boolean => slot.supportedLaunchDefaults?.[key] === true

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

export const buildLaunchDefaults = (
  draft: SlotDraft,
  slot: ApplicationResourceSlotDeclaration,
): ApplicationConfiguredLaunchDefaults | null => {
  const runtimeKind = draft.runtimeKind.trim()
  const llmModelIdentifier = draft.llmModelIdentifier.trim()
  const workspaceRootPath = draft.workspaceRootPath.trim()
  const normalized: ApplicationConfiguredLaunchDefaults = {
    ...(slotSupportsLaunchDefault(slot, 'runtimeKind') && runtimeKind ? { runtimeKind } : {}),
    ...(slotSupportsLaunchDefault(slot, 'llmModelIdentifier') && llmModelIdentifier ? { llmModelIdentifier } : {}),
    ...(slotSupportsLaunchDefault(slot, 'workspaceRootPath') && workspaceRootPath ? { workspaceRootPath } : {}),
  }

  if (Object.keys(normalized).length === 0) {
    return null
  }

  return {
    ...normalized,
    autoExecuteTools: true,
  }
}

export const hasEffectiveResourceSelection = (
  view: ApplicationResourceConfigurationView,
  draft: SlotDraft | null | undefined,
  availableResources: ApplicationRuntimeResourceSummary[],
): boolean => {
  if (!draft) {
    return false
  }
  if (draft.selection === MANIFEST_DEFAULT_SELECTION) {
    return Boolean(view.slot.defaultResourceRef)
  }
  return Boolean(resolveSelectedResourceRef(draft.selection, availableResources))
}

export const hasUnsavedDraftChanges = (
  view: ApplicationResourceConfigurationView,
  draft: SlotDraft | null | undefined,
): boolean => {
  if (!draft) {
    return false
  }
  const persistedDraft = buildDraftFromView(view)
  return (
    draft.selection !== persistedDraft.selection
    || draft.runtimeKind !== persistedDraft.runtimeKind
    || draft.llmModelIdentifier !== persistedDraft.llmModelIdentifier
    || draft.workspaceRootPath !== persistedDraft.workspaceRootPath
  )
}

export const hasSavedModelIdentifier = (
  view: ApplicationResourceConfigurationView,
): boolean => typeof view.configuration?.launchDefaults?.llmModelIdentifier === 'string'
  && view.configuration.launchDefaults.llmModelIdentifier.trim().length > 0

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
  if (view.configuration?.resourceRef) {
    return describeResourceRef(view.configuration.resourceRef, availableResources, t)
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

export const slotSupportsRuntimeKind = (slot: ApplicationResourceSlotDeclaration): boolean => (
  slotSupportsLaunchDefault(slot, 'runtimeKind')
)

export const slotSupportsModelIdentifier = (slot: ApplicationResourceSlotDeclaration): boolean => (
  slotSupportsLaunchDefault(slot, 'llmModelIdentifier')
)

export const slotSupportsWorkspaceRootPath = (slot: ApplicationResourceSlotDeclaration): boolean => (
  slotSupportsLaunchDefault(slot, 'workspaceRootPath')
)

export const slotHasAdditionalDefaults = (slot: ApplicationResourceSlotDeclaration): boolean => (
  slotSupportsRuntimeKind(slot) || slotSupportsModelIdentifier(slot) || slotSupportsWorkspaceRootPath(slot)
)

export const buildLaunchSetupGateState = (input: {
  loading: boolean
  loadError: string | null
  configurationViews: ApplicationResourceConfigurationView[]
  drafts: Record<string, SlotDraft>
  savingSlotKeys: string[]
  saveErrors: Record<string, string | null>
  t: ApplicationLaunchSetupTranslate
}): ApplicationLaunchSetupGateState => {
  if (input.loading) {
    return {
      phase: 'loading',
      isLaunchReady: false,
      blockingReason: input.t('applications.components.applications.ApplicationLaunchSetupPanel.waitingForLoadBeforeEntry'),
    }
  }

  if (input.loadError) {
    return {
      phase: 'error',
      isLaunchReady: false,
      blockingReason: input.loadError,
    }
  }

  if (input.savingSlotKeys.length > 0) {
    return {
      phase: 'loading',
      isLaunchReady: false,
      blockingReason: input.t('applications.components.applications.ApplicationLaunchSetupPanel.savingBeforeEntry'),
    }
  }

  const saveFailure = Object.values(input.saveErrors).find((value) => typeof value === 'string' && value.trim().length > 0)
  if (saveFailure) {
    return {
      phase: 'error',
      isLaunchReady: false,
      blockingReason: saveFailure,
    }
  }

  const dirtyView = input.configurationViews.find((view) => hasUnsavedDraftChanges(view, input.drafts[view.slot.slotKey]))
  if (dirtyView) {
    return {
      phase: 'ready',
      isLaunchReady: false,
      blockingReason: input.t('applications.components.applications.ApplicationLaunchSetupPanel.saveOrResetChangesBeforeEntry'),
    }
  }

  const missingRequiredResource = input.configurationViews.find((view) => view.slot.required && !view.configuration?.resourceRef)
  if (missingRequiredResource) {
    return {
      phase: 'ready',
      isLaunchReady: false,
      blockingReason: input.t('applications.components.applications.ApplicationLaunchSetupPanel.requiredResourceBeforeEntry', {
        slot: missingRequiredResource.slot.name,
      }),
    }
  }

  const missingRequiredModel = input.configurationViews.find((view) => (
    view.slot.required
    && slotSupportsModelIdentifier(view.slot)
    && !hasSavedModelIdentifier(view)
  ))
  if (missingRequiredModel) {
    return {
      phase: 'ready',
      isLaunchReady: false,
      blockingReason: input.t('applications.components.applications.ApplicationLaunchSetupPanel.requiredModelBeforeEntry', {
        slot: missingRequiredModel.slot.name,
      }),
    }
  }

  return {
    phase: 'ready',
    isLaunchReady: true,
    blockingReason: null,
  }
}
