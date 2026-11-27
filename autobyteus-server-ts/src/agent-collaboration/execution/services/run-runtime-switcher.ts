import type { RootExecutionIdentity } from "../domain/root-execution-identity.js";
import type { AgentRuntimeSwitchOutcome, AgentRuntimeSwitchRequest } from "../domain/agent-runtime-switch-request.js";
import type { ActiveCollaborationRootDirectory } from "./active-collaboration-root-directory.js";

/** A live root that can switch one of its agents' runtime: an Agent root (its own agent) or a Team root (a member). */
export type RuntimeSwitchableRoot = Readonly<{
  switchAgentRuntime(agentRunId: string, request: AgentRuntimeSwitchRequest): Promise<AgentRuntimeSwitchOutcome>;
}>;

/**
 * The switch action (autobyteus-646 R-1): finds the live root holding the agent (`placeOf`: a standalone, delegated or
 * Org-unit Agent root, or a Team root; an Org container claims no unit agent, units are roots of their own) and asks it
 * to switch that agent, inside the root's own gate. A run no live root holds is not switched.
 */
export class RunRuntimeSwitcher {
  constructor(private readonly dependencies: Readonly<{
    roots: Pick<ActiveCollaborationRootDirectory, "placeOf">;
    /** The live root object of a root identity, when it can switch an agent's runtime; null otherwise. */
    liveRoot(root: RootExecutionIdentity): RuntimeSwitchableRoot | null;
  }>) {}

  async switchAgentRuntime(agentRunId: string, request: AgentRuntimeSwitchRequest): Promise<AgentRuntimeSwitchOutcome> {
    const placed = this.dependencies.roots.placeOf(agentRunId);
    if (!placed) return { kind: "failed", reason: "no live run on this node holds the agent" };
    const root = this.dependencies.liveRoot(placed.root);
    if (!root) return { kind: "failed", reason: `its ${placed.root.rootSubjectKind} root cannot switch an agent's runtime` };
    return root.switchAgentRuntime(agentRunId, request);
  }
}
