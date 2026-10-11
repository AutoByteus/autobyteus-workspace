import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'definitionCatalog.issue.usingLastGood': 'Using last working version',
  'definitionCatalog.issue.sourceMissing': 'Package folder missing',
  'definitionCatalog.issue.detailsLabel': 'Show what is wrong',
  'definitionCatalog.issue.lastGoodExplanation': 'The definition file could not be read, so the last working version stays in use until the file is fixed.',
  'definitionCatalog.issue.sourceMissingExplanation': 'The package folder could not be found, so the last loaded version stays in use until the folder returns.',
  'definitionCatalog.issue.file': 'File: {{path}}',
  'definitionCatalog.issue.reason': 'Reason: {{reason}}',
  'definitionCatalog.notice.agentsTitle': '{{count}} agent definition(s) could not be loaded',
  'definitionCatalog.notice.teamsTitle': '{{count}} team definition(s) are not available',
  'definitionCatalog.notice.orgsTitle': '{{count}} org definition(s) are not available',
  'definitionCatalog.notice.dependency': 'Depends on: {{chain}}',
  'definitionCatalog.package.watching': 'Auto-refreshing',
  'definitionCatalog.package.rootMissing': 'Folder not found',
  'definitionCatalog.package.unavailable': 'Not auto-refreshing',
} satisfies TranslationCatalog;

export default messages;
