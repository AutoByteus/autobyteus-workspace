/**
 * A refused or failed extension request, with the code its transport answers. The action route's codes are those of
 * design-spec.md (Data Contract, action call); the lifecycle codes are what the GraphQL mutations refuse with.
 */
export type ExtensionErrorCode =
  // action route
  | "EXTENSION_NOT_INSTALLED"
  | "EXTENSION_OFF"
  | "EXTENSION_BUSY"
  | "UNKNOWN_ACTION"
  | "RECORDING_TOO_LONG"
  | "ACTION_FAILED"
  // lifecycle
  | "EXTENSION_NOT_OFFERED"
  | "EXTENSION_NOT_AVAILABLE"
  | "EXTENSION_CATALOG_NOT_VERIFIED"
  | "EXTENSION_ALREADY_INSTALLED"
  | "EXTENSION_NO_UPDATE";

export class ExtensionError extends Error {
  constructor(readonly code: ExtensionErrorCode, message: string) {
    super(message);
  }
}

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
