import type { NodeEndpoints } from '~/types/node';

const RESERVED_SURFACE_SEGMENTS = new Set(['mobile', 'rest', 'graphql', 'ws']);

function ensureHttpProtocol(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `http://${value}`;
}

function stripKnownSurfacePath(pathname: string): string {
  const withoutTrailingSlash = pathname.replace(/\/+$/, '');
  const segments = withoutTrailingSlash.split('/').filter(Boolean);
  const reservedIndex = segments.findIndex((segment) => RESERVED_SURFACE_SEGMENTS.has(segment.toLowerCase()));
  if (reservedIndex >= 0) {
    const baseSegments = segments.slice(0, reservedIndex);
    return baseSegments.length > 0 ? `/${baseSegments.join('/')}` : '';
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

  const normalizedPath = stripKnownSurfacePath(parsed.pathname);
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
