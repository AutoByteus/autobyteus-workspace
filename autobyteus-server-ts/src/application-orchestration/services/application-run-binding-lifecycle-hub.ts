export type ApplicationRunBindingTerminalStatus = "TERMINATED" | "ORPHANED";

export type ApplicationRunBindingTerminalSignal = {
  applicationId: string;
  bindingId: string;
  status: ApplicationRunBindingTerminalStatus;
};

type TerminalListener = (signal: ApplicationRunBindingTerminalSignal) => void;

const keyFor = (applicationId: string, bindingId: string): string =>
  `${applicationId}\u0000${bindingId}`;

export class ApplicationRunBindingLifecycleHub {
  private static instance: ApplicationRunBindingLifecycleHub | null = null;

  static getInstance(): ApplicationRunBindingLifecycleHub {
    if (!this.instance) this.instance = new ApplicationRunBindingLifecycleHub();
    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
    cachedApplicationRunBindingLifecycleHub = null;
  }

  private readonly listeners = new Map<string, Set<TerminalListener>>();

  observeTerminal(
    applicationId: string,
    bindingId: string,
    listener: TerminalListener,
  ): () => void {
    const key = keyFor(applicationId, bindingId);
    const listeners = this.listeners.get(key) ?? new Set<TerminalListener>();
    listeners.add(listener);
    this.listeners.set(key, listeners);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(key);
    };
  }

  publishTerminal(signal: ApplicationRunBindingTerminalSignal): void {
    const key = keyFor(signal.applicationId, signal.bindingId);
    const listeners = this.listeners.get(key);
    if (!listeners) return;
    this.listeners.delete(key);
    for (const listener of listeners) {
      listeners.delete(listener);
      try { listener(signal); } catch { /* lifecycle fan-out is no-throw */ }
    }
  }
}

let cachedApplicationRunBindingLifecycleHub: ApplicationRunBindingLifecycleHub | null = null;

export const getApplicationRunBindingLifecycleHub = (): ApplicationRunBindingLifecycleHub => {
  if (!cachedApplicationRunBindingLifecycleHub) {
    cachedApplicationRunBindingLifecycleHub = ApplicationRunBindingLifecycleHub.getInstance();
  }
  return cachedApplicationRunBindingLifecycleHub;
};
