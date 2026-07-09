import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelfEvolutionRecordLifecycle } from "../../src/self-evolution/services/self-evolution-record-lifecycle.js";
import { SelfEvolutionRunStore } from "../../src/self-evolution/services/self-evolution-run-store.js";
import type { SelfEvolutionRequest } from "../../src/self-evolution/domain/models.js";

const request: SelfEvolutionRequest = {
  evolutionRunId: "evo-override",
  triggerStrategy: "manual_only",
  target: { kind: "agent_run", runId: "target-run" },
  effectiveConfig: {
    enabled: true,
    triggerStrategy: "manual_only",
    evolverStrategy: "single_agent",
    evolverAgentDefinitionId: "autobyteus-skill-evolver",
    resolvedAt: "2026-01-01T00:00:00.000Z",
    sourceTrace: [],
  },
  requestedAt: "2026-01-01T00:00:00.000Z",
  requestedFrom: "api",
};

describe("SelfEvolutionRecordLifecycle direct outcome summaries", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-record-lifecycle-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("uses improver-authored send_message_to summary without sending duplicate generic notification", async () => {
    const notify = vi.fn(async () => ({ status: "sent_active_idle" }));
    const lifecycle = new SelfEvolutionRecordLifecycle({
      runStore: new SelfEvolutionRunStore(tempDir),
      notificationService: { notify } as any,
    });
    const initial = lifecycle.buildInitialRecord(request);
    await lifecycle.patchRecord(initial, {});

    const finalRecord = await lifecycle.finalizeRecord(initial, "completed", {
      status: "send_message_sent",
      message: "improver outcome delivered",
      targetAgentRunId: "target-run",
      evolverRunId: "evolver-run",
    });

    expect(finalRecord.notificationSummary).toEqual({
      status: "send_message_sent",
      message: "improver outcome delivered",
      targetAgentRunId: "target-run",
      evolverRunId: "evolver-run",
    });
    expect(notify).not.toHaveBeenCalled();
  });
});
