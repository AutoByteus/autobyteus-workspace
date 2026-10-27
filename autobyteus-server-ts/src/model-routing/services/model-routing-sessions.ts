import { randomBytes } from "node:crypto";
import type { NodeRuntimesReading } from "../../available-agent-runtimes/available-agent-runtimes-report.js";
import { agentRuntimeDisplayName } from "../../available-agent-runtimes/available-agent-runtimes-service.js";
import { blockedDetail, reportedModel } from "../../launch-preferences/launch-usability-check.js";
import type { LaunchChoice, RoutingRequest } from "../domain/model-routing-types.js";

/** A task kind is a short label (REQ-011, D7). */
export const TASK_KIND_MAX_LENGTH = 40;

/** What the router submits for one agent, as the tool received it. */
export type SubmittedLaunchChoice = Readonly<{
  address?: unknown;
  runtime?: unknown;
  model?: unknown;
  taskKind?: unknown;
  reason?: unknown;
}>;

/** How a session ended: the valid choices, or why there are none. */
export type SessionOutcome =
  | Readonly<{ kind: "chosen"; choices: readonly LaunchChoice[] }>
  | Readonly<{ kind: "failed"; reason: string }>;

/** The answer `submit_launch_choices` gives the router. */
export type SubmitResult = Readonly<{ accepted: true; message: string }> | Readonly<{ accepted: false; message: string }>;

/** An open routing request, as its opener holds it. */
export type OpenSession = Readonly<{
  requestId: string;
  /** Settles once: with the first valid decision, or the first failure. */
  outcome: Promise<SessionOutcome>;
  /** Ends the session as a failure (time-out, the carrying turn ended); no effect once settled. */
  fail(reason: string): void;
}>;

type Session = { request: RoutingRequest; facts: NodeRuntimesReading; settle(outcome: SessionOutcome): void };

export const sessionClosedText = (requestId: string): string =>
  `Routing request ${requestId} is no longer open (answered or timed out); nothing was changed.`;

const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * The open routing requests by `requestId` (DS-004): each holds its request and the node's runtime report it is
 * decided against. `submit` validates a decision (every asked agent once; a usable, unblocked model of the node, on a
 * required runtime; a task kind of 1–40 characters; a reason) and settles the session, or returns the reasons so the
 * router corrects them within the time left. A closed or unknown request changes nothing (SR-012).
 */
export class ModelRoutingSessions {
  private readonly open = new Map<string, Session>();

  constructor(private readonly newRequestId: () => string = () => `req_${randomBytes(4).toString("hex")}`) {}

  openSession(request: RoutingRequest, facts: NodeRuntimesReading): OpenSession {
    const requestId = this.newRequestId();
    let settle!: (outcome: SessionOutcome) => void;
    const outcome = new Promise<SessionOutcome>((resolve) => { settle = resolve; });
    this.open.set(requestId, {
      request, facts,
      settle: (result) => {
        if (!this.open.delete(requestId)) return;
        settle(result);
      },
    });
    return Object.freeze({
      requestId,
      outcome,
      fail: (reason: string) => this.open.get(requestId)?.settle({ kind: "failed", reason }),
    });
  }

  isOpen(requestId: string): boolean { return this.open.has(requestId); }

  submit(requestId: string, submitted: readonly SubmittedLaunchChoice[]): SubmitResult {
    const session = this.open.get(requestId);
    if (!session) return { accepted: false, message: sessionClosedText(requestId) };
    const errors: string[] = [];
    const choices: LaunchChoice[] = [];
    const asked = new Map(session.request.agents.map((agent) => [agent.address, agent]));
    const seen = new Set<string>();
    submitted.forEach((entry, index) => {
      const address = text(entry.address);
      const at = address ?? `choice ${index + 1}`;
      if (!address) { errors.push(`${at}: address is missing.`); return; }
      const agent = asked.get(address);
      if (!agent) { errors.push(`${address}: this request does not ask about that agent.`); return; }
      if (seen.has(address)) { errors.push(`${address}: answered twice.`); return; }
      seen.add(address);
      const runtime = text(entry.runtime);
      const model = text(entry.model);
      const taskKind = text(entry.taskKind);
      const reason = text(entry.reason);
      const before = errors.length;
      if (!runtime || !model) errors.push(`${address}: a runtime and a model are required.`);
      else {
        const problem = this.launchProblem(session.facts, runtime, model);
        if (problem) errors.push(`${address}: ${problem}`);
        if (agent.requiredRuntime && runtime !== agent.requiredRuntime) {
          errors.push(`${address}: it must stay on ${agent.requiredRuntime} (its own default names that runtime).`);
        }
      }
      if (!taskKind || taskKind.length > TASK_KIND_MAX_LENGTH) errors.push(`${address}: taskKind must be 1-${TASK_KIND_MAX_LENGTH} characters.`);
      if (!reason) errors.push(`${address}: a one-sentence reason is required.`);
      if (errors.length === before) choices.push(Object.freeze({ address, runtimeKind: runtime!, llmModelIdentifier: model!, taskKind: taskKind!, reason: reason! }));
    });
    for (const address of asked.keys()) if (!seen.has(address)) errors.push(`${address}: no choice was given.`);
    if (errors.length) {
      return { accepted: false, message: `Not accepted; nothing was changed. Correct these and submit again for request ${requestId}:\n- ${errors.join("\n- ")}` };
    }
    session.settle({ kind: "chosen", choices: Object.freeze(choices) });
    return { accepted: true, message: `Accepted: ${choices.length} launch choice${choices.length === 1 ? "" : "s"} for request ${requestId}.` };
  }

  /** Why `runtime` / `model` cannot run on this node now (the session's report), or null. */
  private launchProblem(facts: NodeRuntimesReading, runtime: string, model: string): string | null {
    if (!facts.report.agentRuntimes.some((entry) => entry.runtime === runtime)) {
      return `${runtime} is not an available runtime on this node now (see list_available_agent_runtimes).`;
    }
    const found = reportedModel(facts, runtime, model);
    if (!found) return `${agentRuntimeDisplayName(runtime)} does not offer the model ${model} on this node.`;
    return found.blocked ? blockedDetail(model, found.blocked) : null;
  }
}
