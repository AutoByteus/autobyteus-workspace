import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(THIS_FILE), "../../..");
const read = (relativePath: string): string => readFileSync(join(ROOT, relativePath), "utf8");

const listFiles = (root: string): string[] => readdirSync(root).flatMap((name) => {
  const path = join(root, name);
  return statSync(path).isDirectory() ? listFiles(path) : [path];
});

const productionFiles = [
  "autobyteus-application-sdk-contracts/src",
  "autobyteus-application-backend-sdk/src",
  "autobyteus-application-frontend-sdk/src",
  "autobyteus-server-ts/src/application-agent-communication",
  "autobyteus-server-ts/src/application-agent-streaming",
  "autobyteus-server-ts/src/application-orchestration",
  "autobyteus-server-ts/src/application-platform/execution",
  "applications/brief-studio/backend-src",
  "applications/socratic-math-teacher/backend-src",
].flatMap((relativePath) => listFiles(join(ROOT, relativePath)))
  .filter((path) => /\.(?:ts|js)$/.test(path))
  .concat([
    join(ROOT, "autobyteus-server-ts/src/api/websocket/application-agent-communication.ts"),
    join(ROOT, "autobyteus-server-ts/src/standalone-application-host/api/register-standalone-application-websockets.ts"),
  ]);

const packageContractCopies = [
  "applications/brief-studio/ui/vendor/application-sdk-contracts",
  "applications/socratic-math-teacher/ui/vendor/application-sdk-contracts",
].flatMap((relativePath) => listFiles(join(ROOT, relativePath)))
  .filter((path) => /application-agent-(?:bindings|target-url)\.(?:d\.ts|js)(?:\.map)?$/.test(path));

const offendingFiles = (
  files: readonly string[],
  predicate: (source: string, path: string) => boolean,
): string[] => files
  .filter((path) => predicate(readFileSync(path, "utf8"), path))
  .map((path) => relative(ROOT, path).split("\\").join("/"));

