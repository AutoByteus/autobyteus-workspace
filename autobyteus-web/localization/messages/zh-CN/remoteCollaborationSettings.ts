import type { TranslationCatalog } from '../../runtime/types';

const remoteCollaborationSettingsMessages = {
  'settings.components.settings.NodeManager.tabs.remoteCollaboration': '远程协作',
  'settings.components.settings.RemoteCollaboration.title': '远程协作',
  'settings.components.settings.RemoteCollaboration.description': '允许本节点的智能体委派给已登记的对等节点上的智能体，并允许对等节点启动本节点的共享智能体。仅适用于可信的私有网络：对等节点不做身份认证，也不共享任何凭据。',
  'settings.components.settings.RemoteCollaboration.status.loading': '加载中',
  'settings.components.settings.RemoteCollaboration.status.error': '错误',
  'settings.components.settings.RemoteCollaboration.status.enabled': '已开启',
  'settings.components.settings.RemoteCollaboration.status.disabled': '已关闭',
  'settings.components.settings.RemoteCollaboration.status.saving': '正在保存...',
  'settings.components.settings.RemoteCollaboration.source.defaultDisabled': '默认关闭。关闭时，本节点不向其他节点发送任何内容，并拒绝它们的请求。',
  'settings.components.settings.RemoteCollaboration.save': '保存',
  'settings.components.settings.RemoteCollaboration.cancel': '取消',
  'settings.components.settings.RemoteCollaboration.peers.title': '对等节点',
  'settings.components.settings.RemoteCollaboration.peers.description': '与本节点协作的节点。也请在对方节点上登记本节点。智能体使用你在这里给出的名称指定对等节点。',
  'settings.components.settings.RemoteCollaboration.peers.urlLabel': '节点 URL',
  'settings.components.settings.RemoteCollaboration.peers.urlPlaceholder': 'http://192.168.1.20:29695',
  'settings.components.settings.RemoteCollaboration.peers.nameLabel': '名称',
  'settings.components.settings.RemoteCollaboration.peers.namePlaceholder': 'docker',
  'settings.components.settings.RemoteCollaboration.peers.add': '添加对等节点',
  'settings.components.settings.RemoteCollaboration.peers.rename': '重命名',
  'settings.components.settings.RemoteCollaboration.peers.remove': '移除',
  'settings.components.settings.RemoteCollaboration.peers.empty': '还没有对等节点。',
  'settings.components.settings.RemoteCollaboration.peers.switchHint': '请先开启远程协作再添加对等节点：添加时会联系该节点以确认其身份。',
  'settings.components.settings.RemoteCollaboration.availability.title': '对等节点可用的智能体',
  'settings.components.settings.RemoteCollaboration.availability.note': '开启远程协作后，已登记的对等节点可以启动本节点的任何共享智能体。它使用自己的默认运行时和模型，在本节点的临时工作区中运行，工具调用自动批准。如果智能体的默认运行时使用本节点的本地登录（例如 Codex 或 Claude），它会为每个已登记的对等节点使用该登录。没有默认运行时和模型的智能体会被拒绝。',
} satisfies TranslationCatalog;

export default remoteCollaborationSettingsMessages;
