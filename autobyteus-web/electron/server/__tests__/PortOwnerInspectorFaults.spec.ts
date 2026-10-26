/**
 * AC-002: real inspectPortOwner -> execFile boundary, without installed lsof.
 * Run: pnpm -C autobyteus-web test:electron --run server/__tests__/PortOwnerInspectorFaults.spec.ts
 * macOS/Linux only; private executable/PATH, listener and data sentinels; no credentials.
 * ENOENT/EACCES, real timeout/output limit, malformed/empty/racing evidence and recovery.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as net from 'node:net'
import { inspectPortOwner } from '../portOwnerInspector'

describe.skipIf(!['darwin', 'linux'].includes(process.platform))('actual advisory inspector faults', () => {
  let root: string
  let executable: string
  let sentinel: net.Server
  let port: number
  let signalSpy: ReturnType<typeof vi.spyOn>
  const unavailable = (value: Awaited<ReturnType<typeof inspectPortOwner>>) => {
    expect(value).toMatchObject({ kind: 'port-conflict', port, inspection: 'unavailable', owners: [] })
    expect(Number.isFinite(Date.parse(value.observedAt))).toBe(true)
  }
  const script = (body: string) => {
    writeFileSync(executable, `#!${process.execPath}\n${body}\n`, { mode: 0o700 })
    chmodSync(executable, 0o700)
  }
  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'port-owner-fault-'))
    executable = join(root, 'lsof')
    writeFileSync(join(root, 'data'), 'unrelated data stays unchanged')
    sentinel = net.createServer(socket => socket.end())
    await new Promise<void>(resolve => sentinel.listen(0, '127.0.0.1', resolve))
    port = (sentinel.address() as net.AddressInfo).port
    vi.stubEnv('PATH', root)
    // Fail rather than actually signal anything if advisory production code tries to.
    signalSpy = vi.spyOn(process, 'kill').mockImplementation(() => { throw new Error('unexpected signal') })
  })
  afterEach(async () => {
    try {
      expect(signalSpy).not.toHaveBeenCalled()
      expect(readFileSync(join(root, 'data'), 'utf8')).toBe('unrelated data stays unchanged')
      expect(sentinel.listening).toBe(true)
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect({ host: '127.0.0.1', port }, () => { socket.end(); resolve() })
        socket.once('error', reject)
      })
    } finally {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
      await new Promise<void>(resolve => sentinel.close(() => resolve()))
      // execFile's callback occurs after its owned child exits; timeout fixture also
      // self-expires as a safety net, never forks descendants or touches other data.
      rmSync(root, { recursive: true, force: true })
      expect(existsSync(root)).toBe(false)
    }
  })
  it('missing diagnostic binary returns unavailable without obscuring the conflict', async () => {
    unavailable(await inspectPortOwner(port))
  })
  it('permission-denied executable returns unavailable', async () => {
    script('process.stdout.write("p123\\ncdenied\\n")')
    chmodSync(executable, 0o600)
    unavailable(await inspectPortOwner(port))
  })
  it('enforces the real 1000ms subprocess deadline and reaps only its owned child', async () => {
    const receipt = join(root, 'child-pid')
    script(`require('node:fs').writeFileSync(${JSON.stringify(receipt)}, String(process.pid));
      process.stdout.write('p123\\ncpartial-before-timeout\\n');
      setTimeout(() => process.exit(0), 5000)`)
    const start = performance.now()
    unavailable(await inspectPortOwner(port))
    const elapsed = performance.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(900)
    expect(elapsed).toBeLessThan(3000)
    expect(signalSpy).not.toHaveBeenCalled()
    signalSpy.mockRestore()
    const pid = Number(readFileSync(receipt, 'utf8'))
    expect(() => process.kill(pid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }))
    // Restore guard for the shared sentinel checks; no production call follows.
    signalSpy = vi.spyOn(process, 'kill').mockImplementation(() => { throw new Error('unexpected signal') })
    console.info('AC002 actual deadline receipt', JSON.stringify({ elapsedMs: Math.round(elapsed), pid, absent: true }))
  })
  it('rejects over-32KiB output rather than publishing a truncated owner', async () => {
    script("process.stdout.write('p123\\ncnode\\n' + 'x'.repeat(65536))")
    const start = performance.now()
    unavailable(await inspectPortOwner(port))
    expect(performance.now() - start).toBeLessThan(3000)
  })
  it.each(['', 'unstructured text', 'p0\ncnode\n', 'pNaN\ncnode\n', 'p9007199254740992\ncnode\n', 'p12\ncnode\npbad\n'])(
    'empty or malformed evidence %j does not fabricate an owner', async output => {
      script(`process.stdout.write(${JSON.stringify(output)})`)
      unavailable(await inspectPortOwner(port))
    },
  )
  it('discards racing/nonzero partial evidence, recovers fresh, then forgets vanished owners', async () => {
    script("process.stdout.write('p123\\ncstale\\n', () => process.exit(1))")
    unavailable(await inspectPortOwner(port))
    script("process.stdout.write('p456\\ncnode\\n')")
    const fresh = await inspectPortOwner(port)
    expect(fresh).toMatchObject({ inspection: 'available', owners: [{ pid: 456, executable: 'node' }] })
    script('process.exit(0)')
    const vanished = await inspectPortOwner(port)
    unavailable(vanished)
    expect(Date.parse(vanished.observedAt)).toBeGreaterThanOrEqual(Date.parse(fresh.observedAt))
  })
})
