import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const h = vi.hoisted(() => ({
  list: { changeSubjectOf: vi.fn(), askAgain: vi.fn(), askAll: vi.fn(), setUnfinishedStep: vi.fn() },
  connector: { plan: vi.fn(), run: vi.fn(), resolveAhead: vi.fn(async () => undefined) },
}))
vi.mock('~/stores/nodeListStore', () => ({ useNodeListStore: () => h.list }))
vi.mock('~/services/nodeCollaboration/windowNodeCollaborationConnector', () => ({ useNodeCollaborationConnector: () => h.connector }))

import { useNodeChangeDialogStore } from '../nodeChangeDialogStore'

/** one-nodes-tab DS-003, UIS-004: the one confirmation; after a run it tells the list (dialog → list only). */

const subject = { target: { rowKey: 'srv_b', name: '8003', nodeId: 'srv_b', desktopIds: ['d1'], windowAddress: 'http://localhost:8003' },
  here: { name: 'Embedded Node', nodeId: 'srv_a', windowAddress: 'http://127.0.0.1:29695' } }
const planOf = (kind: string, steps: Array<{ id: string; status: string; error?: unknown }>) =>
  ({ kind, target: subject.target, here: subject.here, steps, phase: 'confirm', candidates: { here: [], there: [] } })

describe('nodeChangeDialogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    h.list.changeSubjectOf.mockReturnValue(subject)
  })

  it('opens a plan with steps and looks up the addresses ahead; a plan with nothing to do or a node that cannot be read asks the row again', async () => {
    const store = useNodeChangeDialogStore()
    h.connector.plan.mockResolvedValueOnce(planOf('connect', [{ id: 'registerHere', status: 'todo' }]))
    await store.request('connect', 'srv_b')
    expect(store.plan?.kind).toBe('connect')
    expect(h.connector.resolveAhead).toHaveBeenCalled()
    store.cancel()
    h.connector.plan.mockResolvedValueOnce(planOf('finish', []))
    await store.request('finish', 'srv_b')
    h.connector.plan.mockRejectedValueOnce(new Error('down'))
    await store.request('finish', 'srv_b')
    expect(store.plan).toBeNull()
    expect(h.list.askAgain).toHaveBeenCalledTimes(2)
  })

  it('a connect run that stopped keeps its failed step on the row; a run that finished clears it and closes after a moment', async () => {
    const store = useNodeChangeDialogStore()
    const error = { code: 'PEER_UNREACHABLE', message: 'x' }
    h.connector.plan.mockResolvedValueOnce(planOf('connect', [{ id: 'turnOnThere', status: 'todo' }]))
    await store.request('connect', 'srv_b')
    h.connector.run.mockImplementationOnce(async (plan: any) => { plan.steps[0].status = 'failed'; plan.steps[0].error = error; plan.phase = 'failed' })
    await store.confirm()
    expect(h.list.setUnfinishedStep).toHaveBeenLastCalledWith('srv_b', { id: 'turnOnThere', status: 'failed', error })
    expect(h.list.askAgain).toHaveBeenCalledWith('srv_b')
    expect(store.plan?.phase).toBe('failed')
    h.connector.run.mockImplementationOnce(async (plan: any) => { plan.steps[0].status = 'done'; plan.phase = 'done' })
    const done = store.confirm()
    await vi.advanceTimersByTimeAsync(700)
    await done
    expect(h.list.setUnfinishedStep).toHaveBeenLastCalledWith('srv_b', null)
    expect(store.plan).toBeNull()
  })

  it('turning this node on asks every row again (TR-713); Use this looks again with the suggested address first', async () => {
    const store = useNodeChangeDialogStore()
    h.connector.plan.mockResolvedValueOnce(planOf('connect', [{ id: 'turnOnHere', status: 'todo' }, { id: 'resolveThere', status: 'failed' }]))
    await store.request('connect', 'srv_b')
    await store.useAddress('resolveThere', 'http://host.docker.internal:29695')
    expect(store.plan!.steps[1]).toMatchObject({ firstAddress: 'http://host.docker.internal:29695' })
    expect(h.connector.resolveAhead).toHaveBeenLastCalledWith(store.plan, 'resolveThere')
    h.connector.run.mockImplementationOnce(async (plan: any) => { plan.steps.forEach((step: any) => { step.status = 'done' }); plan.phase = 'done' })
    const done = store.confirm()
    await vi.advanceTimersByTimeAsync(700)
    await done
    expect(h.list.askAll).toHaveBeenCalled()
  })
})
