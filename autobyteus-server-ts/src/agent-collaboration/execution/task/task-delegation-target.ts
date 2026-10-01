import { CollaborationContractError } from "../../domain/collaboration-contract-error.js";
import type { DelegateTaskResult } from "./task-delegation-command.js";

/**
 * Resolves a delegation target, then delegates. A target that is neither mounted nor a
 * collaborator of the run starts nothing and returns its reason (no run ID) instead of
 * failing the tool call; every other resolution error still throws.
 */
export const delegateToResolvedTarget = async <TPlacement>(
  resolve: () => TPlacement | Promise<TPlacement>,
  delegate: (placement: TPlacement) => Promise<DelegateTaskResult>,
): Promise<DelegateTaskResult> => {
  let placement: TPlacement;
  try {
    placement = await resolve();
  } catch (error) {
    if (error instanceof CollaborationContractError && error.code === "COLLABORATION_TARGET_NOT_FOUND") {
      return { target_agent_run_id: null, message: error.message };
    }
    throw error;
  }
  return delegate(placement);
};
