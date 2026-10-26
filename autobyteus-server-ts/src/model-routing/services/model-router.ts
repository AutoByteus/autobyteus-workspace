import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import { MODEL_ROUTER_REQUEST_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { AgentRunInputLifecycle } from "../../agent-execution/input/agent-run-input-contract.js";
import type { NodeRuntimesReading } from "../../available-agent-runtimes/available-agent-runtimes-report.js";
import { agentRuntimeDisplayName } from "../../available-agent-runtimes/available-agent-runtimes-service.js";
import { formatBlockTime, reportedModel } from "../../launch-preferences/launch-usability-check.js";
import type {
  DelegationRouting,
  ModelRouterPort,
  ModelRoutingOutcome,
  RoutingRequest,
} from "../domain/model-routing-types.js";
import { readModelRouterLaunch, readModelRoutingEnabled, type ModelRouterLaunch } from "../model-routing-settings.js";
import type { ModelRouterAgent } from "./model-router-agent.js";
import type { ModelRoutingSessions } from "./model-routing-sessions.js";
import { RoutingRequestQueue } from "./routing-request-queue.js";
import { buildRoutingRequestText } from "./routing-request-text.js";
import type { RoutingStatistics } from "./routing-statistics.js";

/** The routing budget: the report read and a valid decision, waiting for the agent included (QR-001, SR-016). */
export const ROUTING_BUDGET_MS = 40_000;

/** Why the router is or is not active (D6); the page translates by code, the delegation note uses the English text. */
export type ModelRoutingReasonCode =
  | "OFF" | "ROUTER_NOT_SET" | "RUNTIME_UNAVAILABLE" | "SIGNED_OUT" | "MODEL_NOT_OFFERED" | "MODEL_BLOCKED" | "REPORT_UNREADABLE";

export type ModelRoutingStatus = Readonly<{
  enabled: boolean;
  routerLaunch: ModelRouterLaunch | null;
  active: boolean;
  /** Null when active. */
  reasonCode: ModelRoutingReasonCode | null;
  /** `MODEL_BLOCKED`: `{ until, limit }`; other codes: their subject (runtime, model). */
  reasonParams: Readonly<Record<string, string | null>>;
  /** English fallback (and the delegation note's clause). */
  reasonText: string | null;
  /** The Model Router agent's run, once it exists. */
  agentRunId: string | null;
}>;

type Inactive = Readonly<{ code: ModelRoutingReasonCode; params: Readonly<Record<string, string | null>>; text: string }>;

/** Is the router's launch usable in the node's facts (supplement § 4)? Null when it is. */
const inactiveReason = (launch: ModelRouterLaunch | null, facts: NodeRuntimesReading | null): Inactive | null => {
  if (!launch) return { code: "ROUTER_NOT_SET", params: {}, text: "the router has no runtime/model" };
  const runtime = agentRuntimeDisplayName(launch.runtimeKind);
  const subject = { runtime: launch.runtimeKind, model: launch.llmModelIdentifier };
  if (!facts) return { code: "REPORT_UNREADABLE", params: subject, text: "this node's runtimes could not be read" };
  if (facts.signedOutRuntimes.has(launch.runtimeKind)) return { code: "SIGNED_OUT", params: subject, text: `${runtime} is signed out` };
  if (!facts.report.agentRuntimes.some((entry) => entry.runtime === launch.runtimeKind)) {
    return { code: "RUNTIME_UNAVAILABLE", params: subject, text: `${runtime} is not available on this node` };
  }
  const model = reportedModel(facts, launch.runtimeKind, launch.llmModelIdentifier);
  if (!model) return { code: "MODEL_NOT_OFFERED", params: subject, text: `${runtime} does not offer ${launch.llmModelIdentifier}` };
  if (model.blocked) {
    const until = model.blocked.until;
    return {
      code: "MODEL_BLOCKED",
      params: { ...subject, until, limit: model.blocked.by },
      text: `${runtime} · ${launch.llmModelIdentifier} is blocked${until ? ` until ${formatBlockTime(until)}` : ""} (${model.blocked.by})`,
    };
  }
  return null;
};

/** The reason a carrying turn that ended without a decision gives. */
const turnEndedReason = (fact: AgentRunInputLifecycle): string | null => {
  switch (fact.kind) {
    case "completed": return "the Model Router's turn ended without a decision";
    case "interrupted": return "the Model Router's turn was interrupted";
    case "failed": return `the Model Router's turn failed (${fact.message})`;
    case "cancelled": return "the Model Router agent stopped";
    default: return null;
  }
};

export type ModelRouterDependencies = Readonly<{
  agent: ModelRouterAgent;
  sessions: ModelRoutingSessions;
  statistics: Pick<RoutingStatistics, "taskKindsInUse">;
  /** The node's runtimes and sign-in facts (the 303 report, single-flight). */
  readNodeRuntimes(): Promise<NodeRuntimesReading>;
  now?: () => number;
}>;

/**
 * The one owner of a routing (DS-003): whether the router is active, opening a delegation's routing (its runtime facts
 * and budget), and one routing request at a time to the node's Model Router agent through its queue (SR-016). It never
 * decides layer order (the resolver does).
 */
export class ModelRouter implements ModelRouterPort {
  private readonly queue: RoutingRequestQueue;
  private readonly now: () => number;

  constructor(private readonly dependencies: ModelRouterDependencies) {
    this.now = dependencies.now ?? Date.now;
    this.queue = new RoutingRequestQueue(dependencies.agent, this.now);
  }

  /** The page's status line (D6): the switch, the router's launch, and whether it is active or why not. */
  async status(): Promise<ModelRoutingStatus> {
    const enabled = readModelRoutingEnabled();
    const routerLaunch = readModelRouterLaunch();
    const agentRunId = await this.dependencies.agent.storedRunId();
    if (!enabled) {
      return Object.freeze({ enabled, routerLaunch, active: false, reasonCode: "OFF", reasonParams: {}, reasonText: "Model Routing is off", agentRunId });
    }
    const facts = routerLaunch ? await this.readFacts(this.now() + ROUTING_BUDGET_MS) : null;
    const inactive = inactiveReason(routerLaunch, facts);
    return Object.freeze({
      enabled, routerLaunch, active: !inactive,
      reasonCode: inactive?.code ?? null, reasonParams: inactive?.params ?? {}, reasonText: inactive?.text ?? null, agentRunId,
    });
  }

  async openDelegation(): Promise<DelegationRouting | null> {
    if (!readModelRoutingEnabled()) return null;
    const deadlineAt = this.now() + ROUTING_BUDGET_MS;
    const facts = await this.readFacts(deadlineAt);
    const launch = readModelRouterLaunch();
    const inactive = inactiveReason(launch, facts);
    return Object.freeze({
      facts,
      notActiveReason: inactive?.text ?? null,
      route: (request: RoutingRequest): Promise<ModelRoutingOutcome> => inactive || !facts || !launch
        ? Promise.resolve({ kind: "not_active" as const, reason: inactive?.text ?? "the router is not active" })
        : this.route(request, launch, facts, deadlineAt),
    });
  }

  /** The node's facts within the budget; null when they could not be read in time. */
  private async readFacts(deadlineAt: number): Promise<NodeRuntimesReading | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.dependencies.readNodeRuntimes(),
        new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), Math.max(0, deadlineAt - this.now())); }),
      ]);
    } catch (error) {
      console.warn(`Model Routing: this node's runtimes could not be read (${error instanceof Error ? error.message : String(error)}).`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * One routing request: the agent's run, a session holding the report it is decided against, then the queue posts it
   * when the agent is idle. The budget, the carrying turn ending without a decision, or the wait running out ends it.
   */
  private async route(request: RoutingRequest, launch: ModelRouterLaunch, facts: NodeRuntimesReading, deadlineAt: number): Promise<ModelRoutingOutcome> {
    let run: AgentRun;
    try {
      run = await this.dependencies.agent.ensureRun(launch);
    } catch (error) {
      return { kind: "failed", reason: `the Model Router agent could not start (${error instanceof Error ? error.message : String(error)})` };
    }
    const session = this.dependencies.sessions.openSession(request, facts);
    // A request still waiting when its budget ends was never sent: the router was busy, whichever timer fires first.
    let sent = false;
    const budget = setTimeout(() => session.fail(sent ? "no valid answer within 40 seconds" : "the Model Router was busy"),
      Math.max(0, deadlineAt - this.now()));
    budget.unref?.();
    this.queue.enqueue({
      deadlineAt,
      expire: () => session.fail("the Model Router was busy"),
      send: () => {
        sent = true;
        return this.send(run, session.requestId, request, (reason) => session.fail(reason));
      },
    });
    const outcome = await session.outcome;
    clearTimeout(budget);
    return outcome.kind === "chosen" ? { kind: "chosen", choices: outcome.choices } : { kind: "failed", reason: outcome.reason };
  }

  /** Posts the request as a system notice; resolves with when the turn carrying it ends. */
  private async send(run: AgentRun, requestId: string, request: RoutingRequest, fail: (reason: string) => void): Promise<Readonly<{ turnEnded: Promise<void> }>> {
    const [knowledge, taskKinds] = await Promise.all([
      this.dependencies.agent.readKnowledge().catch(() => null),
      this.dependencies.statistics.taskKindsInUse().catch(() => []),
    ]);
    const text = buildRoutingRequestText({ requestId, request, knowledge, taskKinds });
    let ended!: () => void;
    const turnEnded = new Promise<void>((resolve) => { ended = resolve; });
    const result = await run.postUserMessage(new AgentInputUserMessage(text, SenderType.SYSTEM, null, {
      sender_id: MODEL_ROUTER_REQUEST_SENDER_ID,
      [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
      ...platformInputPrefaceMetadata({ content: text, senderId: MODEL_ROUTER_REQUEST_SENDER_ID, originalContent: null }),
    }), {
      lifecycleObserver: (fact) => {
        if (fact.kind === "forwarded") {
          void run.publishEvent({
            eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: run.runId, statusHint: null,
            payload: { sender_id: MODEL_ROUTER_REQUEST_SENDER_ID, content: text, ...(fact.turnId ? { turn_id: fact.turnId } : {}) },
          }).catch(() => undefined);
          return;
        }
        const reason = turnEndedReason(fact);
        if (!reason) return;
        // The session is already settled when the router answered in this turn; then this changes nothing.
        fail(reason);
        ended();
      },
    });
    if (!result.accepted) {
      fail(`the Model Router agent did not take the request (${result.message ?? result.code ?? "not accepted"})`);
      ended();
    }
    return { turnEnded };
  }
}
