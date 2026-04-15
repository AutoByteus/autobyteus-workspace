import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createProcessedEventRepository } from "../repositories/processed-event-repository.js";
const deriveBriefId = (applicationSessionId) => `brief::${applicationSessionId}`;
const deriveFallbackTitle = (applicationSessionId) => `Brief ${applicationSessionId.slice(0, 8)}`;
const preserveTerminalStatus = (nextStatus, currentStatus) => {
    if (currentStatus === "approved" || currentStatus === "rejected") {
        return currentStatus;
    }
    return nextStatus;
};
const BRIEF_ARTIFACT_RULES = {
    researcher: {
        artifactKind: "researcher",
        allowedArtifactTypes: ["research_note", "source_summary", "research_blocker_note"],
        resolveStatus: (artifactType, currentStatus) => preserveTerminalStatus(artifactType === "research_blocker_note" ? "blocked" : "researching", currentStatus),
    },
    writer: {
        artifactKind: "writer",
        allowedArtifactTypes: ["brief_draft", "final_brief", "brief_blocker_note"],
        resolveStatus: (artifactType, currentStatus) => preserveTerminalStatus(artifactType === "brief_blocker_note"
            ? "blocked"
            : artifactType === "final_brief"
                ? "in_review"
                : "draft_ready", currentStatus),
    },
};
const resolveArtifactRule = (memberRouteKey, artifactType) => {
    const rule = BRIEF_ARTIFACT_RULES[memberRouteKey];
    if (!rule) {
        throw new Error(`Unexpected Brief Studio artifact producer '${memberRouteKey}'. Expected 'researcher' or 'writer'.`);
    }
    if (!rule.allowedArtifactTypes.includes(artifactType)) {
        throw new Error(`Unexpected Brief Studio artifactType '${artifactType}' for producer '${memberRouteKey}'. Allowed values: ${rule.allowedArtifactTypes.join(", ")}.`);
    }
    return rule;
};
export const projectArtifact = async (envelope, context) => {
    if (envelope.event.family !== "ARTIFACT") {
        return;
    }
    const event = envelope.event;
    const payload = event.payload;
    const briefId = deriveBriefId(event.applicationSessionId);
    let readyNotification = null;
    withAppDatabase(context.storage.appDatabasePath, (db) => {
        withTransaction(db, () => {
            const briefRepository = createBriefRepository(db);
            const artifactRepository = createArtifactRepository(db);
            const processedEventRepository = createProcessedEventRepository(db);
            if (!processedEventRepository.claimEvent({
                eventId: event.eventId,
                briefId,
                journalSequence: event.journalSequence,
                processedAt: event.publishedAt,
            })) {
                return;
            }
            const currentBrief = briefRepository.getById(briefId);
            const artifactRule = resolveArtifactRule(event.producer.memberRouteKey, payload.artifactType);
            const title = payload.title?.trim() || currentBrief?.title || deriveFallbackTitle(event.applicationSessionId);
            const nextStatus = artifactRule.resolveStatus(payload.artifactType, currentBrief?.status ?? null);
            briefRepository.upsertProjectedBrief({
                briefId,
                applicationSessionId: event.applicationSessionId,
                title,
                status: nextStatus,
                updatedAt: event.publishedAt,
            });
            artifactRepository.upsertArtifact({
                briefId,
                artifactKind: artifactRule.artifactKind,
                artifactKey: payload.artifactKey,
                artifactType: payload.artifactType,
                title,
                summary: payload.summary?.trim() || null,
                artifactRef: payload.artifactRef,
                metadata: payload.metadata ? structuredClone(payload.metadata) : null,
                isFinal: Boolean(payload.isFinal),
                producerMemberRouteKey: event.producer.memberRouteKey,
                updatedAt: event.publishedAt,
            });
            if (artifactRule.artifactKind === "writer" && payload.artifactType === "final_brief") {
                readyNotification = {
                    topic: "brief.ready_for_review",
                    payload: {
                        briefId,
                        applicationSessionId: event.applicationSessionId,
                        eventId: event.eventId,
                        journalSequence: event.journalSequence,
                    },
                };
            }
        });
    });
    const notificationToPublish = readyNotification;
    if (notificationToPublish) {
        await context.publishNotification(notificationToPublish.topic, notificationToPublish.payload);
    }
};
