import { afterEach, describe, expect, it, vi } from "vitest";

const cutState = vi.hoisted(() => ({ cut: null as string | null }));

vi.mock(
  "../../../src/agent-memory/services/agent-memory-location-service.js",
  async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../src/agent-memory/services/agent-memory-location-service.js")>();
    return {
      ...actual,
      AgentMemoryLocationService: class extends actual.AgentMemoryLocationService {
        constructor(...args: ConstructorParameters<typeof actual.AgentMemoryLocationService>) {
          if (cutState.cut === "K2") throw new Error("K2 plain service failed");
          super(...args);
        }
      },
    };
  },
);

vi.mock(
  "../../../src/agent-execution/services/agent-run-manager.js",
  async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../src/agent-execution/services/agent-run-manager.js")>();
    return {
      ...actual,
      AgentRunManager: class extends actual.AgentRunManager {
        constructor(...args: ConstructorParameters<typeof actual.AgentRunManager>) {
          if (cutState.cut === "K5") throw new Error("K5 Agent graph failed");
          super(...args);
        }
      },
    };
  },
);

vi.mock(
  "../../../src/agent-team-execution/services/agent-team-run-manager.js",
  async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../src/agent-team-execution/services/agent-team-run-manager.js")>();
    return {
      ...actual,
      AgentTeamRunManager: class extends actual.AgentTeamRunManager {
        constructor(...args: ConstructorParameters<typeof actual.AgentTeamRunManager>) {
          if (cutState.cut === "K6") throw new Error("K6 Team graph failed");
          super(...args);
        }
      },
    };
  },
);

vi.mock(
  "../../../src/application-platform/execution/application-execution-shutdown-coordinator.js",
  async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../src/application-platform/execution/application-execution-shutdown-coordinator.js")>();
    return {
      ...actual,
      ApplicationExecutionShutdownCoordinator:
        class extends actual.ApplicationExecutionShutdownCoordinator {
          constructor(
            ...args: ConstructorParameters<
              typeof actual.ApplicationExecutionShutdownCoordinator
            >
          ) {
            if (cutState.cut === "K7") throw new Error("K7 kernel finalization failed");
            super(...args);
          }
        },
    };
  },
);

import type { AgentProviderFactoryBuilder } from "../../../src/agent-execution/providers/agent-provider-factory-builder.js";
import type {
  AgentToolMcpSessionAuthorityFactory,
  ScopedAgentToolMcpSessionAuthority,
} from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { buildApplicationExecutionScopeKernel } from "../../../src/application-platform/execution/application-execution-scope-kernel-builder.js";

const createHarness = (input: {
  beginFailure?: Error;
  completeFailure?: Error;
  providerFailure?: Error;
  closeFailure?: Error;
} = {}) => {
  const runSessions = Object.freeze({
    activateForRun: vi.fn(),
    deactivateForRun: vi.fn(() => 0),
  });
  const close = vi.fn(() => {
    if (input.closeFailure) throw input.closeFailure;
  });
  const authority: ScopedAgentToolMcpSessionAuthority = {
    scopeIdentity: "application:test",
    runSessions,
    assertReady: vi.fn(),
    blockNewSessions: vi.fn(),
    close,
  };
  const abort = vi.fn();
  const complete = vi.fn(() => {
    if (input.completeFailure) throw input.completeFailure;
    return authority;
  });
  const begin = vi.fn(() => {
    if (input.beginFailure) throw input.beginFailure;
    return {
      scopeIdentity: "application:test",
      runSessions,
      complete,
      abort,
    };
  });
  const authorityFactory: AgentToolMcpSessionAuthorityFactory = { begin };
  const createForExecution = vi.fn(() => {
    if (input.providerFailure) throw input.providerFailure;
    return {
      autoByteus: {} as never,
      codex: {} as never,
      claude: {} as never,
    };
  });
  const providerBuilder: AgentProviderFactoryBuilder = { createForExecution };
  const buildInput = {
    scopeIdentity: "application:test" as const,
    memoryDir: "/tmp/application-kernel-builder",
    contextFilePathEnvironment: {
      appDataDir: "/tmp/application-kernel-builder/app-data",
      baseUrl: "http://localhost:8000",
    },
    agentDefinitionService: {} as never,
    agentTeamDefinitionService: {} as never,
    agentToolMcpSessionAuthorities: authorityFactory,
    agentProviderFactoryBuilder: providerBuilder,
    workspaceManager: {} as never,
    bindingReader: { getBinding: vi.fn(async () => null) },
    artifactDeliverySink: { accept: vi.fn(async () => undefined) },
    modelConfigValidator: { validate: vi.fn() },
  };
  return {
    buildInput,
    authority,
    begin,
    complete,
    abort,
    close,
    createForExecution,
  };
};

