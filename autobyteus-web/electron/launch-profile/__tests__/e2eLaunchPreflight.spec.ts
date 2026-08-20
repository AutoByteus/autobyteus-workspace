import * as net from 'net'
import { describe, expect, it } from 'vitest'
import { assertEmbeddedServerListenerPortAvailable } from '../e2eLaunchPreflight'

describe('embedded listener preflight', () => {
  it('uses wildcard-equivalent exclusive binding and rejects an occupied port', async () => {
    const owner = net.createServer()
    await new Promise<void>((resolve, reject) => {
      owner.once('error', reject)
      owner.listen({ host: '0.0.0.0', port: 0, exclusive: true }, resolve)
    })
    const address = owner.address()
    const port = typeof address === 'object' && address ? address.port : 0
    await expect(assertEmbeddedServerListenerPortAvailable(port)).rejects.toThrow(
      `Embedded server listener port ${port} is unavailable`,
    )
    await new Promise<void>((resolve) => owner.close(() => resolve()))
    await expect(assertEmbeddedServerListenerPortAvailable(port)).resolves.toBeUndefined()
  })
})
