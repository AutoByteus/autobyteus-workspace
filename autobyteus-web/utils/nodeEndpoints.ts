import type { NodeEndpoints } from '~/types/node';

const KNOWN_PATH_SUFFIXES = [
  '/graphql',
  '/rest',
  '/rest/health',
  '/ws/agent',
  '/ws/agent-team',
  '/ws/terminal',
  '/ws/file-explorer',
];

function ensureHttpProtocol(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `http://${value}`;
}

function stripKnownApiSuffix(pathname: string): string {
  const withoutTrailingSlash = pathname.replace(/\/+$/, '');
  const lowered = withoutTrailingSlash.toLowerCase();

  for (const suffix of KNOWN_PATH_SUFFIXES) {
    if (lowered.endsWith(suffix)) {
      const candidate = withoutTrailingSlash.slice(0, withoutTrailingSlash.length - suffix.length);
      return candidate || '';
    }
  }

  return withoutTrailingSlash;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function toWsBase(httpBase: string): string {
  if (httpBase.startsWith('https://')) {
    return `wss://${httpBase.slice('https://'.length)}`;
  }
  if (httpBase.startsWith('http://')) {
    return `ws://${httpBase.slice('http://'.length)}`;
  }
  throw new Error(`Unsupported protocol for node base URL: ${httpBase}`);
}

export function normalizeNodeBaseUrl(baseUrl: string): string {
  const raw = baseUrl.trim();
  if (!raw) {
    throw new Error('Node base URL is required');
  }

  const schemeMatch = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (schemeMatch && !/^https?$/i.test(schemeMatch[1])) {
    throw new Error(`Node base URL must use http or https: ${baseUrl}`);
  }

  let parsed: URL;
  try {
    parsed = new URL(ensureHttpProtocol(raw));
  } catch {
    throw new Error(`Invalid node base URL: ${baseUrl}`);
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error(`Node base URL must use http or https: ${baseUrl}`);
  }

  const normalizedPath = stripKnownApiSuffix(parsed.pathname);
  const base = `${parsed.protocol}//${parsed.host}${normalizedPath}`;

  return trimTrailingSlash(base);
}

export function deriveNodeEndpoints(baseUrl: string): NodeEndpoints {
  const httpBase = normalizeNodeBaseUrl(baseUrl);
  const wsBase = toWsBase(httpBase);

  return {
    graphqlHttp: `${httpBase}/graphql`,
    graphqlWs: `${wsBase}/graphql`,
    rest: `${httpBase}/rest`,
    agentWs: `${wsBase}/ws/agent`,
    teamWs: `${wsBase}/ws/agent-team`,
    terminalWs: `${wsBase}/ws/terminal`,
    fileExplorerWs: `${wsBase}/ws/file-explorer`,
    health: `${httpBase}/rest/health`,
  };
}
