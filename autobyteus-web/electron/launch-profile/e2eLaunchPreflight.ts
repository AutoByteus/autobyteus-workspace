import * as net from 'net'

export async function assertEmbeddedServerListenerPortAvailable(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const tester = net.createServer()
    tester.once('error', (error) => {
      reject(new Error(`Embedded server listener port ${port} is unavailable: ${(error as Error).message}`))
    })
    tester.once('listening', () => {
      tester.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
    tester.listen({
      host: '0.0.0.0',
      port,
      exclusive: true,
    })
  })
}
