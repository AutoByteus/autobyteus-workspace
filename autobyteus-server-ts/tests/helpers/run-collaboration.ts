import type { DelegationIndex } from "../../src/agent-collaboration/delegation/delegation-index.js";
import { noDelegations } from "./no-delegations.js";

/** A tree for a test whose runs no Task names: no run is delegated, none is in an organization (SR-058, SR-060). */
export const NOT_DELEGATED: Pick<DelegationIndex, "collaborationTreeOf"> = noDelegations();
