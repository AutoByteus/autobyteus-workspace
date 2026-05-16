import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { isMobileRemoteAccessRuntime } from '~/utils/remoteAccess/mobileRuntime';

export function bootstrapMobileRemoteAccessSession(pathname?: string): boolean {
  if (!isMobileRemoteAccessRuntime(pathname)) {
    return false;
  }

  const sessionStore = useMobileNodeSessionStore();
  sessionStore.initializeFromStorage();
  return sessionStore.isPaired;
}

export function resolveCurrentGraphqlHttpEndpoint(): string {
  return useWindowNodeContextStore().getBoundEndpoints().graphqlHttp;
}