describe("logical application-agent addressing boundaries", () => {
  it("keeps the public contract exact and rooted-member canonical", () => {
    const bindings = read("autobyteus-application-sdk-contracts/src/application-agent-bindings.ts");
    const memberAddress = read("autobyteus-application-sdk-contracts/src/application-agent-member-address.ts");

    expect(bindings).toContain("export type ApplicationAgentTargetAddress = Readonly<{\n  bindingId: string;\n  memberAddress: ApplicationAgentMemberAddress | null;\n}>");
    expect(bindings).not.toContain("export type ApplicationAgentTarget =");
    expect(bindings).not.toContain("ApplicationExecutionProducerRuntimeKind");
    expect(memberAddress).toContain("export type ApplicationAgentMemberAddress = `/${string}`");
    expect(memberAddress).toContain("parseApplicationAgentMemberAddress");
  });

  it("keeps authorization as the sole public-to-runtime translator", () => {
    const authorization = read("autobyteus-server-ts/src/application-orchestration/services/application-agent-target-authorization-service.ts");
    const host = read("autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts");
    const scopeContracts = read("autobyteus-server-ts/src/application-platform/execution/application-execution-scope-contracts.ts");
    const streamSource = read("autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-runtime-source.ts");
    const subscription = read("autobyteus-server-ts/src/application-agent-streaming/services/application-agent-stream-subscription.ts");
    const studioRoute = read("autobyteus-server-ts/src/api/websocket/application-agent-communication.ts");
    const standaloneRoute = read("autobyteus-server-ts/src/standalone-application-host/api/register-standalone-application-websockets.ts");
    const sendInputMethod = host.slice(
      host.indexOf("  async sendRunInput("),
      host.indexOf("  async terminateRunBinding("),
    );

    expect(authorization).toContain("runtime: ResolvedApplicationAgentExecutionTarget");
    expect(authorization).toContain("member.memberAddress === memberAddress");
    expect(authorization).toContain("deepFreeze({");
    expect(sendInputMethod).toContain("postAuthorizedRunInputInternal(descriptor.runtime, input.input)");
    expect(sendInputMethod).toContain("structuredClone(descriptor.binding)");
    expect(sendInputMethod).not.toContain("bindingStore.getBinding");
    expect(scopeContracts).not.toContain("application-agent-target-authorization-service");
    expect(scopeContracts).not.toContain("AuthorizedApplicationAgentTargetDescriptor");
    expect(streamSource).toContain("target: ResolvedApplicationAgentExecutionTarget");
    expect(streamSource).not.toContain("ApplicationAgentTargetAddress");
    expect(streamSource).not.toContain("ApplicationAgentBinding");
    expect(subscription).toContain("descriptor.runtime,");
    expect(subscription).toContain("address: structuredClone(this.descriptor.address)");
    expect(subscription).not.toContain("address: structuredClone(this.input.address)");
    expect(studioRoute).toContain("decodeApplicationAgentTargetUrl(`/${readEncodedTargetPath(req)}`)");
    expect(standaloneRoute).toContain("decodeApplicationAgentTargetUrl(`/${readEncodedAgentTargetPath(request)}`)");
  });

  it("removes old target, URL, and application-role shapes from supported production copies", () => {
    const files = [...productionFiles, ...packageContractCopies];
    const violations = offendingFiles(files, (source, path) => {
      const isPhysicalStore = path.endsWith("application-run-binding-store.ts");
      return /export type ApplicationAgentTarget\s*=/.test(source)
        || /\.target\.kind\b/.test(source)
        || /targets\/(?:agent-run|agent-team-run|agent-team-member)/.test(source)
        || /ApplicationExecutionProducerRuntimeKind/.test(source)
        || (!isPhysicalStore && /runtimeKind\s*:\s*["'](?:AGENT|AGENT_TEAM_MEMBER)["']/.test(source));
    });

    expect(violations).toEqual([]);
  });

  it("keeps only logical root/member backend builders", () => {
    const helpers = read("autobyteus-application-backend-sdk/src/application-agent-target-address.ts");
    const exports = read("autobyteus-application-backend-sdk/src/index.ts");

    expect(helpers).toContain("binding: ApplicationAgentBinding | ApplicationAgentTeamBinding");
    expect(helpers).toContain("memberAddress: ApplicationAgentMemberAddress");
    expect(helpers).toContain("member?.memberAddress === normalizedMemberAddress");
    expect(helpers).not.toContain("agentRunId: string");
    expect(exports).not.toContain("createApplicationAgentTeamTargetAddress");
  });

  it("requires owned current-schema projectors and the one private physical role constant", () => {
    const bindingStore = read("autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts");
    const journalStore = read("autobyteus-server-ts/src/application-orchestration/stores/application-execution-event-journal-store.ts");
    const metadataStore = read("autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts");

    expect(bindingStore).toContain("ApplicationRunBindingRecordCodec.decode");
    expect(bindingStore).toContain("APPLICATION_AGENT_TEAM_MEMBER_STORAGE_RUNTIME_KIND = \"AGENT_TEAM_MEMBER\"");
    expect(journalStore).toContain("ApplicationRunBindingRecordCodec.decode");
    expect(journalStore).toContain("ApplicationExecutionProducerProjector.project");
    expect(metadataStore).toContain("ApplicationExecutionProducerProjector.projectContext");
  });

  it("keeps old wire literals only as explicit rejection fixtures", () => {
    const contractTest = read("autobyteus-application-sdk-contracts/tests/application-iframe-contract.test.mjs");
    const authorizationTest = read("autobyteus-server-ts/tests/unit/application-orchestration/application-agent-target-authorization-service.test.ts");
    const oldUrls = contractTest.match(/targets\/(?:agent-run|agent-team-run|agent-team-member)/g) ?? [];
    const oldTargetObjects = authorizationTest.match(/target:\s*\{\s*kind:\s*"AGENT_RUN"\s*\}/g) ?? [];

    expect(oldUrls).toHaveLength(4);
    expect(oldTargetObjects).toHaveLength(2);
  });
});
