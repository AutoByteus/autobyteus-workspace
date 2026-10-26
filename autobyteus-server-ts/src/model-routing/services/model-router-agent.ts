import fs from "node:fs/promises";
import path from "node:path";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { InternalWorkspaces } from "../../workspaces/internal-workspaces.js";
import { MODEL_ROUTER_AGENT_DEFINITION_ID } from "../../built-in-agents/built-in-agent-registry.js";
import type { ModelRouterLaunch } from "../model-routing-settings.js";
import type { KnowledgeText } from "./routing-request-text.js";

/** The router's own durable memory in its workspace (REQ-007). */
export const KNOWLEDGE_FILE_NAME = "knowledge.md";
/** A routing request carries at most this much of the knowledge file (RSK-008). */
export const KNOWLEDGE_TEXT_LIMIT_BYTES = 16 * 1024;

/** `<appData>/model-routing/model-router-agent.json`: the node's Model Router agent run and the launch it was created with. */
type StoredAgentRun = Readonly<{ runId: string; runtimeKind: string; llmModelIdentifier: string }>;

/** Whether the agent's run is idle (its turn ended, no other input waiting or running), and when that changes. */
export type ModelRouterRunIdleState = Readonly<{
  isIdle(): boolean;
  onIdleChange(listener: () => void): () => void;
}>;

export type ModelRouterAgentDependencies = Readonly<{
  agentRuns: Pick<AgentRunService, "createAgentRun" | "getAgentRun" | "resolveAgentRun">;
  internalWorkspaces?: Pick<InternalWorkspaces, "pathFor">;
  /** `<appData>/model-routing/`. */
  stateDir: string;
}>;

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

/**
 * The node's one Model Router agent (REQ-004, design § Ownership Map): one long-lived run of the built-in internal
 * agent in its own internal workspace, auto-approved, confined to that workspace (`toolConfinement`) and marked
 * system-owned (`systemRunOwner`, never a collaboration member). It is the only creator of that run. A run is reused
 * while its recorded runtime and model equal the settings and it restores; otherwise a new run starts with the current
 * settings (the old one stays in history; `knowledge.md` stays in the workspace). It also tells the routing queue when
 * the run is idle (SR-016).
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

  /** The agent's run for `launch`: restored, or created (single-flight). */
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

  isIdle(): boolean {
    return this.watched !== null && this.watched.run.isActive() && this.status === "idle" && this.pendingInputs === 0;
  }

  onIdleChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private async ensureOnce(launch: ModelRouterLaunch): Promise<AgentRun> {
    const stored = await this.readState();
    if (stored && stored.runtimeKind === launch.runtimeKind && stored.llmModelIdentifier === launch.llmModelIdentifier) {
      const restored = this.dependencies.agentRuns.getAgentRun(stored.runId) ?? await this.dependencies.agentRuns.resolveAgentRun(stored.runId);
      if (restored) return this.watch(restored);
    }
    const workspace = this.workspacePath();
    await fs.mkdir(workspace, { recursive: true });
    const { runId } = await this.dependencies.agentRuns.createAgentRun({
      agentDefinitionId: MODEL_ROUTER_AGENT_DEFINITION_ID,
      workspaceRootPath: workspace,
      llmModelIdentifier: launch.llmModelIdentifier,
      runtimeKind: launch.runtimeKind,
      autoExecuteTools: true,
      toolConfinement: "workspace",
      systemRunOwner: "model_router",
    });
    await this.writeState({ runId, runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier });
    const run = this.dependencies.agentRuns.getAgentRun(runId) ?? await this.dependencies.agentRuns.resolveAgentRun(runId);
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

  /** The stored run, or null when missing or unreadable (a new run starts; DESIGN.md rule 7). */
  private async readState(): Promise<StoredAgentRun | null> {
    try {
      const value = JSON.parse(await fs.readFile(this.statePath, "utf8")) as Partial<StoredAgentRun>;
      return typeof value.runId === "string" && typeof value.runtimeKind === "string" && typeof value.llmModelIdentifier === "string"
        ? Object.freeze({ runId: value.runId, runtimeKind: value.runtimeKind, llmModelIdentifier: value.llmModelIdentifier })
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
