import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { buildTeamMemberAgentId } from "../../../src/run-history/utils/team-member-agent-id.js";

type RunningNodeProcess = {
  child: ChildProcessWithoutNullStreams;
  baseUrl: string;
  dataDir: string;
  nodeId: string;
  logPrefix: string;
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const hasSeedDatabase = fs.existsSync(path.join(repoRoot, "db", "production.db"));

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const reserveFreePort = async (): Promise<number> => {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to reserve free port.")));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
};

let processHarnessPrepared = false;

const ensureProcessEntrypoint = (): string => {
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const entry = path.join(repoRoot, "dist", "app.js");

  if (!processHarnessPrepared) {
    execFileSync("pnpm", ["build"], {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    });
    processHarnessPrepared = true;
  }

  if (!fs.existsSync(entry)) {
    throw new Error(`Server entrypoint not found after build: ${entry}`);
  }
  return entry;
};

const createNodeDataDir = (prefix: string): string => {
  const seedDbPath = path.join(repoRoot, "db", "production.db");
  if (!fs.existsSync(seedDbPath)) {
    throw new Error(`Seed database not found: ${seedDbPath}`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `autobyteus-run-history-dist-e2e-${prefix}-`));
  fs.writeFileSync(path.join(dir, ".env"), "\n", "utf8");
  fs.mkdirSync(path.join(dir, "db"), { recursive: true });
  fs.copyFileSync(seedDbPath, path.join(dir, "db", "production.db"));
  return dir;
};

const waitForHealth = async (baseUrl: string, timeoutMs = 60_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: string | null = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/rest/health`);
      if (response.ok) {
        return;
      }
      lastError = `health status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await wait(250);
  }

  throw new Error(`Timed out waiting for health at ${baseUrl}: ${lastError ?? "unknown error"}`);
};

const pollUntil = async (
  predicate: () => Promise<boolean>,
  timeoutMs = 30_000,
  pollMs = 350,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await wait(pollMs);
  }
  throw new Error("Timed out waiting for condition.");
};

const startNodeProcess = async (input: {
  role: "registry" | "client";
  nodeId: string;
  nodeName: string;
  port: number;
  dataDir: string;
  registryUrl?: string;
  logPrefix: string;
}): Promise<RunningNodeProcess> => {
  const entry = ensureProcessEntrypoint();
  const baseUrl = `http://127.0.0.1:${input.port}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    AUTOBYTEUS_SERVER_HOST: baseUrl,
    AUTOBYTEUS_NODE_ID: input.nodeId,
    AUTOBYTEUS_NODE_NAME: input.nodeName,
    AUTOBYTEUS_NODE_DISCOVERY_ENABLED: "true",
    AUTOBYTEUS_NODE_DISCOVERY_ROLE: input.role,
    AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL: input.registryUrl ?? baseUrl,
    AUTOBYTEUS_NODE_DISCOVERY_HEARTBEAT_INTERVAL_MS: "500",
    AUTOBYTEUS_NODE_DISCOVERY_SYNC_INTERVAL_MS: "500",
    AUTOBYTEUS_NODE_DISCOVERY_MAINTENANCE_INTERVAL_MS: "500",
    AUTOBYTEUS_NODE_DISCOVERY_DEGRADED_AFTER_MS: "2000",
    AUTOBYTEUS_NODE_DISCOVERY_UNREACHABLE_AFTER_MS: "4000",
    AUTOBYTEUS_NODE_DISCOVERY_TTL_MS: "6000",
    DB_TYPE: "sqlite",
    PERSISTENCE_PROVIDER: "sqlite",
    AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: "off",
    AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY: "false",
    LOG_LEVEL: "info",
  };

  const child = spawn(
    process.execPath,
    [entry, "--host", "127.0.0.1", "--port", String(input.port), "--data-dir", input.dataDir],
    {
      cwd: path.resolve(__dirname, "..", "..", ".."),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  child.stdout.on("data", (chunk: Buffer) => {
    process.stdout.write(`[${input.logPrefix}] ${chunk.toString()}`);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(`[${input.logPrefix}] ${chunk.toString()}`);
  });

  await waitForHealth(baseUrl);

  return {
    child,
    baseUrl,
    dataDir: input.dataDir,
    nodeId: input.nodeId,
    logPrefix: input.logPrefix,
  };
};

const stopNodeProcess = async (node: RunningNodeProcess): Promise<void> => {
  const child = node.child;
  if (child.exitCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve();
    };

    const hardKillTimer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      finish();
    }, 10_000);

    child.once("exit", () => {
      clearTimeout(hardKillTimer);
      finish();
    });

    child.kill("SIGTERM");
  });
};

const execGraphql = async <T>(
  baseUrl: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(`${baseUrl}/graphql`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });
  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status} at ${baseUrl}`);
  }

  const payload = (await response.json()) as GraphqlResponse<T>;
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message ?? "GraphQL execution failed.");
  }
  if (!payload.data) {
    throw new Error("GraphQL response missing data.");
  }
  return payload.data;
};

