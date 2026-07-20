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
  createPendingLaunchRequestRepository,
  type PendingLaunchRequestRecord,
} from "../repositories/pending-launch-request-repository.js";

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
  launchRequestId: binding.launchRequestId,
  runId: binding.runtime.runId,
  createdAt: binding.createdAt,
  updatedAt,
  artifactCatchupCompletedAt: null,
});

const ensureBindingConsistency = (
  pendingLaunchRequest: PendingLaunchRequestRecord | null,
  existingBinding: BriefBindingRecord | null,
  input: {
    briefId: string;
    binding: ApplicationRunBindingSummary;
  },
): void => {
  if (pendingLaunchRequest && pendingLaunchRequest.briefId !== input.briefId) {
    throw new Error(
      `Pending launch request '${input.binding.launchRequestId}' belongs to brief '${pendingLaunchRequest.briefId}', not '${input.briefId}'.`,
    );
  }
  if (pendingLaunchRequest?.bindingId && pendingLaunchRequest.bindingId !== input.binding.bindingId) {
    throw new Error(
      `Pending launch request '${input.binding.launchRequestId}' is already attached to binding '${pendingLaunchRequest.bindingId}'.`,
    );
  }
  if (existingBinding && existingBinding.briefId !== input.briefId) {
    throw new Error(
      `Binding '${input.binding.bindingId}' is already attached to brief '${existingBinding.briefId}'.`,
    );
  }
};

const requireLaunchRequestId = (binding: ApplicationRunBindingSummary): string =>
  requireNonEmptyString(binding.launchRequestId, "binding.launchRequestId");

export const createRunBindingCorrelationService = (context: ApplicationHandlerContext) => ({
  createPendingLaunchRequest(briefId: string): PendingLaunchRequestRecord {
    const createdAt = new Date().toISOString();
    const pendingLaunchRequest: PendingLaunchRequestRecord = {
      launchRequestId: `brief-launch-request-${randomUUID()}`,
      briefId: requireNonEmptyString(briefId, "briefId"),
      status: "PENDING_START",
      bindingId: null,
      createdAt,
      updatedAt: createdAt,
      committedAt: null,
    };

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        createPendingLaunchRequestRepository(db).insertPendingLaunchRequest(pendingLaunchRequest);
      });
    });

    return pendingLaunchRequest;
  },

  finalizeBindingForBrief(input: {
    briefId: string;
    binding: ApplicationRunBindingSummary;
    committedAt?: string;
  }): void {
    const launchRequestId = requireLaunchRequestId(input.binding);
    const briefId = requireNonEmptyString(input.briefId, "briefId");
    const committedAt = input.committedAt ?? new Date().toISOString();

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const pendingLaunchRequestRepository = createPendingLaunchRequestRepository(db);
        const briefBindingRepository = createBriefBindingRepository(db);
        const pendingLaunchRequest = pendingLaunchRequestRepository.getByLaunchRequestId(launchRequestId);
        const existingBinding = briefBindingRepository.getByBindingId(input.binding.bindingId);

        ensureBindingConsistency(pendingLaunchRequest, existingBinding, { briefId, binding: input.binding });
        briefBindingRepository.upsertBinding({
          ...toBindingRecord(briefId, input.binding, committedAt),
          artifactCatchupCompletedAt: existingBinding?.artifactCatchupCompletedAt ?? null,
        });
        if (pendingLaunchRequest) {
          pendingLaunchRequestRepository.markCommitted({
            launchRequestId,
            bindingId: input.binding.bindingId,
            committedAt,
          });
        }
      });
    });
  },

  resolveBriefIdForBinding(binding: ApplicationRunBindingSummary): string {
    const launchRequestId = requireLaunchRequestId(binding);

    return withAppDatabase(context.storage.appDatabasePath, (db) =>
      withTransaction(db, () => {
        const briefBindingRepository = createBriefBindingRepository(db);
        const existingBinding = briefBindingRepository.getByBindingId(binding.bindingId);
        if (existingBinding) {
          return existingBinding.briefId;
        }

        const pendingLaunchRequestRepository = createPendingLaunchRequestRepository(db);
        const pendingLaunchRequest = pendingLaunchRequestRepository.getByLaunchRequestId(launchRequestId);
        if (!pendingLaunchRequest) {
          throw new Error(
            `Brief Studio could not resolve binding '${binding.bindingId}' from launchRequestId '${launchRequestId}'.`,
          );
        }

        const committedAt = new Date().toISOString();
        briefBindingRepository.upsertBinding(toBindingRecord(pendingLaunchRequest.briefId, binding, committedAt));
        pendingLaunchRequestRepository.markCommitted({
          launchRequestId,
          bindingId: binding.bindingId,
          committedAt,
        });
        return pendingLaunchRequest.briefId;
      }),
    );
  },

  async reconcileLaunchRequest(launchRequestId: string): Promise<{
    briefId: string;
    binding: ApplicationRunBindingSummary;
  } | null> {
    const normalizedLaunchRequestId = requireNonEmptyString(launchRequestId, "launchRequestId");
    const pendingLaunchRequest = withAppDatabase(context.storage.appDatabasePath, (db) =>
      createPendingLaunchRequestRepository(db).getByLaunchRequestId(normalizedLaunchRequestId),
    );
    if (!pendingLaunchRequest) {
      return null;
    }

    const binding = await context.agentExecution.findByLaunchRequestId(normalizedLaunchRequestId);
    if (!binding) {
      return null;
    }

    this.finalizeBindingForBrief({
      briefId: pendingLaunchRequest.briefId,
      binding,
    });

    return {
      briefId: pendingLaunchRequest.briefId,
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
