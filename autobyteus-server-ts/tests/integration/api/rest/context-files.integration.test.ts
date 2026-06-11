import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";

const appConfigState = vi.hoisted(() => ({
  root: "",
  baseUrl: "http://localhost:8000",
}));

const activeTeamRunManagerState = vi.hoisted(() => ({
  manager: null as null | {
    getTeamRun: (teamRunId: string) => unknown | null;
    listActiveRuns: () => string[];
  },
}));

vi.mock("../../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: {
      getAppDataDir: (): string => appConfigState.root,
      getMemoryDir: (): string => path.join(appConfigState.root, "memory"),
      getBaseUrl: (): string => appConfigState.baseUrl,
    },
  },
}));

vi.mock("../../../../src/run-history/services/team-run-metadata-service.js", async () => {
  const actual = await vi.importActual<typeof import("../../../../src/run-history/services/team-run-metadata-service.js")>(
    "../../../../src/run-history/services/team-run-metadata-service.js",
  );
  return {
    ...actual,
    getTeamRunMetadataService: (): InstanceType<typeof actual.TeamRunMetadataService> =>
      new actual.TeamRunMetadataService(path.join(appConfigState.root, "memory")),
  };
});

vi.mock("../../../../src/agent-team-execution/services/agent-team-run-manager.js", async () => {
  const actual = await vi.importActual<typeof import("../../../../src/agent-team-execution/services/agent-team-run-manager.js")>(
    "../../../../src/agent-team-execution/services/agent-team-run-manager.js",
  );
  const inactiveTeamRunManager = {
    getTeamRun: () => null,
    listActiveRuns: () => [],
  };
  const AgentTeamRunManager = new Proxy(actual.AgentTeamRunManager, {
    get(target, property, receiver) {
      if (property === "getInstance") {
        return () => activeTeamRunManagerState.manager ?? inactiveTeamRunManager;
      }
      return Reflect.get(target, property, receiver);
    },
  });
  return {
    ...actual,
    AgentTeamRunManager,
  };
});

import { registerContextFileRoutes } from "../../../../src/api/rest/context-files.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

type MultipartPart =
  | { name: string; value: string }
  | { name: string; filename: string; contentType: string; content: string | Buffer };

const buildMultipartPayload = (parts: MultipartPart[]): { boundary: string; payload: Buffer } => {
  const boundary = "----autobyteus-context-files-boundary";
  const buffers: Buffer[] = [];

  for (const part of parts) {
    if ("filename" in part) {
      const header = Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n` +
          `Content-Type: ${part.contentType}\r\n\r\n`,
        "utf8",
      );
      const contentBuffer = Buffer.isBuffer(part.content)
        ? part.content
        : Buffer.from(part.content, "utf8");
      const footer = Buffer.from("\r\n", "utf8");
      buffers.push(header, contentBuffer, footer);
      continue;
    }

    buffers.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${part.name}"\r\n\r\n` +
          `${part.value}\r\n`,
        "utf8",
      ),
    );
  }

  buffers.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return { boundary, payload: Buffer.concat(buffers) };
};

const writeTeamMetadata = (
  tempDir: string,
  teamRunId: string,
  metadata: Record<string, unknown>,
): void => {
  const teamDir = path.join(tempDir, "memory", "agent_teams", teamRunId);
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(
    path.join(teamDir, "team_run_metadata.json"),
    JSON.stringify(metadata),
    "utf8",
  );
};

const buildAgentMemberMetadata = (input: {
  memberRouteKey: string;
  memberPath: string[];
  memberName: string;
  memberRunId: string;
}): Record<string, unknown> => ({
  memberKind: "agent",
  memberRouteKey: input.memberRouteKey,
  memberPath: input.memberPath,
  memberName: input.memberName,
  memberRunId: input.memberRunId,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
  agentDefinitionId: `agent-${input.memberRouteKey.replace(/[^a-zA-Z0-9_-]+/g, "_")}`,
  llmModelIdentifier: "model-context-file",
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.NONE,
  llmConfig: null,
  workspaceRootPath: "/tmp/context-file-workspace",
  applicationExecutionContext: null,
});

