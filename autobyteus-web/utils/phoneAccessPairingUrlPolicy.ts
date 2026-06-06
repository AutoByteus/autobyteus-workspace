import type { RemoteAccessUrlCandidate } from '~/types/remoteAccess'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

export type PhoneAccessTransportSecurity = 'https' | 'trusted_private_http'

export type PhoneAccessPairingUrlDecision = {
  normalizedBaseUrl: string
  isValid: boolean
  isHttps: boolean
  isAndroidFacing: boolean
  transportSecurity: PhoneAccessTransportSecurity | null
  requiresTrustedPrivateHttpAcknowledgement: boolean
  message: string | null
  warning: string | null
}

type PhoneAccessPairingUrlPolicyOptions = {
  requiresPhoneFacingUrl?: boolean
}

const normalizeHostname = (hostname: string): string =>
  hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')

const parseIpv4Address = (hostname: string): [number, number, number, number] | null => {
  const parts = hostname.split('.')
  if (parts.length !== 4) {
    return null
  }
  const octets = parts.map((part) => Number(part))
  if (!octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    return null
  }
  return octets as [number, number, number, number]
}

const firstIpv6Hextet = (hostname: string): number | null => {
  if (!hostname.includes(':')) {
    return null
  }
  const first = hostname.split(':', 1)[0]
  if (!first) {
    return 0
  }
  const parsed = Number.parseInt(first, 16)
  return Number.isFinite(parsed) ? parsed : null
}

const isIpv4LoopbackOrUnspecified = (octets: [number, number, number, number]): boolean =>
  octets[0] === 127 || octets[0] === 0

const isIpv4PrivateOrLocal = (octets: [number, number, number, number]): boolean =>
  octets[0] === 10
  || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
  || (octets[0] === 192 && octets[1] === 168)
  || (octets[0] === 169 && octets[1] === 254)
  || (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127)

const isIpv6LoopbackOrUnspecified = (hostname: string): boolean =>
  hostname === '::1'
  || hostname === '::'
  || hostname === '0:0:0:0:0:0:0:1'
  || hostname === '0:0:0:0:0:0:0:0'

const isIpv6PrivateOrLocal = (hostname: string): boolean => {
  const firstHextet = firstIpv6Hextet(hostname)
  if (firstHextet === null) {
    return false
  }
  return (firstHextet >= 0xfc00 && firstHextet <= 0xfdff)
    || (firstHextet >= 0xfe80 && firstHextet <= 0xfebf)
}

export const isPhoneUnreachableLocalOnlyHost = (hostname: string): boolean => {
  const normalized = normalizeHostname(hostname)
  const ipv4 = parseIpv4Address(normalized)
  if (ipv4) {
    return isIpv4LoopbackOrUnspecified(ipv4)
  }
  return normalized === 'localhost'
    || normalized === 'host.docker.internal'
    || normalized.endsWith('.localhost')
    || isIpv6LoopbackOrUnspecified(normalized)
}

export const isTrustedPrivateHttpHost = (hostname: string): boolean => {
  const normalized = normalizeHostname(hostname)
  const ipv4 = parseIpv4Address(normalized)
  if (ipv4) {
    return !isIpv4LoopbackOrUnspecified(ipv4) && isIpv4PrivateOrLocal(ipv4)
  }
  if (normalized.includes(':')) {
    return !isIpv6LoopbackOrUnspecified(normalized) && isIpv6PrivateOrLocal(normalized)
  }
  return !isPhoneUnreachableLocalOnlyHost(normalized)
    && (normalized.endsWith('.local')
      || normalized.endsWith('.lan')
      || normalized.endsWith('.home.arpa')
      || !normalized.includes('.'))
}

export const evaluatePhoneAccessPairingUrl = (
  rawBaseUrl: string,
  options: PhoneAccessPairingUrlPolicyOptions = {},
): PhoneAccessPairingUrlDecision => {
  const raw = rawBaseUrl.trim()
  if (!raw) {
    return {
      normalizedBaseUrl: '',
      isValid: false,
      isHttps: false,
      isAndroidFacing: false,
      transportSecurity: null,
      requiresTrustedPrivateHttpAcknowledgement: false,
      message: options.requiresPhoneFacingUrl
        ? 'Enter the phone-facing private network URL for this remote node.'
        : 'Choose or enter a server URL first.',
      warning: null,
    }
  }

  try {
    const normalizedBaseUrl = normalizeNodeBaseUrl(raw)
    const parsed = new URL(normalizedBaseUrl)
    const isHttps = parsed.protocol === 'https:'
    const isAndroidFacing = !isPhoneUnreachableLocalOnlyHost(parsed.hostname)

    if (!isAndroidFacing) {
      return {
        normalizedBaseUrl,
        isValid: false,
        isHttps,
        isAndroidFacing: false,
        transportSecurity: null,
        requiresTrustedPrivateHttpAcknowledgement: false,
        message: 'Phone Access requires a phone-facing URL, not localhost, 127.0.0.1, 0.0.0.0, host.docker.internal, or another local-only address.',
        warning: null,
      }
    }

    if (isHttps) {
      return {
        normalizedBaseUrl,
        isValid: true,
        isHttps: true,
        isAndroidFacing: true,
        transportSecurity: 'https',
        requiresTrustedPrivateHttpAcknowledgement: false,
        message: null,
        warning: null,
      }
    }

    if (parsed.protocol !== 'http:') {
      return {
        normalizedBaseUrl,
        isValid: false,
        isHttps: false,
        isAndroidFacing: true,
        transportSecurity: null,
        requiresTrustedPrivateHttpAcknowledgement: false,
        message: 'Phone Access URL must use http or https.',
        warning: null,
      }
    }

    if (!isTrustedPrivateHttpHost(parsed.hostname)) {
      return {
        normalizedBaseUrl,
        isValid: false,
        isHttps: false,
        isAndroidFacing: true,
        transportSecurity: null,
        requiresTrustedPrivateHttpAcknowledgement: false,
        message: 'HTTP Phone Access is allowed only for trusted private LAN, tailnet IP, or local hostname URLs. Use HTTPS for public hostnames.',
        warning: null,
      }
    }

    return {
      normalizedBaseUrl,
      isValid: true,
      isHttps: false,
      isAndroidFacing: true,
      transportSecurity: 'trusted_private_http',
      requiresTrustedPrivateHttpAcknowledgement: true,
      message: null,
      warning: 'This URL uses cleartext HTTP. Only create this QR when your phone is on the same trusted LAN, tailnet IP range, or private local network.',
    }
  } catch (validationError) {
    return {
      normalizedBaseUrl: '',
      isValid: false,
      isHttps: false,
      isAndroidFacing: false,
      transportSecurity: null,
      requiresTrustedPrivateHttpAcknowledgement: false,
      message: validationError instanceof Error ? validationError.message : String(validationError),
      warning: null,
    }
  }
}

export const normalizeAllowedPhoneAccessCandidate = (candidate: RemoteAccessUrlCandidate): string | null => {
  const decision = evaluatePhoneAccessPairingUrl(candidate.serverBaseUrl)
  return decision.isValid ? decision.normalizedBaseUrl : null
}
