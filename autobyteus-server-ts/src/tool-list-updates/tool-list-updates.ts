import type { AgentDefinitionChangeSignal } from "../agent-definition/services/agent-definition-change-signal.js";
import type { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { SeenToolNamesStore } from "./providers/seen-tool-names-store.js";
import { ToolListUpdateService } from "./services/tool-list-update-service.js";

/** The tool list update subsystem of one `AgentRunManager`. */
export type ToolListUpdates = Readonly<{
  /** The input-preface port and the run lifecycle observer for the run manager. */
  service: ToolListUpdateService;
  close(): Promise<void>;
}>;

/**
 * Builds the subsystem: on every agent definition change, each tracked run is given the tools of
 * its own definition (re-read by ID), and told what changed.
 */
export const createToolListUpdates = (input: Readonly<{
  agentDefinitionService: Pick<AgentDefinitionService, "getAgentDefinitionById">;
  definitionChanges: Pick<AgentDefinitionChangeSignal, "subscribe">;
  seenToolNamesRetryDelaysMs?: readonly number[];
}>): ToolListUpdates => {
  const service = new ToolListUpdateService({
    agentDefinitionService: input.agentDefinitionService,
    store: new SeenToolNamesStore(),
    seenToolNamesRetryDelaysMs: input.seenToolNamesRetryDelaysMs,
  });
  const unsubscribe = input.definitionChanges.subscribe(() => { void service.onDefinitionsChanged(); });
  let closing: Promise<void> | null = null;
  return Object.freeze({
    service,
    close: () => {
      // No new passes, then the service waits for passes and record writes in progress.
      closing ??= (async () => {
        unsubscribe();
        await service.close();
      })();
      return closing;
    },
  });
};
