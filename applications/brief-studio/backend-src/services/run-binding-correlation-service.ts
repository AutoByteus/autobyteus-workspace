import { randomUUID } from "node:crypto";
import type {
  ApplicationHandlerContext,
  ApplicationRunBindingSummary,
} from "@autobyteus/application-backend-sdk";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import {
  createBriefBindingRepository,
  type BriefBindingRecord,
} from "../repositories/brief-binding-repository.js";
import {
  createPendingBindingIntentRepository,
  type PendingBindingIntentRecord,
} from "../repositories/pending-binding-intent-repository.js";

const requireNonEmptyString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const toBindingRecord = (
  briefId: string,
  binding: ApplicationRunBindingSummary,
  updatedAt: string,
): BriefBindingRecord => ({
  briefId,
  bindingId: binding.bindingId,
  bindingIntentId: binding.bindingIntentId,
  runId: binding.runtime.runId,
  createdAt: binding.createdAt,
  updatedAt,
  artifactCatchupCompletedAt: null,
});

const ensureBindingConsistency = (
  pendingIntent: PendingBindingIntentRecord | null,
  existingBinding: BriefBindingRecord | null,
  input: {
    briefId: string;
    binding: ApplicationRunBindingSummary;
  },
): void => {
  if (pendingIntent && pendingIntent.briefId !== input.briefId) {
    throw new Error(
      `Pending binding intent '${input.binding.bindingIntentId}' belongs to brief '${pendingIntent.briefId}', not '${input.briefId}'.`,
    );
  }
  if (pendingIntent?.bindingId && pendingIntent.bindingId !== input.binding.bindingId) {
    throw new Error(
      `Pending binding intent '${input.binding.bindingIntentId}' is already attached to binding '${pendingIntent.bindingId}'.`,
    );
  }
  if (existingBinding && existingBinding.briefId !== input.briefId) {
    throw new Error(
      `Binding '${input.binding.bindingId}' is already attached to brief '${existingBinding.briefId}'.`,
    );
  }
};

const requireBindingIntentId = (binding: ApplicationRunBindingSummary): string =>
  requireNonEmptyString(binding.bindingIntentId, "binding.bindingIntentId");

export const createRunBindingCorrelationService = (context: ApplicationHandlerContext) => ({
  createPendingBindingIntent(briefId: string): PendingBindingIntentRecord {
    const createdAt = new Date().toISOString();
    const pendingIntent: PendingBindingIntentRecord = {
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

  finalizeBindingForBrief(input: {
    briefId: string;
    binding: ApplicationRunBindingSummary;
    committedAt?: string;
  }): void {
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

  resolveBriefIdForBinding(binding: ApplicationRunBindingSummary): string {
    const bindingIntentId = requireBindingIntentId(binding);

    return withAppDatabase(context.storage.appDatabasePath, (db) =>
      withTransaction(db, () => {
        const briefBindingRepository = createBriefBindingRepository(db);
        const existingBinding = briefBindingRepository.getByBindingId(binding.bindingId);
        if (existingBinding) {
          return existingBinding.briefId;
        }

        const pendingIntentRepository = createPendingBindingIntentRepository(db);
        const pendingIntent = pendingIntentRepository.getByBindingIntentId(bindingIntentId);
        if (!pendingIntent) {
          throw new Error(
            `Brief Studio could not resolve binding '${binding.bindingId}' from bindingIntentId '${bindingIntentId}'.`,
          );
        }

        const committedAt = new Date().toISOString();
        briefBindingRepository.upsertBinding(toBindingRecord(pendingIntent.briefId, binding, committedAt));
        pendingIntentRepository.markCommitted({
          bindingIntentId,
          bindingId: binding.bindingId,
          committedAt,
        });
        return pendingIntent.briefId;
      }),
    );
  },

  async reconcileBindingIntent(bindingIntentId: string): Promise<{
    briefId: string;
    binding: ApplicationRunBindingSummary;
  } | null> {
    const normalizedBindingIntentId = requireNonEmptyString(bindingIntentId, "bindingIntentId");
    const pendingIntent = withAppDatabase(context.storage.appDatabasePath, (db) =>
      createPendingBindingIntentRepository(db).getByBindingIntentId(normalizedBindingIntentId),
    );
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

  listBindingIdsByBriefId(briefId: string): string[] {
    const normalizedBriefId = requireNonEmptyString(briefId, "briefId");
    return withAppDatabase(context.storage.appDatabasePath, (db) =>
      createBriefBindingRepository(db)
        .listByBriefId(normalizedBriefId)
        .map((binding) => binding.bindingId),
    );
  },
});
