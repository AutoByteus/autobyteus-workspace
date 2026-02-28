export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig();

  // Protect /applications route and its subroutes
  if (to.path.startsWith('/applications') && !config.public.enableApplications) {
    return navigateTo('/');
  }
});
