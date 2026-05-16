const MOBILE_ROUTE_PREFIX = '/mobile';

const normalizePathname = (pathname: string): string => {
  const normalized = `/${String(pathname || '/').replace(/^\/+/, '')}`.replace(/\/+$/, '');
  return normalized || '/';
};

export function isPathWithinMobileRuntime(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return normalized === MOBILE_ROUTE_PREFIX || normalized.startsWith(`${MOBILE_ROUTE_PREFIX}/`);
}

export function stripMobileRuntimePrefix(pathname: string): string {
  const normalized = normalizePathname(pathname);
  if (normalized === MOBILE_ROUTE_PREFIX) {
    return '/';
  }
  return normalized.startsWith(`${MOBILE_ROUTE_PREFIX}/`)
    ? normalizePathname(normalized.slice(MOBILE_ROUTE_PREFIX.length))
    : normalized;
}

export function isMobileRemoteAccessBuild(): boolean {
  try {
    return useRuntimeConfig().public.mobileRemoteAccessBuild === true;
  } catch {
    return false;
  }
}

export function mobileRemoteAccessHomePath(): string {
  return isMobileRemoteAccessBuild() ? '/' : MOBILE_ROUTE_PREFIX;
}

export function isMobileRemoteAccessRuntime(pathname?: string): boolean {
  if (isMobileRemoteAccessBuild()) {
    return true;
  }
  if (typeof window === 'undefined' && pathname === undefined) {
    return false;
  }
  return isPathWithinMobileRuntime(pathname ?? window.location.pathname);
}
