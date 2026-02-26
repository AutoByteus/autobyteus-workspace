import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { HealthChecker } from '../HealthChecker'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock the logger
vi.mock('../../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('HealthChecker', () => {
  const testBaseUrl = 'http://localhost:29695'
  let healthChecker: HealthChecker

  beforeEach(() => {
    vi.clearAllMocks()
    healthChecker = new HealthChecker(testBaseUrl)
  })

  describe('check', () => {
    it('should return ok when server responds with 200 and status ok', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'ok', uptime: 123 }
      })

      const result = await healthChecker.check()

      expect(result.status).toBe('ok')
      expect(result.data).toEqual({ status: 'ok', uptime: 123 })
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${testBaseUrl}/rest/health`,
        { timeout: 2000 }
      )
    })

    it('should return error when server responds with non-200 status', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 500,
        data: { error: 'Internal error' }
      })

      const result = await healthChecker.check()

      expect(result.status).toBe('error')
      expect(result.message).toContain('Unexpected response status')
    })

    it('should return starting when connection is refused', async () => {
      const error = new Error('connect ECONNREFUSED') as any
      error.code = 'ECONNREFUSED'
      mockedAxios.get.mockRejectedValue(error)

      const result = await healthChecker.check()

      expect(result.status).toBe('starting')
      expect(result.message).toContain('not yet accepting connections')
    })

    it('should return error on timeout', async () => {
      const error = new Error('timeout') as any
      error.code = 'ETIMEDOUT'
      mockedAxios.get.mockRejectedValue(error)

      const result = await healthChecker.check()

      expect(result.status).toBe('error')
      expect(result.message).toContain('timed out')
    })

    it('should return error with message for other errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const result = await healthChecker.check()

      expect(result.status).toBe('error')
      expect(result.message).toBe('Network error')
    })
  })

  describe('setBaseUrl', () => {
    it('should update the base URL', async () => {
      const newBaseUrl = 'http://localhost:8000'
      healthChecker.setBaseUrl(newBaseUrl)

      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'ok' }
      })

      await healthChecker.check()

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${newBaseUrl}/rest/health`,
        expect.any(Object)
      )
    })
  })

  describe('waitUntilHealthy', () => {
    it('should resolve immediately if server is already healthy', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'ok' }
      })

      await expect(healthChecker.waitUntilHealthy(5000)).resolves.toBeUndefined()
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    })

    it('should poll until server becomes healthy', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }))
        .mockRejectedValueOnce(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }))
        .mockResolvedValueOnce({ status: 200, data: { status: 'ok' } })

      await expect(healthChecker.waitUntilHealthy(5000, 10)).resolves.toBeUndefined()
      expect(mockedAxios.get).toHaveBeenCalledTimes(3)
    })

    it('should reject on timeout', async () => {
      mockedAxios.get.mockRejectedValue(
        Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })
      )

      await expect(healthChecker.waitUntilHealthy(50, 10)).rejects.toThrow('failed to become healthy')
    })
  })
})
