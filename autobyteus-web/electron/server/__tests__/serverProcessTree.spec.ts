import { describe, it, expect, vi } from 'vitest'
import { parseProcessTable, selectServerTreeTargets, signalTargets, waitForTargetsGone } from '../serverProcessTree'

// pid ppid pgid. Electron (50) spawned the server (100) without detaching, so they share group 50.
// 200: runtime CLI in that group; 201: its child; 300: a tool command leading its own group (301 inside);
// 400: a descendant inside a group led by a non-descendant (900); 60: Electron's other child in group 50.
const rows = parseProcessTable(`
    1     0     1
   50     1    50
   60    50    50
  100    50    50
  200   100    50
  201   200    50
  300   200   300
  301   300   300
  400   100   900
  900     1   900
garbage
`)

const errno = (code: string) => Object.assign(new Error(code), { code })

describe('server process-tree selection (desktop copy)', () => {
  it('records server-group descendants by pid and descendant-led groups by -pgid', () => {
    expect(selectServerTreeTargets(rows, 100)).toEqual([200, 201, -300])
  })

  it('never selects the server, Electron, its group, a sibling, or a foreign-led group', () => {
    const targets = selectServerTreeTargets(rows, 100)
    for (const excluded of [100, 50, -50, 60, 400, -900, 1, -1]) expect(targets).not.toContain(excluded)
  })

  it('selects nothing when the server is not in the table', () => {
    expect(selectServerTreeTargets(rows, 777)).toEqual([])
  })
})

describe('server process-tree signalling (desktop copy)', () => {
  it('skips ESRCH, keeps going past EPERM and returns the failures', () => {
    const seen: number[] = []
    const kill = vi.fn((target: number) => {
      seen.push(target)
      if (target === 200) throw errno('ESRCH')
      if (target === -300) throw errno('EPERM')
    })
    const errors = signalTargets([200, -300, 201], 'SIGTERM', kill)
    expect(seen).toEqual([200, -300, 201])
    expect(errors).toHaveLength(1)
  })

  it('returns the targets still alive at the end of the window; only ESRCH proves absence', async () => {
    const gone = new Set([200])
    const kill = vi.fn((target: number) => {
      if (gone.has(target)) throw errno('ESRCH')
      if (target === -300) throw errno('EPERM')
    })
    await expect(waitForTargetsGone([200, -300, 201], 60, kill)).resolves.toEqual([-300, 201])
    await expect(waitForTargetsGone([200], 60, kill)).resolves.toEqual([])
  })
})
