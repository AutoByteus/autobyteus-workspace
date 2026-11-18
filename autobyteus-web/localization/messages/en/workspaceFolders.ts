import type { TranslationCatalog } from '../../runtime/types';

// workspace-tree-vs-chooser: the run section's view menu, and "Remove" in the chat's folder chooser.
// The English strings are normative UI copy (the Product spec of workspace-tree-vs-chooser, VIS-001…VIS-017).
const workspaceFolderMessages = {
  'workspaceFolders.menuTitle': 'View',
  'workspaceFolders.viewLabel': 'View',
  'workspaceFolders.viewRuns': 'Runs',
  'workspaceFolders.emptyTitle': 'No runs in any folder yet',
  'workspaceFolders.emptyHelp': 'A folder is listed here once it has a run. Start one with Chat and choose its folder.',
  'workspaceFolders.projectsNoRunsTitle': 'No Project has a run yet',
  'workspaceFolders.projectsNoRunsHelp': 'A Project is listed here once it has a run. Your Projects are on the Projects page.',
  'workspaceFolders.chooserRemove': 'Remove {{name}}',
  'workspaceFolders.removeTitle': 'Remove folder',
  'workspaceFolders.removeQuestion': 'Remove {{name}}?',
  'workspaceFolders.removeBody': 'It will no longer be offered when you choose a folder, and its runs will not be listed in the left panel. Files, memories, artifacts, and run history are not deleted. Add the folder again to use it.',
  'workspaceFolders.removeConfirm': 'Remove',
  'workspaceFolders.removedToast': '{{name}} removed. Files, memories, and run history were not deleted.',
} satisfies TranslationCatalog;

export default workspaceFolderMessages;
