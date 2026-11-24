/**
 * Private GitHub repositories on the BUILT server (autobyteus-627), through its public GraphQL surface, on a test-owned
 * data root (`startBuiltStudio`).
 *
 * BS-L1 (live, real GitHub; AC-001, AC-002, AC-005, AC-007): the user's steps on a fresh node. With GitHub not connected,
 * importing the private repository the GitHub test token can read is refused "not found, or private: connect GitHub";
 * an invalid token is refused and nothing is saved; with the test token saved (`connectGitHub`), the same import gets as
 * far as a public repository of the same shape (`octocat/Hello-World`, one file at its root) and is refused by the same
 * package validation, word for word, as an Agent Package and as a Skill source (the token's private repository holds no
 * package: the download, extraction and validation ran). A public package (`AutoByteus/autobyteus-agents`) imports and
 * checks for updates with the token saved. After Disconnect the private import is refused as at first. The token never
 * appears in the server's output, its data root (logs, app data, database, vault files) or any GraphQL answer.
 * The repository's name is never printed or recorded. Read-only on GitHub.
 *
 * BS-E1 (GitHub emulated for one private repository; AC-003, AC-004, AC-005, AC-007): what the test token cannot give,
 * as no private agent package exists to read and nothing may be written to GitHub. The built server runs with the browser
 * probe's preload (`autobyteus-web/tests/e2e/fixtures/github-private-upstream.mjs`, `probe-org/private-pack`, one accepted
 * token). The private package is imported with the token saved; a new commit upstream is found and installed by the
 * node's scheduled pass (automatic updates on; the package's last check set back two days in the stopped node's own
 * registry, as the 15-minute minimum interval would otherwise hold it); after Disconnect the scheduled pass's check says
 * "connect GitHub" and the installed package stays; with the saved token later revoked upstream, a check says "rejected"
 * and the package stays, while a public package (real GitHub, `AutoByteus/autobyteus-agents`) imports as today. The
 * accepted token is in no output, record or answer.
 * Gate: RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1 and a current build; BS-L1 also needs AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault
 * holding `test.github.token` (AUTOBYTEUS_LIVE_STRICT=1 fails instead of skipping without it). BS-E1 needs no secret,
 * only network access to public GitHub for its public package.
 *
 * Command (repository root):
 *   pnpm -C autobyteus-server-ts build
 *   AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_GITHUB_PRIVATE_REPOSITORY_E2E=1 \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/integrations/github-private-repository-built-server.e2e.test.ts --no-watch
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { create as createTar } from "tar";
import { afterAll, describe, expect, it } from "vitest";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";
import { killBuiltStudios, startBuiltStudio, until, type BuiltStudio } from "../helpers/built-studio-roots.js";

const serverDir = path.resolve(import.meta.dirname, "../../..");
const BUILT = fs.existsSync(path.join(serverDir, "dist", "app.js"));
const LIVE = process.env["RUN_GITHUB_PRIVATE_REPOSITORY_E2E"] === "1";

type GraphqlAnswer = { data?: Record<string, any> | null; errors?: ReadonlyArray<{ message: string }> };
/** A GraphQL call on the built server that returns its errors instead of throwing (the refusals are the point). */
const graphql = async (studio: BuiltStudio, query: string, variables: Record<string, unknown> = {}): Promise<GraphqlAnswer> => {
  const response = await fetch(`${studio.url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  return await response.json() as GraphqlAnswer;
};
const errorText = (answer: GraphqlAnswer): string => {
  expect(answer.errors?.length, `expected a refusal, got ${JSON.stringify(answer.data)}`).toBeTruthy();
  return answer.errors!.map((error) => error.message).join(" | ");
};
const CONNECTION = `{ githubConnection { connected login } }`;
const IMPORT_PACKAGE = `mutation($source:String!){importAgentPackage(input:{sourceKind:GITHUB_REPOSITORY, source:$source}){packageId source sourceKind sharedAgentCount agentTeamCount updateInfo{status installedRevision message lastError}}}`;
const IMPORT_SKILLS = `mutation($url:String!){importGitHubSkillSource(repositoryUrl:$url){sources{sourceId sourceKind} warnings}}`;
const notVisible = (url: string) => `GitHub repository not found, or it is private: ${url}. To use a private repository, connect GitHub on this node.`;

/** Every file under `root` (logs, app data, database, vault files), read as bytes. */
const filesUnder = (root: string): string[] => {
  const out: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full); else if (entry.isFile()) out.push(full);
    }
  };
  walk(root);
  return out;
};

afterAll(() => killBuiltStudios());

describe.skipIf(!LIVE || !BUILT)("Private GitHub repositories on the built server, against real GitHub (live)", () => {
  it("BS-L1 AC-001/AC-002/AC-005/AC-007: not connected, an invalid token, the token saved, a private import as far as a public one of the same shape, a public package, Disconnect; the token nowhere", async (context) => {
    const value = (await readLiveTestSecret(context, "test.github.token")).revealToTrustedConsumer();
    const listing = await fetch("https://api.github.com/user/repos?visibility=private&per_page=100", {
      headers: { Authorization: `Bearer ${value}`, Accept: "application/vnd.github+json", "User-Agent": "AutoByteus" },
    });
    expect(listing.status, "GitHub /user/repos with the test token").toBe(200);
    const privateRepository = ((await listing.json()) as Array<{ full_name: string; private: boolean }>).find((repository) => repository.private);
    expect(privateRepository, "the test token can read a private repository").toBeDefined();
    const privateUrl = `https://github.com/${privateRepository!.full_name}`;
    /** A text with the private repository's address replaced, so no assertion prints its name. */
    const masked = (text: string) => text.split(privateUrl).join("<private repository>");
    const PRIVATE = "<private repository>";
    const sameShapePublicUrl = "https://github.com/octocat/Hello-World";
    const publicPackageUrl = "https://github.com/AutoByteus/autobyteus-agents";

    const root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "github-private-built-")));
    await fsp.mkdir(path.join(root, "home"), { recursive: true });
    await fsp.mkdir(path.join(root, "db"), { recursive: true });
    await fsp.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const answers: GraphqlAnswer[] = [];
    const call = async (query: string, variables: Record<string, unknown> = {}) => { const answer = await graphql(studio, query, variables); answers.push(answer); return answer; };
    let studio = await startBuiltStudio(root, {});
    try {
      // Not connected (AC-002): the import says why and what to do.
      expect((await call(CONNECTION)).data?.githubConnection).toEqual({ connected: false, login: null });
      expect(masked(errorText(await call(IMPORT_PACKAGE, { source: privateUrl })))).toBe(notVisible(PRIVATE));

      // An invalid token is refused and nothing is saved (AC-002).
      const invalid = `github_pat_${"0".repeat(22)}_${"0".repeat(59)}`;
      const refusedSave = errorText(await call(`mutation($t:String!){connectGitHub(token:$t){connected login}}`, { t: invalid }));
      expect(refusedSave.length).toBeGreaterThan(0);
      expect((await call(CONNECTION)).data?.githubConnection, "nothing saved").toEqual({ connected: false, login: null });

      // The token saved: the GitHub login comes back, never the token.
      const connected = (await call(`mutation($t:String!){connectGitHub(token:$t){connected login}}`, { t: value })).data?.connectGitHub;
      expect(connected?.connected, JSON.stringify(connected)).toBe(true);
      expect(typeof connected?.login).toBe("string");

      // AC-001: the private import goes as far as a public repository of the same shape and gets the same validation.
      const privateAsPackage = masked(errorText(await call(IMPORT_PACKAGE, { source: privateUrl })));
      const publicAsPackage = errorText(await call(IMPORT_PACKAGE, { source: sameShapePublicUrl })).split(sameShapePublicUrl).join(PRIVATE);
      expect(privateAsPackage, "the private repository downloaded and validated like the public one").toBe(publicAsPackage);
      expect(privateAsPackage).toBe("Agent package must contain at least one directory: 'agents', 'agent-teams', or 'applications'.");
      const privateAsSkills = masked(errorText(await call(IMPORT_SKILLS, { url: privateUrl })));
      const publicAsSkills = errorText(await call(IMPORT_SKILLS, { url: sameShapePublicUrl })).split(sameShapePublicUrl).join(PRIVATE);
      expect(privateAsSkills, "as a Skill source too").toBe(publicAsSkills);

      // AC-007: a public package imports and checks for updates as today, with the token saved.
      const imported = await call(IMPORT_PACKAGE, { source: publicPackageUrl });
      expect(imported.errors, JSON.stringify(imported.errors)).toBeUndefined();
      const publicPackage = (imported.data?.importAgentPackage as Array<Record<string, any>>).find((entry) => entry.source === publicPackageUrl);
      expect(publicPackage, JSON.stringify(imported.data)).toBeDefined();
      expect(publicPackage!.sharedAgentCount + publicPackage!.agentTeamCount, "the public package's definitions").toBeGreaterThan(0);
      const checked = await call(`mutation($ids:[String!]){checkAgentPackageUpdates(packageIds:$ids){packageId updateInfo{status installedRevision latestRevision lastError}}}`, { ids: [publicPackage!.packageId] });
      expect(checked.errors, JSON.stringify(checked.errors)).toBeUndefined();
      const afterCheck = (checked.data?.checkAgentPackageUpdates as Array<Record<string, any>>).find((entry) => entry.packageId === publicPackage!.packageId);
      expect(afterCheck?.updateInfo, JSON.stringify(afterCheck)).toMatchObject({ lastError: null, latestRevision: publicPackage!.updateInfo.installedRevision });

      // Disconnect: the private import is refused as at first (AC-002).
      expect((await call(`mutation{disconnectGitHub{connected login}}`)).data?.disconnectGitHub).toEqual({ connected: false, login: null });
      expect(masked(errorText(await call(IMPORT_PACKAGE, { source: privateUrl })))).toBe(notVisible(PRIVATE));
    } finally {
      await studio.stop();
    }

    // AC-005: the token is in no answer, no output and no file of the node (after its stop, so every log is flushed).
    const leaks: string[] = [];
    if (JSON.stringify(answers).includes(value)) leaks.push("a GraphQL answer");
    if (studio.output().includes(value)) leaks.push("the server's output");
    const files = filesUnder(root);
    for (const file of files) if (fs.readFileSync(file).includes(value)) leaks.push(path.relative(root, file));
    expect(leaks, "the token appears nowhere").toEqual([]);
    expect(studio.output().includes("token="), "no URL carrying a token in the output").toBe(false);
    // A downloaded repository's own content may hold "token=" (the public package's scripts do); the node's records may not.
    const downloaded = path.join(root, "agent-packages", "github") + path.sep;
    const withTokenParameter = files.filter((file) => !file.startsWith(downloaded) && fs.readFileSync(file).includes("token="));
    expect(withTokenParameter.map((file) => path.relative(root, file)), "no URL carrying a token in any file").toEqual([]);
    expect(files.length, "the node wrote its data root").toBeGreaterThan(0);
    await fsp.rm(root, { recursive: true, force: true });
  }, 600_000);
});

