export type AgentDefinitionChangeListener = () => void;

const logger = { warn: (...args: unknown[]) => console.warn(...args) };

/**
 * One signal for every way an agent definition can change: an agent package folder reload (in-app
 * saves, file edits, Reload), an application-owned agent saved in the app, and an application
 * package import, reload or removal. It carries no IDs: definitions are read on demand by ID, so
 * a listener re-reads the definitions it cares about. Listeners are called in order; one that
 * throws is logged and does not stop the others.
 */
export class AgentDefinitionChangeSignal {
  private readonly listeners = new Set<AgentDefinitionChangeListener>();

  notifyChanged(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch (error) {
        logger.warn("AGENT_DEFINITION_CHANGE_LISTENER_FAILED", error);
      }
    }
  }

  /** Adds a listener; the returned function removes it. */
  subscribe(listener: AgentDefinitionChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
