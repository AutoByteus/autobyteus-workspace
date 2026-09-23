import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { CodexAgentRunContext } from "../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexAppServerClient } from "../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { CodexClientThreadRouter } from "../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { CodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { CodexApprovalPolicy } from "../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { CodexThreadEventName } from "../../../src/agent-execution/backends/codex/events/codex-thread-event-name.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";

const ids = ["gpt-6-astra", "gpt-6-sol", "gpt-6-luna"];
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "api-e2e-codex-gpt6-"));
const clientManager = new CodexAppServerClientManager({
  createClient: cwd => new CodexAppServerClient({command: "codex", args: ["app-server"], cwd, requestTimeoutMs: 45000}),
});
const threadManager = new CodexThreadManager(clientManager, undefined, new CodexClientThreadRouter());
const ownedRunIds: string[] = [];
let advertised: Set<string>;

const within = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms); })]); }
  finally { if (timer) clearTimeout(timer); }
};

beforeAll(async () => {
  const rows = await new CodexModelCatalog(clientManager).listModels(workspace);
  advertised = new Set(rows.map(row => row.model_identifier));
  console.log(`GPT6_ADVERTISED ${ids.map(id => `${id}:${advertised.has(id)}`).join(" ")}`);
});
afterAll(async () => {
  for (const id of ownedRunIds) { try { await threadManager.terminateThread(id); } catch { /* owned cleanup best effort */ } }
  await clientManager.close();
  await fs.rm(workspace, {recursive: true, force: true});
});

describe("temporary exact GPT-6 live app-server turns", () => {
  for (const id of ids) {
    it(id, async () => {
      if (!advertised.has(id)) { console.log(`GPT6_RESULT ${id} NOT_ADVERTISED`); return; }
      const runId = `api-e2e-${randomUUID()}`;
      ownedRunIds.push(runId);
      const config = new AgentRunConfig({
        runtimeKind: RuntimeKind.CODEX_APP_SERVER, agentDefinitionId: "api-e2e-probe",
        llmModelIdentifier: id, autoExecuteTools: false, workspaceId: workspace,
        llmConfig: null, skillAccessMode: SkillAccessMode.NONE,
      });
      const ctx = new AgentRunContext({
        runId, config,
        runtimeContext: new CodexAgentRunContext({
          codexThreadConfig: {model: id, workingDirectory: workspace, reasoningEffort: "medium", serviceTier: null,
            approvalPolicy: CodexApprovalPolicy.ON_REQUEST, sandbox: "read-only", baseInstructions: null,
            developerInstructions: null, dynamicTools: null},
          threadId: null,
        }),
      });
      try {
        const thread = await threadManager.createThread(ctx);
        await within(thread.startup.waitForReady, 30000);
        const completion = new Promise<unknown>((resolve, reject) => {
          const timeout = setTimeout(() => { unsubscribe(); reject(new Error(`turn completion timeout for ${id}`)); }, 120000);
          const unsubscribe = thread.subscribeAppServerMessages(event => {
            if (event.method === CodexThreadEventName.TURN_COMPLETED) { clearTimeout(timeout); unsubscribe(); resolve(event); }
          });
        });
        const result = await thread.startInput(new AgentInputUserMessage("Reply with READY only."));
        expect(result.turnId).toBeTruthy();
        await completion;
        expect(thread.currentStatus).toBe("IDLE");
        console.log(`GPT6_RESULT ${id} COMPLETED`);
      } catch (error) {
        console.log(`GPT6_RESULT ${id} FAILED ${error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 200) : "unknown"}`);
        throw error;
      }
    }, 180000);
  }
});
