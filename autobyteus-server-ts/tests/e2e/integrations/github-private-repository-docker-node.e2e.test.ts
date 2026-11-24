/**
 * AC-006 (autobyteus-627): a Docker node with its own GitHub connection reads a private repository, as BS-L1 proves on
 * the built server. A test-owned container from the server image, bound to 127.0.0.1 on a free port, with fresh
 * anonymous volumes (its own data, `/root` and workspace), runs this worktree's server package mounted read-only over
 * `/opt/autobyteus/server-package` (TESTING.md, Docker server nodes). The test reaches it as the desktop app does: a
 * setup code from the node's CLI, exchanged for an owner credential.
 *
 * BS-D1 (live, real GitHub): GitHub not connected → the private import says "connect GitHub"; the GitHub test token
 * saved on the node (`connectGitHub`, the node's own vault) → the private import downloads and is refused by the same
 * package validation as the public `octocat/Hello-World` (one file at its root); Disconnect. The token is in no GraphQL
 * answer, in no file under the node's data folder (streamed out of the container, never written to the host) and not
 * in the container's log. The repository's name is never printed. The container and its volumes are removed.
 *
 * Gate: RUN_GITHUB_PRIVATE_REPOSITORY_DOCKER_E2E=1, AUTOBYTEUS_TEST_VAULT holding `test.github.token`, Docker, and
 * GITHUB_PRIVATE_DOCKER_SERVER_PACKAGE: this worktree's server package for the image's platform, built with
 *   docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package \
 *     --platform linux/<arch> --output type=local,dest=<new folder> .
 * GITHUB_PRIVATE_DOCKER_IMAGE names the image (default `autobyteus/autobyteus-server:beta`).
 * Command (repository root):
 *   AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_GITHUB_PRIVATE_REPOSITORY_DOCKER_E2E=1 \
 *     GITHUB_PRIVATE_DOCKER_SERVER_PACKAGE=<folder> \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/integrations/github-private-repository-docker-node.e2e.test.ts --no-watch
 */
import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it } from "vitest";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";
import { attachOwnerCredential } from "../../../../test-support/node-access/owner-credential-attachment.mjs";

const execFileAsync = promisify(execFile);
const GATE = process.env["RUN_GITHUB_PRIVATE_REPOSITORY_DOCKER_E2E"] === "1";
const PACKAGE_DIR = process.env["GITHUB_PRIVATE_DOCKER_SERVER_PACKAGE"] ?? "";
const IMAGE = process.env["GITHUB_PRIVATE_DOCKER_IMAGE"] ?? "autobyteus/autobyteus-server:beta";
const READY = GATE && fs.existsSync(path.join(PACKAGE_DIR, "dist", "app.js"));
const container = `api627-github-private-${randomBytes(4).toString("hex")}`;