const EMULATION = path.resolve(serverDir, "..", "autobyteus-web", "tests", "e2e", "fixtures", "github-private-upstream.mjs");
const EMULATED_URL = "https://github.com/probe-org/private-pack";
const PACKAGE_FIELDS = `packageId source sharedAgentCount updateInfo{status installedRevision latestRevision checkedAt lastError}`;

describe.skipIf(!LIVE || !BUILT)("Private GitHub packages on the built server: scheduled updates, Disconnect, a revoked token (GitHub emulated)", () => {
  it("BS-E1 AC-003/AC-004/AC-005/AC-007: the scheduled pass installs a private package's new commit; after Disconnect it says 'connect GitHub'; a revoked token says 'rejected'; the package stays; a public package imports", async () => {
    const root = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "github-private-built-emulated-")));
    const data = path.join(root, "node");
    for (const folder of ["home", "db"]) await fsp.mkdir(path.join(data, folder), { recursive: true });
    await fsp.writeFile(path.join(data, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const accepted = `github_pat_EMULATED_${Date.now().toString(36)}_ACCEPTED_627`;
    const control = path.join(root, "control.json");
    /** The private repository at `revision`, with `agents` shared agents, in GitHub's archive layout. */
    const publish = async (revision: string, agents: number) => {
      const top = path.join(root, "archives", revision, `private-pack-${revision}`);
      for (let index = 1; index <= agents; index += 1) {
        const agent = path.join(top, "agents", `private-helper-${index}`);
        await fsp.mkdir(agent, { recursive: true });
        await fsp.writeFile(path.join(agent, "agent.md"), `---\nname: Private Helper ${index}\ndescription: From a private repository\n---\n\nHelp.\n`);
        await fsp.writeFile(path.join(agent, "agent-config.json"), "{}");
      }
      const archive = path.join(root, "archives", `${revision}.tar.gz`);
      await createTar({ cwd: path.join(root, "archives", revision), file: archive, gzip: true, portable: true }, [`private-pack-${revision}`]);
      const state = fs.existsSync(control) ? JSON.parse(await fsp.readFile(control, "utf8")) : { accepted };
      await fsp.writeFile(control, JSON.stringify({ ...state, archive, revision, archives: { ...(state.archives ?? {}), [revision]: archive } }));
    };
    const revoke = async () => {
      const state = JSON.parse(await fsp.readFile(control, "utf8"));
      await fsp.writeFile(control, JSON.stringify({ ...state, accepted: `${accepted}_REPLACED` }));
    };
    const env = { NODE_OPTIONS: `--import ${EMULATION}`, GITHUB_PRIVATE_PROBE_CONTROL: control };
    const outputs: string[] = [];
    const answers: GraphqlAnswer[] = [];
    let studio: BuiltStudio;
    const call = async (query: string, variables: Record<string, unknown> = {}) => { const answer = await graphql(studio, query, variables); answers.push(answer); return answer; };
    const packageOf = async (packageId: string) => ((await call(`{ agentPackages { ${PACKAGE_FIELDS} } }`)).data?.agentPackages as Array<Record<string, any>>)
      .find((entry) => entry.packageId === packageId)!;
    /** Stops the node, sets the package's last check two days back in its own registry, and starts it again. */
    const restartDue = async (packageId: string) => {
      await studio.stop();
      outputs.push(studio.output());
      const registry = path.join(data, "agent-packages", "registry.json");
      const rows = JSON.parse(await fsp.readFile(registry, "utf8")) as Array<Record<string, any>>;
      const row = rows.find((entry) => entry.packageId === packageId);
      expect(row?.sourceMetadata?.github, `the registry row of ${packageId}`).toBeTruthy();
      row!.sourceMetadata.github.latestCheckedAt = new Date(Date.now() - 2 * 24 * 3600_000).toISOString();
      await fsp.writeFile(registry, `${JSON.stringify(rows, null, 2)}\n`);
      studio = await startBuiltStudio(data, env);
    };

    const r1 = "a".repeat(40), r2 = "b".repeat(40), r3 = "c".repeat(40);
    await publish(r1, 1);
    studio = await startBuiltStudio(data, env);
    try {
      expect((await call(`mutation($t:String!){connectGitHub(token:$t){connected login}}`, { t: accepted })).data?.connectGitHub).toEqual({ connected: true, login: "octo-dev" });
      const imported = await call(`mutation($s:String!){importAgentPackage(input:{sourceKind:GITHUB_REPOSITORY, source:$s}){${PACKAGE_FIELDS}}}`, { s: EMULATED_URL });
      expect(imported.errors, JSON.stringify(imported.errors)).toBeUndefined();
      const installed = (imported.data?.importAgentPackage as Array<Record<string, any>>).find((entry) => entry.source === EMULATED_URL)!;
      expect(installed, JSON.stringify(imported.data)).toMatchObject({ sharedAgentCount: 1, updateInfo: { installedRevision: r1 } });
      const packageId = installed.packageId as string;
      expect((await call(`mutation{setAutomaticUpdates(kind:AGENT_PACKAGE, enabled:true){automaticUpdates{agentPackages}}}`)).errors).toBeUndefined();

      // AC-003: a new commit upstream; the node's own scheduled pass finds it and installs it (automatic updates on).
      await publish(r2, 2);
      await restartDue(packageId);
      const updated = await until(async () => { const entry = await packageOf(packageId); return entry.updateInfo.installedRevision === r2 ? entry : null; },
        "the scheduled pass installs the new commit", 240_000);
      expect(updated.sharedAgentCount, "the new commit's two agents").toBe(2);

      // After Disconnect: the scheduled pass's check of the private source says "connect GitHub"; the package stays.
      expect((await call(`mutation{disconnectGitHub{connected login}}`)).data?.disconnectGitHub).toEqual({ connected: false, login: null });
      await publish(r3, 3);
      await restartDue(packageId);
      const refused = await until(async () => { const entry = await packageOf(packageId); return entry.updateInfo.lastError ? entry : null; },
        "the scheduled pass's check after Disconnect", 240_000);
      expect(refused.updateInfo.lastError).toBe(notVisible(EMULATED_URL));
      expect(refused, "the installed package stays").toMatchObject({ sharedAgentCount: 2, updateInfo: { installedRevision: r2 } });

      // AC-004: the token saved again, then revoked upstream: a check says "rejected"; the package stays.
      expect((await call(`mutation($t:String!){connectGitHub(token:$t){connected login}}`, { t: accepted })).data?.connectGitHub?.connected).toBe(true);
      await revoke();
      const checked = await call(`mutation($ids:[String!]){checkAgentPackageUpdates(packageIds:$ids){${PACKAGE_FIELDS}}}`, { ids: [packageId] });
      const rejected = ((checked.data?.checkAgentPackageUpdates ?? []) as Array<Record<string, any>>).find((entry) => entry.packageId === packageId);
      const rejectedText = rejected?.updateInfo.lastError ?? (checked.errors ?? []).map((error) => error.message).join(" | ");
      expect(rejectedText).toBe("GitHub rejected this node's GitHub token (expired or revoked). Reconnect GitHub on this node.");
      expect(await packageOf(packageId), "the installed package stays").toMatchObject({ sharedAgentCount: 2, updateInfo: { installedRevision: r2 } });

      // AC-007: with the revoked token still saved, a public package imports as today (real GitHub, no token needed).
      const publicUrl = "https://github.com/AutoByteus/autobyteus-agents";
      const publicImport = await call(`mutation($s:String!){importAgentPackage(input:{sourceKind:GITHUB_REPOSITORY, source:$s}){${PACKAGE_FIELDS}}}`, { s: publicUrl });
      expect(publicImport.errors, JSON.stringify(publicImport.errors)).toBeUndefined();
      expect((publicImport.data?.importAgentPackage as Array<Record<string, any>>).some((entry) => entry.source === publicUrl)).toBe(true);
    } finally {
      await studio!.stop();
      outputs.push(studio!.output());
    }

    // AC-005: the accepted token is in no answer, output or file of the node; the emulated GitHub saw it only as a header.
    const files = filesUnder(data);
    const leaks = [
      ...(JSON.stringify(answers).includes(accepted) ? ["a GraphQL answer"] : []),
      ...(outputs.some((text) => text.includes(accepted)) ? ["the server's output"] : []),
      ...files.filter((file) => fs.readFileSync(file).includes(accepted)).map((file) => path.relative(data, file)),
    ];
    expect(leaks, "the token appears nowhere").toEqual([]);
    const downloaded = path.join(data, "agent-packages", "github") + path.sep;
    expect(files.filter((file) => !file.startsWith(downloaded) && fs.readFileSync(file).includes("token=")).map((file) => path.relative(data, file))).toEqual([]);
    const upstream = (await fsp.readFile(path.join(root, "upstream-requests.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line) as { url: string; credential: string });
    expect(upstream.every((request) => !request.url.includes(accepted) && !request.url.includes("token=")), "no URL carried the token").toBe(true);
    expect(upstream.some((request) => request.credential === "accepted"), "the emulated GitHub saw the token as a header").toBe(true);
    await fsp.rm(root, { recursive: true, force: true });
  }, 900_000);
});
