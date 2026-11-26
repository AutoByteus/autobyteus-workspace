/**
 * autobyteus-581 IR-004 probe (F-1, F-2): starts sandbox-shaped containers with the real SandboxDocker spec shape
 * (memory folder bound at /home/autobyteus/data/memory inside the data volume), connects with the real
 * SandboxPairing.connect, creates one native run (no model call) and reports where its run_metadata.json landed on
 * the host. Prints no setup code, credential or key.
 * Usage: tsx sandbox-connect-and-memory-probe.ts <image> <runs>
 */
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { SandboxDocker } from "../../../../autobyteus-server-ts/src/sandboxes/sandbox-docker.js";
import { SandboxPairing } from "../../../../autobyteus-server-ts/src/sandboxes/sandbox-pairing.js";
import { DATA_IN_SANDBOX, MEMORY_IN_SANDBOX, WORKSPACE_IN_SANDBOX } from "../../../../autobyteus-server-ts/src/sandboxes/sandbox-folders.js";

const [image, runsArg] = process.argv.slice(2);
const runs = Number(runsArg ?? "3");
const docker = new SandboxDocker();
const pairing = new SandboxPairing({ docker, pairing: {} as never, peers: {} as never, discovery: {} as never });
const freePort = () => new Promise<number>((resolve) => {
  const server = net.createServer();
  server.listen(0, "127.0.0.1", () => { const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port)); });
});
const find = (dir: string, name: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? find(path.join(dir, entry.name), name) : entry.name === name ? [path.join(dir, entry.name)] : []);

for (let run = 0; run < runs; run += 1) {
  const sandboxId = `sbx_probe${process.pid}${run}`;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sbx-probe-"));
  const workspace = path.join(root, "workspace");
  const memory = path.join(root, "run-memory");
  fs.mkdirSync(workspace); fs.mkdirSync(memory);
  const hostPort = await freePort();
  const started = Date.now();
  try {
    const result = await docker.startContainer({
      sandboxId, hostNodeId: "probe-host", image, hostPort, memory: "6g", cpus: "4",
      mounts: [
        { hostPath: workspace, containerPath: WORKSPACE_IN_SANDBOX, readOnly: false },
        { hostPath: memory, containerPath: MEMORY_IN_SANDBOX, readOnly: false },
      ],
      anonymousVolumes: [DATA_IN_SANDBOX, "/root", "/home/autobyteus/server-packages"],
      environment: { AUTOBYTEUS_TEMP_WORKSPACE_DIR: WORKSPACE_IN_SANDBOX, AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${hostPort}` },
    });
    if (result.exitCode !== 0) { console.log(JSON.stringify({ run, startFailed: result.stderr.trim().slice(0, 200) })); continue; }
    let connect = "ok";
    let session;
    try { session = await pairing.connect(sandboxId, `http://127.0.0.1:${hostPort}`, Date.now() + 180_000); }
    catch (error) { connect = String(error instanceof Error ? error.message : error); }
    const connectMs = Date.now() - started;
    let runCreated: boolean | null = null;
    let metadataOnHost: string[] = [];
    if (session) {
      const def = await session.graphql<{ createAgentDefinition: { id: string } }>(
        "mutation($i: CreateAgentDefinitionInput!) { createAgentDefinition(input: $i) { id } }",
        { i: { name: "memprobe", role: "a", description: "d", instructions: "i", category: "test", toolNames: [], skillNames: [] } });
      const created = await session.graphql<{ createAgentRun: { success: boolean } }>(
        "mutation($i: CreateAgentRunInput!) { createAgentRun(input: $i) { success message runId } }",
        { i: { agentDefinitionId: def.createAgentDefinition.id, workspaceRootPath: WORKSPACE_IN_SANDBOX,
          llmModelIdentifier: "claude-haiku-5-5", autoExecuteTools: false, runtimeKind: "autobyteus", llmConfig: null } });
      runCreated = created.createAgentRun.success;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      metadataOnHost = find(memory, "run_metadata.json").map((file) => path.relative(memory, path.dirname(file)).replace(/[^/]+$/, "<runId>"));
    }
    const topLevel = fs.readdirSync(memory).sort();
    console.log(JSON.stringify({ run, connect, connectMs, runCreated, metadataOnHost, hostMemoryTopLevel: topLevel }));
  } finally {
    await docker.remove(sandboxId).catch(() => undefined);
    fs.rmSync(root, { recursive: true, force: true });
  }
}