const freePort = () => new Promise<number>((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const port = (server.address() as net.AddressInfo).port; server.close(() => resolve(port)); });
});
const until = async <T>(check: () => Promise<T>, label: string, ms: number): Promise<T> => {
  const deadline = Date.now() + ms;
  let last: unknown;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch (error) { last = error; }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out: ${label}${last ? ` (${String(last)})` : ""}`);
};
/** Runs a command and returns its stdout as bytes (a tar stream of the node's data never touches the host's disk). */
const output = (command: string, args: string[]) => new Promise<Buffer>((resolve, reject) => {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
  const chunks: Buffer[] = [];
  child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => chunks.push(chunk));
  child.once("error", reject);
  child.once("close", () => resolve(Buffer.concat(chunks)));
});

afterAll(async () => {
  if (READY) await execFileAsync("docker", ["rm", "-f", "-v", container]).catch(() => undefined);
}, 60_000);

describe.skipIf(!READY)("A Docker node's own GitHub connection reads a private repository (live)", () => {
  it("BS-D1 AC-006 (AC-001, AC-002, AC-005 on the Docker node)", async (context) => {
    const value = (await readLiveTestSecret(context, "test.github.token")).revealToTrustedConsumer();
    const listing = await fetch("https://api.github.com/user/repos?visibility=private&per_page=100", {
      headers: { Authorization: `Bearer ${value}`, Accept: "application/vnd.github+json", "User-Agent": "AutoByteus" },
    });
    expect(listing.status).toBe(200);
    const privateRepository = ((await listing.json()) as Array<{ full_name: string; private: boolean }>).find((repository) => repository.private);
    expect(privateRepository, "the test token can read a private repository").toBeDefined();
    const privateUrl = `https://github.com/${privateRepository!.full_name}`;
    const PRIVATE = "<private repository>";
    const masked = (text: string) => text.split(privateUrl).join(PRIVATE);

    // A test-owned node: fresh anonymous volumes, this worktree's server package, loopback only.
    const port = await freePort();
    const url = `http://127.0.0.1:${port}`;
    await execFileAsync("docker", ["run", "-d", "--name", container, "--cap-add", "SYS_ADMIN", "--security-opt", "seccomp=unconfined",
      "-p", `127.0.0.1:${port}:8000`, "-e", `AUTOBYTEUS_SERVER_HOST=${url}`,
      "-v", "/home/autobyteus/data", "-v", "/root", "-v", "/app/autobyteus-server-ts/workspace", "-v", "/home/vncuser/.config/chromium",
      "-v", `${path.resolve(PACKAGE_DIR)}:/opt/autobyteus/server-package:ro`, IMAGE]);
    await until(async () => (await fetch(`${url}/rest/health`)).ok, "the node's health", 300_000);
    // The node runs this worktree's package (the mounted one), not the image's own.
    const mounted = (await execFileAsync("docker", ["exec", container, "sh", "-c", "sha256sum /opt/autobyteus/server-package/dist/integrations/github/github-repository-client.js"])).stdout.split(" ")[0];
    const local = (await execFileAsync("shasum", ["-a", "256", path.join(PACKAGE_DIR, "dist", "integrations", "github", "github-repository-client.js")])).stdout.split(" ")[0];
    expect(mounted, "the container runs this worktree's GitHub client").toBe(local);

    // As the desktop app connects: a setup code from the node, exchanged for an owner credential.
    const setup = (await execFileAsync("docker", ["exec", container, "node", "/opt/autobyteus/server-package/dist/node-access-cli.js", "setup-code", "--data-dir", "/home/autobyteus/data"])).stdout;
    const setupCode = /Setup code: (\S+)/.exec(setup)?.[1];
    expect(setupCode, "the node printed a setup code").toBeTruthy();
    const exchange = await fetch(`${url}/rest/node-access/setup-exchanges`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ setupCode, desktopName: "api627 test" }) });
    expect(exchange.status).toBe(201);
    const { credential } = await exchange.json() as { credential: string };
    const detach = attachOwnerCredential(url, credential);
    const answers: unknown[] = [];
    const gql = async (query: string, variables: Record<string, unknown> = {}) => {
      const answer = await (await fetch(`${url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) })).json() as { data?: Record<string, any>; errors?: Array<{ message: string }> };
      answers.push(answer);
      return answer;
    };
    const refusal = (answer: { errors?: Array<{ message: string }> }) => { expect(answer.errors?.length, "a refusal").toBeTruthy(); return answer.errors!.map((error) => error.message).join(" | "); };
    const IMPORT = `mutation($source:String!){importAgentPackage(input:{sourceKind:GITHUB_REPOSITORY, source:$source}){packageId}}`;
    try {
      expect((await gql(`{ githubConnection { connected login } }`)).data?.githubConnection).toEqual({ connected: false, login: null });
      expect(masked(refusal(await gql(IMPORT, { source: privateUrl })))).toBe(`GitHub repository not found, or it is private: ${PRIVATE}. To use a private repository, connect GitHub on this node.`);
      const connected = (await gql(`mutation($t:String!){connectGitHub(token:$t){connected login}}`, { t: value })).data?.connectGitHub;
      expect(connected?.connected, JSON.stringify(connected)).toBe(true);
      const privateAnswer = masked(refusal(await gql(IMPORT, { source: privateUrl })));
      const publicAnswer = refusal(await gql(IMPORT, { source: "https://github.com/octocat/Hello-World" }));
      expect(privateAnswer, "downloaded and validated on the Docker node like a public repository").toBe(publicAnswer);
      expect(privateAnswer).toBe("Agent package must contain at least one directory: 'agents', 'agent-teams', or 'applications'.");
      expect((await gql(`mutation{disconnectGitHub{connected login}}`)).data?.disconnectGitHub).toEqual({ connected: false, login: null });
    } finally {
      detach();
    }
    // AC-005 on the node: no answer, no file under its data folder (a tar stream read in memory), no log line holds the token.
    expect(JSON.stringify(answers).includes(value), "no GraphQL answer holds the token").toBe(false);
    const data = await output("docker", ["exec", container, "tar", "-C", "/home/autobyteus", "-cf", "-", "data"]);
    expect(data.length, "the node's data folder was read").toBeGreaterThan(10_000);
    expect(data.includes(value), "no file of the node holds the token").toBe(false);
    const logs = await output("docker", ["logs", container]);
    expect(logs.includes(value), "the node's log does not hold the token").toBe(false);
    expect(logs.includes("token="), "no URL carrying a token in the node's log").toBe(false);
  }, 900_000);
});
