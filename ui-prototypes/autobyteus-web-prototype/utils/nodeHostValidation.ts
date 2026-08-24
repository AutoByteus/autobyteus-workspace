import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';

export interface NodeHostValidationIssue {
  code: string;
  message: string;
}

export interface NodeHostValidationResult {
  normalizedBaseUrl: string;
  severity: 'ok' | 'warning' | 'error';
  warnings: NodeHostValidationIssue[];
  errors: NodeHostValidationIssue[];
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

function parseUrlOrNull(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function validateServerHostConfiguration(
  baseUrl: string,
  sampleGeneratedUrls: string[] = [],
): NodeHostValidationResult {
  const normalizedBaseUrl = normalizeNodeBaseUrl(baseUrl);
  const base = new URL(normalizedBaseUrl);

  const warnings: NodeHostValidationIssue[] = [];
  const errors: NodeHostValidationIssue[] = [];

  if (isLoopbackHost(base.hostname)) {
    warnings.push({
      code: 'loopback-host',
      message:
        'Node host uses loopback (localhost/127.0.0.1). This is only reachable from the same machine.',
    });
  }

  if (base.protocol === 'http:' && !isLoopbackHost(base.hostname)) {
    warnings.push({
      code: 'insecure-http',
      message: 'Node host uses plain HTTP. Use HTTPS for remote production deployments when possible.',
    });
  }

  for (const candidate of sampleGeneratedUrls) {
    const parsed = parseUrlOrNull(candidate);
    if (!parsed) {
      warnings.push({
        code: 'invalid-generated-url',
        message: `Generated URL is not a valid absolute URL: ${candidate}`,
      });
      continue;
    }

    if (parsed.host !== base.host) {
      warnings.push({
        code: 'generated-host-mismatch',
        message: `Generated URL host (${parsed.host}) differs from node host (${base.host}).`,
      });
    }
  }

  const severity: NodeHostValidationResult['severity'] =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok';

  return {
    normalizedBaseUrl,
    severity,
    warnings,
    errors,
  };
}
