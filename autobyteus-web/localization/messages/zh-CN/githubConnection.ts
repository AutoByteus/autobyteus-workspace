import type { TranslationCatalog } from '../../runtime/types';

/** 导入区域（智能体包、技能来源）中的 GitHub 连接行。 */
const githubConnectionMessages = {
  'github.connection.notConnected': 'GitHub · 未连接 — 仅私有仓库需要。',
  'github.connection.connectedAs': 'GitHub · 已连接为 @{{login}}',
  'github.connection.usage': '用于此处的私有仓库，以及拥有 GitHub 集成的智能体。',
  'github.connection.connect': '连接 GitHub',
  'github.connection.replace': '更换令牌',
  'github.connection.disconnect': '断开连接',
  'github.connection.disconnecting': '正在断开…',
  'github.connection.tokenLabel': 'GitHub 令牌',
  'github.connection.tokenPlaceholder': '粘贴 GitHub 令牌',
  'github.connection.save': '保存',
  'github.connection.checking': '正在检查…',
  'github.connection.cancel': '取消',
  'github.connection.createToken': '在 GitHub 上创建细粒度令牌 ↗',
  'github.connection.tokenHelp': '— 只选择您需要的仓库；Repository permissions → Contents：Read-only。令牌保存在此节点的保险库中，不会再次显示。',
  'github.connection.errorTokenRequired': '请输入令牌。',
  'github.connection.errorTokenRejected': 'GitHub 拒绝了此令牌。请确认已完整复制，且令牌未过期。',
  'github.connection.errorTokenCheckFailed': '无法向 GitHub 检查此令牌，请重试。',
  'github.connection.errorVaultUnavailable': '此节点的密钥保险库不可用，无法保存令牌。',
  'github.connection.loadFailed': '无法读取此节点的 GitHub 连接。',
  'github.connection.connectFailed': '无法连接 GitHub。',
  'github.connection.disconnectFailed': '无法断开 GitHub。',
} satisfies TranslationCatalog;

export default githubConnectionMessages;
