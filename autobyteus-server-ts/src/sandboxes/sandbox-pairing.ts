import path from "node:path";
import type { AvailableCollaboratorEntry } from "../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { PeerNodeDiscovery } from "../remote-collaboration/discovery/peer-node-discovery.js";
import type { PeerPairing } from "../remote-collaboration/pairing/peer-pairing.js";
import type { SandboxDocker } from "./sandbox-docker.js";
import { DATA_IN_SANDBOX } from "./sandbox-folders.js";

/** The sandbox node's local control socket (in its data folder), which hands out its setup code. */
const LOCAL_CONTROL_SOCKET = `${DATA_IN_SANDBOX}/node-access/local-control.sock`;
/** How long one health request may wait for an answer, and the pause between requests. */
const HEALTH_REQUEST_TIMEOUT_MS = 5_000;
const HEALTH_RETRY_PAUSE_MS = 250;
/** Asks the socket for a setup code and prints only the code (run with `node -e` inside the sandbox). */
const SETUP_CODE_SCRIPT = 'const s=require("net").createConnection(process.argv[1],()=>s.write("setup-code\\n"));'
  + 's.setTimeout(5000,()=>process.exit(1));let d="";s.setEncoding("utf8");s.on("data",(c)=>{d+=c});'
  + 's.on("end",()=>{let r={};try{r=JSON.parse(d)}catch{}if(!r.setupCode)process.exit(1);process.stdout.write(r.setupCode)});'
  + 's.on("error",()=>process.exit(1))';
/** Where package copies go inside the sandbox before they are imported. */
const PACKAGES_IN_SANDBOX = "/home/autobyteus/agent-packages";

/** A started sandbox node as this host drives it during creation: its address and its owner credential (memory only). */
export type SandboxNodeSession = Readonly<{
  baseUrl: string;
  graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}>;

