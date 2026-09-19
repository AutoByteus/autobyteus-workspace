import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import {
  ContextFileDescriptorError,
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
  TeamContextFileOwnerNotFoundError,
} from "../../context-files/services/context-file-owner-resolver.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../run-history/services/team-run-execution-tree-location-service.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentOrgExecutionTreeLocationService } from "../../agent-org-execution/services/agent-org-execution-tree-location-service.js";
import { CollaborationExecutionLocationService } from "../../agent-collaboration/execution/services/collaboration-execution-location-service.js";

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
    locations: new CollaborationExecutionLocationService({
      teams: createStoredTeamRunExecutionTreeLocationService(memoryDir),
      orgs: new AgentOrgExecutionTreeLocationService({ memoryDir }),
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

  app.get<{
    Params: { draftRunId: string; storedFilename: string };
  }>("/drafts/agent-runs/:draftRunId/context-files/:storedFilename", async (request, reply) => {
    const owner = parseDraftContextFileOwnerDescriptor({
      kind: "agent_draft",
      draftRunId: request.params.draftRunId,
    });
    const filePath = await readService.getDraftFilePath(owner, request.params.storedFilename);
    if (!filePath) {
      return reply.code(404).send({ detail: "File not found." });
    }
    return sendFile(filePath, reply);
  });

  app.delete<{
    Params: { draftRunId: string; storedFilename: string };
  }>("/drafts/agent-runs/:draftRunId/context-files/:storedFilename", async (request, reply) => {
    try {
      const owner = parseDraftContextFileOwnerDescriptor({
        kind: "agent_draft",
        draftRunId: request.params.draftRunId,
      });
      await readService.deleteDraftFile(owner, request.params.storedFilename);
      return reply.code(204).send();
    } catch (error) {
      logger.error(`Failed to delete draft context file: ${String(error)}`);
      return reply.code(400).send({ detail: error instanceof Error ? error.message : "Delete failed." });
    }
  });

  const orgDraftRoute = "/drafts/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename";
  type OrgFileParams = { orgRunId: string; agentRunId: string; storedFilename: string };
  app.get<{ Params: OrgFileParams }>(orgDraftRoute, async (request, reply) => {
    try {
      const { orgRunId, agentRunId, storedFilename } = request.params;
      const owner = parseDraftContextFileOwnerDescriptor({ kind: "org_member_draft", orgRunId, agentRunId });
      const filePath = await readService.getDraftFilePath(owner, storedFilename);
      if (!filePath) return reply.code(404).send({ detail: "File not found." });
      return sendFile(filePath, reply);
    } catch (error) {
      if (error instanceof OrgContextFileOwnerNotFoundError) return reply.code(404).send({ detail: "File not found." });
      if (error instanceof ContextFileDescriptorError) return reply.code(400).send({ detail: error.message });
      throw error;
    }
  });
  app.delete<{ Params: OrgFileParams }>(orgDraftRoute, async (request, reply) => {
    try {
      const { orgRunId, agentRunId, storedFilename } = request.params;
      const owner = parseDraftContextFileOwnerDescriptor({ kind: "org_member_draft", orgRunId, agentRunId });
      await readService.deleteDraftFile(owner, storedFilename);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(400).send({ detail: error instanceof Error ? error.message : "Delete failed." });
    }
  });

  app.get<{
    Params: { teamDraftId: string; memberAddress: string; storedFilename: string };
  }>("/drafts/team-runs/:teamDraftId/members/:memberAddress/context-files/:storedFilename", async (request, reply) => {
    const owner = parseDraftContextFileOwnerDescriptor({
      kind: "team_member_draft",
      teamDraftId: request.params.teamDraftId,
      memberAddress: request.params.memberAddress,
    });
    const filePath = await readService.getDraftFilePath(owner, request.params.storedFilename);
    if (!filePath) {
      return reply.code(404).send({ detail: "File not found." });
    }
    return sendFile(filePath, reply);
  });

  app.delete<{
    Params: { teamDraftId: string; memberAddress: string; storedFilename: string };
  }>("/drafts/team-runs/:teamDraftId/members/:memberAddress/context-files/:storedFilename", async (request, reply) => {
    try {
      const owner = parseDraftContextFileOwnerDescriptor({
        kind: "team_member_draft",
        teamDraftId: request.params.teamDraftId,
        memberAddress: request.params.memberAddress,
      });
      await readService.deleteDraftFile(owner, request.params.storedFilename);
      return reply.code(204).send();
    } catch (error) {
      logger.error(`Failed to delete team draft context file: ${String(error)}`);
      return reply.code(400).send({ detail: error instanceof Error ? error.message : "Delete failed." });
    }
  });

  app.get<{
    Params: { runId: string; storedFilename: string };
  }>("/runs/:runId/context-files/:storedFilename", async (request, reply) => {
    const owner = parseFinalContextFileOwnerDescriptor({
      kind: "agent_final",
      runId: request.params.runId,
    });
    const filePath = await readService.getFinalFilePath(owner, request.params.storedFilename);
    if (!filePath) {
      return reply.code(404).send({ detail: "File not found." });
    }
    return sendFile(filePath, reply);
  });

  app.get<{
    Params: { teamRunId: string; memberAddress: string; storedFilename: string };
  }>("/team-runs/:teamRunId/members/:memberAddress/context-files/:storedFilename", async (request, reply) => {
    let owner;
    try {
      owner = parseFinalContextFileOwnerDescriptor({
        kind: "team_member_final",
        teamRunId: request.params.teamRunId,
        memberAddress: request.params.memberAddress,
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
}
