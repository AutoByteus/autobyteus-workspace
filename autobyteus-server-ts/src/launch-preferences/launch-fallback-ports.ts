/** Which runtimes' models are exhausted now (autobyteus-646 C-3), as launch checks read it. */
export type RuntimeExhaustionPort = Readonly<{
  isExhausted(runtimeKind: string, llmModelIdentifier: string): Readonly<{ until: string }> | null;
}>;

/** This agent's history pick among what is usable now (C-8, R-2's history layer); null when nothing is. */
export type AgentHistoryLaunchPort = Readonly<{
  historyLaunch(agentDefinitionId: string): Promise<Readonly<{ runtimeKind: string; llmModelIdentifier: string }> | null>;
}>;

let exhaustion: RuntimeExhaustionPort | null = null;
let history: AgentHistoryLaunchPort | null = null;

const binding = <T>(set: (value: T | null) => void, get: () => T | null, value: T, what: string): Readonly<{ close(): void }> => {
  if (get()) throw new Error(`${what} is already configured.`);
  set(value);
  return Object.freeze({ close: () => { if (get() === value) set(null); } });
};

/** Binds the node's exhaustion view until `close()` (the server composition). */
export const configureRuntimeExhaustion = (port: RuntimeExhaustionPort): Readonly<{ close(): void }> =>
  binding((value) => { exhaustion = value; }, () => exhaustion, port, "Runtime exhaustion");

/** Binds the node's agent history pick until `close()` (the server composition). */
export const configureAgentHistoryLaunch = (port: AgentHistoryLaunchPort): Readonly<{ close(): void }> =>
  binding((value) => { history = value; }, () => history, port, "The agent history launch");

/**
 * The process's exhaustion view as delegation's launch check reads it: nothing is exhausted on a server that does not
 * compose the run event hub. Collaboration admission is built before the hub's listeners, so it asks on each check.
 */
export const PROCESS_RUNTIME_EXHAUSTION: RuntimeExhaustionPort = Object.freeze({
  isExhausted: (runtimeKind: string, llmModelIdentifier: string) => exhaustion?.isExhausted(runtimeKind, llmModelIdentifier) ?? null,
});

/** The process's agent history pick; none on a server that does not compose the usage-limit switch. */
export const PROCESS_AGENT_HISTORY_LAUNCH: AgentHistoryLaunchPort = Object.freeze({
  historyLaunch: (agentDefinitionId: string) => history?.historyLaunch(agentDefinitionId) ?? Promise.resolve(null),
});
