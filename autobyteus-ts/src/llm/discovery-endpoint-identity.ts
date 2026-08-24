export const normalizeDiscoveryEndpointIdentity = (input: string): string => {
  const value = input.trim();
  if (!value) throw new Error('DISCOVERY_ENDPOINT_REQUIRED');

  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error('DISCOVERY_ENDPOINT_INVALID');
  }

  if (!endpoint.protocol || !endpoint.host) throw new Error('DISCOVERY_ENDPOINT_INVALID');
  if (endpoint.username || endpoint.password) {
    throw new Error('DISCOVERY_ENDPOINT_CREDENTIALS_NOT_ALLOWED');
  }

  endpoint.hash = '';
  const path = endpoint.pathname === '/' ? '' : endpoint.pathname;
  return `${endpoint.protocol}//${endpoint.host}${path}${endpoint.search}`;
};

export const tryNormalizeDiscoveryEndpointIdentity = (input: string): string | null => {
  try {
    return normalizeDiscoveryEndpointIdentity(input);
  } catch {
    return null;
  }
};

export const joinDiscoveryEndpointPath = (baseUrl: string, requestPath: string): string => {
  const endpoint = new URL(normalizeDiscoveryEndpointIdentity(baseUrl));
  const basePath = endpoint.pathname.replace(/\/+$/, '');
  const relativePath = requestPath.replace(/^\/+/, '');
  endpoint.pathname = `${basePath}/${relativePath}`;
  endpoint.hash = '';
  return endpoint.toString();
};
