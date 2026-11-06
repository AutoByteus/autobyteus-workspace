import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRandomId } from '~/utils/randomId'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// autobyteus-277 DEC-014: the phone also runs on a trusted private HTTP pairing, where crypto.randomUUID is missing.
describe('createRandomId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is crypto.randomUUID where it exists (a secure context)', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-2222-4333-8444-555555555555', getRandomValues: vi.fn() })
    expect(createRandomId()).toBe('11111111-2222-4333-8444-555555555555')
  })

  it('outside a secure context it is still a UUID v4, from crypto.getRandomValues', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => { bytes.fill(0xab); return bytes })
    vi.stubGlobal('crypto', { getRandomValues })
    const id = createRandomId()
    expect(getRandomValues).toHaveBeenCalledTimes(1)
    expect(id).toMatch(UUID_V4)
    expect(id).toBe('abababab-abab-4bab-abab-abababababab')
  })

  it('ids differ from one call to the next without randomUUID', () => {
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) })
    const [first, second] = [createRandomId(), createRandomId()]
    expect(first).toMatch(UUID_V4)
    expect(first).not.toBe(second)
  })
})
