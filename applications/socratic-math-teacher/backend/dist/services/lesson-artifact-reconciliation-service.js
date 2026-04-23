import { randomUUID } from "node:crypto";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createLessonMessageRepository } from "../repositories/lesson-message-repository.js";
import { createLessonRepository } from "../repositories/lesson-repository.js";
import { resolveLessonArtifactPathRule } from "./lesson-artifact-paths.js";
import { createRunBindingCorrelationService } from "./run-binding-correlation-service.js";
const TERMINAL_BINDING_STATUSES = new Set(["TERMINATED", "FAILED", "ORPHANED"]);
const isTerminalBinding = (binding) => TERMINAL_BINDING_STATUSES.has(binding.status);
const resolveBindingRunIds = (binding) => {
    if (binding.runtime.members.length > 0) {
        return binding.runtime.members.map((member) => member.runId);
    }
    return [binding.runtime.runId];
};
const resolveProducerForRun = (binding, runId) => {
    const member = binding.runtime.members.find((candidate) => candidate.runId === runId) ?? null;
    if (!member) {
        return null;
    }
    return {
        runId,
        memberRouteKey: member.memberRouteKey,
        memberName: member.memberName,
        displayName: member.displayName,
        runtimeKind: member.runtimeKind,
        teamPath: [...member.teamPath],
    };
};
const sortArtifacts = (artifacts) => [...artifacts].sort((left, right) => {
    const updatedAtComparison = left.updatedAt.localeCompare(right.updatedAt);
    if (updatedAtComparison !== 0) {
        return updatedAtComparison;
    }
    return left.createdAt.localeCompare(right.createdAt);
});
const requireRevisionText = async (context, input) => {
    const text = await context.runtimeControl.getPublishedArtifactRevisionText(input);
    if (typeof text !== "string") {
        throw new Error(`Socratic Math Teacher could not read published artifact revision '${input.revisionId}' for run '${input.runId}'.`);
    }
    return text.trim() || "Tutor response received.";
};
export const createLessonArtifactReconciliationService = (context) => ({
    async handlePersistedArtifact(event) {
        await this.projectArtifactRevision({
            binding: event.binding,
            producer: event.producer,
            runId: event.runId,
            revisionId: event.revisionId,
            path: event.path,
            publishedAt: event.publishedAt,
        });
    },
    async reconcilePublishedArtifacts() {
        const bindings = await context.runtimeControl.listRunBindings(null);
        for (const binding of bindings) {
            const lessonId = createRunBindingCorrelationService(context).resolveLessonIdForBinding(binding);
            const lesson = withAppDatabase(context.storage.appDatabasePath, (db) => createLessonRepository(db).getById(lessonId));
            if (!lesson) {
                continue;
            }
            if (isTerminalBinding(binding) && lesson.artifactCatchupCompletedAt) {
                continue;
            }
            for (const runId of resolveBindingRunIds(binding)) {
                const producer = resolveProducerForRun(binding, runId);
                if (!producer) {
                    continue;
                }
                const artifacts = sortArtifacts(await context.runtimeControl.getRunPublishedArtifacts(runId));
                for (const artifact of artifacts) {
                    await this.projectArtifactRevision({
                        binding,
                        producer,
                        runId,
                        revisionId: artifact.revisionId,
                        path: artifact.path,
                        publishedAt: artifact.updatedAt,
                    });
                }
            }
            if (isTerminalBinding(binding)) {
                withAppDatabase(context.storage.appDatabasePath, (db) => {
                    createLessonRepository(db).markArtifactCatchupCompleted(lessonId, new Date().toISOString());
                });
            }
        }
    },
    async projectArtifactRevision(input) {
        const lessonId = createRunBindingCorrelationService(context).resolveLessonIdForBinding(input.binding);
        const rule = resolveLessonArtifactPathRule(input.path);
        const body = await requireRevisionText(context, {
            runId: input.runId,
            revisionId: input.revisionId,
        });
        const notification = withAppDatabase(context.storage.appDatabasePath, (db) => withTransaction(db, () => {
            const lessonRepository = createLessonRepository(db);
            const lessonMessageRepository = createLessonMessageRepository(db);
            const lesson = lessonRepository.getById(lessonId);
            if (!lesson) {
                throw new Error(`Lesson '${lessonId}' was not found during artifact projection.`);
            }
            const inserted = lessonMessageRepository.insertMessage({
                messageId: randomUUID(),
                lessonId,
                role: "tutor",
                kind: rule.messageKind,
                body,
                createdAt: input.publishedAt,
                sourceRevisionId: input.revisionId,
            });
            if (!inserted) {
                return null;
            }
            lessonRepository.clearArtifactCatchupCompleted(lessonId);
            lessonRepository.upsertLesson({
                lessonId,
                prompt: lesson.prompt,
                status: lesson.status === "closed" ? "closed" : "active",
                updatedAt: input.publishedAt,
                latestBindingId: input.binding.bindingId,
                latestRunId: input.binding.runtime.runId,
                latestBindingStatus: input.binding.status,
                lastErrorMessage: null,
                closedAt: lesson.closedAt,
                artifactCatchupCompletedAt: null,
            });
            return {
                topic: rule.notificationTopic,
                payload: {
                    lessonId,
                    bindingId: input.binding.bindingId,
                    revisionId: input.revisionId,
                    runId: input.runId,
                },
            };
        }));
        if (notification) {
            await context.publishNotification(notification.topic, notification.payload);
        }
    },
});
