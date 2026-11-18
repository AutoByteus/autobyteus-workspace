import { runBrowserStorageMigrations } from '~/client-data-migrations/browser-storage-runner';

/** Renames stored browser keys once (autobyteus-290 SM-7, SM-8), before the node and phone-session stores read them. */
export default defineNuxtPlugin(() => {
  if (!process.client || typeof window.localStorage === 'undefined') {
    return;
  }

  runBrowserStorageMigrations(window.localStorage, console);
});
