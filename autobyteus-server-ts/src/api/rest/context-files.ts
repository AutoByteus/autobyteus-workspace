import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import {
  ContextFileDescriptorError,
  parseDraftContextFileLocator,
  parseDraftContextFileOwnerDescriptor,
  parseFinalContextFileOwnerDescriptor,
} from "../../context-files/domain/context-file-owner-types.js";
import { ContextFileDraftCleanupService } from "../../context-files/services/context-file-draft-cleanup-service.js";
import { ContextFileUploadService } from "../../context-files/services/context-file-upload-service.js";
import { ContextFileFinalizationService } from "../../context-files/services/context-file-finalization-service.js";
import { ContextFileReadService } from "../../context-files/services/context-file-read-service.js";
import { ContextFileLayout } from "../../context-files/store/context-file-layout.js";
import {
  ContextFileOwnerResolver,
  OrgContextFileOwnerNotFoundError,
  AgentCollaborationContextFileOwnerNotFoundError,
  StandaloneContextFileOwnerNotFoundError,
  TeamContextFileOwnerNotFoundError,
} from "../../context-files/services/context-file-owner-resolver.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { CollaborationExecutionLocationService } from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { StandaloneRootLocationService } from "../../standalone-agent-run-root/services/standalone-root-location-service.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const buildServices = () => {
  const config = appConfigProvider.config;
  const memoryDir = config.getMemoryDir();
  const layout = new ContextFileLayout({
    appDataDir: config.getAppDataDir(),
    memoryDir,
  });
  const ownerResolver = new ContextFileOwnerResolver({
      memoryDir: memoryDir,
    locations: new CollaborationExecutionLocationService({
      teams: createStoredTeamRunExecutionTreeLocationService(memoryDir),
      orgs: new AgentOrgExecutionTreeLocationService({ memoryDir }),
      agents: new StandaloneRootLocationService({ memoryDir }),
    }),
  });
  const cleanupService = new ContextFileDraftCleanupService(layout);
  return {
    uploadService: new ContextFileUploadService(layout, cleanupService, ownerResolver),
    finalizationService: new ContextFileFinalizationService(
      layout,
      cleanupService,
      ownerResolver,
    ),
    readService: new ContextFileReadService(layout, cleanupService, ownerResolver),
  };
};

/** A `/rest/drafts/` path that is not a draft context-file locator. */
class DraftLocatorNotFoundError extends Error {}

const isContextFileOwnerNotFound = (error: unknown): boolean =>
  error instanceof DraftLocatorNotFoundError
  || error instanceof StandaloneContextFileOwnerNotFoundError
  || error instanceof TeamContextFileOwnerNotFoundError
  || error instanceof OrgContextFileOwnerNotFoundError
  || error instanceof AgentCollaborationContextFileOwnerNotFoundError;

/** The single HTTP error mapping of the draft read and delete routes. */
const sendDraftRouteError = (error: unknown, reply: { code(status: number): { send(body: unknown): unknown } }) => {
  if (error instanceof ContextFileDescriptorError || error instanceof CollaborationContractError) {
    return reply.code(400).send({ detail: error.message });
  }
  if (isContextFileOwnerNotFound(error)) return reply.code(404).send({ detail: "File not found." });
  throw error;
};

const sendFile = async (filePath: string, reply: { type: (mimeType: string) => void; send: (data: unknown) => unknown }) => {
  const mimeType = lookupMime(filePath) || "application/octet-stream";
  reply.type(String(mimeType));
  return reply.send(fs.createReadStream(filePath));
};

