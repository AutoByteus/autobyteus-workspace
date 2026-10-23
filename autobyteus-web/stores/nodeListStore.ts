import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { NodeProfile } from '~/types/node'
import { useNodeStore } from '~/stores/nodeStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useRemoteCollaborationStore, type PeerNode } from '~/stores/remoteCollaborationStore'
import { useRemoteCollaborationOffersStore } from '~/stores/remoteCollaborationOffersStore'
import { useRemoteCollaborationCapabilityStore } from '~/stores/remoteCollaborationCapabilityStore'
import { useNodeChangeDialogStore } from '~/stores/nodeChangeDialogStore'
import { rowViewOf, type NodeRow, type RowFacts, type RowView } from '~/stores/nodeRowStatus'
import { createNodeCollaborationApi } from '~/services/nodeCollaboration/nodeCollaborationApi'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'
import { hostOf, probeNodeIdentity, type NodeIdentityProbeResult } from '~/utils/nodeIdentityProbe'
import type { NodeSettingsFailure } from '~/utils/nodeSettingsError'


/** The add button waits at most this long for the node to say who it is (UI/UX spec TR-702). */
export const ADD_PROBE_WAIT_MS = 1_500
const FLASH_MS = 2_500
const NAME_RULE = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$/

export const isValidNodeName = (name: string): boolean => NAME_RULE.test(name.trim())

