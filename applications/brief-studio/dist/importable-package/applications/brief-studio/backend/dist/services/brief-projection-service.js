import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createProcessedEventRepository } from "../repositories/processed-event-repository.js";
import { createRunBindingCorrelationService } from "./run-binding-correlation-service.js";
const deriveFallbackTitle = (briefId) => `Brief ${briefId.slice(0, 8)}`;
const preserveTerminalStatus = (nextStatus, currentStatus) => {
    if (currentStatus === "approved" || currentStatus === "rejected") {
        return currentStatus;
    }
    return nextStatus;
};
const resolveLifecycleStatus = (family, currentStatus) => {
    switch (family) {
        case "RUN_STARTED":
            return preserveTerminalStatus(currentStatus ?? "researching", currentStatus);
        case "RUN_FAILED":
        case "RUN_ORPHANED":
            return preserveTerminalStatus("blocked", currentStatus);
        case "RUN_TERMINATED":
            return currentStatus ?? "blocked";
        default:
            return currentStatus ?? "researching";
    }
};
export const projectExecutionEvent = async (envelope, context) => {
    const event = envelope.event;
    const briefId = createRunBindingCorrelationService(context).resolveBriefIdForBinding(event.binding);
    withAppDatabase(context.storage.appDatabasePath, (db) => withTransaction(db, () => {
        const briefRepository = createBriefRepository(db);
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
        briefRepository.upsertProjectedBrief({
            briefId,
            title: currentBrief?.title || deriveFallbackTitle(briefId),
            status: resolveLifecycleStatus(event.family, currentBrief?.status ?? null),
            updatedAt: event.publishedAt,
            latestBindingId: event.binding.bindingId,
            latestRunId: event.binding.runtime.runId,
            latestBindingStatus: event.binding.status,
            lastErrorMessage: event.binding.lastErrorMessage ?? null,
        });
    }));
};
