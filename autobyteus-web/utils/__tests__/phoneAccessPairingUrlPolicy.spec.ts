import { describe, expect, it } from 'vitest'
import { evaluatePhoneAccessPairingUrl } from '../phoneAccessPairingUrlPolicy'

describe('phoneAccessPairingUrlPolicy', () => {
  it('allows HTTPS and strips mobile surface paths to the canonical base', () => {
    expect(evaluatePhoneAccessPairingUrl('https://gateway.example.com/autobyteus/mobile?pairing=old'))
      .toMatchObject({
        normalizedBaseUrl: 'https://gateway.example.com/autobyteus',
        isValid: true,
        transportSecurity: 'https',
        requiresTrustedPrivateHttpAcknowledgement: false,
      })
  })

  it.each([
    'http://192.168.1.25:29695/mobile',
    'http://10.0.0.5:29695',
    'http://172.20.0.5:29695',
    'http://169.254.1.2:29695',
    'http://100.64.1.2:29695',
    'http://printer.local:29695',
    'http://autobyteus-node:29695',
    'http://[fd00::1]:29695',
    'http://[fe80::1]:29695',
  ])('allows trusted private HTTP URL %s with acknowledgement requirement', (serverBaseUrl) => {
    expect(evaluatePhoneAccessPairingUrl(serverBaseUrl))
      .toMatchObject({
        normalizedBaseUrl: expect.stringMatching(/^http:\/\//),
        isValid: true,
        transportSecurity: 'trusted_private_http',
        requiresTrustedPrivateHttpAcknowledgement: true,
      })
  })

  it.each([
    'http://example.com:29695',
    'http://desktop.tailnet.ts.net:29695',
    'http://8.8.8.8:29695',
  ])('rejects public-looking HTTP URL %s', (serverBaseUrl) => {
    expect(evaluatePhoneAccessPairingUrl(serverBaseUrl))
      .toMatchObject({
        isValid: false,
        message: expect.stringContaining('Use HTTPS for public hostnames'),
      })
  })

  it.each([
    'http://localhost:29695',
    'https://127.0.0.1:29695',
    'http://0.0.0.0:29695',
    'http://host.docker.internal:29695',
    'http://[::1]:29695',
  ])('rejects phone-unreachable local-only URL %s', (serverBaseUrl) => {
    expect(evaluatePhoneAccessPairingUrl(serverBaseUrl))
      .toMatchObject({
        isValid: false,
        isAndroidFacing: false,
        message: expect.stringContaining('phone-facing URL'),
      })
  })
})
