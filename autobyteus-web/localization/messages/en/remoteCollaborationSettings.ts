import type { TranslationCatalog } from '../../runtime/types';

const remoteCollaborationSettingsMessages = {
  'settings.components.settings.NodeManager.tabs.remoteCollaboration': 'Remote Collaboration',
  'settings.components.settings.RemoteCollaboration.title': 'Remote Collaboration',
  'settings.components.settings.RemoteCollaboration.description': 'Let agents on this node delegate to agents on registered peer nodes, and let peers start this node\'s shared agents. For a trusted private network only: peers are not authenticated, and no credential is shared.',
  'settings.components.settings.RemoteCollaboration.status.loading': 'Loading',
  'settings.components.settings.RemoteCollaboration.status.error': 'Error',
  'settings.components.settings.RemoteCollaboration.status.enabled': 'On',
  'settings.components.settings.RemoteCollaboration.status.disabled': 'Off',
  'settings.components.settings.RemoteCollaboration.status.saving': 'Saving...',
  'settings.components.settings.RemoteCollaboration.source.defaultDisabled': 'Off by default. While it is off, this node sends nothing to other nodes and refuses their requests.',
  'settings.components.settings.RemoteCollaboration.save': 'Save',
  'settings.components.settings.RemoteCollaboration.cancel': 'Cancel',
  'settings.components.settings.RemoteCollaboration.peers.title': 'Peer nodes',
  'settings.components.settings.RemoteCollaboration.peers.description': 'Nodes this node collaborates with. Register each node on the other one too. Agents name a peer by the name you give it here.',
  'settings.components.settings.RemoteCollaboration.peers.urlLabel': 'Node URL',
  'settings.components.settings.RemoteCollaboration.peers.urlPlaceholder': 'http://192.168.1.20:29695',
  'settings.components.settings.RemoteCollaboration.peers.nameLabel': 'Name',
  'settings.components.settings.RemoteCollaboration.peers.namePlaceholder': 'docker',
  'settings.components.settings.RemoteCollaboration.peers.add': 'Add peer',
  'settings.components.settings.RemoteCollaboration.peers.rename': 'Rename',
  'settings.components.settings.RemoteCollaboration.peers.remove': 'Remove',
  'settings.components.settings.RemoteCollaboration.peers.empty': 'No peer nodes yet.',
  'settings.components.settings.RemoteCollaboration.peers.switchHint': 'Turn Remote Collaboration on to add a peer: adding one contacts the node to check who it is.',
  'settings.components.settings.RemoteCollaboration.availability.title': 'Agents and Agent Teams available to peers',
  'settings.components.settings.RemoteCollaboration.availability.note': 'With Remote Collaboration on, registered peer nodes can start any shared agent or Agent Team of this node. Each agent runs with its own default runtime and model (a team member without one uses its team\'s default), in this node\'s temp workspace, and every agent of the run has its tool calls auto-approved. An agent whose default runtime signs in with this node\'s local login (for example Codex or Claude) uses that login for every registered peer. An agent, or a team member, with no default runtime and model is refused.',
} satisfies TranslationCatalog;

export default remoteCollaborationSettingsMessages;
