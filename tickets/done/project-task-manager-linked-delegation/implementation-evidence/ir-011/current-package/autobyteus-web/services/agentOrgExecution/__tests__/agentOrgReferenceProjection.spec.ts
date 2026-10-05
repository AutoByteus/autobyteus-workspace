import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectAgentOrgReference } from '../agentOrgReferenceProjection'

const sha256Spy = vi.hoisted(() => ({ calls: 0 }))

vi.mock('crypto-js/sha256', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto-js/sha256')>()
  const real = actual.default
  return {
    default: (...args: Parameters<typeof real>) => {
      sha256Spy.calls += 1
      return real(...args)
    },
  }
})

const serverReferenceId = (ownerId: string, filePath: string) =>
  createHash('sha256').update(`${ownerId}\0${filePath}`).digest('hex')

describe('projectAgentOrgReference', () => {
  beforeEach(() => {
    sha256Spy.calls = 0
  })

  it('matches the server owner/path identity and preserves accepted reference presentation', () => {
    const filePath = '/tmp/review diagram.svg'
    expect(projectAgentOrgReference('review-1', filePath, '2026-09-01T00:00:00.000Z')).toEqual({
      referenceId: serverReferenceId('review-1', filePath),
      path: filePath,
      type: 'image',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    })
  })

  it('derives the reference id only when read, once per reference', () => {
    const references = Array.from({ length: 1_000 }, (_, index) =>
      projectAgentOrgReference('message-1', `/repo/file-${index}.ts`, '2026-09-01T00:00:00.000Z'))
    expect(references.map((reference) => reference.path)).toHaveLength(1_000)
    expect(sha256Spy.calls).toBe(0)

    const last = references[999]
    expect(last.referenceId).toBe(serverReferenceId('message-1', '/repo/file-999.ts'))
    expect(last.referenceId).toBe(serverReferenceId('message-1', '/repo/file-999.ts'))
    expect(sha256Spy.calls).toBe(1)
    expect(Object.isFrozen(last)).toBe(true)
  })
})
