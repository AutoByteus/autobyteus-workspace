import path from "node:path";
import type { AvailableCollaboratorEntry } from "../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { PeerNodeDiscovery } from "../remote-collaboration/discovery/peer-node-discovery.js";
import type { PeerDirectory } from "../remote-collaboration/settings/peer-directory.js";
import type { PeerPairingService } from "../remote-collaboration/settings/peer-pairing-service.js";
import type { SandboxDocker } from "./sandbox-docker.js";

/** The sandbox node's local control socket (the image's data folder), which hands out its setup code. */
const LOCAL_CONTROL_SOCKET = "/home/autobyteus/data/node-access/local-control.sock";
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
 * A new sandbox node's setup as its host performs it (DS-003): its owner credential from a setup code read over
 * `docker exec` (kept in memory for the creation only, never stored, V-4), pairing with this host from an invite
 * marked `sandbox` (C11: the host's exchange saves the peer with the mark), and the requested agent packages copied in
 * and imported. Never puts a credential, key or peer secret into the sandbox.
 */
export class SandboxPairing {
  constructor(private readonly deps: Readonly<{
    docker: Pick<SandboxDocker, "exec" | "copyInto" | "makeDirectory">;
    pairing: Pick<PeerPairingService, "createInvite">;
    peers: Pick<PeerDirectory, "findByName">;
    discovery: Pick<PeerNodeDiscovery, "listAvailableAgents">;
    fetch?: typeof fetch;
  }>) {}

  /** Waits until the sandbox node hands out a setup code, then exchanges it for an owner credential. */
  async connect(sandboxId: string, baseUrl: string, deadlineAt: number): Promise<SandboxNodeSession> {
    let setupCode: string | null = null;
    while (!setupCode) {
      if (Date.now() > deadlineAt) throw new SandboxPairingError("SANDBOX_START_FAILED", "The sandbox node did not start in time.");
      const result = await this.deps.docker.exec(sandboxId, ["node", "-e", SETUP_CODE_SCRIPT, LOCAL_CONTROL_SOCKET], { timeoutMs: 10_000 });
      if (result.exitCode === 0 && result.stdout.trim()) setupCode = result.stdout.trim();
      else await sleep(1_000);
    }
    const fetchImpl = this.deps.fetch ?? fetch;
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

  /**
   * Pairs the sandbox with this host: an invite marked `sandbox` here, accepted on the sandbox (its name for this host
   * is `host`; this host's name for it is `sandboxId`). Returns the sandbox's node ID as this host saved it.
   */
  async pair(session: SandboxNodeSession, sandboxId: string): Promise<string> {
    const invite = await this.deps.pairing.createInvite({ role: "sandbox" });
    try {
      await session.graphql(
        "mutation($inviteText: String!, $name: String!, $nameOnInviter: String) { acceptPeerInvite(inviteText: $inviteText, name: $name, nameOnInviter: $nameOnInviter) { nodeId } }",
        { inviteText: invite.inviteText, name: "host", nameOnInviter: sandboxId },
      );
    } catch (error) {
      throw new SandboxPairingError("SANDBOX_START_FAILED", `The sandbox could not pair with this node: ${error instanceof Error ? error.message : String(error)}`);
    }
    const peer = await this.deps.peers.findByName(sandboxId);
    if (!peer?.paired || peer.role !== "sandbox") {
      throw new SandboxPairingError("SANDBOX_START_FAILED", "The sandbox paired, but this node did not save it as its sandbox peer.");
    }
    return peer.nodeId;
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
