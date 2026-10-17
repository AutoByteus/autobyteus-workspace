import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'agentPackageDefinitions.issue.usingLastGood': '正在使用上一个可用版本',
  'agentPackageDefinitions.issue.sourceMissing': '包文件夹不可用',
  'agentPackageDefinitions.issue.membersUnavailable': '部分成员无法加载',
  'agentPackageDefinitions.issue.count': '（{{count}}）',
  'agentPackageDefinitions.issue.detailsLabel': '查看问题',
  'agentPackageDefinitions.issue.lastGoodExplanation': '无法读取定义文件，因此在修复该文件之前继续使用上一个可用版本。',
  'agentPackageDefinitions.issue.membersUnavailableExplanation': '以下部分定义无法读取，且没有可回退的可用版本，因此在文件修复之前无法使用。',
  'agentPackageDefinitions.issue.noWorkingVersion': '没有可用版本',
  'agentPackageDefinitions.issue.sourceMissingExplanation': '无法找到或读取包文件夹，因此在其恢复可用之前继续使用上次加载的版本。',
  'agentPackageDefinitions.issue.file': '文件：{{path}}',
  'agentPackageDefinitions.issue.reason': '原因：{{reason}}',
  'agentPackageDefinitions.notice.agentsTitle': '有 {{count}} 个智能体定义无法加载',
  'agentPackageDefinitions.notice.teamsTitle': '有 {{count}} 个团队定义不可用',
  'agentPackageDefinitions.notice.orgsTitle': '有 {{count}} 个组织定义不可用',
  'agentPackageDefinitions.notice.dependency': '依赖：{{chain}}',
  'agentPackageDefinitions.package.watching': '自动刷新中',
  'agentPackageDefinitions.package.rootMissing': '找不到文件夹',
  'agentPackageDefinitions.package.unavailable': '未自动刷新',
} satisfies TranslationCatalog;

export default messages;