export class SandboxPairingError extends Error {
  constructor(readonly code: "SANDBOX_START_FAILED" | "SANDBOX_PACKAGE_INVALID", message: string) {
    super(message);
    this.name = "SandboxPairingError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A new sandbox node's setup as its host performs it (DS-003; autobyteus-661 AR-001): its owner credential from a
 * setup code read over `docker exec` (kept in memory for the creation only, never stored, V-4), pairing with this host
 * (the host has the sandbox make a grant, then pairs with it under node keys, saving it marked `sandbox`), and the
 * requested agent packages copied in and imported. Never puts a credential or key into the sandbox.
 */
export class SandboxPairing {
  constructor(private readonly deps: Readonly<{
    docker: Pick<SandboxDocker, "exec" | "copyInto" | "makeDirectory">;
    pairing: Pick<PeerPairing, "pair">;
    discovery: Pick<PeerNodeDiscovery, "listAvailableAgents">;
    /** This host's node ID: the grant the sandbox makes is for this node only (CR-001). */
    hostNodeId(): Promise<string>;
    fetch?: typeof fetch;
  }>) {}

  /**
   * Waits until the sandbox node hands out a setup code and its published port answers (the node hands out codes a
   * moment before its HTTP server takes connections, API-E01), then exchanges the code once for an owner credential.
   */
  async connect(sandboxId: string, baseUrl: string, deadlineAt: number): Promise<SandboxNodeSession> {
    let setupCode: string | null = null;
    while (!setupCode) {
      if (Date.now() > deadlineAt) throw new SandboxPairingError("SANDBOX_START_FAILED", "The sandbox node did not start in time.");
      const result = await this.deps.docker.exec(sandboxId, ["node", "-e", SETUP_CODE_SCRIPT, LOCAL_CONTROL_SOCKET], { timeoutMs: 10_000 });
      if (result.exitCode === 0 && result.stdout.trim()) setupCode = result.stdout.trim();
      else await sleep(1_000);
    }
    const fetchImpl = this.deps.fetch ?? fetch;
    await this.untilAnswering(fetchImpl, baseUrl, deadlineAt);
    const exchange = await fetchImpl(`${baseUrl}/rest/node-access/setup-exchanges`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ setupCode, desktopName: "sandbox host" }),
    });
    const issued = await exchange.json().catch(() => null) as { credential?: unknown } | null;
    if (exchange.status !== 201 || typeof issued?.credential !== "string") {
      throw new SandboxPairingError("SANDBOX_START_FAILED", `The sandbox node refused its setup exchange (HTTP ${exchange.status}).`);
    }
    const credential = issued.credential;
    return Object.freeze({
      baseUrl,
      graphql: async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
        const response = await fetchImpl(`${baseUrl}/graphql`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${credential}` },
          body: JSON.stringify({ query, variables }),
        });
        const body = await response.json().catch(() => ({})) as { data?: T; errors?: Array<{ message?: string }> };
        if (body.errors?.length) throw new Error(body.errors.map((error) => error.message ?? "error").join("; "));
        if (!response.ok || !body.data) throw new Error(`HTTP ${response.status}`);
        return body.data;
      },
    });
  }

  /** Asks `GET /rest/health` until any HTTP answer comes; a refused or dropped connection is asked again. */
  private async untilAnswering(fetchImpl: typeof fetch, baseUrl: string, deadlineAt: number): Promise<void> {
    for (;;) {
      try {
        await fetchImpl(`${baseUrl}/rest/health`, { signal: AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS) });
        return;
      } catch {
        if (Date.now() > deadlineAt) {
          throw new SandboxPairingError("SANDBOX_START_FAILED", "The sandbox node handed out its setup code, but its port did not answer in time.");
        }
        await sleep(HEALTH_RETRY_PAUSE_MS);
      }
    }
  }

  /**
   * Pairs the sandbox with this host (AR-001 steps 2–5): the sandbox makes a grant for an `own` node it names `host`;
   * this host pairs with the sandbox at once with the grant (the sandbox keeps the first of this host's addresses that
   * answers as this host from inside its container, `host.docker.internal` for a host on loopback) and saves it as `sandboxId`,
   * marked `sandbox`. Returns the sandbox's node ID.
   */
  async pair(session: SandboxNodeSession, sandboxId: string): Promise<string> {
    const failed = (error: unknown) => new SandboxPairingError("SANDBOX_START_FAILED",
      `The sandbox could not pair with this node: ${error instanceof Error ? error.message : String(error)}`);
    let grant: string;
    try {
      grant = (await session.graphql<{ createPairingGrant: { grant: string } }>(
        'mutation($host: String!) { createPairingGrant(relation: "own", forNodeId: $host, nameForAsker: "host") { grant } }',
        { host: await this.deps.hostNodeId() },
      )).createPairingGrant.grant;
    } catch (error) {
      throw failed(error);
    }
    try {
      const outcome = await this.deps.pairing.pair({ address: session.baseUrl, grant, name: sandboxId, sandbox: true });
      if (outcome.state !== "paired" || !outcome.peer.sandbox) throw new Error("this node did not save it as its sandbox peer");
      return outcome.peer.nodeId;
    } catch (error) {
      throw failed(error);
    }
  }

  /**
   * Copies each package folder into the sandbox (a copy: the original stays out of its reach) and imports it there.
   * Returns the agents and teams the imports added, as this host addresses them over the peer channel.
   */
  async importPackages(session: SandboxNodeSession, sandboxId: string, packageFolders: readonly string[]): Promise<Readonly<{
    agents: readonly AvailableCollaboratorEntry[];
    teams: readonly AvailableCollaboratorEntry[];
  }>> {
    const before = new Set((await this.offer(sandboxId)).map((entry) => `${entry.kind}:${entry.address}`));
    for (const [index, folder] of packageFolders.entries()) {
      const target = `${PACKAGES_IN_SANDBOX}/${index + 1}-${path.basename(folder).replace(/[^A-Za-z0-9._-]+/g, "-")}`;
      await this.deps.docker.makeDirectory(sandboxId, target);
      await this.deps.docker.copyInto(sandboxId, folder, target);
      try {
        await session.graphql(
          "mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId } }",
          { input: { sourceKind: "LOCAL_PATH", source: target } },
        );
      } catch (error) {
        throw new SandboxPairingError("SANDBOX_PACKAGE_INVALID",
          `The agent package ${folder} could not be imported in the sandbox: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const added = (await this.offer(sandboxId)).filter((entry) => !before.has(`${entry.kind}:${entry.address}`));
    return Object.freeze({
      agents: added.filter((entry) => entry.kind === "agent"),
      teams: added.filter((entry) => entry.kind === "agent_team"),
    });
  }

  private async offer(sandboxId: string): Promise<readonly AvailableCollaboratorEntry[]> {
    const answer = await this.deps.discovery.listAvailableAgents(sandboxId);
    if (!Array.isArray(answer)) {
      const refusal = answer as { code?: string; message?: string };
      throw new SandboxPairingError("SANDBOX_START_FAILED", `The sandbox's agents could not be listed: ${refusal.message ?? refusal.code ?? "refused"}`);
    }
    return answer;
  }
}
