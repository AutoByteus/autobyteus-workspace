import { beforeEach, describe, expect, it, vi } from "vitest";
import { listLifecycleProcessors } from "../../../../src/agent-tools/tool-management/list-lifecycle-processors.js";
import {
  defaultLifecycleEventProcessorRegistry,
  LifecycleEventProcessorDefinition,
  BaseLifecycleEventProcessor,
  LifecycleEvent,
} from "autobyteus-ts";

class FirstProcessor extends BaseLifecycleEventProcessor {
  static getOrder(): number {
    return 10;
  }

  static isMandatory(): boolean {
    return true;
  }

  get event(): LifecycleEvent {
    return LifecycleEvent.AGENT_CREATED;
  }

  async process(): Promise<void> {
    return;
  }
}

class SecondProcessor extends BaseLifecycleEventProcessor {
  static getOrder(): number {
    return 20;
  }

  get event(): LifecycleEvent {
    return LifecycleEvent.AGENT_CREATED;
  }

  async process(): Promise<void> {
    return;
  }
}

describe("listLifecycleProcessors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns processor metadata sorted by order", async () => {
    const definitions = {
      second: new LifecycleEventProcessorDefinition("second", SecondProcessor),
      first: new LifecycleEventProcessorDefinition("first", FirstProcessor),
    };
    vi.spyOn(defaultLifecycleEventProcessorRegistry, "getAllDefinitions").mockReturnValue(
      definitions,
    );

    const result = await listLifecycleProcessors({ agentId: "test-agent" } as any);
    const data = JSON.parse(result) as Array<Record<string, unknown>>;

    expect(data).toHaveLength(2);
    expect(data[0]?.name).toBe("first");
    expect(data[0]?.is_mandatory).toBe(true);
    expect(data[0]?.order).toBe(10);
    expect(data[1]?.name).toBe("second");
  });
});
