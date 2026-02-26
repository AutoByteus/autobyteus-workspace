import { networkInterfaces } from 'os'
import { logger } from '../logger'

/**
 * Finds the primary local IPv4 address of the machine.
 * 
 * It iterates through network interfaces and returns the first non-internal
 * IPv4 address it finds, preferring private IP ranges. This is crucial for
 * scenarios where other services on the local network (including Docker containers)
 * need to connect to the Electron app's backend server.
 *
 * @returns {string | null} The detected local IP address, or null if none is found.
 */
export function getLocalIp(): string | null {
  try {
    const nets = networkInterfaces()
    const results: { [name: string]: string[] } = {}

    for (const name of Object.keys(nets)) {
      const netInfo = nets[name]
      if (netInfo) {
        for (const net of netInfo) {
          // Skip over non-IPv4 and internal (i.e., 127.0.0.1) addresses
          if (net.family === 'IPv4' && !net.internal) {
            if (!results[name]) {
              results[name] = []
            }
            results[name].push(net.address)
          }
        }
      }
    }

    // Prioritize interfaces that are commonly used for LAN
    const priorityInterfaces = ['eth0', 'en0', 'wlan0', 'Wi-Fi']
    for (const iface of priorityInterfaces) {
      if (results[iface] && results[iface].length > 0) {
        const ip = results[iface][0]
        logger.info(`Found priority local IP address on interface '${iface}': ${ip}`)
        return ip
      }
    }
    
    // If no priority interface found, return the first one found
    for (const name in results) {
      if (results[name].length > 0) {
        const ip = results[name][0]
        logger.info(`Found local IP address on interface '${name}': ${ip}`)
        return ip
      }
    }

    logger.warn('Could not find a suitable local IP address. Falling back to localhost.')
    return null
  } catch (error) {
    logger.error('Error getting local IP address:', error)
    return null
  }
}