export async function registerContextFileRoutes(app: FastifyInstance): Promise<void> {
  const { uploadService, finalizationService, readService } = buildServices();

  app.post("/context-files/upload", async (request, reply) => {
    try {
      const file = await request.file();
      if (!file) {
        return reply.code(400).send({ detail: "No file uploaded." });
      }

      const ownerField = file.fields.owner;
      const ownerPart = Array.isArray(ownerField) ? ownerField[0] : ownerField;
      const ownerValue = ownerPart && "value" in ownerPart ? ownerPart.value : null;
      if (typeof ownerValue !== "string" || !ownerValue.trim()) {
        throw new Error("owner is required.");
      }
      const owner = parseDraftContextFileOwnerDescriptor(JSON.parse(ownerValue));
      const uploadedAttachment = await uploadService.uploadDraftAttachment(owner, file);
      return reply.send(uploadedAttachment);
    } catch (error) {
      logger.error(`Failed to upload context file: ${String(error)}`);
      return reply.code(400).send({ detail: error instanceof Error ? error.message : "Upload failed." });
    }
  });

  app.post<{
    Body: {
      draftOwner: unknown;
      finalOwner: unknown;
      attachments?: Array<{ storedFilename?: string; displayName?: string }>;
    };
  }>("/context-files/finalize", async (request, reply) => {
    try {
      const draftOwner = parseDraftContextFileOwnerDescriptor(request.body?.draftOwner);
      const finalOwner = parseFinalContextFileOwnerDescriptor(request.body?.finalOwner);
      const attachmentDescriptors = Array.isArray(request.body?.attachments)
        ? request.body.attachments.map((attachment) => ({
            storedFilename: String(attachment?.storedFilename ?? ""),
            displayName: String(attachment?.displayName ?? ""),
          }))
        : [];
      const attachments = await finalizationService.finalizeDraftAttachments({
        draftOwner,
        finalOwner,
        attachments: attachmentDescriptors,
      });
      return reply.send({ attachments });
    } catch (error) {
      logger.error(`Failed to finalize context files: ${String(error)}`);
      return reply.code(400).send({ detail: error instanceof Error ? error.message : "Finalize failed." });
    }
  });

  /** Every draft owner kind shares one read and one delete route; the codec owns the locator shape. */
  const parseDraftRequest = (url: string) => {
    const located = parseDraftContextFileLocator(url.split("?", 1)[0]!);
    if (!located) throw new DraftLocatorNotFoundError();
    return located;
  };
  app.get("/drafts/*", async (request, reply) => {
    try {
      const { owner, storedFilename } = parseDraftRequest(request.url);
      const filePath = await readService.getDraftFilePath(owner, storedFilename);
      if (!filePath) return reply.code(404).send({ detail: "File not found." });
      return sendFile(filePath, reply);
    } catch (error) {
      return sendDraftRouteError(error, reply);
    }
  });
  app.delete("/drafts/*", async (request, reply) => {
    try {
      const { owner, storedFilename } = parseDraftRequest(request.url);
      await readService.deleteDraftFile(owner, storedFilename);
      return reply.code(204).send();
    } catch (error) {
      return sendDraftRouteError(error, reply);
    }
  });

  app.get<{
    Params: { runId: string; storedFilename: string };
  }>("/runs/:runId/context-files/:storedFilename", async (request, reply) => {
    try {
      const owner = parseFinalContextFileOwnerDescriptor({
        kind: "agent_final",
        runId: request.params.runId,
      });
      const filePath = await readService.getFinalFilePath(owner, request.params.storedFilename);
      if (!filePath) {
        return reply.code(404).send({ detail: "File not found." });
      }
      return sendFile(filePath, reply);
    } catch (error) {
      if (error instanceof ContextFileDescriptorError) return reply.code(400).send({ detail: error.message });
      if (error instanceof StandaloneContextFileOwnerNotFoundError) return reply.code(404).send({ detail: "File not found." });
      throw error;
    }
  });

  app.get<{
    Params: { teamRunId: string; agentRunId: string; storedFilename: string };
  }>("/team-runs/:teamRunId/agent-runs/:agentRunId/context-files/:storedFilename", async (request, reply) => {
    let owner;
    try {
      owner = parseFinalContextFileOwnerDescriptor({
        kind: "team_member_final",
        teamRunId: request.params.teamRunId,
        agentRunId: request.params.agentRunId,
      });
    } catch (error) {
      if (error instanceof ContextFileDescriptorError || error instanceof CollaborationContractError) {
        return reply.code(400).send({ detail: error.message });
      }
      throw error;
    }
    try {
      const filePath = await readService.getFinalFilePath(owner, request.params.storedFilename);
      if (!filePath) return reply.code(404).send({ detail: "File not found." });
      return sendFile(filePath, reply);
    } catch (error) {
      if (error instanceof ContextFileDescriptorError) return reply.code(400).send({ detail: error.message });
      if (error instanceof TeamContextFileOwnerNotFoundError) return reply.code(404).send({ detail: "File not found." });
      throw error;
    }
  });

  type OrgFileParams = { orgRunId: string; agentRunId: string; storedFilename: string };
  app.get<{ Params: OrgFileParams }>("/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename", async (request, reply) => {
    try {
      const { orgRunId, agentRunId, storedFilename } = request.params;
      const owner = parseFinalContextFileOwnerDescriptor({ kind: "org_member_final", orgRunId, agentRunId });
      const filePath = await readService.getFinalFilePath(owner, storedFilename);
      if (!filePath) return reply.code(404).send({ detail: "File not found." });
      return sendFile(filePath, reply);
    } catch (error) {
      if (error instanceof OrgContextFileOwnerNotFoundError) return reply.code(404).send({ detail: "File not found." });
      if (error instanceof ContextFileDescriptorError) return reply.code(400).send({ detail: error.message });
      throw error;
    }
  });

  type AgentCollaborationFileParams = { hostRunId: string; agentRunId: string; storedFilename: string };
  app.get<{ Params: AgentCollaborationFileParams }>(
    "/agent-collaborations/:hostRunId/agent-runs/:agentRunId/context-files/:storedFilename",
    async (request, reply) => {
      try {
        const { hostRunId, agentRunId, storedFilename } = request.params;
        const filePath = await readService.getFinalFilePath(
          parseFinalContextFileOwnerDescriptor({ kind: "agent_collaboration_member_final", hostRunId, agentRunId }),
          storedFilename,
        );
        if (!filePath) return reply.code(404).send({ detail: "File not found." });
        return sendFile(filePath, reply);
      } catch (error) {
        if (error instanceof AgentCollaborationContextFileOwnerNotFoundError) return reply.code(404).send({ detail: "File not found." });
        if (error instanceof ContextFileDescriptorError) return reply.code(400).send({ detail: error.message });
        throw error;
      }
    },
  );
}
