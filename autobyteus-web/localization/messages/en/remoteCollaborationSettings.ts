import type { TranslationCatalog } from '../../runtime/types';

const remoteCollaborationSettingsMessages = {
  'settings.components.settings.RemoteCollaboration.offer.agents': 'Agents',
  'settings.components.settings.RemoteCollaboration.offer.teams': 'Agent Teams',
  'settings.components.settings.RemoteCollaboration.offer.agentOne': '1 Agent',
  'settings.components.settings.RemoteCollaboration.offer.agentsCount': '{count} Agents',
  'settings.components.settings.RemoteCollaboration.offer.teamOne': '1 Agent Team',
  'settings.components.settings.RemoteCollaboration.offer.teamsCount': '{count} Agent Teams',
  'settings.components.settings.RemoteCollaboration.offer.countFiltered': '{shown} of {count}',
  'settings.components.settings.RemoteCollaboration.offer.search': 'Search by name',
  'settings.components.settings.RemoteCollaboration.offer.noMatchInKind': 'No match.',
  'settings.components.settings.RemoteCollaboration.offer.noMatch': 'No Agents or Agent Teams match “{query}”.',
  'settings.components.settings.RemoteCollaboration.offer.clearSearch': 'Clear search',
} satisfies TranslationCatalog;

export default remoteCollaborationSettingsMessages;
