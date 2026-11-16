/**
 * A stored file that could not be read, and where (autobyteus-461 CR-461-083): `message` keeps the reader's own detail
 * (a parser or schema message, for the log); `what`, `fileName` and `line` are the plain reason a user is told.
 */
export class StoredFileDamagedError extends Error {
  constructor(
    readonly what: string,
    readonly fileName: string,
    readonly line: number | null,
    detail: string,
  ) {
    super(detail);
    this.name = "StoredFileDamagedError";
  }
}

/** The damaged stored file behind an error, following its `cause` chain; `null` when it names none. */
export const storedFileDamageOf = (error: unknown): StoredFileDamagedError | null => {
  for (let current: unknown = error, depth = 0; current && depth < 8; current = (current as { cause?: unknown }).cause, depth += 1) {
    if (current instanceof StoredFileDamagedError) return current;
  }
  return null;
};
