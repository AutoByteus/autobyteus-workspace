/** An upload over the limit of its type; `maxBytes` is the limit that applied. */
export class ContextFileTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super("Uploaded file is too large.");
    this.name = "ContextFileTooLargeError";
  }
}

/** An upload whose type the app does not accept as a context file. */
export class UnsupportedContextFileTypeError extends Error {
  constructor(readonly mimeType: string) {
    super(`Unsupported file type: ${mimeType}`);
    this.name = "UnsupportedContextFileTypeError";
  }
}
