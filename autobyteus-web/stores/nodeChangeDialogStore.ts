import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNodeListStore } from '~/stores/nodeListStore'
import { useNodeCollaborationConnector } from '~/services/nodeCollaboration/windowNodeCollaborationConnector'
import type { NodeChangePlan, NodeChangePlanKind, NodeChangeStepId } from '~/services/nodeCollaboration/nodeChangePlan'

/** After a run that did everything, the dialog stays this long so the last step shows done (UI/UX spec TR-705). */
export const DIALOG_CLOSE_DELAY_MS = 700

type DialogKind = Extract<NodeChangePlanKind, 'connect' | 'finish' | 'disconnect' | 'remove'>

/**
 * The one confirmation for every change on both nodes (one-nodes-tab DS-003, UIS-004): it holds the plan the
 * connector made, shows it, runs it on confirm, and keeps a partial result with Try again. After a run it tells the
 * list (`nodeListStore`, which keeps each row's unfinished step) and asks the row again. It depends on the list; the
 * list does not depend on it.
 */
export const useNodeChangeDialogStore = defineStore('nodeChangeDialog', () => {
  const plan = ref<NodeChangePlan | null>(null)
  /** Loading the facts for a dialog; the row whose button asked. */
  const preparing = ref<string | null>(null)
  const connector = useNodeCollaborationConnector()

  /** Opens the confirmation for a row: the switch, Turn on, a fixing button, the trash icon, the add form. */
  const request = async (kind: DialogKind, key: string): Promise<void> => {
    const list = useNodeListStore()
    const subject = list.changeSubjectOf(key)
    if (!subject || preparing.value) return
    preparing.value = key
    try {
      const next = await connector.plan(kind, subject.target, subject.here)
      if (!next.steps.length) { list.askAgain(key); return }
      plan.value = next
      void connector.resolveAhead(plan.value)
    } catch {
      // The node could not be read now: its row says why, with Check again.
      list.askAgain(key)
    } finally {
      preparing.value = null
    }
  }

  const finishRun = (current: NodeChangePlan): void => {
    const list = useNodeListStore()
    const key = current.target.rowKey
    const failed = current.steps.find((entry) => entry.status === 'failed')
    list.setUnfinishedStep(key, (current.kind === 'connect' || current.kind === 'finish') && failed ? { ...failed } : null)
    // Turning this node's switch on re-asks every row (TR-713); otherwise the row is asked again.
    if (current.steps.some((entry) => entry.id === 'turnOnHere' && entry.status === 'done')) list.askAll()
    else if (current.kind !== 'remove' || failed) list.askAgain(key)
  }

  /** Turn on / Make these changes / Turn off / Remove, and Try again: runs what is not done yet. */
  const confirm = async (): Promise<void> => {
    const current = plan.value
    if (!current || current.phase === 'running') return
    await connector.run(current)
    finishRun(current)
    if (current.phase === 'done') {
      await new Promise((resolve) => setTimeout(resolve, DIALOG_CLOSE_DELAY_MS))
      if (plan.value === current) plan.value = null
    }
  }

  /** "Use this": the node tries the suggested address first, then its other candidates (design § Loopback Hint Surface). */
  const useAddress = async (stepId: NodeChangeStepId, address: string): Promise<void> => {
    const current = plan.value
    const entry = current?.steps.find((candidate) => candidate.id === stepId)
    if (!current || !entry) return
    entry.firstAddress = address
    entry.address = undefined
    if (current.phase === 'confirm') await connector.resolveAhead(current, stepId)
    else await confirm()
  }

  /** Cancel, Close, Esc, or the tab left: a plan that is running is never dropped. */
  const cancel = (): void => {
    if (plan.value?.phase !== 'running') plan.value = null
  }

  return { plan, preparing, request, confirm, useAddress, cancel }
})
