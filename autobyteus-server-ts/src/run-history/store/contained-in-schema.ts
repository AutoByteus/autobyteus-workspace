import type { ContainedIn } from "../../agent-collaboration/domain/contained-in.js";
import { canonicalNonRootAddress, objectRecord, requireKeys, requiredString } from "./run-execution-tree-shared-record-schemas.js";

/**
 * A unit run's `containedIn` (its Org container and its address there), read tolerantly (unknown keys ignored) and
 * written exactly. A malformed section makes the run's file unreadable, so the run is left out with a warning naming it
 * and its file is never rewritten (DESIGN.md rule 7).
 */
export const parseContainedIn = (value: unknown, label = "containedIn"): ContainedIn => {
  const section = objectRecord(value, label);
  requireKeys(section, ["orgRunId", "address"], label);
  return Object.freeze({
    orgRunId: requiredString(section.orgRunId, `${label}.orgRunId`),
    address: canonicalNonRootAddress(section.address, `${label}.address`),
  });
};
