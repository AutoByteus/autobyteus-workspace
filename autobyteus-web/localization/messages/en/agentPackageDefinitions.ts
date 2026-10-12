import type { TranslationCatalog } from '../../runtime/types';

const messages = {
  'agentPackageDefinitions.issue.usingLastGood': 'Using last working version',
  'agentPackageDefinitions.issue.sourceMissing': 'Package folder unavailable',
  'agentPackageDefinitions.issue.membersUnavailable': "Some members couldn't be loaded",
  'agentPackageDefinitions.issue.count': '({{count}})',
  'agentPackageDefinitions.issue.detailsLabel': 'Show what is wrong',
  'agentPackageDefinitions.issue.lastGoodExplanation': 'The definition file could not be read, so the last working version stays in use until the file is fixed.',
  'agentPackageDefinitions.issue.membersUnavailableExplanation': 'Some definitions below could not be read and have no working version to fall back on, so they cannot be used until their files are fixed.',
  'agentPackageDefinitions.issue.noWorkingVersion': 'No working version',
  'agentPackageDefinitions.issue.sourceMissingExplanation': 'The package folder could not be found or read, so the last loaded version stays in use until it is available again.',
  'agentPackageDefinitions.issue.file': 'File: {{path}}',
  'agentPackageDefinitions.issue.reason': 'Reason: {{reason}}',
  'agentPackageDefinitions.notice.agentsTitle': '{{count}} agent definition(s) could not be loaded',
  'agentPackageDefinitions.notice.teamsTitle': '{{count}} team definition(s) are not available',
  'agentPackageDefinitions.notice.orgsTitle': '{{count}} org definition(s) are not available',
  'agentPackageDefinitions.notice.dependency': 'Depends on: {{chain}}',
  'agentPackageDefinitions.package.watching': 'Auto-refreshing',
  'agentPackageDefinitions.package.rootMissing': 'Folder not found',
  'agentPackageDefinitions.package.unavailable': 'Not auto-refreshing',
} satisfies TranslationCatalog;

export default messages;
