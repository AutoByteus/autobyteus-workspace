import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID } from "../../../src/built-in-agents/built-in-agent-registry.js";
import { AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID } from "../../../src/skill-improvement/domain/settings.js";

type RunningServer = {
  child: ChildProcessWithoutNullStreams;
  output: () => string;
};

const serverRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const builtServerEntry = path.join(serverRoot, "dist", "app.js");
const runningServers = new Set<ChildProcessWithoutNullStreams>();
const tempDirectories = new Set<string>();

const reservePort = async (): Promise<number> =>
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to reserve a loopback port."));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });

const sanitizedOperationalEnvironment = (): NodeJS.ProcessEnv => {
  const environment: NodeJS.ProcessEnv = { NODE_ENV: "test" };
  for (const key of ["PATH", "HOME", "USERPROFILE", "TMPDIR", "TMP", "TEMP", "SystemRoot", "WINDIR"]) {
    const value = process.env[key];
    if (value) environment[key] = value;
  }
  return environment;
};

const waitForReady = async (server: RunningServer): Promise<void> => {
  const readyMarker = "Server listening on 127.0.0.1:";
  const timeoutAt = Date.now() + 90_000;
  while (Date.now() < timeoutAt) {
    if (server.output().includes(readyMarker)) return;
    if (server.child.exitCode !== null) {
      throw new Error(`Server exited before listen. Output:\n${server.output()}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for server listen. Output:\n${server.output()}`);
};

const startServer = async (dataDir: string, port: number): Promise<RunningServer> => {
  let combinedOutput = "";
  const child = spawn(
    process.execPath,
    [builtServerEntry, "--host", "127.0.0.1", "--port", String(port), "--data-dir", dataDir],
    {
      cwd: serverRoot,
      env: sanitizedOperationalEnvironment(),
      stdio: "pipe",
    },
  );
  runningServers.add(child);
  child.stdout.on("data", (chunk: Buffer) => {
    combinedOutput += chunk.toString("utf-8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    combinedOutput += chunk.toString("utf-8");
  });
  const runningServer = { child, output: () => combinedOutput };
  await waitForReady(runningServer);
  return runningServer;
};

const stopServer = async (server: RunningServer): Promise<void> => {
  if (server.child.exitCode !== null) {
    runningServers.delete(server.child);
    expect(server.child.exitCode).toBe(0);
    return;
  }
  server.child.kill("SIGTERM");
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.child.kill("SIGKILL");
      reject(new Error(`Server did not stop cleanly. Output:\n${server.output()}`));
    }, 15_000);
    server.child.once("close", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  runningServers.delete(server.child);
  expect(exitCode).toBe(0);
};

const executeGraphql = async <T>(port: number, query: string, variables: Record<string, unknown>): Promise<T> => {
  const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(`GraphQL request failed: ${JSON.stringify(payload.errors ?? response.status)}`);
  }
  return payload.data;
};

const credentialStatus = async (port: number) =>
  await executeGraphql<{
    getLlmProviderCredentialStatus: {
      backendHealth: string;
      storageState: string;
      lifecycle: string;
      instructionCode: string | null;
    };
  }>(port, `
    query Status($providerId: String!) {
      getLlmProviderCredentialStatus(providerId: $providerId) {
        backendHealth
        storageState
        lifecycle
        instructionCode
      }
    }
  `, { providerId: "AUTOBYTEUS" });

const retrospectiveSkillImproverRuntimeDefault = async (port: number) => {
  const settings = await executeGraphql<{
    getServerSettings: Array<{ key: string; value: string }>;
  }>(port, `
    query RuntimeDefault {
      getServerSettings {
        key
        value
      }
    }
  `, {});
  return settings.getServerSettings.find(
    (entry) => entry.key === AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
  );
};

afterEach(async () => {
  const children = [...runningServers];
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  await Promise.all(children.map(async (child) => {
    if (child.exitCode !== null) return;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 5_000);
      child.once("close", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }));
  runningServers.clear();
  for (const directory of tempDirectories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  tempDirectories.clear();
});

describe("server restart secret lifecycle", () => {
  it("reopens persisted SQLite and managed Store state without a parent or persisted DATABASE_URL", async () => {
    expect(fs.existsSync(builtServerEntry), "Build autobyteus-server-ts before running this test.").toBe(true);
    const port = await reservePort();
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-restart-lifecycle-"));
    tempDirectories.add(dataDir);
    const configPath = path.join(dataDir, ".env");
    const initialConfigBytes = Buffer.from(
      [
        `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}`,
        "APP_ENV=test",
        "DB_TYPE=sqlite",
        "LOG_LEVEL=ERROR",
        "",
      ].join("\n"),
      "utf-8",
    );
    fs.writeFileSync(configPath, initialConfigBytes);

    const syntheticCanary = "synthetic-restart-secret-canary";
    const firstServer = await startServer(dataDir, port);
    expect(await retrospectiveSkillImproverRuntimeDefault(port)).toEqual({
      key: AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
      value: RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    });
    const saved = await executeGraphql<{ setLlmProviderApiKey: string }>(port, `
      mutation Save($providerId: String!, $apiKey: String!) {
        setLlmProviderApiKey(providerId: $providerId, apiKey: $apiKey)
      }
    `, { providerId: "AUTOBYTEUS", apiKey: syntheticCanary });
    expect(saved.setLlmProviderApiKey).toContain("set successfully");
    expect(JSON.stringify(saved)).not.toContain(syntheticCanary);
    expect((await credentialStatus(port)).getLlmProviderCredentialStatus.storageState).toBe("CONFIGURED");
    await stopServer(firstServer);

    expect(fs.readFileSync(configPath)).toEqual(initialConfigBytes);
    expect(fs.existsSync(path.join(dataDir, "db", "test.db"))).toBe(true);

    const secondServer = await startServer(dataDir, port);
    const reopened = await credentialStatus(port);
    expect(reopened.getLlmProviderCredentialStatus).toEqual({
      backendHealth: "READY",
      storageState: "CONFIGURED",
      lifecycle: "WRITABLE",
      instructionCode: null,
    });
    expect(await retrospectiveSkillImproverRuntimeDefault(port)).toEqual({
      key: AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
      value: RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID,
    });
    expect(JSON.stringify(reopened)).not.toContain(syntheticCanary);

    const removed = await executeGraphql<{ removeLlmProviderApiKey: string }>(port, `
      mutation Remove($providerId: String!) {
        removeLlmProviderApiKey(providerId: $providerId)
      }
    `, { providerId: "AUTOBYTEUS" });
    expect(removed.removeLlmProviderApiKey).toContain("removed successfully");
    expect((await credentialStatus(port)).getLlmProviderCredentialStatus.storageState).toBe("MISSING");
    await stopServer(secondServer);
    expect(fs.readFileSync(configPath)).toEqual(initialConfigBytes);

    expect(firstServer.output()).toContain("Database migrations completed successfully.");
    expect(firstServer.output()).toContain(`Server listening on 127.0.0.1:${port}`);
    expect(secondServer.output()).toContain("Database migrations completed successfully.");
    expect(secondServer.output()).toContain(`Server listening on 127.0.0.1:${port}`);
    const allOutput = firstServer.output() + secondServer.output();
    expect(allOutput).not.toContain(syntheticCanary);
    expect(allOutput).not.toContain("Environment variable not found: DATABASE_URL");
    expect(allOutput).not.toContain("P1012");
  }, 180_000);
});
