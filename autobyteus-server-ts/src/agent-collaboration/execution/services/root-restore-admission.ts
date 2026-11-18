import { createServerLogger } from "../../../logging/server-app-logger.js";
import { storedFileDamageOf } from "../../../run-history/store/stored-file-damaged-error.js";
import { TokenUsageCapabilityUnavailableError, type TokenUsageCapability } from "../../../token-usage/providers/token-usage-capability.js";

const logger = createServerLogger("agent-collaboration.root-restore");

/** A stopped team or org root that may not be restored: base's reason code and text, as its restore answered them. */
export type RootRestoreRefusal = Readonly<{ accepted: false; code: string; message: string }>;

/**
 * Base's restore admission of a stored team or org root (autobyteus-461 SR-078, CR-461-069), asked before its stored file
 * is read: the token-usage migration of existing runs, then the package catalog. Its codes and texts are base's
 * (`TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`, `…_STATE_PACKAGE_NOT_CATALOGED`).
 */
export const rootRestoreRefusal = async (input: Readonly<{
  tokenUsage: Pick<TokenUsageCapability, "assertExistingRunRestoreReady">;
  isCataloged(): Promise<boolean>;
  notCataloged: Readonly<{ code: string; message: string }>;
}>): Promise<RootRestoreRefusal | null> => {
  try {
    input.tokenUsage.assertExistingRunRestoreReady();
  } catch (error) {
    if (error instanceof TokenUsageCapabilityUnavailableError) return Object.freeze({ accepted: false as const, code: error.code, message: error.message });
    throw error;
  }
  return await input.isCataloged() ? null : Object.freeze({ accepted: false as const, ...input.notCataloged });
};

/**
 * A root admitted but whose stored state cannot be read or restored (CR-461-069, rule 7): answered as a run that cannot be
 * restored, with the reason in plain words. A damaged stored file is named, with its line and what the user can do
 * (CR-461-083); the detail (a schema or parse error) goes to the log only.
 */
export const unrestorableRoot = (input: Readonly<{ kind: "Team run" | "AgentOrg run"; code: string; runId: string; error: unknown }>): RootRestoreRefusal => {
  logger.warn("ROOT_NOT_RESTORABLE", { kind: input.kind, runId: input.runId, detail: input.error instanceof Error ? input.error.message : String(input.error) });
  const damaged = storedFileDamageOf(input.error);
  const reason = damaged
    ? `its ${damaged.what} (${damaged.fileName}) is damaged${damaged.line === null ? "" : ` at line ${damaged.line}`}. Its files were left unchanged; start a new run, or repair or remove that file.`
    : "its saved state cannot be read. Its files were left unchanged.";
  return Object.freeze({ accepted: false as const, code: input.code, message: `${input.kind} '${input.runId}' cannot be restored: ${reason}` });
};
