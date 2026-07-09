import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillImprovementRecordLifecycle } from "../../src/skill-improvement/services/skill-improvement-record-lifecycle.js";
import { SkillImprovementRunStore } from "../../src/skill-improvement/services/skill-improvement-run-store.js";
import type { SkillImprovementRequest } from "../../src/skill-improvement/domain/models.js";

const request: SkillImprovementRequest = {
  improvementRunId: "improvement-override",
  triggerStrategy: "manual_only",
  target: { kind: "agent_run", runId: "target-run" },
  effectiveConfig: {
    enabled: true,
    triggerStrategy: "manual_only",
    improverStrategy: "single_agent",
    improverAgentDefinitionId: "autobyteus-retrospective-skill-improver",
    resolvedAt: "2026-01-01T00:00:00.000Z",
    sourceTrace: [],
  },
  requestedAt: "2026-01-01T00:00:00.000Z",
  requestedFrom: "api",
};

describe("SkillImprovementRecordLifecycle direct outcome summaries", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "skill-improvement-record-lifecycle-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("uses improver-authored send_message_to summary without sending duplicate generic notification", async () => {
    const notify = vi.fn(async () => ({ status: "sent_active_idle" }));
    const lifecycle = new SkillImprovementRecordLifecycle({
      runStore: new SkillImprovementRunStore(tempDir),
      notificationService: { notify } as any,
    });
    const initial = lifecycle.buildInitialRecord(request);
    await lifecycle.patchRecord(initial, {});

    const finalRecord = await lifecycle.finalizeRecord(initial, "completed", {
      status: "send_message_sent",
      message: "improver outcome delivered",
      targetAgentRunId: "target-run",
      improverRunId: "improver-run",
    });

    expect(finalRecord.notificationSummary).toEqual({
      status: "send_message_sent",
      message: "improver outcome delivered",
      targetAgentRunId: "target-run",
      improverRunId: "improver-run",
    });
    expect(notify).not.toHaveBeenCalled();
  });
});
