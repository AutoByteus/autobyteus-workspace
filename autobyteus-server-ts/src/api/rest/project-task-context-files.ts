import fs from "node:fs";
import type { FastifyInstance, FastifyReply } from "fastify";
import { getProjectTaskService } from "../../projects/services/project-task-service.js";
import { ProjectError } from "../../projects/domain/project-errors.js";
import type { ProjectTaskContextFile } from "../../projects/domain/project-task-context.js";
const sendFile = (reply: FastifyReply, {filePath, file}: {filePath: string; file: ProjectTaskContextFile}) => {
  const inline = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.mimeType);
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("Content-Disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.displayName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)}`);
  reply.type(file.mimeType);
  return reply.send(fs.createReadStream(filePath));
};
const guarded = async (reply: FastifyReply, operation: () => Promise<unknown>) => {
  try { return await operation(); }
  catch (e) {
    if (e instanceof ProjectError) return reply.code(["PROJECT_NOT_FOUND", "TASK_NOT_FOUND", "TASK_CONTEXT_NOT_FOUND"].includes(e.code) ? 404 : 400).send({error: {code: e.code, message: e.message}});
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return reply.code(404).send({detail: "Task context was not found."});
    console.error("Task context operation failed.", e);
    return reply.code(400).send({detail: "Task context operation failed."});
  }
};
type DraftParams = {projectId: string; draftId: string; storedFilename: string};
export async function registerProjectTaskContextRoutes(app: FastifyInstance): Promise<void> {
  const service = getProjectTaskService();
  const drafts = "/projects/:projectId/task-context-drafts";
  const files = `${drafts}/:draftId/context-files`;
  app.post<{Params: {projectId: string}; Body: {taskId?: string}}>(drafts, async (r, reply) => guarded(reply, async () => {
    const taskId = r.body?.taskId;
    if (taskId !== undefined && (typeof taskId !== "string" || !taskId.trim())) throw new ProjectError("TASK_CONTEXT_INVALID", "Invalid Task identity.");
    return reply.send(await service.beginContextDraft(r.params.projectId, taskId));
  }));
  app.post<{Params: DraftParams}>(files, async (r, reply) => guarded(reply, async () => {
    const file = await r.file();
    if (!file) return reply.code(400).send({detail: "No file uploaded."});
    return reply.send(await service.uploadContextFile(r.params.projectId, r.params.draftId, file));
  }));
  app.get<{Params: DraftParams}>(`${files}/:storedFilename`, async (r, reply) => guarded(reply, async () =>
    sendFile(reply, await service.readDraftContextFile(r.params.projectId, r.params.draftId, r.params.storedFilename))));
  app.delete<{Params: DraftParams}>(`${files}/:storedFilename`, async (r, reply) => guarded(reply, async () => {
    await service.removeDraftContextFile(r.params.projectId, r.params.draftId, r.params.storedFilename); return reply.code(204).send();
  }));
  app.delete<{Params: DraftParams}>(`${drafts}/:draftId`, async (r, reply) => guarded(reply, async () => {
    await service.discardContextDraft(r.params.projectId, r.params.draftId); return reply.code(204).send();
  }));
  app.get<{Params: {projectId: string; taskId: string; storedFilename: string}}>("/projects/:projectId/tasks/:taskId/context-files/:storedFilename", async (r, reply) => guarded(reply, async () =>
    sendFile(reply, await service.readSavedContextFile(r.params.projectId, r.params.taskId, r.params.storedFilename))));
}
