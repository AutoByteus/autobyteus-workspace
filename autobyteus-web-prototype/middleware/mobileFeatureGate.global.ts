import {
  isFeatureAvailableInRuntime,
  mobileFeatureForRouteLocation,
} from '~/utils/mobileFeatureGates';
import {
  isMobileRemoteAccessRuntime,
  mobileRemoteAccessHomePath,
} from '~/utils/remoteAccess/mobileRuntime';

export default defineNuxtRouteMiddleware((to) => {
  if (!process.client || !isMobileRemoteAccessRuntime()) {
    return;
  }

  const featureId = mobileFeatureForRouteLocation({
    path: to.path,
    query: to.query as Record<string, unknown>,
  });
  if (!featureId || isFeatureAvailableInRuntime(featureId, true)) {
    return;
  }

  return navigateTo({
    path: mobileRemoteAccessHomePath(),
    query: { unsupported: featureId },
  });
});
