import type { ApplicationResourceConfigurationView } from '@autobyteus/application-sdk-contracts'
import type {
  ApplicationLaunchSetupTranslate,
  ApplicationSlotDraft,
  ApplicationSlotEditorReadiness,
} from '~/utils/application/applicationLaunchProfile'
import { hasUnsavedDraftChanges } from '~/utils/application/applicationLaunchProfile'

export type ApplicationLaunchSetupGateState = {
  phase: 'loading' | 'error' | 'ready'
  isLaunchReady: boolean
  blockingReason: string | null
}

export const buildLaunchSetupGateState = (input: {
  loading: boolean
  loadError: string | null
  configurationViews: ApplicationResourceConfigurationView[]
  drafts: Record<string, ApplicationSlotDraft>
  slotReadinessByKey: Record<string, ApplicationSlotEditorReadiness>
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

  const unreadiness = input.configurationViews.find((view) => {
    const readiness = input.slotReadinessByKey[view.slot.slotKey]
    return !readiness || !readiness.isReady
  })
  if (unreadiness) {
    const readiness = input.slotReadinessByKey[unreadiness.slot.slotKey]
    return {
      phase: 'ready',
      isLaunchReady: false,
      blockingReason:
        readiness?.blockingReason
        || input.t('applications.components.applications.ApplicationLaunchSetupPanel.waitingForLoadBeforeEntry'),
    }
  }

  return {
    phase: 'ready',
    isLaunchReady: true,
    blockingReason: null,
  }
}
