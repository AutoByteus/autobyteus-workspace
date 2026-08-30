import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { ContextFile } from "autobyteus-ts/agent/message/context-file.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import { AgentRunProviderInputNormalizer } from "../../../../src/agent-execution/input/agent-run-provider-input-normalizer.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { ContextFileLayout } from "../../../../src/context-files/store/context-file-layout.js";
import { ContextFileOwnerResolver } from "../../../../src/context-files/services/context-file-owner-resolver.js";
import { ContextFileLocalPathResolver } from "../../../../src/context-files/services/context-file-local-path-resolver.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { TeamRunExecutionTreeStore } from "../../../../src/run-history/store/team-run-execution-tree-store.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testExecutionTree,
} from "../../../fixtures/current-team-run-fixtures.js";

const tempDirs: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const writeFile = async (filePath: string): Promise<string> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "proof");
  return filePath;
};

const createNormalizer = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "provider-input-normalizer-"));
  tempDirs.push(root);
  const appDataDir = path.join(root, "app-data");
  const memoryDir = path.join(root, "memory");
  const layout = new ContextFileLayout({ appDataDir, memoryDir });
  const storedFilename = "ctx_token__proof.unknown";
  const rootTeamRunId = "normalizer-root-team";
  const childTeamRunId = "normalizer-child-team";
  const nestedAddress = "/research/reviewer";
  const nestedAgentRunId = "normalizer-reviewer-run";
  const tree = testExecutionTree({
    rootTeamRunId,
    coordinatorAddress: "/coordinator",
    children: [
      testAgentNode("/coordinator"),
      testAgentTeamNode({
        address: "/research",
        coordinatorAddress: nestedAddress,
        teamRunId: childTeamRunId,
        children: [testAgentNode(nestedAddress, { agentRunId: nestedAgentRunId })],
      }),
    ],
  });
  const memoryLayout = new AgentMemoryLayout(memoryDir);
  const rootTeamDir = memoryLayout.getTeamDirPath({ rootTeamRunId, ancestorTeamRunIds: [] });
  await new TeamRunExecutionTreeStore().write(rootTeamDir, tree);

  const standaloneDraft = await writeFile(layout.getDraftFilePath({
    kind: "agent_draft",
    draftRunId: "agent-draft",
  }, storedFilename));
  const teamDraft = await writeFile(layout.getDraftFilePath({
    kind: "team_member_draft",
    teamDraftId: "team-draft",
    memberAddress: nestedAddress,
  }, storedFilename));
  const standaloneFinal = await writeFile(layout.getFinalFilePath({
    kind: "agent_final",
    runId: "standalone-run",
  }, storedFilename));
  const teamFinal = await writeFile(path.join(
    memoryLayout.getTeamAgentRunDirPath({
      rootTeamRunId,
      ancestorTeamRunIds: [childTeamRunId],
    }, nestedAgentRunId),
    "context_files",
    storedFilename,
  ));

  const normalizer = new AgentRunProviderInputNormalizer(
    new ContextFileLocalPathResolver({
      layout,
      ownerResolver: new ContextFileOwnerResolver({
        locations: createStoredTeamRunExecutionTreeLocationService(memoryDir),
      }),
      baseUrl: "http://studio.example.test:8000",
    }),
  );
  return {
    normalizer,
    locators: [
      `/rest/drafts/agent-runs/agent-draft/context-files/${storedFilename}`,
      `/rest/drafts/team-runs/team-draft/members/%2Fresearch%2Freviewer/context-files/${storedFilename}`,
      `/rest/runs/standalone-run/context-files/${storedFilename}`,
      `/rest/team-runs/${childTeamRunId}/members/%2Fresearch%2Freviewer/context-files/${storedFilename}`,
      `http://studio.example.test:8000/rest/runs/standalone-run/context-files/${storedFilename}`,
      `http://localhost:9999/rest/runs/standalone-run/context-files/${storedFilename}`,
    ],
    expectedPaths: [
      standaloneDraft,
      teamDraft,
      standaloneFinal,
      teamFinal,
      standaloneFinal,
      standaloneFinal,
    ],
  };
};

describe("AgentRunProviderInputNormalizer", () => {
  it("copies a claimed dispatch and resolves draft/final Agent and nested Team locators", async () => {
    const { normalizer, locators, expectedPaths } = await createNormalizer();
    const fileMetadata = { source: "upload" };
    const messageMetadata = { correlation: "c-1" };
    const files = locators.map((uri) => {
      const file = new ContextFile(uri, ContextFileType.IMAGE, "proof.custom", fileMetadata);
      file.fileType = ContextFileType.IMAGE;
      file.fileName = "proof.custom";
      return file;
    });
    const message = new AgentInputUserMessage("inspect", undefined, files, messageMetadata);
    const dispatch = { kind: "append_to_active_turn" as const, turnId: "turn-1", message };

    const normalized = normalizer.normalizeForProvider(dispatch);

    expect(normalized).not.toBe(dispatch);
    expect(normalized).toMatchObject({ kind: "append_to_active_turn", turnId: "turn-1" });
    expect(normalized.message).not.toBe(message);
    expect(normalized.message.content).toBe(message.content);
    expect(normalized.message.senderType).toBe(message.senderType);
    expect(normalized.message.metadata).toEqual(messageMetadata);
    expect(normalized.message.metadata).not.toBe(message.metadata);
    expect(normalized.message.contextFiles).not.toBe(files);
    for (let index = 0; index < files.length; index += 1) {
      const source = files[index]!;
      const copy = normalized.message.contextFiles![index]!;
      expect(copy).not.toBe(source);
      expect(copy.uri).toBe(expectedPaths[index]);
      expect(copy.fileType).toBe(ContextFileType.IMAGE);
      expect(copy.fileName).toBe("proof.custom");
      expect(copy.metadata).toEqual(fileMetadata);
      expect(copy.metadata).not.toBe(source.metadata);
      expect(source.uri).toBe(locators[index]);
    }
  });

  it("leaves remote, data, file, absolute, relative, and missing locators byte-identical", async () => {
    const { normalizer } = await createNormalizer();
    const locators = [
      "https://remote.example.test/rest/runs/run/context-files/missing.png",
      "data:image/png;base64,AA==",
      "file:///tmp/missing.png",
      "/tmp/missing.png",
      "relative/missing.png",
      "/rest/runs/run/context-files/missing.png?not-a-route=1",
    ];
    const message = new AgentInputUserMessage("inspect", undefined, locators.map((uri) => new ContextFile(uri)));
    const normalized = normalizer.normalizeForProvider({ kind: "start_turn", message });
    expect(normalized.message.contextFiles?.map((file) => file.uri)).toEqual(locators);
    expect(message.contextFiles?.map((file) => file.uri)).toEqual(locators);
  });

  it("preserves null versus an empty context-file array", async () => {
    const { normalizer } = await createNormalizer();
    const nullMessage = new AgentInputUserMessage("null", undefined, null);
    const emptyMessage = new AgentInputUserMessage("empty", undefined, []);

    expect(normalizer.normalizeForProvider({ kind: "start_turn", message: nullMessage }).message.contextFiles)
      .toBeNull();
    expect(normalizer.normalizeForProvider({ kind: "start_turn", message: emptyMessage }).message.contextFiles)
      .toEqual([]);
  });
});