const ACTIVE_ROOT_TEAM_RUN_ID = "active-root-team-context";
const ACTIVE_REVIEW_CHILD_TEAM_RUN_ID = "active-review-child-team-context";
const ACTIVE_BUILD_CHILD_TEAM_RUN_ID = "active-build-child-team-context";
const ACTIVE_REVIEW_WORKER_RUN_ID = "review_worker_member_33333333333333333333333333333333";
const ACTIVE_BUILD_WORKER_RUN_ID = "build_worker_member_44444444444444444444444444444444";

const buildActiveWorkerMemberConfig = (input: {
  memberRouteKey: string;
  memberPath: string[];
  memberName: string;
  memberRunId: string;
}): Record<string, unknown> => ({
  memberKind: "agent",
  memberRouteKey: input.memberRouteKey,
  memberPath: input.memberPath,
  memberName: input.memberName,
  memberRunId: input.memberRunId,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  agentDefinitionId: `agent-${input.memberRouteKey.replace(/[^a-zA-Z0-9_-]+/g, "_")}`,
  llmModelIdentifier: "model-context-file-active",
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.NONE,
  workspaceRootPath: "/tmp/context-file-active-workspace",
});

const buildActiveDuplicateWorkerTeamRun = (): Record<string, unknown> => ({
  runId: ACTIVE_ROOT_TEAM_RUN_ID,
  config: {
    memberTree: [
      {
        memberKind: "agent_team",
        memberRouteKey: "ReviewSquad",
        memberPath: ["ReviewSquad"],
        memberName: "Review Squad",
        memberRunId: ACTIVE_REVIEW_CHILD_TEAM_RUN_ID,
        childTeamRunId: ACTIVE_REVIEW_CHILD_TEAM_RUN_ID,
        teamDefinitionId: "team-def-review-squad",
        coordinatorMemberRouteKey: "ReviewSquad/worker",
        memberConfigs: [
          buildActiveWorkerMemberConfig({
            memberRouteKey: "ReviewSquad/worker",
            memberPath: ["ReviewSquad", "worker"],
            memberName: "worker",
            memberRunId: ACTIVE_REVIEW_WORKER_RUN_ID,
          }),
        ],
      },
      {
        memberKind: "agent_team",
        memberRouteKey: "BuildSquad",
        memberPath: ["BuildSquad"],
        memberName: "Build Squad",
        memberRunId: ACTIVE_BUILD_CHILD_TEAM_RUN_ID,
        childTeamRunId: ACTIVE_BUILD_CHILD_TEAM_RUN_ID,
        teamDefinitionId: "team-def-build-squad",
        coordinatorMemberRouteKey: "BuildSquad/worker",
        memberConfigs: [
          buildActiveWorkerMemberConfig({
            memberRouteKey: "BuildSquad/worker",
            memberPath: ["BuildSquad", "worker"],
            memberName: "worker",
            memberRunId: ACTIVE_BUILD_WORKER_RUN_ID,
          }),
        ],
      },
    ],
  },
  getRuntimeContext: () => ({ memberContexts: [] }),
});

const useActiveDuplicateWorkerTeamRunManager = (): void => {
  const activeRun = buildActiveDuplicateWorkerTeamRun();
  activeTeamRunManagerState.manager = {
    getTeamRun: vi.fn((teamRunId: string) =>
      teamRunId === ACTIVE_ROOT_TEAM_RUN_ID ? activeRun : null,
    ),
    listActiveRuns: vi.fn(() => [ACTIVE_ROOT_TEAM_RUN_ID]),
  };
};

