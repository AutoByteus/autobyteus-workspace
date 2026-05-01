export type CompactionSemanticEntry = {
  fact: string;
};

export type CompactionResultInit = {
  criticalIssues?: CompactionSemanticEntry[];
  unresolvedWork?: CompactionSemanticEntry[];
  durableFacts?: CompactionSemanticEntry[];
  userPreferences?: CompactionSemanticEntry[];
  importantArtifacts?: CompactionSemanticEntry[];
};

export class CompactionResult {
  episodicSummary: string;
  criticalIssues: CompactionSemanticEntry[];
  unresolvedWork: CompactionSemanticEntry[];
  durableFacts: CompactionSemanticEntry[];
  userPreferences: CompactionSemanticEntry[];
  importantArtifacts: CompactionSemanticEntry[];

  constructor(episodicSummary: string, init: CompactionResultInit = {}) {
    this.episodicSummary = episodicSummary;
    this.criticalIssues = init.criticalIssues ?? [];
    this.unresolvedWork = init.unresolvedWork ?? [];
    this.durableFacts = init.durableFacts ?? [];
    this.userPreferences = init.userPreferences ?? [];
    this.importantArtifacts = init.importantArtifacts ?? [];
  }
}
