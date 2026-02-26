import axios from 'axios'
import { logger } from '../../logger'

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'starting'
  message?: string
  data?: any
}

/**
 * Service responsible for checking server health status.
 * Provides methods for single health checks and polling until healthy.
 */
export class HealthChecker {
  constructor(private baseUrl: string) {}

  /**
   * Update the base URL for health checks.
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl
  }

  /**
   * Perform a single health check.
   */
  async check(): Promise<HealthCheckResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/rest/health`, {
        timeout: 2000
      })

      if (response.status === 200 && response.data.status === 'ok') {
        logger.info('Health check successful')
        return { status: 'ok', data: response.data }
      }

      return {
        status: 'error',
        message: `Unexpected response status: ${response.status}`
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorCode = (error as any).code

      if (errorCode === 'ECONNREFUSED') {
        return { status: 'starting', message: 'Server not yet accepting connections' }
      }

      if (errorCode === 'ETIMEDOUT') {
        return { status: 'error', message: 'Connection timed out' }
      }

      return { status: 'error', message: errorMessage }
    }
  }

  /**
   * Poll until the server is healthy or timeout is reached.
   * @param timeoutMs Maximum time to wait for healthy status
   * @param pollIntervalMs Interval between health checks (default: 500ms)
   */
  async waitUntilHealthy(timeoutMs: number, pollIntervalMs: number = 500): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.check()

      if (result.status === 'ok') {
        logger.info('Server is healthy')
        return
      }

      logger.info(`Health check result: ${result.status} - ${result.message || 'waiting...'}`)
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }

    throw new Error(`Server failed to become healthy within ${timeoutMs}ms`)
  }
}
