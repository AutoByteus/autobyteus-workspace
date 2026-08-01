export type CompactionSemanticEntry = {
  fact: string;
};

export type CompactionEpisodeEntry = {
  summary: string;
};

export type CompactionResultInit = {
  episodes: CompactionEpisodeEntry[];
  criticalIssues?: CompactionSemanticEntry[];
  unresolvedWork?: CompactionSemanticEntry[];
  durableFacts?: CompactionSemanticEntry[];
  userPreferences?: CompactionSemanticEntry[];
  importantArtifacts?: CompactionSemanticEntry[];
};

export class CompactionResult {
  episodes: CompactionEpisodeEntry[];
  criticalIssues: CompactionSemanticEntry[];
  unresolvedWork: CompactionSemanticEntry[];
  durableFacts: CompactionSemanticEntry[];
  userPreferences: CompactionSemanticEntry[];
  importantArtifacts: CompactionSemanticEntry[];

  constructor(init: CompactionResultInit) {
    this.episodes = init.episodes;
    this.criticalIssues = init.criticalIssues ?? [];
    this.unresolvedWork = init.unresolvedWork ?? [];
    this.durableFacts = init.durableFacts ?? [];
    this.userPreferences = init.userPreferences ?? [];
    this.importantArtifacts = init.importantArtifacts ?? [];
  }
}
