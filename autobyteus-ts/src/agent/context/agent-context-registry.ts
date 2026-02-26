import { Singleton } from '../../utils/singleton.js';
import type { AgentContextLike } from './agent-context-like.js';

export class AgentContextRegistry extends Singleton {
  protected static instance?: AgentContextRegistry;

  private contexts: Map<string, WeakRef<AgentContextLike>> = new Map();

  constructor() {
    super();
    if (AgentContextRegistry.instance) {
      return AgentContextRegistry.instance;
    }
    AgentContextRegistry.instance = this;
  }

  registerContext(context: AgentContextLike): void {
    const agentId = context.agentId;
    const existingRef = this.contexts.get(agentId);
    const existing = existingRef?.deref();
    if (existing) {
      console.warn(`AgentContext for agent_id '${agentId}' is already registered. Overwriting.`);
    }
    this.contexts.set(agentId, new WeakRef(context));
    console.log(
      `Registered AgentContext for agent_id '${agentId}'. Total registered contexts: ${this.contexts.size}`
    );
  }

  unregisterContext(agentId: string): void {
    if (this.contexts.has(agentId)) {
      this.contexts.delete(agentId);
      console.log(`Unregistered AgentContext for agent_id '${agentId}'.`);
      return;
    }
    console.warn(`Attempted to unregister a non-existent AgentContext for agent_id '${agentId}'.`);
  }

  getContext(agentId: string): AgentContextLike | undefined {
    const ref = this.contexts.get(agentId);
    if (!ref) {
      return undefined;
    }
    const context = ref.deref();
    if (context) {
      return context;
    }
    console.debug(`Cleaning up dead weak reference for agent_id '${agentId}'.`);
    this.contexts.delete(agentId);
    return undefined;
  }
}

export const defaultAgentContextRegistry = AgentContextRegistry.getInstance();
