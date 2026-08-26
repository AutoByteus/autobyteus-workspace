import type {
  ApplicationExecutionProducer,
  ApplicationHandlerContext,
  ApplicationPublishedArtifactEvent,
  ApplicationAgentBinding,
  ApplicationAgentTeamBinding,
} from "@autobyteus/application-backend-sdk";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createArtifactRepository } from "../repositories/artifact-repository.js";
import { createBriefArtifactRevisionRepository } from "../repositories/brief-artifact-revision-repository.js";
import { createBriefBindingRepository } from "../repositories/brief-binding-repository.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import {
  findBriefArtifactPathRule,
  resolveBriefArtifactPathRule,
} from "./brief-artifact-paths.js";
import { createRunBindingCorrelationService } from "./run-binding-correlation-service.js";

const TERMINAL_BINDING_STATUSES = new Set(["TERMINATED", "FAILED", "ORPHANED"]);

const isTerminalBinding = (binding: ApplicationAgentBinding | ApplicationAgentTeamBinding): boolean =>
  TERMINAL_BINDING_STATUSES.has(binding.status);

const resolveBindingRunIds = (binding: ApplicationAgentBinding | ApplicationAgentTeamBinding): string[] => {
  if (binding.runtime.members.length > 0) {
    return binding.runtime.members.map((member) => member.agentRunId);
  }
  return [binding.runtime.subject === "AGENT_RUN" ? binding.runtime.agentRunId : binding.runtime.teamRunId];
};

const sortArtifacts = <T extends { updatedAt: string; createdAt: string }>(artifacts: T[]): T[] =>
  [...artifacts].sort((left, right) => {
    const updatedAtComparison = left.updatedAt.localeCompare(right.updatedAt);
    if (updatedAtComparison !== 0) {
      return updatedAtComparison;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });

const resolveProducerForRun = (
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
  runId: string,
): { producer: ApplicationExecutionProducer; memberAddress: string } | null => {
  if (binding.runtime.subject !== "TEAM_RUN") {
    return null;
  }
  const member = binding.runtime.members.find((candidate) => candidate.agentRunId === runId) ?? null;
  if (!member) {
    return null;
  }
  return {
    producer: {
      agentRunId: member.agentRunId,
      displayName: member.displayName,
    },
    memberAddress: member.memberAddress,
  };
};

const requireRevisionText = async (
  context: ApplicationHandlerContext,
  input: { runId: string; revisionId: string },
): Promise<string> => {
  const text = await context.publishedArtifacts.readRevision(input);
  if (typeof text !== "string") {
    throw new Error(
      `Brief Studio could not read published artifact revision '${input.revisionId}' for run '${input.runId}'.`,
    );
  }
  return text;
};

const buildReadyNotificationPayload = (input: {
  briefId: string;
  bindingId: string;
  revisionId: string;
  runId: string;
}): { topic: string; payload: Record<string, string> } => ({
  topic: "brief.ready_for_review",
  payload: {
    briefId: input.briefId,
    bindingId: input.bindingId,
    revisionId: input.revisionId,
    runId: input.runId,
  },
});

export const createBriefArtifactReconciliationService = (context: ApplicationHandlerContext) => ({
  async handlePersistedArtifact(event: ApplicationPublishedArtifactEvent): Promise<void> {
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

  async reconcilePublishedArtifacts(): Promise<void> {
    const bindings = await context.agentExecution.list(null);
    for (const binding of bindings) {
      const correlationService = createRunBindingCorrelationService(context);
      correlationService.resolveBriefIdForBinding(binding);

      const bindingRecord = withAppDatabase(context.storage.appDatabasePath, (db) =>
        createBriefBindingRepository(db).getByBindingId(binding.bindingId),
      );
      if (isTerminalBinding(binding) && bindingRecord?.artifactCatchupCompletedAt) {
        continue;
      }

      const runIds = resolveBindingRunIds(binding);
      for (const runId of runIds) {
        const resolvedProducer = resolveProducerForRun(binding, runId);
        if (!resolvedProducer) {
          continue;
        }
        const publishedArtifacts = sortArtifacts(
          await context.publishedArtifacts.list(runId),
        );
        for (const artifact of publishedArtifacts) {
          if (!findBriefArtifactPathRule(resolvedProducer.memberAddress, artifact.path)) {
            continue;
          }
          await this.projectArtifactRevision({
            binding,
            producer: resolvedProducer.producer,
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
          createBriefBindingRepository(db).markArtifactCatchupCompleted(
            binding.bindingId,
            new Date().toISOString(),
          );
        });
      }
    }
  },

  async projectArtifactRevision(input: {
    binding: ApplicationAgentBinding | ApplicationAgentTeamBinding;
    producer: ApplicationExecutionProducer | null;
    runId: string;
    revisionId: string;
    path: string;
    description: string | null;
    publishedAt: string;
  }): Promise<void> {
    if (!input.producer?.agentRunId) {
      throw new Error("Brief Studio artifact projection requires producer.agentRunId.");
    }
    const producer = input.producer;
    const producerMemberAddress = input.binding.runtime.subject === "TEAM_RUN"
      ? input.binding.runtime.members.find((member) => member.agentRunId === producer.agentRunId)?.memberAddress ?? null
      : null;
    if (!producerMemberAddress) {
      throw new Error(`Brief Studio binding does not contain producer AgentRun '${producer.agentRunId}'.`);
    }

    const briefId = createRunBindingCorrelationService(context).resolveBriefIdForBinding(input.binding);
    const pathRule = resolveBriefArtifactPathRule(producerMemberAddress, input.path);
    const body = await requireRevisionText(context, {
      runId: input.runId,
      revisionId: input.revisionId,
    });
    const projectedAt = new Date().toISOString();

    const readyNotification = withAppDatabase(context.storage.appDatabasePath, (db) =>
      withTransaction(db, () => {
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
          producerMemberAddress,
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
          producerMemberAddress,
          updatedAt: input.publishedAt,
        });
        briefRepository.upsertProjectedBrief({
          briefId,
          title: brief.title,
          status: pathRule.resolveStatus(brief.status),
          updatedAt: input.publishedAt,
          latestBindingId: input.binding.bindingId,
          latestRunId: input.binding.runtime.subject === "AGENT_RUN" ? input.binding.runtime.agentRunId : input.binding.runtime.teamRunId,
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
      }),
    );

    if (readyNotification) {
      await context.publishNotification(readyNotification.topic, readyNotification.payload);
    }
  },
});
