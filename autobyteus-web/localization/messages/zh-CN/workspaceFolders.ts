import type { TranslationCatalog } from '../../runtime/types';

// workspace-tree-vs-chooser: 运行区的视图菜单，以及聊天文件夹选择器中的“移除”。
const workspaceFolderMessages = {
  'workspaceFolders.menuTitle': '视图',
  'workspaceFolders.viewLabel': '视图',
  'workspaceFolders.viewRuns': '运行',
  'workspaceFolders.emptyTitle': '还没有文件夹有运行',
  'workspaceFolders.emptyHelp': '文件夹有运行后才会列在这里。在“聊天”中开始一个运行并选择它的文件夹即可。',
  'workspaceFolders.projectsNoRunsTitle': '还没有项目有运行',
  'workspaceFolders.projectsNoRunsHelp': '项目有运行后才会列在这里。你的项目都在“项目”页面。',
  'workspaceFolders.chooserRemove': '移除 {{name}}',
  'workspaceFolders.removeTitle': '移除文件夹',
  'workspaceFolders.removeQuestion': '移除 {{name}}？',
  'workspaceFolders.removeBody': '选择文件夹时将不再提供它，它的运行也不会列在左侧面板中。文件、记忆、产物和运行历史不会被删除。重新添加该文件夹即可再次使用。',
  'workspaceFolders.removeConfirm': '移除',
  'workspaceFolders.removedToast': '{{name}} 已移除。文件、记忆和运行历史未被删除。',
} satisfies TranslationCatalog;

export default workspaceFolderMessages;