/** `host:port` with an optional `http://`/`https://`, no path (UI/UX spec § Form And Input Validation). */
export const normalizeTypedAddress = (address: string): string | null => {
  const text = address.trim().replace(/\/+$/, '')
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`
  if (!/^https?:\/\/[^\s/?#]+$/i.test(withScheme)) return null
  try { return normalizeNodeBaseUrl(withScheme) } catch { return null }
}

const sameAddress = (a: string | null | undefined, b: string): boolean => Boolean(a) && hostOf(a!).toLowerCase() === hostOf(b).toLowerCase()

export type AddNodeResult =
  | { ok: true; key: string }
  | { ok: false; error: 'invalid'; address: boolean; name: boolean }
  | { ok: false; error: 'duplicate'; existing: string }

let nextToken = 1

/**
 * Manage Nodes: one list of nodes, each once (one-nodes-tab DS-001, DS-002, DS-004). The rows join the desktop's
 * entries (`nodeStore`) with this node's peers (`remoteCollaborationStore`) by node ID; neither list is changed by
 * joining them. A row's node is asked when the tab opens, when it is added, when this node's switch turns on and on
 * Check again (DEC-708); nothing polls. Each ask takes a token per row, and an answer whose token is no longer current
 * is ignored. Changes on both nodes go through the change dialog and the connector.
 */
export const useNodeListStore = defineStore('nodeList', () => {
  const nodeStore = useNodeStore()
  const windowNode = useWindowNodeContextStore()
  const peerStore = useRemoteCollaborationStore()
  const offers = useRemoteCollaborationOffersStore()
  const capability = useRemoteCollaborationCapabilityStore()

  const facts = ref<Record<string, RowFacts>>({})
  const tokens: Record<string, number> = {}
  const thisNodeId = ref<string | null>(null)
  const flashKey = ref<string | null>(null)
  const expanded = ref<Record<string, boolean>>({})
  let flashTimer: ReturnType<typeof setTimeout> | null = null

  const currentNode = computed<NodeProfile | null>(() => nodeStore.getNodeById(windowNode.nodeId))
  const thisName = computed(() => currentNode.value?.name ?? '')
  const switchOn = computed(() => capability.isEnabled)
  const switchBusy = computed(() => capability.status === 'loading')
  const hasOpen = computed(() => typeof window !== 'undefined' && Boolean(window.electronAPI?.openNodeWindow))

  const rows = computed<NodeRow[]>(() => {
    const ownId = currentNode.value?.id
    const groups = new Map<string, NodeProfile[]>()
    const entries = [...nodeStore.nodes].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const entry of entries) {
      if (entry.id === ownId || (entry.serverInstanceId && entry.serverInstanceId === thisNodeId.value)) continue
      const key = entry.serverInstanceId ?? `d:${entry.id}`
      groups.set(key, [...(groups.get(key) ?? []), entry])
    }
    const peers = new Map<string, PeerNode>(peerStore.peers.map((peer) => [peer.nodeId, peer]))
    const result: NodeRow[] = [...groups.entries()].map(([key, group]) => {
      const first = group[0]!
      const peer = first.serverInstanceId ? peers.get(first.serverInstanceId) ?? null : null
      return {
        key, serverInstanceId: first.serverInstanceId ?? null, desktopIds: group.map((entry) => entry.id),
        windowAddress: first.baseUrl, peer, name: peer?.name ?? first.name, isEmbedded: first.nodeType === 'embedded',
      }
    })
    // DEC-706: the peers of this node that are not in the desktop's list.
    for (const peer of peerStore.peers) {
      if (groups.has(peer.nodeId) || peer.nodeId === thisNodeId.value) continue
      result.push({ key: peer.nodeId, serverInstanceId: peer.nodeId, desktopIds: [], windowAddress: null, peer, name: peer.name, isEmbedded: false })
    }
    return result
  })

  const rowByKey = (key: string): NodeRow | undefined => rows.value.find((row) => row.key === key)

  const views = computed<Record<string, RowView>>(() => {
    const dialog = useNodeChangeDialogStore()
    return Object.fromEntries(rows.value.map((row) => [row.key, rowViewOf({
      row, switchOn: switchOn.value, thisNodeId: thisNodeId.value, facts: facts.value[row.key],
      offer: row.serverInstanceId ? offers.peers[row.serverInstanceId] : undefined, unfinishedStep: dialog.unfinishedStepOf(row.key),
    })]))
  })

  /** The address at which this window asks the row's node: its desktop entry's, or this node's for a node only this node knows. */
  const probeAddressOf = (row: NodeRow): string | null => row.windowAddress ?? row.peer?.baseUrl ?? null
  /** Where this window reaches the row's node now, when it does (the probe answered with the row's node). */
  const reachedAddressOf = (row: NodeRow): string | null => {
    const probe = facts.value[row.key]?.probe
    return probe?.ok && (!row.serverInstanceId || probe.serverInstanceId === row.serverInstanceId) ? probeAddressOf(row) : null
  }

  // ---------------------------------------------------------------- asking a node (DS-001, DS-004)
  const update = (key: string, token: number, change: Partial<RowFacts>): boolean => {
    if (tokens[key] !== token) return false
    facts.value[key] = { ...facts.value[key]!, ...change }
    return true
  }

  /** The window learned the node ID of a desktop entry: it is stored, and the row moves to its node's key. */
  const learn = async (row: NodeRow, result: NodeIdentityProbeResult, token: number): Promise<string> => {
    if (!result.ok || !row.desktopIds.length || row.serverInstanceId === result.serverInstanceId) return row.key
    await Promise.all(row.desktopIds.map((desktopId) => nodeStore.identifyNode(desktopId, result.serverInstanceId)))
    if (tokens[row.key] === token) { delete facts.value[row.key]; delete tokens[row.key] }
    return result.serverInstanceId
  }

  const ask = async (row: NodeRow): Promise<void> => {
    const token = nextToken++
    tokens[row.key] = token
    facts.value[row.key] = { probe: null, remote: undefined, availability: undefined, checkedAt: null }
    const offerAsked = row.peer && switchOn.value ? offers.ask(row.peer.nodeId) : Promise.resolve()
    const address = probeAddressOf(row)
    const probe: NodeIdentityProbeResult = address ? await probeNodeIdentity(address) : { ok: false, cause: 'unreachable' }
    if (!update(row.key, token, { probe, checkedAt: new Date().toISOString() })) return
    const key = await learn(row, probe, token)
    // The entry's node ID was just learned: the row is now the node's row (perhaps joined with its peer); ask that.
    if (key !== row.key) { askAgain(key); return }
    // A desktop entry's own address is authoritative for it (learned above); a peer's address must answer as that peer.
    const reached = probe.ok && (row.desktopIds.length > 0 || probe.serverInstanceId === row.serverInstanceId)
    if (!reached || !address) { update(key, token, { remote: null, availability: null }); return }
    const api = createNodeCollaborationApi(address)
    const remote = await Promise.all([api.capability(), api.peers()])
      .then(([state, peers]) => ({ switchOn: state.enabled, peers }), () => null)
    if (!update(key, token, { remote })) return
    await offerAsked
    const offer = row.serverInstanceId ? offers.peers[row.serverInstanceId] : undefined
    if (!remote || offer?.phase !== 'available' || !thisNodeId.value) { update(key, token, { availability: null }); return }
    const availability = await api.peerNodeAvailability(thisNodeId.value).catch(() => null)
    update(key, token, { availability })
  }

  const askAll = (): void => { rows.value.forEach((row) => { void ask(row) }) }
  const askAgain = (key: string): void => { const row = rowByKey(key); if (row) void ask(row) }

  /** This node's own node ID, from its own address (the window's probe), so its row is "this node". */
  const identifyThisNode = async (): Promise<void> => {
    const own = currentNode.value
    if (!own) return
    const probe = await probeNodeIdentity(own.baseUrl)
    if (!probe.ok) return
    thisNodeId.value = probe.serverInstanceId
    await nodeStore.identifyNode(own.id, probe.serverInstanceId)
  }

  /** The tab opened: every row is asked once (TR-701), whatever this node's switch says. */
  const open = async (): Promise<void> => {
    await nodeStore.initializeRegistry()
    await Promise.all([capability.ensureResolved().catch(() => undefined), peerStore.load(), identifyThisNode()])
    offers.clear()
    askAll()
  }

  /** The tab was left: answers on their way are ignored, and a confirmation not running is closed. */
  const close = (): void => {
    for (const key of Object.keys(tokens)) delete tokens[key]
    facts.value = {}
    offers.clear()
    useNodeChangeDialogStore().cancel()
  }

  // ---------------------------------------------------------------- this node's switch (REQ-709, TR-713)
  const setSwitch = async (on: boolean): Promise<void> => {
    if (switchBusy.value) return
    await capability.setEnabled(on).catch(() => undefined)
    offers.clear()
    askAll()
  }

  // ---------------------------------------------------------------- add (DS-002)
  const flash = (key: string): void => {
    flashKey.value = key
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flashKey.value = null }, FLASH_MS)
  }

  const addNode = async (input: { address: string; name: string; collaborate: boolean }): Promise<AddNodeResult> => {
    const address = normalizeTypedAddress(input.address)
    const nameOk = isValidNodeName(input.name)
    if (!address || !nameOk) return { ok: false, error: 'invalid', address: !address, name: !nameOk }
    // AR-008: the address of every row, whatever its node's state, even when it is down.
    const listed = rows.value.find((row) => sameAddress(probeAddressOf(row), address))
    if (listed) { flash(listed.key); return { ok: false, error: 'duplicate', existing: listed.name } }
    if (sameAddress(currentNode.value?.baseUrl, address)) return { ok: false, error: 'duplicate', existing: thisName.value }
    const probe = await Promise.race([
      probeNodeIdentity(address),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ADD_PROBE_WAIT_MS)),
    ])
    if (probe?.ok) {
      if (probe.serverInstanceId === thisNodeId.value) return { ok: false, error: 'duplicate', existing: thisName.value }
      const sameNode = rows.value.find((row) => row.serverInstanceId === probe.serverInstanceId)
      if (sameNode) { flash(sameNode.key); return { ok: false, error: 'duplicate', existing: sameNode.name } }
    }
    const added = await nodeStore.addRemoteNode({ name: input.name.trim(), baseUrl: address, serverInstanceId: probe?.ok ? probe.serverInstanceId : undefined })
    const key = added.serverInstanceId ?? `d:${added.id}`
    flash(key)
    const row = rowByKey(key)
    if (row) void ask(row)
    // With the switch on and the node reachable, the one confirmation opens (REQ-704); nothing changes before it.
    if (row && probe?.ok && input.collaborate) void useNodeChangeDialogStore().request('connect', key)
    return { ok: true, key }
  }

  // ---------------------------------------------------------------- open (TR-714, DEC-706)
  const canOpen = (key: string): boolean => {
    const row = rowByKey(key)
    if (!row || !hasOpen.value) return false
    return row.desktopIds.length > 0 || Boolean(reachedAddressOf(row))
  }

  const openNode = async (key: string): Promise<void> => {
    const row = rowByKey(key)
    if (!row || !window.electronAPI?.openNodeWindow) return
    let desktopId = row.desktopIds[0]
    if (!desktopId) {
      // A node only this node knows gets a desktop entry at its first Open, at the address this window reached.
      const address = reachedAddressOf(row)
      if (!address) return
      desktopId = (await nodeStore.addRemoteNode({ name: row.name, baseUrl: address, serverInstanceId: row.serverInstanceId ?? undefined })).id
    }
    await window.electronAPI.openNodeWindow(desktopId)
  }

  // ---------------------------------------------------------------- rename and change address (silent changes)
  const renameNode = async (key: string, next: string): Promise<{ ok: true } | { ok: false; error: 'name' | 'taken'; failure?: NodeSettingsFailure }> => {
    const row = rowByKey(key)
    const name = next.trim()
    if (!row || !isValidNodeName(name)) return { ok: false, error: 'name' }
    const taken = rows.value.some((other) => other.key !== key && other.name.toLowerCase() === name.toLowerCase())
      || thisName.value.toLowerCase() === name.toLowerCase()
    if (taken) return { ok: false, error: 'taken' }
    const result = await useNodeChangeDialogStore().runSilently('rename', key, { name })
    if (result.ok) return { ok: true }
    return { ok: false, error: result.failure.code === 'PEER_NAME_TAKEN' ? 'taken' : 'name', failure: result.failure }
  }

  const changeAddress = async (key: string, typed: string): Promise<{ ok: true } | { ok: false; failure: NodeSettingsFailure }> => {
    const address = normalizeTypedAddress(typed)
    if (!address) return { ok: false, failure: { code: 'PEER_URL_INVALID', message: typed } }
    const result = await useNodeChangeDialogStore().runSilently('changeAddress', key, { address })
    if (result.ok) askAgain(key)
    return result
  }

  return {
    rows, views, facts, thisNodeId, thisName, currentNode, switchOn, switchBusy, hasOpen, flashKey, expanded,
    rowByKey, reachedAddressOf, open, close, askAgain, askAll, setSwitch, addNode, canOpen, openNode, renameNode, changeAddress,
  }
})
