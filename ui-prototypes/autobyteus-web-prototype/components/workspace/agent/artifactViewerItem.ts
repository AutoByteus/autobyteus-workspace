import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore';

export type ArtifactViewerItem = AgentArtifactViewerItem;

export interface AgentArtifactViewerItem extends RunFileChangeArtifact {
  kind: 'agent';
  itemId: string;
  artifact: RunFileChangeArtifact;
}

export const toAgentArtifactViewerItem = (
  artifact: RunFileChangeArtifact,
): AgentArtifactViewerItem => ({
  ...artifact,
  kind: 'agent',
  itemId: `agent:${artifact.id}`,
  artifact,
});
