import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'definitionCatalog.issue.usingLastGood': '正在使用上一个可用版本',
  'definitionCatalog.issue.sourceMissing': '包文件夹缺失',
  'definitionCatalog.issue.detailsLabel': '查看问题',
  'definitionCatalog.issue.lastGoodExplanation': '无法读取定义文件，因此在修复该文件之前继续使用上一个可用版本。',
  'definitionCatalog.issue.sourceMissingExplanation': '找不到包文件夹，因此在该文件夹恢复之前继续使用上次加载的版本。',
  'definitionCatalog.issue.file': '文件：{{path}}',
  'definitionCatalog.issue.reason': '原因：{{reason}}',
  'definitionCatalog.notice.agentsTitle': '有 {{count}} 个智能体定义无法加载',
  'definitionCatalog.notice.teamsTitle': '有 {{count}} 个团队定义不可用',
  'definitionCatalog.notice.orgsTitle': '有 {{count}} 个组织定义不可用',
  'definitionCatalog.notice.dependency': '依赖：{{chain}}',
  'definitionCatalog.package.watching': '自动刷新中',
  'definitionCatalog.package.rootMissing': '找不到文件夹',
  'definitionCatalog.package.unavailable': '未自动刷新',
} satisfies TranslationCatalog;

export default messages;
