import { startTeamStreamAutoRecovery } from '~/services/runOpen/teamStreamAutoRecovery';

/**
 * The Team streams' recovery owner, for the window's life (autobyteus-541 D-A2): a Team stream that fails recovers by
 * itself, on desktop and phone (both load this app). It registers before any Team stream can open.
 */
export default defineNuxtPlugin(() => {
  if (!process.client) return;
  startTeamStreamAutoRecovery();
});
