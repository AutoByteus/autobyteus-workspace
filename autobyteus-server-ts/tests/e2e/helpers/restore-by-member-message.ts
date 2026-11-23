import { randomUUID } from "node:crypto";
import WebSocket from "ws";

type Rec = Record<string, any>;
type Gql = (query: string, variables?: Rec) => Promise<Rec>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Whether a Team or Org run is active (managed by the server). */
export const isRunActive = async (gql: Gql, kind: "team" | "org", runId: string): Promise<boolean> => kind === "team"
  ? Boolean((await gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive}}`, { id: runId })).getTeamRunResumeConfig?.isActive)
  : Boolean((await gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){isActive}}`, { id: runId })).getAgentOrgRunConfig?.isActive);

/**
 * Restores a stopped Team or Org run the way the product does since autobyteus-461 (CR-461-008, SR-046 … SR-048): the user's
 * message to one of the run's own members, sent on the run's open view stream. The view first serves the stopped run from its
 * stored file; the message restores the run, the view switches to live, and the message is posted. There is no restore
 * mutation for these runs any more. The view stream is closed afterwards.
 *
 * Resolves once the server has finished handling the message (autobyteus-619 REQ-003). An Org acknowledges it, by its
 * `command_id`, after it has posted the message and recorded the run's summary (`agent-org-stream-handler.ts`), so the
 * helper waits for that acknowledgement: a caller that stops the run next no longer races the summary. A Team's stream
 * sends no acknowledgement for an accepted message (only an ERROR for a refused one), so for a Team it resolves once the
 * run is active and its view was brought live.
 */
export const restoreByMemberMessage = async (input: Readonly<{
  url: string;
  gql: Gql;
  kind: "team" | "org";
  runId: string;
  /** One of the run's own members (an agent of the team, or of the org or one of its mounted teams). */
  memberRunId: string;
  content?: string;
  timeoutMs?: number;
}>): Promise<void> => {
  const route = input.kind === "team" ? `agent-team/${input.runId}` : `agent-org/${input.runId}`;
  const socket = new WebSocket(`${input.url.replace(/^http/, "ws")}/ws/${route}`);
  const frames: Rec[] = [];
  socket.on("message", (raw) => frames.push(JSON.parse(String(raw))));
  try {
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    const ready = Date.now() + 30_000;
    while (!frames.some((f) => /SNAPSHOT$/.test(String(f.type))) && Date.now() < ready) await sleep(50);
    if (!frames.some((f) => /SNAPSHOT$/.test(String(f.type)))) {
      // The stream's own refusal (its ERROR payload, with its code) first, then the frames.
      const errors = frames.filter((f) => f.type === "ERROR").map((f) => JSON.stringify(f.payload));
      throw new Error(`${input.kind} ${input.runId}: the view sent no snapshot: ${errors.join(" | ")} ${JSON.stringify(frames.map((f) => f.type))}`);
    }
    const content = input.content ?? "Continue.";
    const commandId = randomUUID();
    socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: input.kind === "org"
      ? { root_subject_kind: "agent_org", root_run_id: input.runId, target_agent_run_id: input.memberRunId, command_id: commandId,
        message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
      : { agent_run_id: input.memberRunId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`,
        content, context_file_paths: [], image_urls: [] } }));
    const deadline = Date.now() + (input.timeoutMs ?? 60_000);
    while (Date.now() < deadline) {
      const active = () => isRunActive(input.gql, input.kind, input.runId);
      if (input.kind === "org") {
        // The Org's acknowledgement of this message: sent once it is posted and the run's summary is recorded.
        const ack = frames.find((f) => f.type === "AGENT_COMMAND_ACK" && f.payload?.command_id === commandId);
        // A rejected acknowledgement of a run that was restored is its first turn's failure, not a refusal (as an ERROR below).
        if (ack && (ack.payload.state === "accepted" || await active())) return;
        if (ack) throw new Error(`org ${input.runId}: the member message was refused: ${JSON.stringify(ack.payload)}`);
      }
      const error = frames.find((f) => f.type === "ERROR");
      // A restored run whose first turn then fails (e.g. its real model has no key: LLM_PROVIDER_ERROR) was restored: the
      // turn's own error is not a refusal of the message. An Org still acknowledges the message itself (above).
      if (error && !await active()) throw new Error(`${input.kind} ${input.runId}: the member message was refused: ${JSON.stringify(error.payload)}`);
      if (input.kind === "team") {
        if (error) return;
        // Active, and the view brought live (its second, in-band snapshot): the message has been handed to the restored run.
        if (frames.filter((f) => /SNAPSHOT$/.test(String(f.type))).length >= 2 && await active()) return;
      }
      await sleep(200);
    }
    throw new Error(`${input.kind} ${input.runId}: the member message was not ${input.kind === "org" ? "acknowledged" : "followed by the run going active"}; frames: ${JSON.stringify(frames.map((f) => f.type))}`);
  } finally {
    socket.close();
  }
};
