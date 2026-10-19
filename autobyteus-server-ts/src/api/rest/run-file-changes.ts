import fs from "node:fs";
import type { FastifyInstance, FastifyReply } from "fastify";
import { lookup as lookupMime } from "mime-types";
import { CollaborationMemberNotFoundError } from "../../agent-collaboration/execution/domain/collaboration-member-not-found-error.js";
import {
  RunFileChangeProjectionService,
  getRunFileChangeProjectionService,
  type ResolvedRunFileChangeEntry,
} from "../../run-history/services/run-file-change-projection-service.js";
import {
  TeamMemberRunViewProjectionService,
  getTeamMemberRunViewProjectionService,
} from "../../run-history/services/team-member-run-view-projection-service.js";
import {
  AgentOrgMemberRunViewProjectionService,
  getAgentOrgMemberRunViewProjectionService,
} from "../../run-history/services/agent-org-member-run-view-projection-service.js";
import {
  StandaloneRootMemberViewProjectionService,
  getStandaloneRootMemberViewProjectionService,
} from "../../standalone-agent-run-root/services/standalone-root-member-view-projection-service.js";

type ContentQuery = { path?: string; memberAddress?: string };

const missingQuery = (reply: FastifyReply, name: string) =>
  reply.code(400).send({ detail: `Missing required query parameter: ${name}` });

const fileChangeNotFound = (reply: FastifyReply) => reply.code(404).send({ detail: "File change not found" });

/** The one content response rule of every owner (REQ-008): bytes, 409 while being written, else 404. */
const sendFileChangeContent = (reply: FastifyReply, resolved: ResolvedRunFileChangeEntry | null) => {
  if (!resolved) return fileChangeNotFound(reply);
  const { entry, absolutePath, isActiveRun } = resolved;
  const fileExists = Boolean(
    absolutePath
    && fs.existsSync(absolutePath)
    && fs.statSync(absolutePath).isFile(),
  );

  if (!fileExists) {
    if (isActiveRun && (entry.status === "pending" || entry.status === "streaming")) {
      return reply.code(409).send({ detail: "File change content is not ready yet" });
    }
    return reply.code(404).send({ detail: "File change content is not available" });
  }

  const mimeType = (lookupMime(absolutePath!) || (entry.type === "file" ? "text/plain" : "application/octet-stream")).toString();
  reply.header("cache-control", "no-store");
  reply.type(mimeType);
  return reply.send(fs.createReadStream(absolutePath!));
};

/** A member read whose agent is not in the named owner answers "not found"; other errors propagate. */
const sendMemberFileChangeContent = async (
  reply: FastifyReply,
  resolve: () => Promise<ResolvedRunFileChangeEntry | null>,
) => {
  let resolved: ResolvedRunFileChangeEntry | null;
  try {
    resolved = await resolve();
  } catch (error) {
    if (error instanceof CollaborationMemberNotFoundError) return fileChangeNotFound(reply);
    throw error;
  }
  return sendFileChangeContent(reply, resolved);
};

/**
 * File-change content per owner: a standalone run by its run id, or a member inside the team run,
 * org run or hub the path names. Each route reads only its owner.
 */
export async function registerRunFileChangeRoutes(
  app: FastifyInstance,
  options: {
    projectionService?: RunFileChangeProjectionService;
    teamMemberViews?: TeamMemberRunViewProjectionService;
    agentOrgMemberViews?: AgentOrgMemberRunViewProjectionService;
    standaloneRootMemberViews?: StandaloneRootMemberViewProjectionService;
  } = {},
): Promise<void> {
  const projectionService = () => options.projectionService ?? getRunFileChangeProjectionService();
  const teamMemberViews = () => options.teamMemberViews ?? getTeamMemberRunViewProjectionService();
  const agentOrgMemberViews = () => options.agentOrgMemberViews ?? getAgentOrgMemberRunViewProjectionService();
  const standaloneRootMemberViews = () => options.standaloneRootMemberViews ?? getStandaloneRootMemberViewProjectionService();

  app.get<{
    Params: { runId: string };
    Querystring: ContentQuery;
  }>("/runs/:runId/file-change-content", async (request, reply) => {
    const rawPath = request.query?.path?.trim();
    if (!rawPath) return missingQuery(reply, "path");
    return sendFileChangeContent(reply, await projectionService().resolveStandaloneRunEntry(request.params.runId, rawPath));
  });

  app.get<{
    Params: { teamRunId: string; agentRunId: string };
    Querystring: ContentQuery;
  }>("/team-runs/:teamRunId/agent-runs/:agentRunId/file-change-content", async (request, reply) => {
    const rawPath = request.query?.path?.trim();
    if (!rawPath) return missingQuery(reply, "path");
    const { teamRunId, agentRunId } = request.params;
    return sendMemberFileChangeContent(reply, () =>
      teamMemberViews().resolveFileChangeEntry(teamRunId, agentRunId, rawPath));
  });

  app.get<{
    Params: { orgRunId: string; agentRunId: string };
    Querystring: ContentQuery;
  }>("/agent-org-runs/:orgRunId/agent-runs/:agentRunId/file-change-content", async (request, reply) => {
    const rawPath = request.query?.path?.trim();
    if (!rawPath) return missingQuery(reply, "path");
    const memberAddress = request.query?.memberAddress?.trim();
    if (!memberAddress) return missingQuery(reply, "memberAddress");
    const { orgRunId, agentRunId } = request.params;
    return sendMemberFileChangeContent(reply, () =>
      agentOrgMemberViews().resolveFileChangeEntry(orgRunId, memberAddress, agentRunId, rawPath));
  });

  app.get<{
    Params: { hostRunId: string; agentRunId: string };
    Querystring: ContentQuery;
  }>("/agent-collaborations/:hostRunId/agent-runs/:agentRunId/file-change-content", async (request, reply) => {
    const rawPath = request.query?.path?.trim();
    if (!rawPath) return missingQuery(reply, "path");
    const memberAddress = request.query?.memberAddress?.trim();
    if (!memberAddress) return missingQuery(reply, "memberAddress");
    const { hostRunId, agentRunId } = request.params;
    return sendMemberFileChangeContent(reply, () =>
      standaloneRootMemberViews().resolveFileChangeEntry(hostRunId, memberAddress, agentRunId, rawPath));
  });
}