describe("Team run restore distributed process GraphQL e2e", () => {
  const runningNodes: RunningNodeProcess[] = [];

  afterEach(async () => {
    while (runningNodes.length > 0) {
      const node = runningNodes.pop();
      if (node) {
        await stopNodeProcess(node);
        fs.rmSync(node.dataDir, { recursive: true, force: true });
      }
    }
  });

  const runWithSeedDb = hasSeedDatabase ? it : it.skip;

  runWithSeedDb(
    "runs remote-member team, terminates, restores via continue, and cleans up across host+worker processes",
    async () => {
      const hostNodeId = "node-host-e2e";
      const workerNodeId = "node-worker-e2e";
      const hostPort = await reserveFreePort();
      const workerPort = await reserveFreePort();
      const hostDataDir = createNodeDataDir("host");
      const workerDataDir = createNodeDataDir("worker");

      const host = await startNodeProcess({
        role: "registry",
        nodeId: hostNodeId,
        nodeName: "Host E2E",
        port: hostPort,
        dataDir: hostDataDir,
        logPrefix: "host-e2e",
      });
      runningNodes.push(host);

      const worker = await startNodeProcess({
        role: "client",
        nodeId: workerNodeId,
        nodeName: "Worker E2E",
        port: workerPort,
        dataDir: workerDataDir,
        registryUrl: host.baseUrl,
        logPrefix: "worker-e2e",
      });
      runningNodes.push(worker);

      await pollUntil(async () => {
        const response = await fetch(`${host.baseUrl}/rest/node-discovery/peers`);
        if (!response.ok) {
          return false;
        }
        const payload = (await response.json()) as { peers?: Array<{ nodeId?: string }> };
        const ids = new Set((payload.peers ?? []).map((peer) => String(peer.nodeId ?? "")));
        return ids.has(hostNodeId) && ids.has(workerNodeId);
      }, 45_000, 500);

      const createAgentMutation = `
        mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
          createAgentDefinition(input: $input) {
            id
            name
          }
        }
      `;
      const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const promptName = `WorkerPrompt_${unique}`;
      const promptCategory = `WorkerCategory_${unique}`;
      const createPromptMutation = `
        mutation CreatePrompt($input: CreatePromptInput!) {
          createPrompt(input: $input) {
            id
          }
        }
      `;
      await execGraphql<{ createPrompt: { id: string } }>(worker.baseUrl, createPromptMutation, {
        input: {
          name: promptName,
          category: promptCategory,
          promptContent: "Remote worker prompt for distributed run-history e2e",
          description: "Prompt for distributed process run-history e2e",
        },
      });

      const workerAgent = await execGraphql<{
        createAgentDefinition: { id: string; name: string };
      }>(worker.baseUrl, createAgentMutation, {
        input: {
          name: `worker_remote_agent_${unique}`,
          role: "student",
          description: "Remote worker agent for distributed run-history e2e",
          systemPromptCategory: promptCategory,
          systemPromptName: promptName,
          toolNames: [],
          skillNames: [],
        },
      });
      const workerAgentId = workerAgent.createAgentDefinition.id;
      expect(workerAgentId).toBeTruthy();

      const createTeamDefinitionMutation = `
        mutation CreateTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
          createAgentTeamDefinition(input: $input) {
            id
            coordinatorMemberName
          }
        }
      `;
      const createdTeamDefinition = await execGraphql<{
        createAgentTeamDefinition: { id: string; coordinatorMemberName: string };
      }>(host.baseUrl, createTeamDefinitionMutation, {
        input: {
          name: `distributed_restore_team_${unique}`,
          description: "Distributed run-history process e2e team",
          coordinatorMemberName: "student",
          nodes: [
            {
              memberName: "student",
              referenceId: workerAgentId,
              referenceType: "AGENT",
              homeNodeId: workerNodeId,
            },
          ],
        },
      });
      const teamDefinitionId = createdTeamDefinition.createAgentTeamDefinition.id;
      expect(teamDefinitionId).toBeTruthy();

      const availableModelsQuery = `
        query AvailableLlmProvidersWithModels {
          availableLlmProvidersWithModels {
            provider
            models {
              modelIdentifier
              provider
              runtime
            }
          }
        }
      `;
      const availableModels = await execGraphql<{
        availableLlmProvidersWithModels: Array<{
          provider: string;
          models: Array<{ modelIdentifier: string; provider: string; runtime: string }>;
        }>;
      }>(host.baseUrl, availableModelsQuery);
      const allModels = availableModels.availableLlmProvidersWithModels.flatMap(
        (provider) => provider.models,
      );
      const lmStudioModelIdentifier =
        allModels.find(
          (model) => typeof model.runtime === "string" && model.runtime.toLowerCase() === "lmstudio",
        )?.modelIdentifier ?? null;
      const llmModelIdentifierCandidate =
        lmStudioModelIdentifier ??
        availableModels.availableLlmProvidersWithModels
          .flatMap((provider) => provider.models)
          .map((model) => model.modelIdentifier)
          .find((identifier) => typeof identifier === "string" && identifier.trim().length > 0) ??
        null;
      if (!llmModelIdentifierCandidate) {
        throw new Error("No available LLM model identifier found on host.");
      }
      const llmModelIdentifier = llmModelIdentifierCandidate;

      const sendMutation = `
        mutation SendMessageToTeam($input: SendMessageToTeamInput!) {
          sendMessageToTeam(input: $input) {
            success
            message
            teamRunId
          }
        }
      `;

      const remoteWorkspaceRootPath = path.join(worker.dataDir, "workspaces", "student");
      fs.mkdirSync(remoteWorkspaceRootPath, { recursive: true });
      const firstSend = await execGraphql<{
        sendMessageToTeam: { success: boolean; teamRunId: string | null; message: string };
      }>(host.baseUrl, sendMutation, {
        input: {
          userInput: {
            content: "hello remote student",
            contextFiles: null,
          },
          teamDefinitionId,
          targetMemberName: "student",
          memberConfigs: [
            {
              memberName: "student",
              memberRouteKey: "student",
              agentDefinitionId: workerAgentId,
              llmModelIdentifier,
              autoExecuteTools: false,
              hostNodeId: workerNodeId,
              workspaceRootPath: remoteWorkspaceRootPath,
            },
          ],
        },
      });
      expect(firstSend.sendMessageToTeam.success).toBe(true);
      expect(firstSend.sendMessageToTeam.teamRunId).toBeTruthy();
      const teamRunId = String(firstSend.sendMessageToTeam.teamRunId);
      const memberAgentId = buildTeamMemberAgentId(teamRunId, "student");

      const resumeQuery = `
        query GetTeamRunResumeConfig($teamRunId: String!) {
          getTeamRunResumeConfig(teamRunId: $teamRunId) {
            teamRunId
            isActive
            manifest
          }
        }
      `;
      const resumeAfterFirstSend = await execGraphql<{
        getTeamRunResumeConfig: {
          teamRunId: string;
          isActive: boolean;
          manifest: {
            memberBindings: Array<{
              memberRouteKey: string;
              memberAgentId: string;
              hostNodeId: string | null;
              workspaceRootPath: string | null;
            }>;
          };
        };
      }>(host.baseUrl, resumeQuery, { teamRunId });
      expect(resumeAfterFirstSend.getTeamRunResumeConfig.teamRunId).toBe(teamRunId);
      expect(resumeAfterFirstSend.getTeamRunResumeConfig.isActive).toBe(true);
      const studentBinding = resumeAfterFirstSend.getTeamRunResumeConfig.manifest.memberBindings.find(
        (binding) => binding.memberRouteKey === "student",
      );
      expect(studentBinding?.memberAgentId).toBe(memberAgentId);
      expect(studentBinding?.hostNodeId).toBe(workerNodeId);
      expect(studentBinding?.workspaceRootPath).toBe(remoteWorkspaceRootPath);

      const hostMemberDir = path.join(host.dataDir, "memory", "agent_teams", teamRunId, memberAgentId);
      const workerMemberDir = path.join(worker.dataDir, "memory", "agent_teams", teamRunId, memberAgentId);
      const hostMemberManifestPath = path.join(hostMemberDir, "run_manifest.json");
      const workerMemberManifestPath = path.join(workerMemberDir, "run_manifest.json");
      const workerRawTracesPath = path.join(workerMemberDir, "raw_traces.jsonl");
      const workerRawArchivePath = path.join(workerMemberDir, "raw_traces_archive.jsonl");
      const workerNestedMemberDir = path.join(workerMemberDir, "agents", memberAgentId);
      const hostNestedMemberDir = path.join(hostMemberDir, "agents", memberAgentId);
      expect(fs.existsSync(path.join(host.dataDir, "memory", "agent_teams", teamRunId))).toBe(true);
      await pollUntil(async () => fs.existsSync(workerMemberDir), 25_000, 300);
      expect(fs.existsSync(hostMemberDir)).toBe(false);
      expect(fs.existsSync(hostMemberManifestPath)).toBe(false);
      await pollUntil(async () => fs.existsSync(workerMemberManifestPath), 25_000, 300);
      const workerMemberManifest = JSON.parse(
        fs.readFileSync(workerMemberManifestPath, "utf8"),
      ) as { memberAgentId?: string; hostNodeId?: string | null };
      expect(workerMemberManifest.memberAgentId).toBe(memberAgentId);
      expect(workerMemberManifest.hostNodeId).toBe(workerNodeId);
      await pollUntil(
        async () => fs.existsSync(workerRawTracesPath) || fs.existsSync(workerRawArchivePath),
        25_000,
        300,
      );
      expect(fs.existsSync(workerNestedMemberDir)).toBe(false);
      expect(fs.existsSync(hostNestedMemberDir)).toBe(false);

      const workerTeamsQuery = `
        query WorkerTeams {
          agentTeamRuns {
            id
          }
        }
      `;
      await pollUntil(async () => {
        const workerTeams = await execGraphql<{
          agentTeamRuns: Array<{ id: string }>;
        }>(worker.baseUrl, workerTeamsQuery);
        return workerTeams.agentTeamRuns.length > 0;
      }, 25_000, 350);

      const terminateMutation = `
        mutation TerminateTeam($id: String!) {
          terminateAgentTeamRun(id: $id) {
            success
            message
          }
        }
      `;
      const terminated = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(host.baseUrl, terminateMutation, { id: teamRunId });
      expect(terminated.terminateAgentTeamRun.success).toBe(true);

      await pollUntil(async () => {
        const resumeAfterTerminate = await execGraphql<{
          getTeamRunResumeConfig: {
            teamRunId: string;
            isActive: boolean;
          };
        }>(host.baseUrl, resumeQuery, { teamRunId });
        return resumeAfterTerminate.getTeamRunResumeConfig.isActive === false;
      }, 25_000, 400);

      const projectionQuery = `
        query TeamMemberProjection($teamRunId: String!, $memberRouteKey: String!) {
          getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
            runId
            summary
            lastActivityAt
            conversation
          }
        }
      `;
      const projectionAfterTerminate = await execGraphql<{
        getTeamMemberRunProjection: {
          runId: string;
          summary: string | null;
          conversation: Array<{ role: string; content: string }>;
        };
      }>(host.baseUrl, projectionQuery, { teamRunId, memberRouteKey: "student" });
      expect(projectionAfterTerminate.getTeamMemberRunProjection.runId).toBe(memberAgentId);
      expect(projectionAfterTerminate.getTeamMemberRunProjection.conversation.length).toBeGreaterThan(0);
      expect(projectionAfterTerminate.getTeamMemberRunProjection.summary || "").toContain("hello");

      const secondSend = await execGraphql<{
        sendMessageToTeam: { success: boolean; teamRunId: string | null; message: string };
      }>(host.baseUrl, sendMutation, {
        input: {
          teamRunId,
          targetMemberName: "student",
          userInput: {
            content: "resume distributed team",
            contextFiles: null,
          },
        },
      });
      expect(secondSend.sendMessageToTeam.success).toBe(true);
      expect(secondSend.sendMessageToTeam.teamRunId).toBe(teamRunId);

      const resumeAfterContinue = await execGraphql<{
        getTeamRunResumeConfig: {
          teamRunId: string;
          isActive: boolean;
        };
      }>(host.baseUrl, resumeQuery, { teamRunId });
      expect(resumeAfterContinue.getTeamRunResumeConfig.isActive).toBe(true);

      const listQuery = `
        query ListTeamRunHistory {
          listTeamRunHistory {
            teamRunId
            summary
            lastKnownStatus
          }
        }
      `;
      const listed = await execGraphql<{
        listTeamRunHistory: Array<{ teamRunId: string; summary: string; lastKnownStatus: string }>;
      }>(host.baseUrl, listQuery);
      const row = listed.listTeamRunHistory.find((item) => item.teamRunId === teamRunId);
      expect(row).toBeTruthy();
      expect(row?.lastKnownStatus).toBe("ACTIVE");
      expect(row?.summary).toContain("resume distributed team");

      const terminatedForDelete = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(host.baseUrl, terminateMutation, { id: teamRunId });
      expect(terminatedForDelete.terminateAgentTeamRun.success).toBe(true);

      const workerTerminatedForDelete = await execGraphql<{
        terminateAgentTeamRun: { success: boolean; message: string };
      }>(worker.baseUrl, terminateMutation, { id: teamRunId });
      expect(workerTerminatedForDelete.terminateAgentTeamRun.success).toBe(true);

      await pollUntil(async () => {
        const resumeAfterTerminateForDelete = await execGraphql<{
          getTeamRunResumeConfig: {
            teamRunId: string;
            isActive: boolean;
          };
        }>(host.baseUrl, resumeQuery, { teamRunId });
        return resumeAfterTerminateForDelete.getTeamRunResumeConfig.isActive === false;
      }, 25_000, 400);

      const deleteMutation = `
        mutation DeleteTeamRunHistory($teamRunId: String!) {
          deleteTeamRunHistory(teamRunId: $teamRunId) {
            success
            message
          }
        }
      `;
      let deleted: { deleteTeamRunHistory: { success: boolean; message: string } } | null = null;
      await pollUntil(async () => {
        deleted = await execGraphql<{
          deleteTeamRunHistory: { success: boolean; message: string };
        }>(host.baseUrl, deleteMutation, { teamRunId });
        return deleted.deleteTeamRunHistory.success;
      }, 30_000, 500);
      if (!deleted) {
        throw new Error("Delete mutation did not return a response.");
      }
      expect(deleted.deleteTeamRunHistory.success).toBe(true);

      await pollUntil(async () => !fs.existsSync(workerMemberDir), 25_000, 300);
      expect(fs.existsSync(path.join(host.dataDir, "memory", "agent_teams", teamRunId))).toBe(false);
    },
    180_000,
  );
});
