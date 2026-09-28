import { defineComponent, h, type Component } from 'vue'
import { useComposerTarget } from '~/composables/agentInput/useComposerTarget'

/**
 * Wraps a message-box piece so it binds to the active-context composer target,
 * exactly as `AgentUserInputForm` does in run views. Mount props are forwarded.
 */
export const withActiveComposerTarget = (piece: Component) => defineComponent({
  name: 'ActiveComposerTargetHarness',
  inheritAttrs: false,
  setup(_, { attrs }) {
    const target = useComposerTarget()
    return () => h(piece, { ...attrs, target: target.value })
  },
})
