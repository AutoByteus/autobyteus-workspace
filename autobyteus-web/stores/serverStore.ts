import { defineStore } from 'pinia'
import axios from 'axios'
import { INTERNAL_SERVER_PORT, getServerUrls, isElectronEnvironment } from '~/utils/serverConfig'
import { ServerStatus } from '~/types/serverStatus'

// Define the state interface
interface ServerState {
  status: ServerStatus
  port: number
  urls: {
    graphql: string
    rest: string
    graphqlWs: string
    transcription: string
    terminalWs: string
    health: string
  }
  errorMessage: string
  isElectron: boolean
  healthCheckStatus: string
  connectionAttempts: number
  maxConnectionAttempts: number
  isInitialStartup: boolean
  logFilePath: string
}

export const useServerStore = defineStore('server', {
  state: (): ServerState => ({
    status: ServerStatus.STARTING,
    port: INTERNAL_SERVER_PORT,
    urls: getServerUrls(),
    errorMessage: '',
    isElectron: isElectronEnvironment(),
    healthCheckStatus: '',
    connectionAttempts: 0,
    maxConnectionAttempts: 5,
    isInitialStartup: true,
    logFilePath: ''
  }),
  
  getters: {
    userFriendlyError: (state): string => {
      if (state.isInitialStartup) {
        return 'The server is starting up. This may take a moment...'
      }
      if (!state.errorMessage) {
        return 'Failed to start the Agent Server.'
      }
      if (state.errorMessage.includes('ECONNREFUSED') || state.errorMessage.includes('connect')) {
        return 'Could not connect to the Agent Server. Please try again or contact support.'
      }
      if (state.errorMessage.includes('timeout')) {
        return 'Connection to the Agent Server timed out. Please try again or contact support.'
      }
      return state.errorMessage
    },
    
    connectionMessage: (state): string => {
      if (state.status === ServerStatus.STARTING) {
        return 'Connecting to Agent Server...'
      } else if (state.status === ServerStatus.ERROR) {
        return state.errorMessage || 'Error connecting to server'
      } else {
        return 'Connected to server'
      }
    }
  },
  
  actions: {
    /**
     * Initialize the server configuration.
     */
    async initialize(): Promise<void> {
      console.log('serverStore: Initializing server config')
      
      if (!this.isElectron) {
        console.log('serverStore: Not in Electron environment. Skipping server initialization.')
        this.status = ServerStatus.RUNNING
        this.errorMessage = ''
        this.isInitialStartup = false
        return
      }
      
      this.status = ServerStatus.STARTING
      this.errorMessage = ''
      this.connectionAttempts = 0
      this.isInitialStartup = true
      this.urls = getServerUrls()
      this.isElectron = isElectronEnvironment()
      
      if (this.isElectron && window.electronAPI?.getLogFilePath) {
        try {
          this.logFilePath = await window.electronAPI.getLogFilePath()
          console.log('serverStore: Log file path:', this.logFilePath)
        } catch (e) {
          console.error('serverStore: Failed to get log file path:', e)
        }
      }
      
      if (this.isElectron) {
        this.handleElectronServerInitialization()
      } else {
        this.handleBrowserServerConnection()
      }
      
      setTimeout(() => {
        this.isInitialStartup = false
      }, 30000)
    },

    /**
     * Wait until the server is ready (Electron only).
     * Returns true when running, false on error/timeout.
     */
    async waitForServerReady(timeoutMs = 30000, pollMs = 250): Promise<boolean> {
      if (!this.isElectron) {
        return true
      }
      if (this.status === ServerStatus.RUNNING) {
        return true
      }

      const start = Date.now()
      return await new Promise<boolean>((resolve) => {
        const interval = setInterval(() => {
          if (this.status === ServerStatus.RUNNING) {
            clearInterval(interval)
            resolve(true)
            return
          }
          if (this.status === ServerStatus.ERROR || this.status === ServerStatus.SHUTTING_DOWN) {
            clearInterval(interval)
            resolve(false)
            return
          }
          if (Date.now() - start >= timeoutMs) {
            clearInterval(interval)
            resolve(false)
          }
        }, pollMs)
      })
    },
    
    /**
     * Initialize through Electron's server manager.
     */
    handleElectronServerInitialization(): void {
      if (window.electronAPI?.getServerStatus) {
        window.electronAPI.getServerStatus()
          .then((serverStatus) => {
            console.log('serverStore: Received server status:', serverStatus)
            this.updateServerStatus(serverStatus)
          })
          .catch((error) => {
            console.error('serverStore: Failed to get Agent Server status:', error)
            if (!this.isInitialStartup) {
              this.status = ServerStatus.ERROR
              this.errorMessage = 'Failed to connect to the Agent Server'
            }
          })
      } else {
        console.warn('serverStore: electronAPI.getServerStatus not available')
      }
      
      if (window.electronAPI?.onServerStatus) {
        window.electronAPI.onServerStatus((serverStatus) => {
          console.log('serverStore: Server status update received:', serverStatus)
          if (serverStatus.status === ServerStatus.RUNNING) {
            this.isInitialStartup = false
          }
          this.updateServerStatus(serverStatus)
        })
      } else {
        console.warn('serverStore: electronAPI.onServerStatus not available')
      }
      
      // Listen for the app quitting event
      if (window.electronAPI?.onAppQuitting) {
        window.electronAPI.onAppQuitting(() => {
          console.log('serverStore: App is quitting, updating status.')
          this.status = ServerStatus.SHUTTING_DOWN
          // Tell the main process that the UI has been updated and it can proceed.
          window.electronAPI?.startShutdown()
        })
      }
      
      const healthCheckInterval = setInterval(() => {
        if (this.status === ServerStatus.RUNNING) {
          clearInterval(healthCheckInterval)
          return
        }
        this.checkServerHealth().then(result => {
          if (result.status === 'ok') {
            this.isInitialStartup = false
          }
        }).catch(() => {})
      }, 2000)
    },
    
    /**
     * Handle server connection in browser environment.
     */
    handleBrowserServerConnection(): void {
      this.connectionAttempts = 0
      this.status = ServerStatus.STARTING
      console.log('serverStore: Setting connection mode to internal server in browser mode')
      
      setTimeout(() => {
        this.attemptServerConnection()
      }, 1000)
    },
    
    /**
     * Attempt to connect to server with retries.
     */
    async attemptServerConnection(): Promise<void> {
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        this.status = ServerStatus.ERROR
        this.errorMessage = `Failed to connect to server after ${this.maxConnectionAttempts} attempts`
        this.isInitialStartup = false
        return
      }
      
      this.connectionAttempts++
      console.log(`serverStore: Connection attempt ${this.connectionAttempts} of ${this.maxConnectionAttempts}`)
      
      try {
        const result = await this.checkServerHealth()
        if (result.status === 'ok') {
          this.status = ServerStatus.RUNNING
          this.errorMessage = ''
          this.isInitialStartup = false
        } else {
          if (this.connectionAttempts < this.maxConnectionAttempts) {
            setTimeout(() => {
              this.attemptServerConnection()
            }, 2000)
          } else {
            this.status = ServerStatus.ERROR
            this.errorMessage = 'Could not connect to the server after multiple attempts'
            this.isInitialStartup = false
          }
        }
      } catch (error) {
        console.log('serverStore: Connection attempt failed:', error instanceof Error ? error.message : String(error))
        if (this.connectionAttempts < this.maxConnectionAttempts) {
          setTimeout(() => {
            this.attemptServerConnection()
          }, 2000)
        } else {
          this.status = ServerStatus.ERROR
          this.errorMessage = error instanceof Error ? error.message : 'Unknown error connecting to server'
          this.isInitialStartup = false
        }
      }
    },
    
    /**
     * Update the server status.
     */
    updateServerStatus(serverStatus: any): void {
      if (!serverStatus) {
        console.warn('serverStore: Received empty server status')
        return
      }
      console.log('serverStore: Updating server status with:', serverStatus)
      
      if (serverStatus.status) {
        if (serverStatus.status === ServerStatus.RUNNING && this.status !== ServerStatus.RUNNING) {
          this.isInitialStartup = false
        }
        this.status = serverStatus.status
      }
      
      if (serverStatus.status === ServerStatus.ERROR && serverStatus.message) {
        this.errorMessage = serverStatus.message
        this.isInitialStartup = false
      }
    },
    
    /**
     * Restart the server.
     * (Delegates to electronAPI.restartServer.)
     */
    async restartServer(): Promise<void> {
      if (!this.isElectron || !window.electronAPI?.restartServer) {
        console.warn('serverStore: electronAPI.restartServer not available')
        return
      }
      
      console.log('serverStore: Initiating server restart.')
      this.status = ServerStatus.RESTARTING; // Optimistically update UI
      this.errorMessage = ''
      
      try {
        // The backend will now handle the full restart process.
        // The onServerStatus listener will catch the final RUNNING or ERROR state.
        await window.electronAPI.restartServer()
      } catch (error) {
        console.error('serverStore: Failed to trigger Agent Server restart:', error)
        this.status = ServerStatus.ERROR
        this.errorMessage = 'Failed to restart the application'
      }
    },

    /**
     * Advanced Recovery: Resets all server data and restarts.
     */
    async resetServerDataAndRestart(): Promise<void> {
      if (!this.isElectron || !window.electronAPI?.resetServerData) {
        this.errorMessage = 'Server data reset is not available in this environment.';
        return;
      }
      console.log('serverStore: Resetting all server data and restarting...');
      this.errorMessage = 'Resetting server data...'; // Give user feedback
      try {
        const result = await window.electronAPI.resetServerData();
        if (result.success) {
          await this.restartServer();
        } else {
          this.status = ServerStatus.ERROR;
          this.errorMessage = `Failed to reset server data: ${result.error}`;
        }
      } catch (error) {
        this.status = ServerStatus.ERROR;
        this.errorMessage = `An unexpected error occurred while resetting server data: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
    
    /**
     * Check server health.
     */
    async checkServerHealth(): Promise<{ status: string; message?: string; data?: any }> {
      if (this.isElectron && window.electronAPI?.checkServerHealth) {
        this.healthCheckStatus = 'Checking...'
        try {
          const result = await window.electronAPI.checkServerHealth()
          if (result.status === 'starting') {
            this.healthCheckStatus = 'Server is starting up...'
            return result
          }
          
          if (result.status === 'ok') {
            this.healthCheckStatus = `Healthy: ${result.data?.status || 'OK'}`
            if (this.status !== ServerStatus.RUNNING) {
              try {
                const serverStatus = await window.electronAPI.getServerStatus()
                this.updateServerStatus(serverStatus)
              } catch (e) {
                console.error('serverStore: Error refreshing server status:', e)
              }
            }
          } else {
            this.healthCheckStatus = `Error: ${result.message || 'Unknown error'}`
          }
          
          return result
        } catch (error) {
          if (!this.isInitialStartup) {
            if (error instanceof Error) {
              this.errorMessage = error.message
            }
          }
          const errorCode = (error as any).code || 'ERROR'
          if (errorCode === 'ECONNREFUSED') {
            this.healthCheckStatus = 'Error: Could not connect to server'
          } else if (errorCode === 'ETIMEDOUT') {
            this.healthCheckStatus = 'Error: Connection timed out'
          } else {
            this.healthCheckStatus = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
          return { status: 'error', message: this.healthCheckStatus }
        }
      } else {
        const healthUrl = this.urls.health
        this.healthCheckStatus = `Checking (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})...`
        try {
          console.log(`serverStore: Checking server health at ${healthUrl}`)
          const response = await axios.get(healthUrl, { timeout: 5000 })
          if (response.status === 200) {
            this.healthCheckStatus = 'Healthy'
            return { status: 'ok', data: response.data }
          } else {
            this.healthCheckStatus = `Error: Unexpected response status ${response.status}`
            return { status: 'error', message: `Unexpected response status ${response.status}` }
          }
        } catch (error) {
          if (!this.isInitialStartup) {
            if (error instanceof Error) {
              this.errorMessage = error.message
            }
          }
          const errorCode = (error as any).code || 'ERROR'
          if (errorCode === 'ECONNREFUSED') {
            this.healthCheckStatus = 'Error: Could not connect to server'
          } else if (errorCode === 'ETIMEDOUT') {
            this.healthCheckStatus = 'Error: Connection timed out'
          } else {
            this.healthCheckStatus = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
          return { status: 'error', message: this.healthCheckStatus }
        }
      }
    }
  }
})
