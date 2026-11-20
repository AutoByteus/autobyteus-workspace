import type { TranslationCatalog } from '../../runtime/types';

/** 软件包和内置定义的个人设置（package-personal-settings，设计 "UI (stage 1)"）。 */
const messages = {
  'personalSettings.note.agent.package': '工具、技能、头像和运行时/模型是你在这台电脑上的个人设置。智能体包更新会保留它们。',
  'personalSettings.note.agent.builtIn': '工具、技能、头像和运行时/模型是你在这台电脑上的个人设置。重启和 AutoByteus 更新会保留它们。',
  'personalSettings.note.collaboration.package': '头像和运行时/模型是你在这台电脑上的个人设置。智能体包更新会保留它们。',
  'personalSettings.mark': '个人',
  'personalSettings.reset.package': '恢复为智能体包的设置',
  'personalSettings.reset.builtIn': '恢复为内置设置',
  'personalSettings.reset.failed': '无法恢复该设置：{{error}}',
  'personalSettings.orgLaunchConfig': '默认运行时/模型：{{runtime}} · {{model}}',
} satisfies TranslationCatalog;

export default messages;
