import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useRemoteRun } from '~/composables/remoteRuns/useRemoteRun'
import { useRunStatusStore } from '~/stores/runStatusStore'

/**
 * autobyteus-278 REQ-808: what an opened run another node runs changes in its view, for every family (the agent and
 * Team member surfaces, which the standalone, Team and Org views render). The run's node beside its name, no ⚙ or ＋
 * (they act on this node's runs), the red notice with Retry while its node did not answer, and a box that names the
 * node. The composer itself is text-only for such a run (`AgentUserInputForm`, `useComposerTarget`).
 */
export const useRemoteRunView = (input: Readonly<{
  agentRunId: MaybeRefOrGetter<string | null | undefined>
  agentName: MaybeRefOrGetter<string>
}>) => {
  const { t } = useLocalization()
  const runStatus = useRunStatusStore()
  const remote = useRemoteRun(input.agentRunId)
  return {
    remote,
    /** ⚙ and ＋ are offered for this node's runs only. */
    headerActionsAllowed: computed(() => remote.value === null),
    /** The red notice: the run's node did not answer. */
    unreachable: computed(() => remote.value?.reachable === false),
    /** The box's placeholder: a remote run's names its agent and node; any other run keeps `local`. */
    composerPlaceholder: (local: string | null): string | null => remote.value
      ? t('remote.composer.placeholder', { agent: toValue(input.agentName), node: remote.value.nodeName })
      : local,
    /** Retry: its node is asked again over `/ws/run-status` (SR-090); its open stream reopens by itself. */
    retry: (): void => {
      if (remote.value) runStatus.retryPeers([remote.value.runId])
    },
  }
}
