/** Which runtimes' models are exhausted now (autobyteus-646 C-3), as launch checks read it. */
export type RuntimeExhaustionPort = Readonly<{
  isExhausted(runtimeKind: string, llmModelIdentifier: string): Readonly<{ until: string }> | null;
}>;

/**
 * The delegation's layers after an exhausted skip (R-2, R-17): this agent's history pick among what is usable now, then,
 * only `withNodeFallback` (the inherited launch can't run either), the node fallback; null when none. `chosenBy` is the
 * launch origin it records (R-8, R-19).
 */
export type FallbackLaunchPort = Readonly<{
  fallbackLaunch(agentDefinitionId: string, withNodeFallback: boolean): Promise<Readonly<{
    runtimeKind: string; llmModelIdentifier: string; chosenBy: "agent_history" | "node_fallback";
  }> | null>;
}>;

let exhaustion: RuntimeExhaustionPort | null = null;
let fallback: FallbackLaunchPort | null = null;

const binding = <T>(set: (value: T | null) => void, get: () => T | null, value: T, what: string): Readonly<{ close(): void }> => {
  if (get()) throw new Error(`${what} is already configured.`);
  set(value);
  return Object.freeze({ close: () => { if (get() === value) set(null); } });
};

/** Binds the node's exhaustion view until `close()` (the server composition). */
export const configureRuntimeExhaustion = (port: RuntimeExhaustionPort): Readonly<{ close(): void }> =>
  binding((value) => { exhaustion = value; }, () => exhaustion, port, "Runtime exhaustion");

/** Binds the node's fallback launch until `close()` (the server composition). */
export const configureFallbackLaunch = (port: FallbackLaunchPort): Readonly<{ close(): void }> =>
  binding((value) => { fallback = value; }, () => fallback, port, "The fallback launch");

/**
 * The process's exhaustion view as delegation's launch check reads it: nothing is exhausted on a server that does not
 * compose the run event hub. Collaboration admission is built before the hub's listeners, so it asks on each check.
 */
export const PROCESS_RUNTIME_EXHAUSTION: RuntimeExhaustionPort = Object.freeze({
  isExhausted: (runtimeKind: string, llmModelIdentifier: string) => exhaustion?.isExhausted(runtimeKind, llmModelIdentifier) ?? null,
});

/** The process's fallback launch; none on a server that does not compose the usage-limit switch. */
export const PROCESS_FALLBACK_LAUNCH: FallbackLaunchPort = Object.freeze({
  fallbackLaunch: (agentDefinitionId: string, withNodeFallback: boolean) =>
    fallback?.fallbackLaunch(agentDefinitionId, withNodeFallback) ?? Promise.resolve(null),
});
