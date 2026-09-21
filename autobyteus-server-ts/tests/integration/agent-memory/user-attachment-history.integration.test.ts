import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import fastify from "fastify";
import multipart from "@fastify/multipart";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSchema, Query, Resolver } from "type-graphql";
const { graphql } = createRequire(import.meta.url)("graphql") as typeof import("graphql");
const config = vi.hoisted(() => ({ root: "" }));
vi.mock("../../../src/config/app-config-provider.js", () => ({ appConfigProvider: { config: {
  getAppDataDir: () => config.root, getMemoryDir: () => path.join(config.root, "memory"),
} } }));
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { registerContextFileRoutes } from "../../../src/api/rest/context-files.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { testExecutionTree, testAgentNode } from "../../fixtures/current-team-run-fixtures.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { createStoredCollaborationExecutionLocationService } from "../../../src/agent-collaboration/execution/services/collaboration-execution-location-service.js";
import { ContextFileOwnerResolver } from "../../../src/context-files/services/context-file-owner-resolver.js";
import { ContextFileLayout } from "../../../src/context-files/store/context-file-layout.js";
import { ContextFileLocalPathResolver } from "../../../src/context-files/services/context-file-local-path-resolver.js";
import { AgentRunProviderInputNormalizer } from "../../../src/agent-execution/input/agent-run-provider-input-normalizer.js";
import { AgentMemoryService } from "../../../src/agent-memory/services/agent-memory-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { MemoryViewConverter } from "../../../src/api/graphql/converters/memory-view-converter.js";
import { AgentMemoryView } from "../../../src/api/graphql/types/memory-view.js";
import { EventMonitorActiveTracePageObject } from "../../../src/api/graphql/types/event-monitor-active-trace-page.js";
import { LocalMemoryRunViewProjectionProvider } from "../../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { toCodexUserInput } from "../../../src/agent-execution/backends/codex/thread/codex-user-input-mapper.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { recordAcceptedAttachmentMessage } from "../../fixtures/accepted-attachment-message.js";

let app: ReturnType<typeof fastify>, memoryDir: string, normalizer: AgentRunProviderInputNormalizer;
let memoryView: AgentMemoryView, pageView: EventMonitorActiveTracePageObject;
@Resolver()
class ReadSurface {
  @Query(() => AgentMemoryView) memory() { return memoryView; }
  @Query(() => EventMonitorActiveTracePageObject) page() { return pageView; }
}
beforeEach(async () => {
  config.root = await fs.mkdtemp(path.join(os.tmpdir(), "attachment-history-"));
  memoryDir = path.join(config.root, "memory");
  const layout = new AgentMemoryLayout(memoryDir);
  const direct = testOrgAgentNode("/same", "direct");
  const lead = testOrgAgentNode("/team/lead", "lead");
  const team = testOrgTeamNode({ address: "/team", teamRunId: "team", coordinatorAddress: lead.address, members: [lead] });
  const tree = structuredClone(testAgentOrgExecutionTree({ orgRunId: "org", members: [direct, team] })) as any;
  tree.rootOrg.taskExecutions = [
    { address: direct.address, agentRunId: "repeat", platformAgentRunId: null, startedAt: "2026-09-01T00:00:01.000Z", settledAt: "2026-09-01T00:00:02.000Z" },
    { address: "/team", teamRunId: "task-team", members: [{ address: lead.address, agentRunId: "task-lead", platformAgentRunId: null }], taskExecutions: [], startedAt: "2026-09-01T00:00:01.000Z", settledAt: "2026-09-01T00:00:02.000Z" },
  ];
  await new AgentOrgRunExecutionTreeStore().write(layout.getOrgDirPath("org"), tree);
  await new TeamRunExecutionTreeStore().write(layout.getTeamDirPath({ rootTeamRunId: "standalone-team", ancestorTeamRunIds: [] }),
    testExecutionTree({ rootTeamRunId: "standalone-team", coordinatorAddress: "/lead", children: [testAgentNode("/lead", { agentRunId: "standalone-lead" })] }));
  normalizer = new AgentRunProviderInputNormalizer(new ContextFileLocalPathResolver({
    layout: new ContextFileLayout({ appDataDir: config.root, memoryDir }),
    ownerResolver: new ContextFileOwnerResolver({ locations: createStoredCollaborationExecutionLocationService(memoryDir) }),
    baseUrl: "http://app.test",
  }));
  app = fastify(); await app.register(multipart); await app.register(registerContextFileRoutes, { prefix: "/rest" });
});
afterEach(async () => { await app.close(); await fs.rm(config.root, { recursive: true, force: true }); });

