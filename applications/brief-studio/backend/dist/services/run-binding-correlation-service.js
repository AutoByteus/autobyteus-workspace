import { randomUUID } from "node:crypto";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createBriefBindingRepository, } from "../repositories/brief-binding-repository.js";
import { createPendingBindingIntentRepository, } from "../repositories/pending-binding-intent-repository.js";
const requireNonEmptyString = (value, fieldName) => {
    const normalized = value.trim();
    if (!normalized) {
        throw new Error(`${fieldName} is required.`);
    }
    return normalized;
};
const toBindingRecord = (briefId, binding, updatedAt) => ({
    briefId,
    bindingId: binding.bindingId,
    bindingIntentId: binding.bindingIntentId,
    runId: binding.runtime.runId,
    createdAt: binding.createdAt,
    updatedAt,
    artifactCatchupCompletedAt: null,
});
const ensureBindingConsistency = (pendingIntent, existingBinding, input) => {
    if (pendingIntent && pendingIntent.briefId !== input.briefId) {
        throw new Error(`Pending binding intent '${input.binding.bindingIntentId}' belongs to brief '${pendingIntent.briefId}', not '${input.briefId}'.`);
    }
    if (pendingIntent?.bindingId && pendingIntent.bindingId !== input.binding.bindingId) {
        throw new Error(`Pending binding intent '${input.binding.bindingIntentId}' is already attached to binding '${pendingIntent.bindingId}'.`);
    }
    if (existingBinding && existingBinding.briefId !== input.briefId) {
        throw new Error(`Binding '${input.binding.bindingId}' is already attached to brief '${existingBinding.briefId}'.`);
    }
};
const requireBindingIntentId = (binding) => requireNonEmptyString(binding.bindingIntentId, "binding.bindingIntentId");
export const createRunBindingCorrelationService = (context) => ({
    createPendingBindingIntent(briefId) {
        const createdAt = new Date().toISOString();
        const pendingIntent = {
            bindingIntentId: `brief-binding-intent-${randomUUID()}`,
            briefId: requireNonEmptyString(briefId, "briefId"),
            status: "PENDING_START",
            bindingId: null,
            createdAt,
            updatedAt: createdAt,
            committedAt: null,
        };
        withAppDatabase(context.storage.appDatabasePath, (db) => {
            withTransaction(db, () => {
                createPendingBindingIntentRepository(db).insertPendingIntent(pendingIntent);
            });
        });
        return pendingIntent;
    },
    finalizeBindingForBrief(input) {
        const bindingIntentId = requireBindingIntentId(input.binding);
        const briefId = requireNonEmptyString(input.briefId, "briefId");
        const committedAt = input.committedAt ?? new Date().toISOString();
        withAppDatabase(context.storage.appDatabasePath, (db) => {
            withTransaction(db, () => {
                const pendingIntentRepository = createPendingBindingIntentRepository(db);
                const briefBindingRepository = createBriefBindingRepository(db);
                const pendingIntent = pendingIntentRepository.getByBindingIntentId(bindingIntentId);
                const existingBinding = briefBindingRepository.getByBindingId(input.binding.bindingId);
                ensureBindingConsistency(pendingIntent, existingBinding, { briefId, binding: input.binding });
                briefBindingRepository.upsertBinding({
                    ...toBindingRecord(briefId, input.binding, committedAt),
                    artifactCatchupCompletedAt: existingBinding?.artifactCatchupCompletedAt ?? null,
                });
                if (pendingIntent) {
                    pendingIntentRepository.markCommitted({
                        bindingIntentId,
                        bindingId: input.binding.bindingId,
                        committedAt,
                    });
                }
            });
        });
    },
    resolveBriefIdForBinding(binding) {
        const bindingIntentId = requireBindingIntentId(binding);
        return withAppDatabase(context.storage.appDatabasePath, (db) => withTransaction(db, () => {
            const briefBindingRepository = createBriefBindingRepository(db);
            const existingBinding = briefBindingRepository.getByBindingId(binding.bindingId);
            if (existingBinding) {
                return existingBinding.briefId;
            }
            const pendingIntentRepository = createPendingBindingIntentRepository(db);
            const pendingIntent = pendingIntentRepository.getByBindingIntentId(bindingIntentId);
            if (!pendingIntent) {
                throw new Error(`Brief Studio could not resolve binding '${binding.bindingId}' from bindingIntentId '${bindingIntentId}'.`);
            }
            const committedAt = new Date().toISOString();
            briefBindingRepository.upsertBinding(toBindingRecord(pendingIntent.briefId, binding, committedAt));
            pendingIntentRepository.markCommitted({
                bindingIntentId,
                bindingId: binding.bindingId,
                committedAt,
            });
            return pendingIntent.briefId;
        }));
    },
    async reconcileBindingIntent(bindingIntentId) {
        const normalizedBindingIntentId = requireNonEmptyString(bindingIntentId, "bindingIntentId");
        const pendingIntent = withAppDatabase(context.storage.appDatabasePath, (db) => createPendingBindingIntentRepository(db).getByBindingIntentId(normalizedBindingIntentId));
        if (!pendingIntent) {
            return null;
        }
        const binding = await context.runtimeControl.getRunBindingByIntentId(normalizedBindingIntentId);
        if (!binding) {
            return null;
        }
        this.finalizeBindingForBrief({
            briefId: pendingIntent.briefId,
            binding,
        });
        return {
            briefId: pendingIntent.briefId,
            binding,
        };
    },
    listBindingIdsByBriefId(briefId) {
        const normalizedBriefId = requireNonEmptyString(briefId, "briefId");
        return withAppDatabase(context.storage.appDatabasePath, (db) => createBriefBindingRepository(db)
            .listByBriefId(normalizedBriefId)
            .map((binding) => binding.bindingId));
    },
});
