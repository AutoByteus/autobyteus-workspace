import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tokenLifecycleHarness = vi.hoisted(() => ({
  enrichmentConstructed: vi.fn(),
  enrichmentQuiesced: vi.fn(),
  persistenceConstructed: vi.fn(),
  persistenceQuiesced: vi.fn(),
}));

vi.mock(
  "../../../../src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.js",
  () => ({
    TokenUsageEventEnrichmentTransformer: class {
      constructor() {
        tokenLifecycleHarness.enrichmentConstructed();
      }

      quiesce(): void {
        tokenLifecycleHarness.enrichmentQuiesced();
      }

      transform(input: { events: readonly unknown[] }): unknown[] {
        return [...input.events];
      }
    },
  }),
);

vi.mock(
  "../../../../src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.js",
  () => ({
    TokenUsageRunPersistenceTransformer: class {
      constructor() {
        tokenLifecycleHarness.persistenceConstructed();
      }

      quiesce(): void {
        tokenLifecycleHarness.persistenceQuiesced();
      }

      transform(input: { events: readonly unknown[] }): unknown[] {
        return [...input.events];
      }
    },
  }),
);

import {
  getDefaultAgentRunEventPipeline,
  resetDefaultAgentRunEventPipelineForTests,
  stopDefaultAgentRunEventPipeline,
} from "../../../../src/agent-execution/events/default-agent-run-event-pipeline.js";

describe("default agent-run event pipeline lifecycle", () => {
  beforeEach(async () => {
    await resetDefaultAgentRunEventPipelineForTests();
    tokenLifecycleHarness.enrichmentConstructed.mockClear();
    tokenLifecycleHarness.enrichmentQuiesced.mockClear();
    tokenLifecycleHarness.persistenceConstructed.mockClear();
    tokenLifecycleHarness.persistenceQuiesced.mockClear();
  });

  afterEach(async () => {
    await resetDefaultAgentRunEventPipelineForTests();
  });

  it("does not construct token persistence when stopped before the first getter", async () => {
    await stopDefaultAgentRunEventPipeline();

    const stoppedComposition = getDefaultAgentRunEventPipeline();
    expect(getDefaultAgentRunEventPipeline()).toBe(stoppedComposition);
    expect(tokenLifecycleHarness.enrichmentConstructed).not.toHaveBeenCalled();
    expect(tokenLifecycleHarness.persistenceConstructed).not.toHaveBeenCalled();
    expect(tokenLifecycleHarness.persistenceQuiesced).not.toHaveBeenCalled();
  });

  it("retains the stopped composition and restarts only through the explicit reset hook", async () => {
    const acceptingComposition = getDefaultAgentRunEventPipeline();
    expect(tokenLifecycleHarness.enrichmentConstructed).toHaveBeenCalledOnce();
    expect(tokenLifecycleHarness.persistenceConstructed).toHaveBeenCalledOnce();

    await stopDefaultAgentRunEventPipeline();
    expect(getDefaultAgentRunEventPipeline()).toBe(acceptingComposition);
    expect(tokenLifecycleHarness.enrichmentConstructed).toHaveBeenCalledOnce();
    expect(tokenLifecycleHarness.persistenceConstructed).toHaveBeenCalledOnce();
    expect(tokenLifecycleHarness.enrichmentQuiesced).toHaveBeenCalledOnce();
    expect(tokenLifecycleHarness.persistenceQuiesced).toHaveBeenCalledOnce();

    await stopDefaultAgentRunEventPipeline();
    expect(getDefaultAgentRunEventPipeline()).toBe(acceptingComposition);
    expect(tokenLifecycleHarness.enrichmentConstructed).toHaveBeenCalledOnce();
    expect(tokenLifecycleHarness.persistenceConstructed).toHaveBeenCalledOnce();

    await resetDefaultAgentRunEventPipelineForTests();
    const resetComposition = getDefaultAgentRunEventPipeline();
    expect(resetComposition).not.toBe(acceptingComposition);
    expect(tokenLifecycleHarness.enrichmentConstructed).toHaveBeenCalledTimes(2);
    expect(tokenLifecycleHarness.persistenceConstructed).toHaveBeenCalledTimes(2);
  });
});
