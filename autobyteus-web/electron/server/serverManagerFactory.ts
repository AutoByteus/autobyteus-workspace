import { LinuxServerManager } from './linuxServerManager'
import { WindowsServerManager } from './windowsServerManager'
import { MacOSServerManager } from './macOSServerManager'
import { BaseServerManager } from './baseServerManager'
import { logger } from '../logger'

/**
 * Factory to create the appropriate server manager based on platform
 */
export class ServerManagerFactory {
  /**
   * Create a server manager instance appropriate for the current platform
   */
  static createServerManager(): BaseServerManager {
    const platform = process.platform
    
    logger.info(`Creating server manager for platform: ${platform}`)
    
    switch (platform) {
      case 'linux':
        return new LinuxServerManager()
      case 'win32':
        return new WindowsServerManager()
      case 'darwin':
        return new MacOSServerManager()
      default:
        logger.warn(`Unknown platform: ${platform}, falling back to Linux server manager`)
        return new LinuxServerManager()
    }
  }
}

// Create and export a singleton instance
export const serverManager = ServerManagerFactory.createServerManager()
