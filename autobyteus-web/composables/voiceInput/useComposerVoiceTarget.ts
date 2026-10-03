import { computed, onBeforeUnmount } from 'vue'
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget'
import type { VoiceTranscriptTarget } from '~/types/voiceInput'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { mergeTranscriptWithDraft } from '~/utils/voiceInputCapture'
/** The composer owns its actual destination; recording never invents or looks up an AgentContext. */
export function useComposerVoiceTarget(getTarget: () => ComposerTarget | null) {
  let alive = true
  const node = useWindowNodeContextStore()
  let currentDestination: {
    context: ComposerTarget['context']
    bindingRevision: number
    sink: VoiceTranscriptTarget
  } | null = null
  onBeforeUnmount(() => { alive = false; currentDestination = null })
  return computed<VoiceTranscriptTarget | null>(() => {
    const target = getTarget()
    if (!alive || !target || target.access === 'read_only') {
      currentDestination = null
      return null
    }
    const context = target.context, revision = node.bindingRevision
    // Presentation wrappers can regenerate on ordinary Team publications without
    // changing the actual eligible destination or its mounted owner's lifetime.
    if (currentDestination?.context === context && currentDestination.bindingRevision === revision) {
      return currentDestination.sink
    }
    const sink: VoiceTranscriptTarget = {
      key: `composer-${Math.random().toString(36).slice(2)}`,
      isCurrent: () => {
        if (!alive || currentDestination?.sink !== sink || node.bindingRevision !== revision) return false
        const current = getTarget()
        return current?.context === context && current.access !== 'read_only'
      },
      appendTranscript: (text) => { context.requirement = mergeTranscriptWithDraft(context.requirement, text) },
    }
    currentDestination = { context, bindingRevision: revision, sink }
    return sink
  })
}
