import type {
  ApplicationExecutionResourceOverride,
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSlotDeclaration,
  ApplicationLaunchOverride,
  ApplicationResolvedResourceLaunchBaseline,
} from "@autobyteus/application-sdk-contracts";
import type {
  StoredApplicationLaunchOverride,
  StoredJsonCell,
} from "../../application-orchestration/stores/application-launch-override-store.js";
import { ApplicationLaunchOverrideValidationError } from "./application-launch-override-normalizer.js";

export const readParsedStoredJsonCell = (cell: StoredJsonCell): unknown | null =>
  cell.state === "parsed" ? cell.value : null;

export const parseStoredExecutionResourceRef = (
  cell: StoredJsonCell,
): ApplicationExecutionResourceRef | null => {
  if (cell.state === "absent") return null;
  if (cell.state === "malformed") {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      "Saved execution resource reference contains malformed JSON.",
    );
  }
  const value = cell.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      "Saved execution resource reference must be an object.",
    );
  }
  const record = value as Record<string, unknown>;
  const source = record.source;
  const kind = record.kind;
  const allowedKeys = source === "bundle"
    ? new Set(["source", "kind", "localId"])
    : new Set(["source", "kind", "definitionId"]);
  if (
    (source !== "bundle" && source !== "shared")
    || (kind !== "AGENT" && kind !== "AGENT_TEAM")
    || Object.keys(record).some((key) => !allowedKeys.has(key))
  ) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      "Saved execution resource reference is not a supported current reference.",
    );
  }
  if (source === "bundle") {
    const localId = typeof record.localId === "string" ? record.localId.trim() : "";
    if (!localId) {
      throw new ApplicationLaunchOverrideValidationError(
        "SAVED_OVERRIDE_MALFORMED",
        "Saved bundle execution resource reference requires localId.",
      );
    }
    return { source, kind, localId };
  }
  const definitionId = typeof record.definitionId === "string"
    ? record.definitionId.trim()
    : "";
  if (!definitionId) {
    throw new ApplicationLaunchOverrideValidationError(
      "SAVED_OVERRIDE_MALFORMED",
      "Saved shared execution resource reference requires definitionId.",
    );
  }
  return { source, kind, definitionId };
};

export const readRawStoredApplicationLaunchOverride = (input: {
  stored: StoredApplicationLaunchOverride | null;
  slot: ApplicationExecutionResourceSlotDeclaration;
  baseline: ApplicationResolvedResourceLaunchBaseline | null;
}): ApplicationExecutionResourceOverride | null => {
  if (!input.stored) return null;
  let storedRef: ApplicationExecutionResourceRef | null = null;
  try {
    storedRef = parseStoredExecutionResourceRef(input.stored.executionResourceRef);
  } catch {
    return null;
  }
  const ref = storedRef
    ?? input.baseline?.executionResourceRef
    ?? input.slot.defaultExecutionResourceRef
    ?? null;
  if (!ref) return null;
  return {
    slotKey: input.slot.slotKey,
    executionResourceRef: structuredClone(ref),
    launchOverride: input.stored.launchOverride.state === "parsed"
      ? structuredClone(input.stored.launchOverride.value) as ApplicationLaunchOverride
      : null,
  };
};
