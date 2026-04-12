export class CompactionPreparationError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'CompactionPreparationError';
    this.cause = cause;
  }
}
