import net from 'node:net'

export const PRODUCTION_SERVER_PORT = 29695

function listenOnce(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen({ host, port, exclusive: true }, () => {
      const address = server.address()
      const selected = typeof address === 'object' && address ? address.port : 0
      server.close((error) => error ? reject(error) : resolve(selected))
    })
  })
}

/**
 * True when nothing listens on `port` on the wildcard or loopback address.
 * Both are probed because a loopback-only listener (for example a CDP endpoint) does not
 * always block a wildcard bind on macOS.
 */
export async function isPortAvailable(port) {
  try {
    await listenOnce(port, '0.0.0.0')
    await listenOnce(port, '127.0.0.1')
    return true
  } catch {
    return false
  }
}

export async function assertPortAvailable(port) {
  for (const host of ['0.0.0.0', '127.0.0.1']) {
    try {
      await listenOnce(port, host)
    } catch (error) {
      throw new Error(`Requested listener port ${port} is unavailable: ${error.message}`)
    }
  }
}

export function assertValidListenerPort(port, label = 'Listener port') {
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === PRODUCTION_SERVER_PORT) {
    throw new Error(`${label} must be an integer from 1024..65535 other than ${PRODUCTION_SERVER_PORT}`)
  }
}

/**
 * Use the requested port (validated and asserted free) or pick a free non-production port.
 */
export async function selectListenerPort(requestedPort, { exclude = [] } = {}) {
  if (requestedPort !== undefined) {
    const port = Number(requestedPort)
    assertValidListenerPort(port, 'Requested listener port')
    await assertPortAvailable(port)
    return port
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const port = await listenOnce(0, '0.0.0.0')
    if (port !== PRODUCTION_SERVER_PORT && port >= 1024 && !exclude.includes(port)) return port
  }
  throw new Error('Unable to allocate a non-default listener port')
}

/**
 * Diagnostic observation of whether `port` is free again after an owned process tree ended.
 */
export async function observePortRelease(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const server = net.createServer()
    let settled = false
    const finish = (observation) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(Object.freeze(observation))
    }
    const timer = setTimeout(() => {
      try {
        server.close(() => undefined)
      } catch {
        // The diagnostic is already complete if the probe never reached listening state.
      }
      finish({
        status: 'occupied-after-owned-tree-exit',
        port,
        detail: 'listener observation timed out',
      })
    }, timeoutMs)
    server.once('error', (error) => finish({
      status: 'occupied-after-owned-tree-exit',
      port,
      detail: error instanceof Error ? error.message : String(error),
    }))
    server.listen({ host: '0.0.0.0', port, exclusive: true }, () => {
      server.close((error) => finish(error
        ? {
            status: 'occupied-after-owned-tree-exit',
            port,
            detail: error.message,
          }
        : { status: 'available', port, detail: null }))
    })
  })
}
