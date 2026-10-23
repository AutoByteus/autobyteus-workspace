import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useNodeStore } from '~/stores/nodeStore'
import { useNodeListStore } from '~/stores/nodeListStore'
import { useRemoteCollaborationStore } from '~/stores/remoteCollaborationStore'
import { useRemoteCollaborationCapabilityStore } from '~/stores/remoteCollaborationCapabilityStore'
import { useRemoteCollaborationOffersStore } from '~/stores/remoteCollaborationOffersStore'
import { createNodeCollaborationApi } from '~/services/nodeCollaboration/nodeCollaborationApi'
import { createNodeCollaborationConnector } from '~/services/nodeCollaboration/nodeCollaborationConnector'
import type { NodeChangePlan, NodeChangePlanKind, NodeChangeStep, NodeChangeStepId, NodeChangeTarget } from '~/services/nodeCollaboration/nodeChangePlan'
import { asSettingsFailure, type NodeSettingsFailure } from '~/utils/nodeSettingsError'

/** After a run that did everything, the dialog stays this long so the last step shows done (UI/UX spec TR-705). */
export const DIALOG_CLOSE_DELAY_MS = 700

type DialogKind = Extract<NodeChangePlanKind, 'connect' | 'finish' | 'disconnect' | 'remove'>

/**
 * The one confirmation for every change on both nodes (one-nodes-tab DS-003, UIS-004): it holds the plan the
 * connector made, shows it, runs it on confirm, keeps a partial result with Try again, and remembers per row the step
 * a connect or finish run could not do until a later run finishes it (the row's "not finished" line). Rename and
 * change address use the same connector without the dialog.
 */
export const useNodeChangeDialogStore = defineStore('nodeChangeDialog', () => {
  const plan = ref<NodeChangePlan | null>(null)
  /** Loading the facts for a dialog; the row whose button asked. */
  const preparing = ref<string | null>(null)
  const unfinished = ref<Record<string, NodeChangeStep>>({})

  const connector = createNodeCollaborationConnector({
    here: {
      switchOn: () => useRemoteCollaborationCapabilityStore().isEnabled,
      setSwitch: async (on) => { await useRemoteCollaborationCapabilityStore().setEnabled(on) },
      loadPeers: async () => { const store = useRemoteCollaborationStore(); await store.load(); return store.peers },
      candidates: () => useRemoteCollaborationStore().addressCandidates(),
      resolveAddress: (nodeId, baseUrls) => useRemoteCollaborationStore().resolveAddress(nodeId, baseUrls),
      addPeer: (input) => useRemoteCollaborationStore().add(input),
      renamePeer: (nodeId, name) => useRemoteCollaborationStore().rename(nodeId, name),
      removePeer: async (nodeId) => { await useRemoteCollaborationStore().remove(nodeId); useRemoteCollaborationOffersStore().forget(nodeId) },
      changePeerAddress: (nodeId, baseUrl) => useRemoteCollaborationStore().changeAddress(nodeId, baseUrl),
    },
    list: {
      rename: (desktopId, name) => useNodeStore().renameNode(desktopId, name),
      remove: (desktopId) => useNodeStore().removeRemoteNode(desktopId),
    },
    there: (windowAddress) => createNodeCollaborationApi(windowAddress),
  })

  const targetOf = (key: string): { target: NodeChangeTarget; here: NodeChangePlan['here'] } | null => {
    const list = useNodeListStore()
    const row = list.rowByKey(key)
    if (!row) return null
    return {
      // Where this window reaches the node: its desktop entry's address, or for a node only this node knows, the
      // address this window reached it at.
      target: { rowKey: row.key, name: row.name, nodeId: row.serverInstanceId, desktopIds: row.desktopIds,
        windowAddress: row.windowAddress ?? list.reachedAddressOf(row) },
      here: { name: list.thisName, nodeId: list.thisNodeId, windowAddress: list.currentNode?.baseUrl ?? '' },
    }
  }

  /** Opens the confirmation for a row: the switch, Turn on, a fixing button, the trash icon. */
  const request = async (kind: DialogKind, key: string): Promise<void> => {
    const subject = targetOf(key)
    if (!subject || preparing.value) return
    preparing.value = key
    try {
      const next = await connector.plan(kind, subject.target, subject.here)
      if (!next.steps.length) { useNodeListStore().askAgain(key); return }
      plan.value = next
      void connector.resolveAhead(plan.value)
    } catch {
      // The node could not be read now: its row says why, with Check again.
      useNodeListStore().askAgain(key)
    } finally {
      preparing.value = null
    }
  }

  const finishRun = (current: NodeChangePlan): void => {
    const key = current.target.rowKey
    const failed = current.steps.find((entry) => entry.status === 'failed')
    if ((current.kind === 'connect' || current.kind === 'finish') && failed) unfinished.value[key] = { ...failed }
    else delete unfinished.value[key]
    // Turning this node's switch on re-asks every row (TR-713); otherwise the row is asked again.
    if (current.steps.some((entry) => entry.id === 'turnOnHere' && entry.status === 'done')) useNodeListStore().askAll()
    else if (current.kind !== 'remove' || failed) useNodeListStore().askAgain(key)
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

  const cancel = (): void => {
    if (plan.value?.phase !== 'running') plan.value = null
  }

  /** Rename and change address: no confirmation (UXJ-706, TR-711); the result is the caller's to show. */
  const runSilently = async (kind: 'rename' | 'changeAddress', key: string, input: { name?: string; address?: string }):
    Promise<{ ok: true } | { ok: false; failure: NodeSettingsFailure }> => {
    const subject = targetOf(key)
    if (!subject) return { ok: false, failure: { code: 'PEER_NOT_FOUND', message: key } }
    try {
      const silent = await connector.plan(kind, subject.target, subject.here, input)
      await connector.run(silent)
      const failed = silent.steps.find((entry) => entry.status === 'failed')
      return failed?.error ? { ok: false, failure: failed.error } : { ok: true }
    } catch (error) {
      return { ok: false, failure: asSettingsFailure(error) }
    }
  }

  const unfinishedStepOf = (key: string): NodeChangeStep | null => unfinished.value[key] ?? null
  const isOpen = computed(() => plan.value !== null)

  return { plan, preparing, unfinished, isOpen, request, confirm, useAddress, cancel, runSilently, unfinishedStepOf }
})
