import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { lookup as lookupMime } from "mime-types";
import {
  parseDraftContextFileOwnerDescriptor,
  parseFinalContextFileOwnerDescriptor,
} from "../../context-files/domain/context-file-owner-types.js";
import { ContextFileDraftCleanupService } from "../../context-files/services/context-file-draft-cleanup-service.js";
import { ContextFileUploadService } from "../../context-files/services/context-file-upload-service.js";
import { ContextFileFinalizationService } from "../../context-files/services/context-file-finalization-service.js";
import { ContextFileReadService } from "../../context-files/services/context-file-read-service.js";
import { ContextFileLayout } from "../../context-files/store/context-file-layout.js";

const logger = {
  error: (...args: unknown[]) => console.error(...args),
};

const buildServices = () => {
  const layout = new ContextFileLayout();
  const cleanupService = new ContextFileDraftCleanupService(layout);
  return {
    uploadService: new ContextFileUploadService(layout, cleanupService),
    finalizationService: new ContextFileFinalizationService(layout, cleanupService),
    readService: new ContextFileReadService(layout, cleanupService),
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

  app.get<{
    Params: { draftTeamRunId: string; memberRouteKey: string; storedFilename: string };
  }>("/drafts/team-runs/:draftTeamRunId/members/:memberRouteKey/context-files/:storedFilename", async (request, reply) => {
    const owner = parseDraftContextFileOwnerDescriptor({
      kind: "team_member_draft",
      draftTeamRunId: request.params.draftTeamRunId,
      memberRouteKey: request.params.memberRouteKey,
    });
    const filePath = await readService.getDraftFilePath(owner, request.params.storedFilename);
    if (!filePath) {
      return reply.code(404).send({ detail: "File not found." });
    }
    return sendFile(filePath, reply);
  });

  app.delete<{
    Params: { draftTeamRunId: string; memberRouteKey: string; storedFilename: string };
  }>("/drafts/team-runs/:draftTeamRunId/members/:memberRouteKey/context-files/:storedFilename", async (request, reply) => {
    try {
      const owner = parseDraftContextFileOwnerDescriptor({
        kind: "team_member_draft",
        draftTeamRunId: request.params.draftTeamRunId,
        memberRouteKey: request.params.memberRouteKey,
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
    Params: { teamRunId: string; memberRouteKey: string; storedFilename: string };
  }>("/team-runs/:teamRunId/members/:memberRouteKey/context-files/:storedFilename", async (request, reply) => {
    const owner = parseFinalContextFileOwnerDescriptor({
      kind: "team_member_final",
      teamRunId: request.params.teamRunId,
      memberRouteKey: request.params.memberRouteKey,
    });
    const filePath = await readService.getFinalFilePath(owner, request.params.storedFilename);
    if (!filePath) {
      return reply.code(404).send({ detail: "File not found." });
    }
    return sendFile(filePath, reply);
  });
}
