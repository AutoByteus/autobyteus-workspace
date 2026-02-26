import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NetworkInterfaceInfo } from 'os'

let getLocalIp: typeof import('../networkUtils').getLocalIp
let mockedNetworkInterfaces: ReturnType<typeof vi.fn>

describe('networkUtils', () => {
  
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    const networkInterfacesMock = vi.fn(() => ({}))

    vi.doMock('os', () => ({
      networkInterfaces: networkInterfacesMock,
      default: {
        networkInterfaces: networkInterfacesMock,
      },
    }))

    vi.doMock('../../logger', () => ({
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    }))

    const osModule = await import('os')
    mockedNetworkInterfaces = vi.mocked(osModule.networkInterfaces)

    ;({ getLocalIp } = await import('../networkUtils'))
  })

  describe('getLocalIp', () => {
    it('should return the IP from a priority interface like en0', () => {
      const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
        lo0: [
          { address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true, cidr: '127.0.0.1/8' },
          { address: '::1', netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', family: 'IPv6', mac: '00:00:00:00:00:00', internal: true, cidr: '::1/128', scopeid: 0 },
        ],
        en0: [
          { address: '192.168.1.100', netmask: '255.255.255.0', family: 'IPv4', mac: 'aa:bb:cc:dd:ee:ff', internal: false, cidr: '192.168.1.100/24' },
          { address: 'fe80::abc:1234:5678:90ab', netmask: 'ffff:ffff:ffff:ffff::', family: 'IPv6', mac: 'aa:bb:cc:dd:ee:ff', internal: false, cidr: 'fe80::abc:1234:5678:90ab/64', scopeid: 4 },
        ],
      }
      mockedNetworkInterfaces.mockReturnValue(mockInterfaces)

      const ip = getLocalIp()
      expect(ip).toBe('192.168.1.100')
    })

    it('should return the IP from a priority interface like Wi-Fi', () => {
        const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
          'Wi-Fi': [
            { address: '192.168.0.42', netmask: '255.255.255.0', family: 'IPv4', mac: 'aa:bb:cc:dd:ee:ff', internal: false, cidr: '192.168.0.42/24' },
          ],
        }
        mockedNetworkInterfaces.mockReturnValue(mockInterfaces)
  
        const ip = getLocalIp()
        expect(ip).toBe('192.168.0.42')
      })

    it('should return the IP from a non-priority interface if no priority ones are available', () => {
      const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
        lo0: [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true, cidr: '127.0.0.1/8' }],
        'custom_net1': [
          { address: '10.0.0.5', netmask: '255.255.255.0', family: 'IPv4', mac: '11:22:33:44:55:66', internal: false, cidr: '10.0.0.5/24' },
        ],
      }
      mockedNetworkInterfaces.mockReturnValue(mockInterfaces)

      const ip = getLocalIp()
      expect(ip).toBe('10.0.0.5')
    })

    it('should return the first valid IPv4 address from a priority interface', () => {
      const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
        eth0: [
          { address: '172.16.0.10', netmask: '255.255.255.0', family: 'IPv4', mac: 'aa:bb:cc:dd:ee:ff', internal: false, cidr: '172.16.0.10/24' },
          { address: '172.16.0.11', netmask: '255.255.255.0', family: 'IPv4', mac: 'aa:bb:cc:dd:ee:ff', internal: false, cidr: '172.16.0.11/24' },
        ],
      }
      mockedNetworkInterfaces.mockReturnValue(mockInterfaces)

      const ip = getLocalIp()
      expect(ip).toBe('172.16.0.10')
    })

    it('should return null if no non-internal IPv4 addresses are found', () => {
      const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {
        lo0: [{ address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true, cidr: '127.0.0.1/8' }],
        en0: [
          { address: 'fe80::abc:1234:5678:90ab', netmask: 'ffff:ffff:ffff:ffff::', family: 'IPv6', mac: 'aa:bb:cc:dd:ee:ff', internal: false, cidr: 'fe80::abc:1234:5678:90ab/64', scopeid: 4 },
        ],
      }
      mockedNetworkInterfaces.mockReturnValue(mockInterfaces)

      const ip = getLocalIp()
      expect(ip).toBeNull()
    })

    it('should return null when networkInterfaces returns an empty object', () => {
      const mockInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {}
      mockedNetworkInterfaces.mockReturnValue(mockInterfaces)

      const ip = getLocalIp()
      expect(ip).toBeNull()
    })

    it('should return null when networkInterfaces returns undefined', () => {
      mockedNetworkInterfaces.mockReturnValue(undefined)

      const ip = getLocalIp()
      expect(ip).toBeNull()
    })

    it('should return null and not crash if networkInterfaces throws an error', () => {
      mockedNetworkInterfaces.mockImplementation(() => {
        throw new Error('OS Error')
      })

      const ip = getLocalIp()
      expect(ip).toBeNull()
    })
  })
})
