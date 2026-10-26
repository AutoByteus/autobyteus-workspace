import { PortConflictError } from './backendPortAvailability'
import { ShutdownIncompleteError } from './managedBackendStop'
import type { ServerDiagnostic } from '../../types/serverStatus'
import { EventEmitter } from 'events'
import { BaseServerManager } from './baseServerManager'
import { logger } from '../logger'
import axios from 'axios'
import {
  ServerStatus,
  type ServerHealthResult,
  type ServerStatusSnapshot,
} from '../../types/serverStatus'

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
  private diagnostic?: ServerDiagnostic
  
  constructor(serverManager: BaseServerManager) {
    super()
    this.manager = serverManager
    
    this.manager.on('startup-delayed', (message: string) => {
      if (this.currentStatus === ServerStatus.STARTING || this.currentStatus === ServerStatus.RESTARTING) {
        this.emitStatusChange(this.currentStatus, message)
      }
    })

    // Set up event handlers for server status changes
    this.manager.on('ready', () => {
      logger.info('ServerStatusManager: Server is ready')
      this.emitStatusChange(ServerStatus.RUNNING)
    })
    
    this.manager.on('error', (error: Error) => {
      logger.error('ServerStatusManager: Server error:', error)
      this.emitStatusChange(ServerStatus.ERROR, error.message, this.errorDiagnostic(error))
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
      throw error
    } finally {
      this.isInitializing = false
    }
  }
  
  /**
   * Restart the internal server with a clean and simple flow.
   */
  async restartServer(): Promise<ServerStatusSnapshot> {
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
      // BaseServerManager emits the generation's startup error before rejecting.
      // Retain that one detailed transition; only synthesize one if restart failed earlier.
      if (this.currentStatus !== ServerStatus.ERROR || error instanceof ShutdownIncompleteError) {
        this.emitStatusChange(ServerStatus.ERROR, errorMessage, this.errorDiagnostic(error))
      }
      return this.getStatus()
    }
  }
  
  /**
   * Check server health.
   */
  async checkServerHealth(): Promise<ServerHealthResult> {
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
      // A diagnostic request from a previous running child must not revive a
      // stopped, failed, or restarting startup while its response was in flight.
      if (!this.manager.isRunning() || this.currentStatus !== ServerStatus.RUNNING) {
        return { status: 'starting', message: 'Server is not running or still starting' }
      }
      
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
  getStatus(): ServerStatusSnapshot {
    const urls = this.manager.getServerUrls()
    
    return {
      status: this.currentStatus,
      baseUrl: this.manager.getServerBaseUrl(),
      urls,
      healthCheckStatus: this.healthCheckStatus,
      diagnostic: this.diagnostic,
      message: this.statusMessage
    }
  }
  
  /**
   * Emit status change event.
   */
  private errorDiagnostic(error: unknown): ServerDiagnostic | undefined {
    return error instanceof PortConflictError || error instanceof ShutdownIncompleteError ? error.diagnostic : undefined
  }
  private emitStatusChange(status: ServerStatus, message?: string, diagnostic?: ServerDiagnostic): void {
    this.diagnostic = diagnostic
    this.currentStatus = status
    this.statusMessage = message
    const urls = this.manager.getServerUrls()
    const statusObject: ServerStatusSnapshot = {
      status,
      baseUrl: this.manager.getServerBaseUrl(),
      urls,
      message,
      healthCheckStatus: this.healthCheckStatus,
      diagnostic: this.diagnostic
    }
    
    logger.info(`ServerStatusManager: Emitting status change: ${status}`)
    this.emit('status-change', statusObject)
  }
}