const targets = [
  { id: "direct", draftOwner: { kind: "org_member_draft", orgRunId: "org", agentRunId: "direct" }, finalOwner: { kind: "org_member_final", orgRunId: "org", agentRunId: "direct" } },
  ...["repeat", "lead", "task-lead"].map(id => ({ id, draftOwner: { kind: "org_member_draft", orgRunId: "org", agentRunId: id }, finalOwner: { kind: "org_member_final", orgRunId: "org", agentRunId: id } })),
  { id: "standalone", draftOwner: { kind: "agent_draft", draftRunId: "draft" }, finalOwner: { kind: "agent_final", runId: "standalone" } },
  { id: "standalone-lead", draftOwner: { kind: "team_member_draft", teamDraftId: "draft-team", memberAddress: "/lead" }, finalOwner: { kind: "team_member_final", teamRunId: "standalone-team", memberAddress: "/lead" } },
];

describe("accepted user attachment filesystem -> record -> cold/page GraphQL -> exact Open", () => {
  it.each([RuntimeKind.AUTOBYTEUS, RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK])(
    "%s preserves both partitions for exact configured/task and standalone owners", async runtimeKind => {
      const schema = await buildSchema({ resolvers: [ReadSurface] });
      const allFixtures = [];
      for (const target of targets) {
        const files = [];
        for (const [name, fileType] of [["notes.txt", ContextFileType.TEXT], ["diagram.png", ContextFileType.IMAGE], ["report.pdf", ContextFileType.PDF]] as const) {
          const bytes = fileType === ContextFileType.IMAGE
            ? Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUGQAAAAASUVORK5CYII=", "base64")
            : Buffer.from(target.id + ":" + runtimeKind + ":" + name);
          const boundary = "attachment-upload";
          const response = await app.inject({ method: "POST", url: "/rest/context-files/upload",
            headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
            payload: Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="owner"\r\n\r\n${JSON.stringify(target.draftOwner)}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${fileType === "image" ? "image/png" : fileType === "pdf" ? "application/pdf" : "text/plain"}\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]),
          });
          expect(response.statusCode).toBe(200);
          const draft = response.json();
          expect((await app.inject({ method: "GET", url: draft.locator })).rawPayload).toEqual(bytes);
          const finalized = await app.inject({ method: "POST", url: "/rest/context-files/finalize",
            payload: { draftOwner: target.draftOwner, finalOwner: target.finalOwner, attachments: [draft] } });
          expect(finalized.statusCode).toBe(200);
          files.push({ ...finalized.json().attachments[0], bytes, fileType, name });
        }
        const dir = path.dirname(path.dirname(normalizer.normalizeForProvider({ kind: "start_turn",
          message: new AgentInputUserMessage("", undefined, [new ContextFile(files[0].locator)]) }).message.contextFiles![0].uri));
        const message = new AgentInputUserMessage("review files", undefined,
          files.map(f => new ContextFile(f.locator, f.fileType, "accepted-" + f.name)), {},
          [{ uri: "/untrusted/snapshot.txt", fileType: ContextFileType.TEXT, fileName: "ignored" }]);
        const { store, providerMessage } = await recordAcceptedAttachmentMessage({ id: target.id, memoryDir: dir, runtimeKind, message, normalizer });
        const expected = files.filter(f => f.fileType !== "image").map(f => ({ uri: f.locator, fileType: f.fileType, fileName: "accepted-" + f.name }));
        expect(providerMessage.recordingFileAttachments).toEqual(expected);
        const providerPayload = JSON.stringify(toCodexUserInput(providerMessage));
        expect(providerPayload).not.toContain("recording_file_attachments");
        expect(providerPayload).not.toContain("recordingFileAttachments");
        for (const reference of expected) expect(providerPayload).not.toContain(reference.uri);
        for (const [i, f] of files.entries()) {
          expect(providerMessage.contextFiles![i].uri).not.toBe(f.locator);
          expect(await fs.readFile(providerMessage.contextFiles![i].uri)).toEqual(f.bytes);
          expect(message.contextFiles![i].uri).toBe(f.locator);
        }
        const rawFile = store.getRawTracesPath(), rawBytes = await fs.readFile(rawFile);
        const row = JSON.parse(rawBytes.toString().trim());
        expect(row.file_attachments).toEqual(expected.map(f => ({ uri: f.uri, file_type: f.fileType, file_name: f.fileName })));
        expect(row.trace_type).toBe("user");
        expect(row.media.images).toEqual([runtimeKind === RuntimeKind.AUTOBYTEUS ? providerMessage.contextFiles![1].uri : files[1].locator]);
        memoryView = MemoryViewConverter.toGraphql(new AgentMemoryService(new MemoryFileStore(path.dirname(dir), { runRootSubdir: "" }))
          .getRunMemoryView(path.basename(dir), { includeRawTraces: true, includeWorkingContext: false }));
        const providerInput = { source: { runId: target.id, runtimeKind, memoryDir: dir, workspaceRootPath: null, platformRunId: null, metadata: null } };
        const projection = await new LocalMemoryRunViewProjectionProvider(memoryDir).buildProjection(providerInput);
        const cold = await new LocalMemoryRunViewProjectionProvider(memoryDir).buildProjection(providerInput);
        expect(cold.conversation).toEqual(projection.conversation);
        expect(cold.conversation[0].fileAttachments).toEqual(expected);
        pageView = await new LocalMemoryRunViewProjectionProvider(memoryDir).buildActiveTracePage({ ...providerInput, subjectFingerprint: target.id });
        const result = await graphql({ schema, source: `{ memory { rawTraces { id traceType fileAttachments { uri fileType fileName } } }
          page { events { eventId turnGroupId occurredAtMs visuals { __typename ... on EventMonitorUserVisual { kind visualId eventId kindOrdinal text attachments { attachmentId fileType fileName locator } } } } } }` });
        expect(result.errors).toBeUndefined();
        expect((result.data as any).memory.rawTraces[0].fileAttachments).toEqual(expected);
        const visual = (result.data as any).page.events[0].visuals[0];
        expect(visual.attachments).toHaveLength(3);
        for (const [i, f] of expected.entries()) {
          const attachment = visual.attachments[i + 1];
          expect(attachment).toMatchObject({ locator: f.uri, fileType: f.fileType, fileName: f.fileName });
          expect(attachment.attachmentId).toContain(`:attachment:file:${i}`);
          const open = await app.inject({ method: "GET", url: attachment.locator });
          expect(open.statusCode).toBe(200); expect(open.rawPayload).toEqual(files.find(file => file.locator === f.uri)!.bytes);
        }
        expect(await fs.readFile(rawFile)).toEqual(rawBytes);
        allFixtures.push({ target: target.id, runtimeKind, projection: cold, page: result.data!.page, files });
      }
      if (process.env.IR055_RENDER_FIXTURE) {
        await fs.writeFile(path.join(process.env.IR055_RENDER_FIXTURE, runtimeKind + ".json"), JSON.stringify(allFixtures, null, 2));
      }
    }, 30_000);
  it.each([RuntimeKind.AUTOBYTEUS, RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK].flatMap(runtimeKind =>
    ["file-only", "unknown", "media-only", "no-context"].map(scenario => ({ runtimeKind, scenario })),
  ))("$runtimeKind $scenario preserves optional facts in the same accepted row", async ({ runtimeKind, scenario }) => {
    const draftOwner = { kind: "agent_draft", draftRunId: "isolated" };
    const finalOwner = { kind: "agent_final", runId: "isolated" };
    const files: ContextFile[] = [];
    if (scenario !== "no-context") {
      const boundary = "single-file";
      const bytes = "one exact file";
      const response = await app.inject({ method: "POST", url: "/rest/context-files/upload",
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        payload: `--${boundary}\r\nContent-Disposition: form-data; name="owner"\r\n\r\n${JSON.stringify(draftOwner)}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="notes.txt"\r\nContent-Type: text/plain\r\n\r\n${bytes}\r\n--${boundary}--\r\n`,
      });
      expect(response.statusCode).toBe(200);
      const finalized = await app.inject({ method: "POST", url: "/rest/context-files/finalize",
        payload: { draftOwner, finalOwner, attachments: [response.json()] } });
      expect(finalized.statusCode).toBe(200);
      const locator = finalized.json().attachments[0].locator;
      const file = new ContextFile(locator, ContextFileType.TEXT, "accepted.txt");
      file.fileType = scenario === "media-only" ? ContextFileType.IMAGE : scenario === "unknown" ? ContextFileType.UNKNOWN : ContextFileType.TEXT;
      file.fileName = scenario === "unknown" ? null : file.fileName;
      files.push(file);
    }
    const dir = path.join(memoryDir, "agents", "isolated");
    const message = new AgentInputUserMessage(scenario === "no-context" ? "no file" : "inspect the attachment", undefined, files);
    const { store } = await recordAcceptedAttachmentMessage({ id: "isolated", memoryDir: dir, runtimeKind, message, normalizer });
    const rows = store.listTurnRawTracesOrdered();
    expect(rows).toHaveLength(1);
    const input = { source: { runId: "isolated", runtimeKind, memoryDir: dir, workspaceRootPath: null, platformRunId: null, metadata: null } };
    const provider = new LocalMemoryRunViewProjectionProvider(memoryDir);
    const projection = await provider.buildProjection(input);
    const page = await provider.buildActiveTracePage({ ...input, subjectFingerprint: scenario });
    if (scenario === "file-only" || scenario === "unknown") {
      const expected = files.map(file => ({ uri: file.uri, fileType: file.fileType, fileName: file.fileName }));
      expect(rows[0].fileAttachments).toEqual(expected);
      expect(projection.conversation[0].fileAttachments).toEqual(expected);
      const visual = page.events[0].visuals[0];
      expect(visual).toMatchObject({ kind: "user", attachments: [{ locator: files[0].uri, fileType: files[0].fileType, fileName: files[0].fileName }] });
      expect((await app.inject({ method: "GET", url: files[0].uri })).body).toBe("one exact file");
    } else {
      expect(rows[0].toDict()).not.toHaveProperty("file_attachments");
      expect(projection.conversation[0]).not.toHaveProperty("fileAttachments");
      expect(page.events[0].visuals[0]).toMatchObject({ kind: "user", attachments: scenario === "no-context" ? [] : [expect.objectContaining({ fileType: "image" })] });
    }
  });

});
