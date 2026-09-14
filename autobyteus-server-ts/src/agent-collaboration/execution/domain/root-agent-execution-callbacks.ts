import type { CollaborationAgentPlatformBindingChange } from "./collaboration-agent-platform-binding.js";
import type { CollaborationAgentExecutionEvent } from "./collaboration-agent-execution-event.js";
import type { CollaborationMemberExecutionIdentity } from "./root-execution-identity.js";

export type RootAgentExecutionCallbacks = Readonly<{
  publishAgentEvent(
    member: CollaborationMemberExecutionIdentity,
    event: CollaborationAgentExecutionEvent,
  ): void;
  commitPlatformBindingChange(
    change: CollaborationAgentPlatformBindingChange,
  ): Promise<void>;
}>;
