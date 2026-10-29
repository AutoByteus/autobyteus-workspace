import type { TranslationCatalog } from '../../runtime/types';

// remote-runs-in-tree: runs another node runs for this node's delegation. The English strings are
// normative UI copy (tickets/done/remote-runs-in-tree/ui-ux-spec.md).
const remoteRunsMessages = {
  'remote.chip.label': 'Runs on {{node}}',
  'remote.row.accessible': 'on {{node}}',
  'remote.row.unreachable': "Couldn't reach {{node}}.",
  'remote.row.checking': 'Checking {{node}}…',
  'remote.row.retry': 'Retry',
  'remote.row.retryAria': 'Retry reaching {{node}}',
  'remote.row.stopFailed': "Couldn't stop it: {{node}} isn't reachable.",
  'remote.view.title': "{{node}} isn't reachable",
  'remote.view.detail': "This run's conversation can't be loaded right now. Your other runs work. Retry when the node is back.",
  'remote.view.sendFailed': "Not sent: {{node}} isn't reachable.",
  'remote.panel.title': 'On {{node}}',
  'remote.panel.files': "The files of this run are on {{node}}. Open it in that node's window to see them.",
  'remote.panel.terminal': "The terminal of this run is on {{node}}. Open it in that node's window to use it.",
  'remote.panel.artifacts': "The files this run wrote are on {{node}}. Open it in that node's window to see them.",
  'remote.panel.vnc': "The screen of this run is on {{node}}. Open it in that node's window to see it.",
  'remote.composer.placeholder': 'Message {{agent}} on {{node}}…',
  'remote.filePath': "That file is on {{node}}: open the run in that node's window to see it.",
} satisfies TranslationCatalog;

export default remoteRunsMessages;
