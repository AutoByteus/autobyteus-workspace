import { describe, it, expect, vi } from 'vitest'
import { ManagedUpdateSession } from '../managedUpdateSession'
import { ApplicationShutdown } from '../applicationShutdown'
import { ManagedStageGone, type ManagedStage } from '../../updater/linuxManagedInstall'

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
const candidate: ManagedStage = { id: 'stage', baseline: 'old', identity: { version: '1.5.14', sha256: 'new' }, channel: 'stable' }
function setup(automaticUpdate = true, stop = vi.fn(async () => {})) {
  const writer = { stage: vi.fn(async () => candidate),
    activate: vi.fn(async () => candidate.identity), discard: vi.fn(async () => {}), status: vi.fn(async () => ({ version: '1.5.13', sha256: 'old' })) }
  const shutdown = new ApplicationShutdown(stop, vi.fn())
  const hooks = { serverGone: vi.fn(() => true), notifyQuit: vi.fn(), quit: vi.fn(), exit: vi.fn(), requestReopen: vi.fn(), report: vi.fn() }
  const session = new ManagedUpdateSession({ writer, shutdown, initialSettings: { automaticUpdate, updateChannel: 'stable' }, ...hooks })
  const events: unknown[] = []; session.onChange(e => events.push(e))
  return { writer, stop, hooks, session, events }
}

