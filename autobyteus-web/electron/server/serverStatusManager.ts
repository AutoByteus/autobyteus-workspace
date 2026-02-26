import { EventEmitter } from 'events'
import { BaseServerManager } from './baseServerManager'
import { logger } from '../logger'
import axios from 'axios'
import { ServerStatus } from './serverStatusEnum'

/**
 * ServerStatusManager acts as a bridge between the Electron main process and renderer
 * process, providing server status information and control methods.
 */
export class ServerStatusManager extends EventEmitter {
  private manager: BaseServerManager
  private isInitializing: boolean = false
  private healthCheckStatus: string = ''
  private currentStatus: ServerStatus = ServerStatus.STARTING
  private statusMessage?: string
  
  constructor(serverManager: BaseServerManager) {
    super()
    this.manager = serverManager
    
    // Set up event handlers for server status changes
    this.manager.on('ready', () => {
      logger.info('ServerStatusManager: Server is ready')
      this.emitStatusChange(ServerStatus.RUNNING)
    })
    
    this.manager.on('error', (error: Error) => {
      logger.error('ServerStatusManager: Server error:', error)
      this.emitStatusChange(ServerStatus.ERROR, error.message)
    })
  }
  
  /**
   * Initialize the internal server.
   */
  async initializeServer(): Promise<void> {
    if (this.isInitializing) {
      logger.info('ServerStatusManager: Server initialization already in progress')
      return
    }
    
    this.isInitializing = true
    
    try {
      logger.info('ServerStatusManager: Starting internal server')
      this.emitStatusChange(ServerStatus.STARTING)
      await this.manager.startServer()
      // 'ready' event from manager will trigger RUNNING status change
    } catch (error) {
      logger.error('ServerStatusManager: Server initialization failed:', error)
      // 'error' event from manager will trigger ERROR status change
    } finally {
      this.isInitializing = false
    }
  }
  
  /**
   * Restart the internal server with a clean and simple flow.
   */
  async restartServer(): Promise<any> {
    logger.info('ServerStatusManager: Restarting server')
    
    // Immediately tell the frontend we are restarting.
    this.emitStatusChange(ServerStatus.RESTARTING)
    
    try {
      // Stop the server and wait for it to finish.
      await this.manager.stopServer()
      
      // Now start it again. The 'ready'/'error' event listeners in the constructor
      // will automatically emit RUNNING or ERROR when it's done.
      await this.manager.startServer()
      
      // Return the current status, which should now be RUNNING.
      return this.getStatus()
    } catch (error) {
      logger.error('ServerStatusManager: Restart failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emitStatusChange(ServerStatus.ERROR, errorMessage)
      return {
        status: ServerStatus.ERROR,
        message: errorMessage
      }
    }
  }
  
  /**
   * Check server health.
   */
  async checkServerHealth(): Promise<any> {
    try {
      logger.info('ServerStatusManager: Checking server health')
      if (!this.manager.isRunning()) {
        // If not running, the status will be handled by the 'error' or 'starting' state
        // This check is mainly for when it's supposed to be running.
        return {
          status: 'starting',
          message: 'Server is not running or still starting'
        }
      }
      
      const urls = this.manager.getServerUrls()
      const response = await axios.get(urls.health, { timeout: 5000 })
      
      if (response.status === 200) {
        this.healthCheckStatus = 'Healthy'
        this.emitStatusChange(ServerStatus.RUNNING)
        return {
          status: 'ok',
          data: response.data
        }
      } else {
        this.healthCheckStatus = `Error: Unexpected response status ${response.status}`
        return {
          status: 'error',
          message: this.healthCheckStatus
        }
      }
    } catch (error) {
      logger.error('ServerStatusManager: Health check failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.healthCheckStatus = `Error: ${errorMessage}`
      // Don't emit an error status from a health check if the server is already considered running
      // Let the main error handlers deal with a crashed server.
      return {
        status: 'error',
        message: errorMessage
      }
    }
  }
  
  /**
   * Get the current server status.
   */
  getStatus(): any {
    const urls = this.manager.getServerUrls()
    
    return {
      status: this.currentStatus,
      urls,
      healthCheckStatus: this.healthCheckStatus,
      message: this.statusMessage
    }
  }
  
  /**
   * Emit status change event.
   */
  private emitStatusChange(status: ServerStatus, message?: string): void {
    this.currentStatus = status
    this.statusMessage = message
    const urls = this.manager.getServerUrls()
    const statusObject = {
      status,
      urls,
      message,
      healthCheckStatus: this.healthCheckStatus
    }
    
    logger.info(`ServerStatusManager: Emitting status change: ${status}`)
    this.emit('status-change', statusObject)
  }
}
