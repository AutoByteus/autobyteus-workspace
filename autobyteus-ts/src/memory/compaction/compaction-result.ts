export class CompactionResult {
  episodicSummary: string;
  semanticFacts: Array<Record<string, unknown>>;

  constructor(episodicSummary: string, semanticFacts: Array<Record<string, unknown>> = []) {
    this.episodicSummary = episodicSummary;
    this.semanticFacts = semanticFacts;
  }
}
