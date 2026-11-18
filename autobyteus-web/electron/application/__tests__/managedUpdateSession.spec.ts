import { describe, it, expect, vi } from 'vitest'
import { ManagedUpdateSession } from '../managedUpdateSession'
import { ApplicationShutdown } from '../applicationShutdown'
import { ManagedStageGone, type ManagedStage } from '../../updater/linuxManagedInstall'

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
const candidate: ManagedStage = { id: 'stage', baseline: 'old', identity: { version: '1.5.14', sha256: 'new' }, channel: 'stable' }
function setup(automaticUpdate = true, stop = vi.fn(async () => {})) {
  const writer = { canonicalImage: '/opt/autobyteus-desktop/1000/app/AutoByteus.AppImage', stage: vi.fn(async () => candidate),
    activate: vi.fn(async () => candidate.identity), discard: vi.fn(async () => {}), status: vi.fn(async () => ({ version: '1.5.13', sha256: 'old' })) }
  const shutdown = new ApplicationShutdown(stop, vi.fn())
  const hooks = { serverGone: vi.fn(() => true), notifyQuit: vi.fn(), quit: vi.fn(), exit: vi.fn(), relaunch: vi.fn(), report: vi.fn() }
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
    expect(s.stop).toHaveBeenCalledOnce(); expect(s.writer.activate).toHaveBeenCalledOnce(); expect(s.hooks.relaunch).not.toHaveBeenCalled()
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
    expect(s.writer.activate).not.toHaveBeenCalled(); expect(s.hooks.relaunch).not.toHaveBeenCalled()
  })
  it('allows verified manual restart with automation off, once, via the canonical outer image', async () => {
    const s = setup(false); expect(s.session.requestRestart().accepted).toBe(false)
    await s.session.stageDownloaded('/cache/update', '1.5.14'); expect(s.session.requestRestart().accepted).toBe(true)
    expect(s.session.requestRestart().accepted).toBe(false); s.session.willQuit({ preventDefault() {} })
    await vi.waitFor(() => expect(s.hooks.exit).toHaveBeenCalledWith(0))
    expect(s.hooks.relaunch).toHaveBeenCalledWith(s.writer.canonicalImage); expect(s.writer.activate).toHaveBeenCalledOnce()
  })
  it('resolves a lost ACK against status rather than retrying activation', async () => {
    const s = setup(false); s.writer.activate.mockRejectedValue(new Error('lost reply')); s.writer.status.mockResolvedValue(candidate.identity)
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.relaunch).toHaveBeenCalledOnce())
    expect(s.writer.activate).toHaveBeenCalledOnce(); expect(s.writer.status).toHaveBeenCalledOnce()
    expect(s.events.some(e => (e as { type: string }).type === 'activation-failed')).toBe(false)
  })
  it('reports confirmed refusal before relaunching old canonical bytes', async () => {
    const s = setup(false), order: string[] = []; s.writer.activate.mockRejectedValue(new Error('refused'))
    s.session.onChange(e => { if (e.type === 'activation-failed' && e.confirmedOld) order.push('persist-refusal') })
    s.hooks.relaunch.mockImplementation(() => { order.push('relaunch') })
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.exit).toHaveBeenCalledWith(0)); expect(order).toEqual(['persist-refusal', 'relaunch'])
  })
  it('does not relaunch or activate if the server exit is unconfirmed', async () => {
    const s = setup(false); s.hooks.serverGone.mockReturnValue(false)
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.report).toHaveBeenCalled())
    expect(s.writer.activate).not.toHaveBeenCalled(); expect(s.hooks.relaunch).not.toHaveBeenCalled()
  })
  it('treats known receipt loss with confirmed old baseline as retryable, without reopening ordinary quit', async () => {
    const s = setup(); s.writer.activate.mockRejectedValue(new ManagedStageGone('gone'))
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.willQuit({ preventDefault() {} })
    await vi.waitFor(() => expect(s.hooks.quit).toHaveBeenCalledOnce())
    expect(s.events).toContainEqual({ type: 'stage-gone', version: '1.5.14', automatic: true })
    expect(s.events.some(e => (e as {type:string}).type === 'activation-failed')).toBe(false)
    expect(s.hooks.relaunch).not.toHaveBeenCalled(); expect(s.writer.stage).toHaveBeenCalledOnce()
  })
  it('does not label receipt loss retryable when the installed baseline is changed', async () => {
    const s = setup(false); s.writer.activate.mockRejectedValue(new ManagedStageGone('gone'))
    s.writer.status.mockResolvedValue({ version: '1.5.15', sha256: 'different' })
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.report).toHaveBeenCalled())
    expect(s.events.some(e => (e as {type:string}).type === 'stage-gone')).toBe(false)
    expect(s.hooks.relaunch).not.toHaveBeenCalled()
  })
  it('keeps unknown commit outcome distinct from definite refusal', async () => {
    const s = setup(false); s.writer.activate.mockRejectedValue(new Error('lost')); s.writer.status.mockRejectedValue(new Error('unavailable'))
    await s.session.stageDownloaded('/cache/update', '1.5.14'); s.session.requestRestart()
    await vi.waitFor(() => expect(s.hooks.report).toHaveBeenCalled())
    expect(s.events).toContainEqual(expect.objectContaining({ type: 'activation-failed', confirmedOld: false }))
    expect(s.hooks.relaunch).not.toHaveBeenCalled()
  })
})
