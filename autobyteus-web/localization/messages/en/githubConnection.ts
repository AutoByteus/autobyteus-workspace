import type { TranslationCatalog } from '../../runtime/types';

/** The GitHub connection line in the import areas (Agent Packages, Skill sources). */
const githubConnectionMessages = {
  'github.connection.notConnected': 'GitHub · not connected — needed only for private repositories.',
  'github.connection.connectedAs': 'GitHub · connected as @{{login}}',
  'github.connection.usage': 'Used for private repositories here and by agents that have the GitHub integration.',
  'github.connection.connect': 'Connect GitHub',
  'github.connection.replace': 'Replace token',
  'github.connection.disconnect': 'Disconnect',
  'github.connection.disconnecting': 'Disconnecting…',
  'github.connection.tokenLabel': 'GitHub token',
  'github.connection.tokenPlaceholder': 'Paste a GitHub token',
  'github.connection.save': 'Save',
  'github.connection.checking': 'Checking…',
  'github.connection.cancel': 'Cancel',
  'github.connection.createToken': 'Create a fine-grained token on GitHub ↗',
  'github.connection.tokenHelp': '— choose only the repositories you need; Repository permissions → Contents: Read-only. Saved in this node\'s vault, never shown again.',
  'github.connection.errorTokenRequired': 'Enter a token.',
  'github.connection.errorTokenRejected': 'GitHub rejected this token. Check that you copied all of it, and that it has not expired.',
  'github.connection.errorTokenCheckFailed': 'The token could not be checked with GitHub. Try again.',
  'github.connection.errorVaultUnavailable': 'This node\'s secret vault is unavailable, so the token can\'t be saved.',
  'github.connection.loadFailed': 'Could not read this node\'s GitHub connection.',
  'github.connection.connectFailed': 'Could not connect GitHub.',
  'github.connection.disconnectFailed': 'Could not disconnect GitHub.',
} satisfies TranslationCatalog;

export default githubConnectionMessages;
