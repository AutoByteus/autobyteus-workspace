import fs from "node:fs/promises";
import path from "node:path";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { InternalWorkspaces } from "../../workspaces/internal-workspaces.js";
import { MODEL_ROUTER_AGENT_DEFINITION_ID } from "../../built-in-agents/built-in-agent-registry.js";
import type { ModelRouterLaunch, ModelRouterLlmConfig } from "../model-routing-settings.js";
import type { KnowledgeText } from "./routing-request-text.js";

/** Statuses in which the agent's run is busy with a turn (or starting one). */
const BUSY_STATUSES: ReadonlySet<string> = new Set(["running", "initializing"]);

/** The router's own durable memory in its workspace (REQ-007). */
export const KNOWLEDGE_FILE_NAME = "knowledge.md";
/** A routing request carries at most this much of the knowledge file (RSK-008). */
export const KNOWLEDGE_TEXT_LIMIT_BYTES = 16 * 1024;

/** `<appData>/model-routing/model-router-agent.json`: the node's Model Router agent run and the launch it was created with. */
type StoredAgentRun = Readonly<{ runId: string; runtimeKind: string; llmModelIdentifier: string; llmConfig: ModelRouterLlmConfig | null }>;

/** JSON text of `value` with object keys sorted, so two equal settings objects compare equal whatever their key order. */
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
};

/** Equal model settings: both none, or structurally equal objects (none is not the same as an empty object). */
const sameLlmConfig = (a: ModelRouterLlmConfig | null, b: ModelRouterLlmConfig | null): boolean =>
  a === null || b === null ? a === b : canonicalJson(a) === canonicalJson(b);

/** The stored run was made with exactly `launch`: runtime, model and model settings (autobyteus-313 REQ-003). */
const madeWith = (stored: StoredAgentRun, launch: ModelRouterLaunch): boolean =>
  stored.runtimeKind === launch.runtimeKind && stored.llmModelIdentifier === launch.llmModelIdentifier
    && sameLlmConfig(stored.llmConfig, launch.llmConfig);

/** Whether the agent's run is idle (its turn ended, no other input waiting or running), and when that changes. */
export type ModelRouterRunIdleState = Readonly<{
  isIdle(): boolean;
  onIdleChange(listener: () => void): () => void;
}>;

export type ModelRouterAgentDependencies = Readonly<{
  agentRuns: Pick<AgentRunService, "createAgentRun" | "getAgentRun" | "resolveCommandReadyAgentRun">;
  internalWorkspaces?: Pick<InternalWorkspaces, "pathFor">;
  /** `<appData>/model-routing/`. */
  stateDir: string;
}>;

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/**
 * The node's one Model Router agent (REQ-004, design § Ownership Map): one long-lived run of the built-in internal
 * agent in its own internal workspace, auto-approved with its runtime's normal tools (SR-018), and marked system-owned
 * (`systemRunOwner`, never a collaboration member). It is the only creator of that run, which starts with the stored
 * launch configuration, model settings included (autobyteus-313). A run is reused while its recorded runtime, model
 * and model settings equal the settings and it restores through the platform's command-ready path (which also
 * restores a run whose runtime stopped, e.g. after a failed turn: CR-005); otherwise a new run starts with the current
 * settings (the old one stays in history; `knowledge.md` stays in the workspace). It also tells the routing queue when
 * the run is free for the next request (SR-016).
 */
export class ModelRouterAgent implements ModelRouterRunIdleState {
  private ensuring: Promise<AgentRun> | null = null;
  private watched: Readonly<{ run: AgentRun; unsubscribe: () => void }> | null = null;
  private status: string = "offline";
  private pendingInputs = 0;
  private readonly listeners = new Set<() => void>();
  private readonly internalWorkspaces: Pick<InternalWorkspaces, "pathFor">;

  constructor(private readonly dependencies: ModelRouterAgentDependencies) {
    this.internalWorkspaces = dependencies.internalWorkspaces ?? new InternalWorkspaces();
  }

  /** The agent's internal workspace folder. */
  workspacePath(): string {
    return this.internalWorkspaces.pathFor(MODEL_ROUTER_AGENT_DEFINITION_ID);
  }

  /** The agent's run for `launch`, ready to take input: live, restored, or created (single-flight). */
  ensureRun(launch: ModelRouterLaunch): Promise<AgentRun> {
    if (!this.ensuring) {
      this.ensuring = this.ensureOnce(launch).finally(() => { this.ensuring = null; });
    }
    return this.ensuring;
  }

  /** The stored run's ID when one was recorded (the page opens it); null before the first use. */
  async storedRunId(): Promise<string | null> {
    return (await this.readState())?.runId ?? null;
  }

