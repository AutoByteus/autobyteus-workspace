import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationBundle } from "../../../src/application-bundles/domain/models.js";
import { ApplicationAgentToolWorkerInvoker } from "../../../src/application-agent-tools/services/application-agent-tool-worker-invoker.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { createApplicationEngineTestRuntime } from "./application-engine-test-runtime.js";

const APPLICATION_ID = "built-in:applications__agent-tool-worker";
const TOOL_NAME = "record_caller";

const createBundle = (applicationRootPath: string): ApplicationBundle => ({
  id: APPLICATION_ID,
  localApplicationId: "agent-tool-worker",
  packageId: "built-in:applications",
  name: "Agent Tool Worker",
  description: "Real child-worker fixture for application-owned Agent Tools",
  iconAssetPath: null,
  entryHtmlAssetPath: "/application-bundles/agent-tool-worker/assets/ui/index.html",
  runtimeTarget: { kind: "AGENT", localId: "agent", definitionId: "agent-def" },
  writable: true,
  applicationRootPath,
  packageRootPath: path.dirname(path.dirname(applicationRootPath)),
  localAgentIds: ["agent"],
  localTeamIds: [],
  agentTools: [{
    name: TOOL_NAME,
    description: "Records exact caller provenance in application-owned storage.",
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "string", description: "Value to persist." },
        invalidResult: { type: "boolean", description: "Emit an invalid result for boundary proof." },
        crash: { type: "boolean", description: "Crash the worker for failure-path proof." },
      },
      required: ["value"],
    },
  }],
  entryHtmlRelativePath: "ui/index.html",
  iconRelativePath: null,
  backend: {
    manifestPath: path.join(applicationRootPath, "backend", "bundle.json"),
    manifestRelativePath: "backend/bundle.json",
    entryModulePath: path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
    entryModuleRelativePath: "backend/dist/entry.mjs",
    moduleFormat: "esm",
    distribution: "self-contained",
    targetRuntime: { engine: "node", semver: ">=22 <23" },
    sdkCompatibility: {
      backendDefinitionContractVersion: "7",
      frontendSdkContractVersion: "6",
    },
    supportedExposures: {
      queries: false,
      commands: false,
      routes: false,
      graphql: false,
      notifications: false,
      eventHandlers: false,
      webSockets: false,
    },
    migrationsDirPath: null,
    migrationsDirRelativePath: null,
    assetsDirPath: null,
    assetsDirRelativePath: null,
  },
});

const writeBackend = async (applicationRootPath: string): Promise<void> => {
  await fs.mkdir(path.join(applicationRootPath, "backend", "dist"), { recursive: true });
  await fs.mkdir(path.join(applicationRootPath, "ui"), { recursive: true });
  await fs.writeFile(
    path.join(applicationRootPath, "backend", "dist", "entry.mjs"),
    `import { DatabaseSync } from 'node:sqlite'

export default {
  definitionContractVersion: '7',
  agentToolHandlers: {
    '${TOOL_NAME}': async (args, context) => {
      if (args.crash) process.exit(19)
      if (args.invalidResult) return { content: [{ type: 'unsupported', value: true }] }
      const db = new DatabaseSync(context.storage.appDatabasePath)
      try {
        db.exec('CREATE TABLE IF NOT EXISTS calls (value TEXT, application_id TEXT, binding_id TEXT, agent_run_id TEXT, member_address TEXT)')
        db.prepare('INSERT INTO calls VALUES (?, ?, ?, ?, ?)').run(
          args.value,
          context.caller.applicationId,
          context.caller.bindingId,
          context.caller.agentRunId,
          context.caller.memberAddress ?? null,
        )
      } finally {
        db.close()
      }
      return {
        content: [
          { type: 'text', text: 'stored:' + args.value },
          { type: 'resource_link', name: 'record', uri: 'app://records/' + encodeURIComponent(args.value) },
        ],
        structuredContent: { arguments: args, caller: context.caller },
      }
    },
  },
}
`,
    "utf8",
  );
};

