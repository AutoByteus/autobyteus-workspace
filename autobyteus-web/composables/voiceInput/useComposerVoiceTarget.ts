import { computed, onBeforeUnmount } from 'vue'
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget'
import type { VoiceTranscriptTarget } from '~/types/voiceInput'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { mergeTranscriptWithDraft } from '~/utils/voiceInputCapture'
/** The composer owns its actual destination; recording never invents or looks up an AgentContext. */
export function useComposerVoiceTarget(getTarget: () => ComposerTarget | null) {
  let alive = true
  const node = useWindowNodeContextStore()
  onBeforeUnmount(() => { alive = false })
  return computed<VoiceTranscriptTarget | null>(() => {
    const target = getTarget()
    if (!target || target.access === 'read_only') return null
    const context = target.context, revision = node.bindingRevision
    return {key: `composer-${Math.random().toString(36).slice(2)}`,
      isCurrent: () => alive && node.bindingRevision === revision && getTarget()?.context === context,
      appendTranscript: (text) => { context.requirement = mergeTranscriptWithDraft(context.requirement, text) },
    }
  })
}
