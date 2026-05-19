import { bootstrapMobileRemoteAccessSession } from '~/utils/remoteAccess/mobileSessionBootstrap';

export default defineNuxtPlugin(() => {
  if (!process.client) {
    return;
  }

  bootstrapMobileRemoteAccessSession();
});
