import type { TranslationCatalog } from '../../runtime/types';

const remoteCollaborationSettingsMessages = {
  'settings.components.settings.RemoteCollaboration.offer.agents': '智能体',
  'settings.components.settings.RemoteCollaboration.offer.teams': '智能体团队',
  'settings.components.settings.RemoteCollaboration.offer.agentOne': '1 个智能体',
  'settings.components.settings.RemoteCollaboration.offer.agentsCount': '{count} 个智能体',
  'settings.components.settings.RemoteCollaboration.offer.teamOne': '1 个智能体团队',
  'settings.components.settings.RemoteCollaboration.offer.teamsCount': '{count} 个智能体团队',
  'settings.components.settings.RemoteCollaboration.offer.countFiltered': '{shown} / {count}',
  'settings.components.settings.RemoteCollaboration.offer.search': '按名称搜索',
  'settings.components.settings.RemoteCollaboration.offer.noMatchInKind': '没有匹配项。',
  'settings.components.settings.RemoteCollaboration.offer.noMatch': '没有名称匹配“{query}”的智能体或智能体团队。',
  'settings.components.settings.RemoteCollaboration.offer.clearSearch': '清除搜索',
} satisfies TranslationCatalog;

export default remoteCollaborationSettingsMessages;
