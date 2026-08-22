export class CurrentModelSelectionRequiredError extends Error {
  readonly code = 'CURRENT_MODEL_SELECTION_REQUIRED' as const;
  readonly modelIdentifier: string;

  constructor(modelIdentifier: string) {
    super('The selected model is no longer supported. Select a current supported model.');
    this.name = 'CurrentModelSelectionRequiredError';
    this.modelIdentifier = modelIdentifier;
  }
}