describe("buildApplicationExecutionScopeKernel construction transaction", () => {
  afterEach(() => {
    cutState.cut = null;
    vi.clearAllMocks();
  });

  it("fails K0 omission/null/undefined validation before authority assembly", () => {
    for (const field of [
      "scopeIdentity",
      "memoryDir",
      "contextFilePathEnvironment",
      "agentDefinitionService",
      "agentTeamDefinitionService",
      "agentToolMcpSessionAuthorities",
      "agentProviderFactoryBuilder",
      "workspaceManager",
      "bindingReader",
      "artifactDeliverySink",
      "modelConfigValidator",
    ] as const) {
      for (const [label, value, omit] of [
        ["omitted", undefined, true],
        ["null", null, false],
        ["undefined", undefined, false],
      ] as const) {
        const harness = createHarness();
        const invalid = { ...harness.buildInput } as Record<string, unknown>;
        if (omit) delete invalid[field];
        else invalid[field] = value;
        expect(() => buildApplicationExecutionScopeKernel(invalid as never), `${field} ${label}`)
          .toThrow();
        expect(harness.begin).not.toHaveBeenCalled();
      }
    }
  });

  it("preserves a K1 begin failure without inventing cleanup", () => {
    const failure = new Error("K1 begin failed");
    const harness = createHarness({ beginFailure: failure });
    expect(() => buildApplicationExecutionScopeKernel(harness.buildInput)).toThrow(failure);
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.abort).not.toHaveBeenCalled();
    expect(harness.close).not.toHaveBeenCalled();
  });

  it.each([
    ["K2", "K2 plain service failed"],
    ["K5", "K5 Agent graph failed"],
    ["K6", "K6 Team graph failed"],
    ["K7", "K7 kernel finalization failed"],
  ] as const)("unwinds the exact owned authority at %s", (cut, message) => {
    const harness = createHarness();
    cutState.cut = cut;
    expect(() => buildApplicationExecutionScopeKernel(harness.buildInput)).toThrow(message);
    if (cut === "K2") {
      expect(harness.complete).not.toHaveBeenCalled();
      expect(harness.abort).toHaveBeenCalledTimes(1);
      expect(harness.close).not.toHaveBeenCalled();
    } else {
      expect(harness.complete).toHaveBeenCalledTimes(1);
      expect(harness.abort).not.toHaveBeenCalled();
      expect(harness.close).toHaveBeenCalledTimes(1);
    }
  });

  it("aborts the incomplete K3 assembly when completion fails", () => {
    const failure = new Error("K3 completion failed");
    const harness = createHarness({ completeFailure: failure });
    expect(() => buildApplicationExecutionScopeKernel(harness.buildInput)).toThrow(failure);
    expect(harness.abort).toHaveBeenCalledTimes(1);
    expect(harness.close).not.toHaveBeenCalled();
  });

  it("closes the completed authority at K4 and preserves primary then cleanup evidence", () => {
    const primary = new Error("K4 provider failed");
    const cleanup = new Error("authority cleanup failed");
    const harness = createHarness({ providerFailure: primary, closeFailure: cleanup });
    expect(() => buildApplicationExecutionScopeKernel(harness.buildInput)).toThrow(
      expect.objectContaining({
        name: "AggregateError",
        message: "Application execution scope construction failed.",
        errors: [primary, cleanup],
      }),
    );
    expect(harness.complete).toHaveBeenCalledTimes(1);
    expect(harness.abort).not.toHaveBeenCalled();
    expect(harness.close).toHaveBeenCalledTimes(1);
  });

  it("transfers one complete frozen K8 kernel with fixed idempotent construction abort", () => {
    const harness = createHarness();
    const kernel = buildApplicationExecutionScopeKernel(harness.buildInput);
    expect(Object.isFrozen(kernel)).toBe(true);
    expect(harness.createForExecution).toHaveBeenCalledWith({
      agentDefinitionService: harness.buildInput.agentDefinitionService,
      agentToolMcpRunSessions: harness.authority.runSessions,
    });
    expect(kernel.sessionAuthority).toBe(harness.authority);

    const agentRunManager = (kernel.agentRunService as unknown as {
      agentRunManager: object;
    }).agentRunManager;
    const teamRunManager = (kernel.teamRunService as unknown as {
      manager: { factory: { options: {
        createTeamManager(input: unknown): object;
      } } };
    }).manager;
    const factoryOptions = teamRunManager.factory.options;
    const callbacks = {
      taskRootResolver: { resolveActiveRoot: vi.fn() },
      publish: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
      acceptPlatformBinding: vi.fn(),
    };
    const constructionInput = {
      context: {} as never,
      subTeamRunFactory: {} as never,
      callbacks,
    };
    const mixedManager = factoryOptions.createTeamManager(constructionInput) as {
      configured: { options: Record<string, unknown> };
      taskAgents: { options: Record<string, unknown> };
    };
    const configured = mixedManager.configured.options;
    const taskAgents = mixedManager.taskAgents.options;
    for (const options of [configured, taskAgents]) {
      expect(options.agentRunManager).toBe(agentRunManager);
      expect(options.memoryLocationService).toBe(kernel.memoryLocationService);
      expect(options.workspaceManager).toBe(harness.buildInput.workspaceManager);
      expect(options.taskRootResolver).toBe(callbacks.taskRootResolver);
      expect(options.publish).toBe(callbacks.publish);
      expect(options.deliverInterAgentMessage)
        .toBe(callbacks.deliverInterAgentMessage);
      expect(options.acceptPlatformBinding).toBe(callbacks.acceptPlatformBinding);
      expect(options.activityInspector).toBeTruthy();
      expect(options.memberTeamContextBuilder).toBeTruthy();
    }
    expect(configured.subTeamRunFactory)
      .toBe(constructionInput.subTeamRunFactory);
    expect(taskAgents.activityInspector).toBe(configured.activityInspector);
    expect(taskAgents.memberTeamContextBuilder)
      .toBe(configured.memberTeamContextBuilder);

    kernel.abortConstruction();
    kernel.abortConstruction();
    expect(harness.close).toHaveBeenCalledTimes(1);
    expect(harness.abort).not.toHaveBeenCalled();
  });
});