  /** The current `knowledge.md` (its first 16 KB); null when the agent has not written one yet. */
  async readKnowledge(): Promise<KnowledgeText | null> {
    let content: Buffer;
    try {
      content = await fs.readFile(path.join(this.workspacePath(), KNOWLEDGE_FILE_NAME));
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
    const truncated = content.byteLength > KNOWLEDGE_TEXT_LIMIT_BYTES;
    const text = (truncated ? content.subarray(0, KNOWLEDGE_TEXT_LIMIT_BYTES) : content).toString("utf8").trim();
    return text ? Object.freeze({ text, truncated }) : null;
  }

  /**
   * Free for the next routing request: no input waiting and no turn running. A run whose runtime stopped (a failed turn
   * can leave it so, CR-005) runs nothing either; the next request restores it before it is posted (`ensureRun`).
   */
  isIdle(): boolean {
    if (this.watched === null || this.pendingInputs > 0) return false;
    return !this.watched.run.isActive() || !BUSY_STATUSES.has(this.status);
  }

  onIdleChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private async ensureOnce(launch: ModelRouterLaunch): Promise<AgentRun> {
    const stored = await this.readState();
    if (stored && madeWith(stored, launch)) {
      const restored = await this.dependencies.agentRuns.resolveCommandReadyAgentRun(stored.runId).catch((error: unknown) => {
        console.warn(`Model Routing: the Model Router agent's run ${stored.runId} could not be restored; a new run starts (${error instanceof Error ? error.message : String(error)}).`);
        return null;
      });
      if (restored) return this.watch(restored);
    }
    const workspace = this.workspacePath();
    await fs.mkdir(workspace, { recursive: true });
    const { runId } = await this.dependencies.agentRuns.createAgentRun({
      agentDefinitionId: MODEL_ROUTER_AGENT_DEFINITION_ID,
      workspaceRootPath: workspace,
      llmModelIdentifier: launch.llmModelIdentifier,
      runtimeKind: launch.runtimeKind,
      llmConfig: launch.llmConfig,
      autoExecuteTools: true,
      systemRunOwner: "model_router",
    });
    await this.writeState({ runId, runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig });
    const run = this.dependencies.agentRuns.getAgentRun(runId) ?? await this.dependencies.agentRuns.resolveCommandReadyAgentRun(runId);
    if (!run) throw new Error(`The Model Router agent's run ${runId} did not start.`);
    return this.watch(run);
  }

  /** Follows the run's status and input queue (one run at a time); listeners hear every change. */
  private watch(run: AgentRun): AgentRun {
    if (this.watched?.run === run) return run;
    this.watched?.unsubscribe();
    this.status = run.getStatusSnapshot().status;
    this.pendingInputs = 0;
    const unsubscribe = run.subscribeToEvents((event: AgentRunEvent) => {
      if (event.eventType === AgentRunEventType.AGENT_STATUS && typeof event.payload.status === "string") this.status = event.payload.status;
      else if (event.eventType === AgentRunEventType.AGENT_INPUT_STATE && Array.isArray(event.payload.entries)) this.pendingInputs = event.payload.entries.length;
      else return;
      this.listeners.forEach((listener) => listener());
    });
    this.watched = Object.freeze({ run, unsubscribe });
    return run;
  }

  private get statePath(): string {
    return path.join(this.dependencies.stateDir, "model-router-agent.json");
  }

  /**
   * The stored run, or null when missing or unreadable (a new run starts; DESIGN.md rule 7). A state recorded before
   * model settings were stored has none (REQ-005), so such a run is reused while the router has no model settings.
   */
  private async readState(): Promise<StoredAgentRun | null> {
    try {
      const value = JSON.parse(await fs.readFile(this.statePath, "utf8")) as Partial<Record<keyof StoredAgentRun, unknown>>;
      const llmConfig = typeof value.llmConfig === "object" && value.llmConfig !== null && !Array.isArray(value.llmConfig)
        ? Object.freeze(value.llmConfig as Record<string, unknown>) : null;
      return typeof value.runId === "string" && typeof value.runtimeKind === "string" && typeof value.llmModelIdentifier === "string"
        ? Object.freeze({ runId: value.runId, runtimeKind: value.runtimeKind, llmModelIdentifier: value.llmModelIdentifier, llmConfig })
        : null;
    } catch (error) {
      if (!isMissing(error)) console.warn(`Model Routing: ${this.statePath} could not be read (${String(error)}); a new Model Router agent run starts.`);
      return null;
    }
  }

  private async writeState(state: StoredAgentRun): Promise<void> {
    await fs.mkdir(this.dependencies.stateDir, { recursive: true });
    const temporary = `${this.statePath}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await fs.rename(temporary, this.statePath);
  }
}