const uploadDraftAttachment = async (
  app: FastifyInstance,
  owner: unknown,
  filename: string,
  content: string,
): Promise<{ storedFilename: string; displayName: string; locator: string }> => {
  const upload = buildMultipartPayload([
    { name: "owner", value: JSON.stringify(owner) },
    {
      name: "file",
      filename,
      contentType: "text/markdown",
      content,
    },
  ]);

  const uploadResponse = await app.inject({
    method: "POST",
    url: "/rest/context-files/upload",
    headers: {
      "content-type": `multipart/form-data; boundary=${upload.boundary}`,
    },
    payload: upload.payload,
  });
  expect(uploadResponse.statusCode).toBe(200);
  return uploadResponse.json() as {
    storedFilename: string;
    displayName: string;
    locator: string;
  };
};

describe("REST context-files routes", () => {
  let tempDir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    activeTeamRunManagerState.manager = null;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-context-files-"));
    appConfigState.root = tempDir;
    app = fastify();
    await app.register(multipart, {
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
      throwFileSizeLimit: false,
    });
    await app.register(registerContextFileRoutes, { prefix: "/rest" });
  });

  afterEach(async () => {
    await app.close();
    activeTeamRunManagerState.manager = null;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("uploads, serves, and finalizes standalone draft attachments into run-owned storage", async () => {
    const owner = { kind: "agent_draft", draftRunId: "temp-agent-1" };
    const { boundary, payload } = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(owner) },
      {
        name: "file",
        filename: "notes.txt",
        contentType: "text/plain",
        content: "Hello from draft storage",
      },
    ]);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(uploadResponse.statusCode).toBe(200);
    const uploadJson = uploadResponse.json() as {
      storedFilename: string;
      displayName: string;
      locator: string;
      phase: "draft";
    };
    expect(uploadJson.displayName).toBe("notes.txt");
    expect(uploadJson.phase).toBe("draft");
    expect(uploadJson.storedFilename).toMatch(/^ctx_[a-f0-9]{12}__notes\.txt$/);
    expect(uploadJson.locator).toBe(
      `/rest/drafts/agent-runs/temp-agent-1/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
    );

    const draftFilePath = path.join(
      tempDir,
      "draft_context_files",
      "agent-runs",
      "temp-agent-1",
      "context_files",
      uploadJson.storedFilename,
    );
    expect(fs.existsSync(draftFilePath)).toBe(true);
    expect(fs.readFileSync(draftFilePath, "utf8")).toBe("Hello from draft storage");
    expect(fs.existsSync(path.join(tempDir, "media"))).toBe(false);

    const draftReadResponse = await app.inject({
      method: "GET",
      url: uploadJson.locator,
    });
    expect(draftReadResponse.statusCode).toBe(200);
    expect(draftReadResponse.payload).toBe("Hello from draft storage");

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner: owner,
        finalOwner: { kind: "agent_final", runId: "run-123" },
        attachments: [
          {
            storedFilename: uploadJson.storedFilename,
            displayName: uploadJson.displayName,
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{
        storedFilename: string;
        displayName: string;
        locator: string;
        phase: "final";
      }>;
    };
    expect(finalizeJson.attachments).toEqual([
      {
        storedFilename: uploadJson.storedFilename,
        displayName: "notes.txt",
        locator: `/rest/runs/run-123/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
        phase: "final",
      },
    ]);

    const finalFilePath = path.join(
      tempDir,
      "memory",
      "agents",
      "run-123",
      "context_files",
      uploadJson.storedFilename,
    );
    expect(fs.existsSync(finalFilePath)).toBe(true);
    expect(fs.readFileSync(finalFilePath, "utf8")).toBe("Hello from draft storage");
    expect(fs.existsSync(draftFilePath)).toBe(false);

    const finalReadResponse = await app.inject({
      method: "GET",
      url: finalizeJson.attachments[0]!.locator,
    });
    expect(finalReadResponse.statusCode).toBe(200);
    expect(finalReadResponse.payload).toBe("Hello from draft storage");

    const draftMissingResponse = await app.inject({
      method: "GET",
      url: uploadJson.locator,
    });
    expect(draftMissingResponse.statusCode).toBe(404);
  });

  it("supports team-member draft delete and final team-member read routes", async () => {
    const draftOwner = {
      kind: "team_member_draft" as const,
      draftTeamRunId: "temp-team-1",
      memberRouteKey: "solution_designer",
    };

    const firstUpload = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(draftOwner) },
      {
        name: "file",
        filename: "analysis.md",
        contentType: "text/markdown",
        content: "# draft one",
      },
    ]);

    const firstUploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${firstUpload.boundary}`,
      },
      payload: firstUpload.payload,
    });
    const firstUploadJson = firstUploadResponse.json() as { storedFilename: string; locator: string };

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: firstUploadJson.locator,
    });
    expect(deleteResponse.statusCode).toBe(204);

    const deletedDraftPath = path.join(
      tempDir,
      "draft_context_files",
      "team-runs",
      "temp-team-1",
      "members",
      "solution_designer",
      "context_files",
      firstUploadJson.storedFilename,
    );
    expect(fs.existsSync(deletedDraftPath)).toBe(false);

    const secondUpload = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(draftOwner) },
      {
        name: "file",
        filename: "plan.md",
        contentType: "text/markdown",
        content: "# draft two",
      },
    ]);

    const secondUploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${secondUpload.boundary}`,
      },
      payload: secondUpload.payload,
    });
    expect(secondUploadResponse.statusCode).toBe(200);
    const secondUploadJson = secondUploadResponse.json() as {
      storedFilename: string;
      locator: string;
    };
    const memberRunId = "solution_designer_member_11111111111111111111111111111111";
    writeTeamMetadata(tempDir, "team-123", {
      teamRunId: "team-123",
      teamDefinitionId: "team-def-context",
      teamDefinitionName: "Context Team",
      coordinatorMemberRouteKey: "solution_designer",
      createdAt: "2026-06-11T00:00:00.000Z",
      memberTree: [
        buildAgentMemberMetadata({
          memberRouteKey: "solution_designer",
          memberPath: ["Solution Designer"],
          memberName: "Solution Designer",
          memberRunId,
        }),
      ],
    });

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner,
        finalOwner: {
          kind: "team_member_final",
          teamRunId: "team-123",
          memberRouteKey: "solution_designer",
        },
        attachments: [
          {
            storedFilename: secondUploadJson.storedFilename,
            displayName: "plan.md",
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{ locator: string; storedFilename: string }>;
    };
    expect(finalizeJson.attachments[0]?.locator).toBe(
      `/rest/team-runs/team-123/members/solution_designer/context-files/${encodeURIComponent(secondUploadJson.storedFilename)}`,
    );

    const finalFilePath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      "team-123",
      memberRunId,
      "context_files",
      secondUploadJson.storedFilename,
    );
    expect(fs.existsSync(finalFilePath)).toBe(true);
    expect(fs.readFileSync(finalFilePath, "utf8")).toBe("# draft two");

    const finalReadResponse = await app.inject({
      method: "GET",
      url: finalizeJson.attachments[0]!.locator,
    });
    expect(finalReadResponse.statusCode).toBe(200);
    expect(finalReadResponse.payload).toBe("# draft two");
  });

  it("finalizes nested team-member attachments into the hierarchical root team memory directory", async () => {
    const draftOwner = {
      kind: "team_member_draft" as const,
      draftTeamRunId: "temp-team-nested",
      memberRouteKey: "worker",
    };
    const workerMemberRunId = "worker_member_22222222222222222222222222222222";
    writeTeamMetadata(tempDir, "root-team-context", {
      teamRunId: "root-team-context",
      teamDefinitionId: "team-def-root",
      teamDefinitionName: "Root Context Team",
      coordinatorMemberRouteKey: "review_team",
      createdAt: "2026-06-11T00:00:00.000Z",
      memberTree: [
        {
          memberKind: "agent_team",
          memberRouteKey: "review_team",
          memberPath: ["Review Team"],
          memberName: "Review Team",
          memberRunId: "child-team-context",
          teamDefinitionId: "team-def-child",
          teamRunId: "child-team-context",
          coordinatorMemberRouteKey: "review_team/worker",
          memberTree: [
            buildAgentMemberMetadata({
              memberRouteKey: "review_team/worker",
              memberPath: ["Review Team", "Worker"],
              memberName: "Worker",
              memberRunId: workerMemberRunId,
            }),
          ],
        },
      ],
    });

    const upload = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(draftOwner) },
      {
        name: "file",
        filename: "nested-plan.md",
        contentType: "text/markdown",
        content: "# nested context",
      },
    ]);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${upload.boundary}`,
      },
      payload: upload.payload,
    });
    expect(uploadResponse.statusCode).toBe(200);
    const uploadJson = uploadResponse.json() as {
      storedFilename: string;
      displayName: string;
    };

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner,
        finalOwner: {
          kind: "team_member_final",
          teamRunId: "root-team-context",
          memberRouteKey: "worker",
        },
        attachments: [
          {
            storedFilename: uploadJson.storedFilename,
            displayName: uploadJson.displayName,
          },
        ],
      },
    });
    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{ locator: string; storedFilename: string }>;
    };
    expect(finalizeJson.attachments[0]?.locator).toBe(
      `/rest/team-runs/root-team-context/members/worker/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
    );

    const nestedFinalPath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      "root-team-context",
      "child-team-context",
      workerMemberRunId,
      "context_files",
      uploadJson.storedFilename,
    );
    const staleChildSiblingPath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      "child-team-context",
      workerMemberRunId,
      "context_files",
      uploadJson.storedFilename,
    );
    const staleRootDirectPath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      "root-team-context",
      workerMemberRunId,
      "context_files",
      uploadJson.storedFilename,
    );
    expect(fs.existsSync(nestedFinalPath)).toBe(true);
    expect(fs.existsSync(staleChildSiblingPath)).toBe(false);
    expect(fs.existsSync(staleRootDirectPath)).toBe(false);
    expect(fs.readFileSync(nestedFinalPath, "utf8")).toBe("# nested context");

    const finalReadResponse = await app.inject({
      method: "GET",
      url: finalizeJson.attachments[0]!.locator,
    });
    expect(finalReadResponse.statusCode).toBe(200);
    expect(finalReadResponse.payload).toBe("# nested context");
  });

  it("rejects ambiguous active nested member suffixes instead of selecting the first match", async () => {
    useActiveDuplicateWorkerTeamRunManager();
    const draftOwner = {
      kind: "team_member_draft" as const,
      draftTeamRunId: "temp-team-active-ambiguous",
      memberRouteKey: "worker",
    };
    const uploadJson = await uploadDraftAttachment(
      app,
      draftOwner,
      "ambiguous-active.md",
      "# ambiguous active context",
    );

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner,
        finalOwner: {
          kind: "team_member_final",
          teamRunId: ACTIVE_ROOT_TEAM_RUN_ID,
          memberRouteKey: "worker",
        },
        attachments: [
          {
            storedFilename: uploadJson.storedFilename,
            displayName: uploadJson.displayName,
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(400);
    expect(finalizeResponse.json()).toMatchObject({
      detail: `Unable to resolve context-file owner member 'worker' for team run '${ACTIVE_ROOT_TEAM_RUN_ID}'.`,
    });
    expect(fs.existsSync(path.join(
      tempDir,
      "draft_context_files",
      "team-runs",
      "temp-team-active-ambiguous",
      "members",
      "worker",
      "context_files",
      uploadJson.storedFilename,
    ))).toBe(true);
    expect(fs.existsSync(path.join(
      tempDir,
      "memory",
      "agent_teams",
      ACTIVE_ROOT_TEAM_RUN_ID,
      ACTIVE_REVIEW_CHILD_TEAM_RUN_ID,
      ACTIVE_REVIEW_WORKER_RUN_ID,
      "context_files",
      uploadJson.storedFilename,
    ))).toBe(false);
    expect(fs.existsSync(path.join(
      tempDir,
      "memory",
      "agent_teams",
      ACTIVE_ROOT_TEAM_RUN_ID,
      ACTIVE_BUILD_CHILD_TEAM_RUN_ID,
      ACTIVE_BUILD_WORKER_RUN_ID,
      "context_files",
      uploadJson.storedFilename,
    ))).toBe(false);
  });

  it("finalizes active nested member attachments with a fully-qualified route key", async () => {
    useActiveDuplicateWorkerTeamRunManager();
    const draftOwner = {
      kind: "team_member_draft" as const,
      draftTeamRunId: "temp-team-active-qualified",
      memberRouteKey: "worker",
    };
    const uploadJson = await uploadDraftAttachment(
      app,
      draftOwner,
      "qualified-active.md",
      "# qualified active context",
    );
    const qualifiedRouteKey = "ReviewSquad/worker";

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner,
        finalOwner: {
          kind: "team_member_final",
          teamRunId: ACTIVE_ROOT_TEAM_RUN_ID,
          memberRouteKey: qualifiedRouteKey,
        },
        attachments: [
          {
            storedFilename: uploadJson.storedFilename,
            displayName: uploadJson.displayName,
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{ locator: string; storedFilename: string }>;
    };
    expect(finalizeJson.attachments[0]?.locator).toBe(
      `/rest/team-runs/${ACTIVE_ROOT_TEAM_RUN_ID}/members/${encodeURIComponent(qualifiedRouteKey)}/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
    );

    const nestedFinalPath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      ACTIVE_ROOT_TEAM_RUN_ID,
      ACTIVE_REVIEW_CHILD_TEAM_RUN_ID,
      ACTIVE_REVIEW_WORKER_RUN_ID,
      "context_files",
      uploadJson.storedFilename,
    );
    const staleRootDirectPath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      ACTIVE_ROOT_TEAM_RUN_ID,
      ACTIVE_REVIEW_WORKER_RUN_ID,
      "context_files",
      uploadJson.storedFilename,
    );
    expect(fs.existsSync(nestedFinalPath)).toBe(true);
    expect(fs.existsSync(staleRootDirectPath)).toBe(false);
    expect(fs.readFileSync(nestedFinalPath, "utf8")).toBe("# qualified active context");

    const finalReadResponse = await app.inject({
      method: "GET",
      url: finalizeJson.attachments[0]!.locator,
    });
    expect(finalReadResponse.statusCode).toBe(200);
    expect(finalReadResponse.payload).toBe("# qualified active context");
  });

  it("finalizes active nested member attachments with a child-team-scoped suffix", async () => {
    useActiveDuplicateWorkerTeamRunManager();
    const draftOwner = {
      kind: "team_member_draft" as const,
      draftTeamRunId: "temp-team-active-child-scope",
      memberRouteKey: "worker",
    };
    const uploadJson = await uploadDraftAttachment(
      app,
      draftOwner,
      "child-scope-active.md",
      "# child scoped active context",
    );

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner,
        finalOwner: {
          kind: "team_member_final",
          teamRunId: ACTIVE_REVIEW_CHILD_TEAM_RUN_ID,
          memberRouteKey: "worker",
        },
        attachments: [
          {
            storedFilename: uploadJson.storedFilename,
            displayName: uploadJson.displayName,
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{ locator: string; storedFilename: string }>;
    };
    expect(finalizeJson.attachments[0]?.locator).toBe(
      `/rest/team-runs/${ACTIVE_REVIEW_CHILD_TEAM_RUN_ID}/members/worker/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
    );

    const nestedFinalPath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      ACTIVE_ROOT_TEAM_RUN_ID,
      ACTIVE_REVIEW_CHILD_TEAM_RUN_ID,
      ACTIVE_REVIEW_WORKER_RUN_ID,
      "context_files",
      uploadJson.storedFilename,
    );
    const staleChildSiblingPath = path.join(
      tempDir,
      "memory",
      "agent_teams",
      ACTIVE_REVIEW_CHILD_TEAM_RUN_ID,
      ACTIVE_REVIEW_WORKER_RUN_ID,
      "context_files",
      uploadJson.storedFilename,
    );
    expect(fs.existsSync(nestedFinalPath)).toBe(true);
    expect(fs.existsSync(staleChildSiblingPath)).toBe(false);
    expect(fs.readFileSync(nestedFinalPath, "utf8")).toBe("# child scoped active context");

    const finalReadResponse = await app.inject({
      method: "GET",
      url: finalizeJson.attachments[0]!.locator,
    });
    expect(finalReadResponse.statusCode).toBe(200);
    expect(finalReadResponse.payload).toBe("# child scoped active context");
  });

  it("preserves the original uploaded display name when finalizing a sanitized stored filename", async () => {
    const owner = { kind: "agent_draft", draftRunId: "temp-agent-display-name" };
    const originalFilename = "Quarterly notes 2026 ???.txt";
    const { boundary, payload } = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(owner) },
      {
        name: "file",
        filename: originalFilename,
        contentType: "text/plain",
        content: "Quarterly notes",
      },
    ]);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(uploadResponse.statusCode).toBe(200);
    const uploadJson = uploadResponse.json() as {
      storedFilename: string;
      displayName: string;
    };
    expect(uploadJson.displayName).toBe(originalFilename);
    expect(uploadJson.storedFilename).not.toContain(" ");
    expect(uploadJson.storedFilename).not.toContain("???");

    const finalizeResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/finalize",
      payload: {
        draftOwner: owner,
        finalOwner: { kind: "agent_final", runId: "run-display-name" },
        attachments: [
          {
            storedFilename: uploadJson.storedFilename,
            displayName: uploadJson.displayName,
          },
        ],
      },
    });

    expect(finalizeResponse.statusCode).toBe(200);
    const finalizeJson = finalizeResponse.json() as {
      attachments: Array<{
        storedFilename: string;
        displayName: string;
        locator: string;
        phase: "final";
      }>;
    };
    expect(finalizeJson.attachments).toEqual([
      {
        storedFilename: uploadJson.storedFilename,
        displayName: originalFilename,
        locator: `/rest/runs/run-display-name/context-files/${encodeURIComponent(uploadJson.storedFilename)}`,
        phase: "final",
      },
    ]);
  });

  it("prunes expired draft attachments on read entrypoints before serving content", async () => {
    const owner = { kind: "agent_draft", draftRunId: "temp-expired-read" };
    const { boundary, payload } = buildMultipartPayload([
      { name: "owner", value: JSON.stringify(owner) },
      {
        name: "file",
        filename: "stale.txt",
        contentType: "text/plain",
        content: "stale draft",
      },
    ]);

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/context-files/upload",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(uploadResponse.statusCode).toBe(200);

    const uploadJson = uploadResponse.json() as { storedFilename: string; locator: string };
    const draftFilePath = path.join(
      tempDir,
      "draft_context_files",
      "agent-runs",
      "temp-expired-read",
      "context_files",
      uploadJson.storedFilename,
    );

    const expiredAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    fs.utimesSync(draftFilePath, expiredAt, expiredAt);

    const readResponse = await app.inject({
      method: "GET",
      url: uploadJson.locator,
    });

    expect(readResponse.statusCode).toBe(404);
    expect(fs.existsSync(draftFilePath)).toBe(false);
  });
});
