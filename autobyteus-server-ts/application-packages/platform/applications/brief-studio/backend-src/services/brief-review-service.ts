import { randomUUID } from "node:crypto";
import type { ApplicationHandlerContext } from "@autobyteus/application-backend-sdk";
import { withAppDatabase, withTransaction } from "../repositories/app-database.js";
import { createBriefRepository } from "../repositories/brief-repository.js";
import { createReviewNoteRepository } from "../repositories/review-note-repository.js";

const requireBrief = (briefId: string | null | undefined): string => {
  const normalized = typeof briefId === "string" ? briefId.trim() : "";
  if (!normalized) {
    throw new Error("briefId is required.");
  }
  return normalized;
};

export const createBriefReviewService = (context: ApplicationHandlerContext) => ({
  async approveBrief(input: { briefId: string }): Promise<{ briefId: string; status: "approved" }> {
    const briefId = requireBrief(input.briefId);
    const reviewedAt = new Date().toISOString();

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const briefRepository = createBriefRepository(db);
        if (!briefRepository.getById(briefId)) {
          throw new Error(`Brief '${briefId}' was not found.`);
        }
        briefRepository.setStatus({
          briefId,
          status: "approved",
          updatedAt: reviewedAt,
          approvedAt: reviewedAt,
          rejectedAt: null,
        });
      });
    });

    await context.publishNotification("brief.review_updated", {
      briefId,
      status: "approved",
      reviewedAt,
    });
    return { briefId, status: "approved" };
  },

  async rejectBrief(input: { briefId: string; reason?: string | null }): Promise<{ briefId: string; status: "rejected" }> {
    const briefId = requireBrief(input.briefId);
    const reviewedAt = new Date().toISOString();
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const briefRepository = createBriefRepository(db);
        const reviewNoteRepository = createReviewNoteRepository(db);
        if (!briefRepository.getById(briefId)) {
          throw new Error(`Brief '${briefId}' was not found.`);
        }
        briefRepository.setStatus({
          briefId,
          status: "rejected",
          updatedAt: reviewedAt,
          approvedAt: null,
          rejectedAt: reviewedAt,
        });
        if (reason) {
          reviewNoteRepository.insertNote({
            noteId: randomUUID(),
            briefId,
            body: reason,
            createdAt: reviewedAt,
          });
        }
      });
    });

    await context.publishNotification("brief.review_updated", {
      briefId,
      status: "rejected",
      reviewedAt,
      reason: reason || null,
    });
    return { briefId, status: "rejected" };
  },

  async addReviewNote(input: { briefId: string; body: string }): Promise<{ briefId: string; noteId: string }> {
    const briefId = requireBrief(input.briefId);
    const body = typeof input.body === "string" ? input.body.trim() : "";
    if (!body) {
      throw new Error("body is required.");
    }

    const noteId = randomUUID();
    const createdAt = new Date().toISOString();

    withAppDatabase(context.storage.appDatabasePath, (db) => {
      withTransaction(db, () => {
        const briefRepository = createBriefRepository(db);
        const reviewNoteRepository = createReviewNoteRepository(db);
        const existing = briefRepository.getById(briefId);
        if (!existing) {
          throw new Error(`Brief '${briefId}' was not found.`);
        }
        reviewNoteRepository.insertNote({
          noteId,
          briefId,
          body,
          createdAt,
        });
        if (existing.status !== "approved" && existing.status !== "rejected") {
          briefRepository.setStatus({
            briefId,
            status: "in_review",
            updatedAt: createdAt,
            approvedAt: existing.approvedAt,
            rejectedAt: existing.rejectedAt,
          });
        }
      });
    });

    await context.publishNotification("brief.note_added", {
      briefId,
      noteId,
      createdAt,
    });
    return { briefId, noteId };
  },
});