describe('managed update session ownership', () => {
  it('stages without stopping and activates only at independent quit, without reopening', async () => {
    const s = setup(); await s.session.stageDownloaded('/cache/update', '1.5.14')
    expect(s.stop).not.toHaveBeenCalled(); expect(s.writer.activate).not.toHaveBeenCalled()
    const event = { preventDefault: vi.fn() }; s.session.willQuit(event); s.session.willQuit(event)
    await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce())
    expect(s.stop).toHaveBeenCalledOnce(); expect(s.writer.activate).toHaveBeenCalledOnce(); expect(s.hooks.requestReopen).not.toHaveBeenCalled()
    const reentry = { preventDefault: vi.fn() }; s.session.willQuit(reentry); expect(reentry.preventDefault).not.toHaveBeenCalled()
  })
  it('does not accept a late stage into a quit already underway', async () => {
    const s = setup(), stage = deferred<ManagedStage>(); s.writer.stage.mockReturnValue(stage.promise)
    const download = s.session.stageDownloaded('/cache/update', '1.5.14')
    s.session.willQuit({ preventDefault() {} }); stage.resolve(candidate); await download
    await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce())
    expect(s.writer.activate).not.toHaveBeenCalled(); expect(s.writer.discard).toHaveBeenCalledWith(candidate)
  })
  it('rechecks opt-out after stop and quits normally with old bytes', async () => {
    const stopped = deferred<void>(), stop = vi.fn(() => stopped.promise), s = setup(true, stop)
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.willQuit({ preventDefault() {} })
    s.session.settingsChanged({ automaticUpdate: false, updateChannel: 'stable' }); stopped.resolve()
    await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce())
    expect(s.writer.activate).not.toHaveBeenCalled(); expect(s.hooks.requestReopen).not.toHaveBeenCalled()
  })
  it('rechecks the independent automatic block after stop, without recording or dispatching activation', async () => {
    const stopped = deferred<void>(), s = setup(true, vi.fn(() => stopped.promise))
    await s.session.stageDownloaded('/cache/update', '1.5.14')
    s.session.willQuit({ preventDefault() {} })
    s.session.automaticInstallBlockChanged('1.5.14'); stopped.resolve()
    await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce())
    expect(s.writer.activate).not.toHaveBeenCalled()
    expect(s.events.some(e => (e as { type: string }).type === 'activating')).toBe(false)
    expect(s.hooks.requestReopen).not.toHaveBeenCalled()
  })
  it('does not block an unrelated release', async () => {
    const s = setup(); s.session.automaticInstallBlockChanged('1.5.13')
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.willQuit({ preventDefault() {} })
    await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce())
    expect(s.writer.activate).toHaveBeenCalledOnce()
  })
  it('allows verified manual restart with automation off, once, via the canonical outer image', async () => {
    const s = setup(false); expect(s.session.requestRestart().accepted).toBe(false)
    await s.session.stageDownloaded('/cache/update', '1.5.14'); expect(s.session.requestRestart().accepted).toBe(true)
    expect(s.session.requestRestart().accepted).toBe(false); s.session.willQuit({ preventDefault() {} })
    await vi.waitFor(() => expect(s.hooks.exit).toHaveBeenCalledWith(76))
    expect(s.hooks.requestReopen).toHaveBeenCalledOnce(); expect(s.writer.activate).toHaveBeenCalledOnce()
  })
  it('still allows manual install after incomplete stop when server exit is confirmed', async () => {
    const s = setup(false, vi.fn(async () => { throw new Error('other resource failed to stop') }))
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.exit).toHaveBeenCalledWith(76))
    expect(s.writer.activate).toHaveBeenCalledOnce(); expect(s.hooks.requestReopen).toHaveBeenCalledOnce()
    expect(s.stop).toHaveBeenCalledOnce()
  })
  it('refuses manual restart before stopping when FD4 was not claimed', async () => {
    const s = setup(), session = new ManagedUpdateSession({ ...s.hooks, requestReopen: null, writer: s.writer,
      shutdown: new ApplicationShutdown(s.stop, vi.fn()), initialSettings: { automaticUpdate: true, updateChannel: 'stable' } })
    const changed = vi.fn(); session.onChange(changed)
    await session.stageDownloaded('/cache/update', '1.5.14')
    expect(session.requestRestart().accepted).toBe(false); expect(changed).toHaveBeenCalledWith({ type: 'restart-unavailable' })
    expect(s.stop).not.toHaveBeenCalled(); expect(s.writer.activate).not.toHaveBeenCalled()
    session.willQuit({ preventDefault() {} }); await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce())
    expect(s.writer.activate).toHaveBeenCalledOnce()
  })
  it.each([true,false])('requires confirmed old baseline on cancelled manual stop (confirmed=%s)', async (confirmed) => {
    const stopped = deferred<void>(), s = setup(true, vi.fn(() => stopped.promise))
    if (!confirmed) s.writer.status.mockRejectedValue(new Error('status unavailable'))
    await s.session.stageDownloaded('/cache/update','1.5.14'); s.session.requestRestart()
    s.session.settingsChanged({automaticUpdate:false,updateChannel:'stable'}); stopped.resolve()
    await vi.waitFor(() => expect(s.writer.status).toHaveBeenCalledOnce())
    expect(s.writer.activate).not.toHaveBeenCalled()
    expect(s.hooks.requestReopen).toHaveBeenCalledTimes(confirmed ? 1 : 0)
    if (confirmed) expect(s.hooks.exit).toHaveBeenCalledWith(76)
    else expect(s.hooks.exit).not.toHaveBeenCalled()
  })
  it('does not send a completion exit or reactivate after failed restart write', async () => {
    const s=setup(); s.hooks.requestReopen.mockImplementation(() => { throw new Error('channel closed') })
    await s.session.stageDownloaded('/cache/update','1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.report).toHaveBeenCalledOnce())
    expect(s.hooks.exit).not.toHaveBeenCalled()
    expect(s.session.requestRestart().accepted).toBe(false); s.session.willQuit({preventDefault(){}})
    await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce()); expect(s.writer.activate).toHaveBeenCalledOnce()
  })
  it('resolves a lost ACK against status rather than retrying activation', async () => {
    const s = setup(false); s.writer.activate.mockRejectedValue(new Error('lost reply')); s.writer.status.mockResolvedValue(candidate.identity)
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.requestReopen).toHaveBeenCalledOnce())
    expect(s.writer.activate).toHaveBeenCalledOnce(); expect(s.writer.status).toHaveBeenCalledOnce()
    expect(s.events.some(e => (e as { type: string }).type === 'activation-failed')).toBe(false)
  })
  it('reports confirmed refusal before reopening old canonical bytes', async () => {
    const s = setup(false), order: string[] = []; s.writer.activate.mockRejectedValue(new Error('refused'))
    s.session.onChange(e => { if (e.type === 'activation-failed' && e.confirmedOld) order.push('persist-refusal') })
    s.hooks.requestReopen.mockImplementation(() => { order.push('requestReopen') })
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.exit).toHaveBeenCalledWith(76)); expect(order).toEqual(['persist-refusal', 'requestReopen'])
  })
  it('does not reopen or activate if the server exit is unconfirmed', async () => {
    const s = setup(false); s.hooks.serverGone.mockReturnValue(false)
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.report).toHaveBeenCalled())
    expect(s.writer.activate).not.toHaveBeenCalled(); expect(s.hooks.requestReopen).not.toHaveBeenCalled()
  })
  it('treats known receipt loss with confirmed old baseline as retryable, without reopening ordinary quit', async () => {
    const s = setup(); s.writer.activate.mockRejectedValue(new ManagedStageGone('gone'))
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.willQuit({ preventDefault() {} })
    await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce())
    expect(s.events).toContainEqual({ type: 'stage-gone', version: '1.5.14', automatic: true })
    expect(s.events.some(e => (e as {type:string}).type === 'activation-failed')).toBe(false)
    expect(s.hooks.requestReopen).not.toHaveBeenCalled(); expect(s.writer.stage).toHaveBeenCalledOnce()
  })
  it('does not label receipt loss retryable when the installed baseline is changed', async () => {
    const s = setup(false); s.writer.activate.mockRejectedValue(new ManagedStageGone('gone'))
    s.writer.status.mockResolvedValue({ version: '1.5.15', sha256: 'different' })
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.report).toHaveBeenCalled())
    expect(s.events.some(e => (e as {type:string}).type === 'stage-gone')).toBe(false)
    expect(s.hooks.requestReopen).not.toHaveBeenCalled()
  })
  it('keeps unknown commit outcome distinct from definite refusal', async () => {
    const s = setup(false); s.writer.activate.mockRejectedValue(new Error('lost')); s.writer.status.mockRejectedValue(new Error('unavailable'))
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.report).toHaveBeenCalled())
    expect(s.events).toContainEqual(expect.objectContaining({ type: 'activation-failed', confirmedOld: false }))
    expect(s.hooks.requestReopen).not.toHaveBeenCalled()
  })
})
