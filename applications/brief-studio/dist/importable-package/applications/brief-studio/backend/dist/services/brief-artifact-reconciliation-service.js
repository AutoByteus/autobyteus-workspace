import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { createBriefArtifactRevisionRepository } from "../repositories/brief-artifact-revision-repository.js";
import { createBriefBindingRepository } from "../repositories/brief-binding-repository.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { resolveBriefArtifactPathRule } from "./brief-artifact-paths.js";
import { createRunBindingCorrelationService } from "./run-binding-correlation-service.js";
const TERMINAL_BINDING_STATUSES = new Set(["TERMINATED", "FAILED", "ORPHANED"]);
const isTerminalBinding = (binding) => TERMINAL_BINDING_STATUSES.has(binding.status);
const resolveBindingRunIds = (binding) => {
    if (binding.runtime.members.length > 0) {
        return binding.runtime.members.map((member) => member.runId);
    }
    return [binding.runtime.runId];
};
const sortArtifacts = (artifacts) => [...artifacts].sort((left, right) => {
    const updatedAtComparison = left.updatedAt.localeCompare(right.updatedAt);
    if (updatedAtComparison !== 0) {
        return updatedAtComparison;
    }
    return left.createdAt.localeCompare(right.createdAt);
});
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
const requireRevisionText = async (context, input) => {
    const text = await context.runtimeControl.getPublishedArtifactRevisionText(input);
    if (typeof text !== "string") {
        throw new Error(`Brief Studio could not read published artifact revision '${input.revisionId}' for run '${input.runId}'.`);
    }
    return text;
};
const buildReadyNotificationPayload = (input) => ({
    topic: "brief.ready_for_review",
    payload: {
        briefId: input.briefId,
        bindingId: input.bindingId,
        revisionId: input.revisionId,
        runId: input.runId,
    },
});
export const createBriefArtifactReconciliationService = (context) => ({
    async handlePersistedArtifact(event) {
        await this.projectArtifactRevision({
            binding: event.binding,
            producer: event.producer,
            runId: event.runId,
            revisionId: event.revisionId,
            path: event.path,
            description: event.description,
            publishedAt: event.publishedAt,
        });
    },
    async reconcilePublishedArtifacts() {
        const bindings = await context.runtimeControl.listRunBindings(null);
        for (const binding of bindings) {
            const correlationService = createRunBindingCorrelationService(context);
            correlationService.resolveBriefIdForBinding(binding);
            const bindingRecord = withAppDatabase(context.storage.appDatabasePath, (db) => createBriefBindingRepository(db).getByBindingId(binding.bindingId));
            if (isTerminalBinding(binding) && bindingRecord?.artifactCatchupCompletedAt) {
                continue;
            }
            const runIds = resolveBindingRunIds(binding);
            for (const runId of runIds) {
                const producer = resolveProducerForRun(binding, runId);
                if (!producer) {
                    continue;
                }
                const publishedArtifacts = sortArtifacts(await context.runtimeControl.getRunPublishedArtifacts(runId));
                for (const artifact of publishedArtifacts) {
                    await this.projectArtifactRevision({
                        binding,
                        producer,
                        runId,
                        revisionId: artifact.revisionId,
                        path: artifact.path,
                        description: artifact.description,
                        publishedAt: artifact.updatedAt,
                    });
                }
            }
            if (isTerminalBinding(binding)) {
                withAppDatabase(context.storage.appDatabasePath, (db) => {
                    createBriefBindingRepository(db).markArtifactCatchupCompleted(binding.bindingId, new Date().toISOString());
                });
            }
        }
    },
    async projectArtifactRevision(input) {
        if (!input.producer?.memberRouteKey) {
            throw new Error("Brief Studio artifact projection requires producer.memberRouteKey.");
        }
        const producer = input.producer;
        const briefId = createRunBindingCorrelationService(context).resolveBriefIdForBinding(input.binding);
        const pathRule = resolveBriefArtifactPathRule(producer.memberRouteKey, input.path);
        const body = await requireRevisionText(context, {
            runId: input.runId,
            revisionId: input.revisionId,
        });
        const projectedAt = new Date().toISOString();
        const readyNotification = withAppDatabase(context.storage.appDatabasePath, (db) => withTransaction(db, () => {
            const briefRepository = createBriefRepository(db);
            const artifactRepository = createArtifactRepository(db);
            const bindingRepository = createBriefBindingRepository(db);
            const revisionRepository = createBriefArtifactRevisionRepository(db);
            const brief = briefRepository.getById(briefId);
            if (!brief) {
                throw new Error(`Brief '${briefId}' was not found during artifact projection.`);
            }
            if (!revisionRepository.claimRevision({
                revisionId: input.revisionId,
                briefId,
                bindingId: input.binding.bindingId,
                runId: input.runId,
                artifactKind: pathRule.artifactKind,
                publicationKind: pathRule.publicationKind,
                path: input.path,
                producerMemberRouteKey: producer.memberRouteKey,
                publishedAt: input.publishedAt,
                projectedAt,
            })) {
                return null;
            }
            bindingRepository.clearArtifactCatchupCompleted(input.binding.bindingId);
            artifactRepository.upsertArtifact({
                briefId,
                artifactKind: pathRule.artifactKind,
                publicationKind: pathRule.publicationKind,
                revisionId: input.revisionId,
                path: input.path,
                description: input.description ?? null,
                body,
                producerMemberRouteKey: producer.memberRouteKey,
                updatedAt: input.publishedAt,
            });
            briefRepository.upsertProjectedBrief({
                briefId,
                title: brief.title,
                status: pathRule.resolveStatus(brief.status),
                updatedAt: input.publishedAt,
                latestBindingId: input.binding.bindingId,
                latestRunId: input.binding.runtime.runId,
                latestBindingStatus: input.binding.status,
                lastErrorMessage: null,
            });
            return pathRule.readyForReview
                ? buildReadyNotificationPayload({
                    briefId,
                    bindingId: input.binding.bindingId,
                    revisionId: input.revisionId,
                    runId: input.runId,
                })
                : null;
        }));
        if (readyNotification) {
            await context.publishNotification(readyNotification.topic, readyNotification.payload);
        }
    },
});
