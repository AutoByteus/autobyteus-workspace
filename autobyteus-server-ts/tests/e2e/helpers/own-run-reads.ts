import fs from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";
import { sendE2eSendMessageCommand } from "./websocket-command-helpers.js";

type Gql = (query: string, variables?: Record<string, unknown>) => Promise<Record<string, any>>;

/**
 * The run an agent belongs to, from the memory folder: a run of its own (`agents/<id>`), or a member of a team run
 * (`agent_teams/<team>/<id>`). Since autobyteus-461 a delegated run is a run of its own; a team or org view's member reads
 * answer only that run's own members (CR-461-014), so a delegated agent is read through its own run.
 */
export const ownRunOfAgent = async (memoryDir: string, agentRunId: string): Promise<{ kind: "agent" } | { kind: "team"; teamRunId: string } | null> => {
  if (await fs.stat(path.join(memoryDir, "agents", agentRunId)).then(() => true, () => false)) return { kind: "agent" };
  const teams = await fs.readdir(path.join(memoryDir, "agent_teams")).catch(() => [] as string[]);
  for (const teamRunId of teams) {
    if (await fs.stat(path.join(memoryDir, "agent_teams", teamRunId, agentRunId)).then(() => true, () => false)) return { kind: "team", teamRunId };
  }
  return null;
};

/** An agent's projection (`conversation activities`) read through its own run; `null` when no run holds it yet. */
export const projectionByOwnRun = async (gql: Gql, memoryDir: string, agentRunId: string): Promise<Record<string, any> | null> => {
  const run = await ownRunOfAgent(memoryDir, agentRunId);
  if (!run) return null;
  if (run.kind === "agent") return (await gql(`query($id:String!){getRunProjection(runId:$id){conversation activities}}`, { id: agentRunId })).getRunProjection ?? null;
  return (await gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation activities}}`,
    { id: run.teamRunId, a: agentRunId })).getTeamMemberRunProjection ?? null;
};

/**
 * The conversation of an agent that is not in run `rootRunId` itself: a run that run (or one of its runs) delegated to,
 * read by its own run (autobyteus-461 rule 2: the delegator's member reads refuse a delegated run). `undefined` when the
 * agent is the root's own (a standalone root's agent, or a member of the team run `rootRunId`), or not stored as an agent
 * or a team member (an org's own agents): the caller then reads it through the root as before.
 */
export const delegatedConversation = async (gql: Gql, memoryDir: string, rootRunId: string, agentRunId: string): Promise<unknown[] | undefined> => {
  const run = await ownRunOfAgent(memoryDir, agentRunId);
  if (!run) return undefined;
  if (run.kind === "agent" && agentRunId === rootRunId) return undefined;
  if (run.kind === "team" && run.teamRunId === rootRunId) return undefined;
  return ((await projectionByOwnRun(gql, memoryDir, agentRunId))?.conversation as unknown[] | undefined) ?? [];
};

/**
 * The user's messages to an agent on its own run's stream (autobyteus-461 rule 2: the delegator's view has no command for a
 * run it delegated to): an agent run's own `/ws/agent/<id>`, or a team member's own team `/ws/agent-team/<team>`. One socket
 * per run, opened on first use. `send` answers `false` for an agent of run `rootRunId` itself (the caller sends it there).
 */
export const ownRunSender = (wsBase: string, memoryDir: string, rootRunId: string) => {
  const sockets = new Map<string, Promise<WebSocket>>();
  const open = (route: string, id: string, readyType: string) => new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`${wsBase}/ws/${route}/${id}`);
    const timer = setTimeout(() => reject(new Error(`${route}/${id}: no ${readyType} in 30 s`)), 30_000);
    socket.on("message", (raw: unknown) => {
      if ((JSON.parse(String(raw)) as { type?: string }).type === readyType) { clearTimeout(timer); resolve(socket); }
    });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
  const send = async (agentRunId: string, content: string, extra: Record<string, unknown> = {}): Promise<boolean> => {
    const run = await ownRunOfAgent(memoryDir, agentRunId);
    if (!run || (run.kind === "agent" && agentRunId === rootRunId) || (run.kind === "team" && run.teamRunId === rootRunId)) return false;
    const key = run.kind === "agent" ? `agent:${agentRunId}` : `team:${run.teamRunId}`;
    if (!sockets.has(key)) sockets.set(key, run.kind === "agent" ? open("agent", agentRunId, "CONNECTED") : open("agent-team", run.teamRunId, "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    sendE2eSendMessageCommand(await sockets.get(key)!, { agent_run_id: agentRunId, content, ...extra });
    return true;
  };
  const close = async () => { for (const socket of sockets.values()) (await socket.catch(() => null))?.terminate(); sockets.clear(); };
  return { send, close };
};