describe("application Agent Tool real child worker integration", () => {
  let tempRoot: string;
  let applicationRootPath: string;
  let runtime: ReturnType<typeof createApplicationEngineTestRuntime> | null;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-agent-tool-worker-"));
    applicationRootPath = path.join(tempRoot, "bundle", "applications", "agent-tool-worker");
    runtime = null;
    await writeBackend(applicationRootPath);
  });

  afterEach(async () => {
    if (runtime) {
      await runtime.engineLauncher.stop(APPLICATION_ID);
      runtime.backendGateway.dispose();
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("lazy-starts the real worker, invokes the exact v7 handler, and supplies isolated storage plus caller context", async () => {
    const bundle = createBundle(applicationRootPath);
    const bundleService = {
      getApplicationById: vi.fn(async (applicationId: string) => applicationId === APPLICATION_ID ? bundle : null),
    };
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot } as never,
      applicationBundleService: bundleService as never,
    });
    runtime = createApplicationEngineTestRuntime({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
    });
    const invoker = new ApplicationAgentToolWorkerInvoker({
      controller: runtime.engineController,
      launcher: runtime.engineLauncher,
    });
    const caller = {
      applicationId: APPLICATION_ID,
      bindingId: "binding-team-1",
      agentRunId: "member-run-1",
      memberAddress: "/researcher",
    };
    const args = { value: "alpha" };

    expect(runtime.engineController.getStatus(APPLICATION_ID).state).toBe("stopped");
    await expect(invoker.invoke({
      applicationId: APPLICATION_ID,
      toolName: TOOL_NAME,
      arguments: args,
      caller,
    })).resolves.toEqual({
      content: [
        { type: "text", text: "stored:alpha" },
        { type: "resource_link", name: "record", uri: "app://records/alpha" },
      ],
      structuredContent: { arguments: args, caller },
    });
    expect(runtime.engineController.getStatus(APPLICATION_ID)).toMatchObject({
      state: "ready",
      ready: true,
    });

    const layout = storageLifecycleService.getStorageLayout(APPLICATION_ID);
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(layout.appDatabasePath);
    try {
      expect(db.prepare("SELECT * FROM calls").get()).toEqual({
        value: "alpha",
        application_id: APPLICATION_ID,
        binding_id: "binding-team-1",
        agent_run_id: "member-run-1",
        member_address: "/researcher",
      });
    } finally {
      db.close();
    }
  });

  it("rejects an invalid handler result across the real worker protocol without retrying", async () => {
    const bundle = createBundle(applicationRootPath);
    const bundleService = {
      getApplicationById: vi.fn(async (applicationId: string) => applicationId === APPLICATION_ID ? bundle : null),
    };
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot } as never,
      applicationBundleService: bundleService as never,
    });
    runtime = createApplicationEngineTestRuntime({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
    });
    const controllerInvoke = vi.spyOn(runtime.engineController, "invokeApplicationAgentTool");
    const invoker = new ApplicationAgentToolWorkerInvoker({
      controller: runtime.engineController,
      launcher: runtime.engineLauncher,
    });

    await expect(invoker.invoke({
      applicationId: APPLICATION_ID,
      toolName: TOOL_NAME,
      arguments: { value: "bad", invalidResult: true },
      caller: {
        applicationId: APPLICATION_ID,
        bindingId: "binding-1",
        agentRunId: "run-1",
      },
    })).rejects.toMatchObject({ code: "APPLICATION_TOOL_EXECUTION_FAILED" });
    expect(controllerInvoke).toHaveBeenCalledTimes(1);
  });

  it("fails safely when the real child worker crashes and does not retry the invocation", async () => {
    const bundle = createBundle(applicationRootPath);
    const bundleService = {
      getApplicationById: vi.fn(async (applicationId: string) => applicationId === APPLICATION_ID ? bundle : null),
    };
    const storageLifecycleService = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => tempRoot } as never,
      applicationBundleService: bundleService as never,
    });
    runtime = createApplicationEngineTestRuntime({
      applicationBundleService: bundleService as never,
      storageLifecycleService,
    });
    const controllerInvoke = vi.spyOn(runtime.engineController, "invokeApplicationAgentTool");
    const invoker = new ApplicationAgentToolWorkerInvoker({
      controller: runtime.engineController,
      launcher: runtime.engineLauncher,
    });

    await expect(invoker.invoke({
      applicationId: APPLICATION_ID,
      toolName: TOOL_NAME,
      arguments: { value: "crash", crash: true },
      caller: {
        applicationId: APPLICATION_ID,
        bindingId: "binding-1",
        agentRunId: "run-1",
      },
    })).rejects.toMatchObject({ code: "APPLICATION_TOOL_EXECUTION_FAILED" });
    expect(controllerInvoke).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(runtime!.engineController.getStatus(APPLICATION_ID)).toMatchObject({
        state: "failed",
        ready: false,
      });
    });
  });
});
