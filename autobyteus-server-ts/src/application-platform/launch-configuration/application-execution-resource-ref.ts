import type { ApplicationExecutionResourceRef } from "@autobyteus/application-sdk-contracts";

export const isSameApplicationExecutionResourceRef = (
  left: ApplicationExecutionResourceRef | null | undefined,
  right: ApplicationExecutionResourceRef | null | undefined,
): boolean => {
  if (!left || !right || left.source !== right.source || left.kind !== right.kind) return false;
  return left.source === "bundle" && right.source === "bundle"
    ? left.localId === right.localId
    : left.source === "shared" && right.source === "shared"
      ? left.definitionId === right.definitionId
      : false;
};
