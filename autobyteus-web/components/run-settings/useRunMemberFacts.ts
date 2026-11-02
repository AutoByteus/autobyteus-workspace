import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLocalization } from '~/composables/useLocalization'
import type { MemberLaunchNote } from '~/utils/runSettings/memberLaunchDefaults'
import type { RunMemberLaunchFallback, RunMemberLaunchSource, RunMemberNode, RunMemberNote } from '~/utils/runSettings/runMemberTree'
import { useRunSettingsPresentation } from './useRunSettingsPresentation'

const UNUSABLE_REASON_KEY: Readonly<Record<MemberLaunchNote['reason'], string>> = {
  incomplete: 'runSettings.members.defaultUnusable.incomplete',
  runtime_unavailable: 'runSettings.members.defaultUnusable.runtime_unavailable',
  model_unavailable: 'runSettings.members.defaultUnusable.model_unavailable',
}
const SOURCE_LABEL_KEY: Readonly<Record<RunMemberLaunchSource, string>> = {
  agent_default: 'runSettings.delegated.source.agent_default',
  team_default: 'runSettings.delegated.source.team_default',
  model_router: 'runSettings.delegated.source.model_router',
  inherited: 'runSettings.delegated.source.inherited',
  configured: 'runSettings.delegated.source.configured',
  not_recorded: 'runSettings.delegated.source.notRecorded',
}
const LAYER_LABEL_KEY: Readonly<Record<RunMemberLaunchFallback['layer'], string>> = {
  agent_default: 'runSettings.delegated.layer.agent_default',
  team_default: 'runSettings.delegated.layer.team_default',
}

/** What a member's row and a focused agent's card both say about it: its notes, where its launch came from, its router decision. */
export function useRunMemberFacts(node: () => RunMemberNode) {
  const presentation = useRunSettingsPresentation()
  const { t } = useLocalization()
  const router = useRouter()
  const modelOf = (runtimeKind: string | null, llmModelIdentifier: string | null): string =>
    [runtimeKind ? presentation.runtimeLabel(runtimeKind) : null, llmModelIdentifier].filter(Boolean).join(' · ') || '—'
  /** An own default a fresh start could not use (it follows its parent), or a recorded fallback of a copy. */
  const noteText = (note: RunMemberNote): string => note.kind === 'unusable_default'
    ? t('runSettings.members.defaultUnusable', { model: modelOf(note.runtimeKind, note.llmModelIdentifier), reason: t(UNUSABLE_REASON_KEY[note.reason]) })
    : t('runSettings.delegated.fallback', { layer: t(LAYER_LABEL_KEY[note.layer]), model: modelOf(note.runtimeKind, note.llmModelIdentifier), detail: note.detail })
  const noteTexts = computed(() => node().launchNotes.map(noteText))
  const sourceLabel = computed(() => {
    const { sourceKey } = node()
    return sourceKey ? t(SOURCE_LABEL_KEY[sourceKey]) : null
  })
  /** Opens Model Routing → Decisions at this copy's decision, with its team open (D9). */
  const openDecision = (): void => {
    const decision = node().routing?.decision
    if (!decision) return
    void router.push({ path: '/settings', query: { section: 'model-routing', tab: 'decisions',
      decisionRun: decision.runId, decisionCopy: decision.copy, decisionAgent: decision.agent } })
  }
  return { noteTexts, sourceLabel, openDecision }
}
