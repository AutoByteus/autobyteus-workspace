import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..");
const applicationRoot = path.join(repoRoot, "applications", "brief-studio");
const packagedApplicationRoot = path.join(
  applicationRoot,
  "dist",
  "importable-package",
  "applications",
  "brief-studio",
);

type AgentConfigFile = {
  toolNames?: string[];
};

type TeamConfigFile = {
  coordinatorMemberName?: string;
};

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, "utf8")) as T;

const readText = async (filePath: string): Promise<string> => fs.readFile(filePath, "utf8");

const expectRequiredTools = (toolNames: string[] | undefined, requiredTools: string[]) => {
  const configuredToolNames = new Set(toolNames ?? []);
  for (const requiredTool of requiredTools) {
    expect(configuredToolNames.has(requiredTool)).toBe(true);
  }
};

const expectMissingTools = (toolNames: string[] | undefined, forbiddenTools: string[]) => {
  const configuredToolNames = new Set(toolNames ?? []);
  for (const forbiddenTool of forbiddenTools) {
    expect(configuredToolNames.has(forbiddenTool)).toBe(false);
  }
};

describe("Brief Studio team package config", () => {
  it("ships source and packaged team configs with the research-first coordinator handoff", async () => {
    const sourceTeamConfig = await readJson<TeamConfigFile>(
      path.join(applicationRoot, "agent-teams", "brief-studio-team", "team-config.json"),
    );
    const packagedTeamConfig = await readJson<TeamConfigFile>(
      path.join(packagedApplicationRoot, "agent-teams", "brief-studio-team", "team-config.json"),
    );

    for (const config of [sourceTeamConfig, packagedTeamConfig]) {
      expect(config.coordinatorMemberName).toBe("researcher");
    }
  });

  it("ships source and packaged agent configs with the intended research-first tool split", async () => {
    const sourceResearcherConfig = await readJson<AgentConfigFile>(
      path.join(applicationRoot, "agent-teams", "brief-studio-team", "agents", "researcher", "agent-config.json"),
    );
    const sourceWriterConfig = await readJson<AgentConfigFile>(
      path.join(applicationRoot, "agent-teams", "brief-studio-team", "agents", "writer", "agent-config.json"),
    );
    const packagedResearcherConfig = await readJson<AgentConfigFile>(
      path.join(packagedApplicationRoot, "agent-teams", "brief-studio-team", "agents", "researcher", "agent-config.json"),
    );
    const packagedWriterConfig = await readJson<AgentConfigFile>(
      path.join(packagedApplicationRoot, "agent-teams", "brief-studio-team", "agents", "writer", "agent-config.json"),
    );

    for (const config of [sourceResearcherConfig, packagedResearcherConfig]) {
      expectRequiredTools(config.toolNames, ["write_file", "publish_artifacts", "send_message_to"]);
      expectMissingTools(config.toolNames, ["read_file", "publish_artifact"]);
    }

    for (const config of [sourceWriterConfig, packagedWriterConfig]) {
      expectRequiredTools(config.toolNames, ["read_file", "write_file", "publish_artifacts", "send_message_to"]);
      expectMissingTools(config.toolNames, ["publish_artifact"]);
    }
  });

  it("ships source and packaged prompts that require publish-after-write and research-first handoff ordering", async () => {
    const sourceResearcherPrompt = await readText(
      path.join(applicationRoot, "agent-teams", "brief-studio-team", "agents", "researcher", "agent.md"),
    );
    const sourceWriterPrompt = await readText(
      path.join(applicationRoot, "agent-teams", "brief-studio-team", "agents", "writer", "agent.md"),
    );
    const packagedResearcherPrompt = await readText(
      path.join(packagedApplicationRoot, "agent-teams", "brief-studio-team", "agents", "researcher", "agent.md"),
    );
    const packagedWriterPrompt = await readText(
      path.join(packagedApplicationRoot, "agent-teams", "brief-studio-team", "agents", "writer", "agent.md"),
    );

    for (const prompt of [sourceResearcherPrompt, packagedResearcherPrompt]) {
      expect(prompt).toContain("you are the first active member for a new Brief Studio run");
      expect(prompt).toContain("`read_file` is intentionally not exposed in this run");
      expect(prompt).toContain("Required fresh-run sequence:");
      expect(prompt).toContain("write `brief-studio/research.md`");
      expect(prompt).toContain("capture the exact absolute path returned by the write step");
      expect(prompt).toContain('call `publish_artifacts` with `artifacts: [{ path: "<exact absolute path returned by write_file>" }]`');
      expect(prompt).toContain("call `send_message_to` to recipient `writer`");
      expect(prompt).toContain("do not answer with plain prose instead of the required tool calls");
      expect(prompt).toContain("reuse the exact absolute path returned by the write step");
      expect(prompt).toContain("target about 200-500 words total");
    }

    for (const prompt of [sourceWriterPrompt, packagedWriterPrompt]) {
      expect(prompt).toContain("wait for the research handoff from the researcher");
      expect(prompt).toContain("do not start by probing for `brief-studio/research.md` on your own");
      expect(prompt).toContain("When the researcher hands off `brief-studio/research.md`:");
      expect(prompt).toContain("review `brief-studio/research.md`");
      expect(prompt).toContain("capture the exact absolute path returned by the write step");
      expect(prompt).toContain('call `publish_artifacts` with `artifacts: [{ path: "<exact absolute path returned by write_file>" }]`');
      expect(prompt).toContain("do not answer with plain prose instead of the required tool calls");
      expect(prompt).toContain("target about 250-600 words total");
      expect(prompt).toContain("treat `publish_artifacts` as the publication step at the end of a completed checkpoint");
    }
  });

  it("ships source and packaged team/launch guidance that preserves the research-first handoff order", async () => {
    const sourceTeamPrompt = await readText(
      path.join(applicationRoot, "agent-teams", "brief-studio-team", "team.md"),
    );
    const packagedTeamPrompt = await readText(
      path.join(packagedApplicationRoot, "agent-teams", "brief-studio-team", "team.md"),
    );
    const sourceLaunchService = await readText(
      path.join(applicationRoot, "backend-src", "services", "brief-run-launch-service.ts"),
    );
    const packagedLaunchService = await readText(
      path.join(packagedApplicationRoot, "backend-src", "services", "brief-run-launch-service.ts"),
    );

    for (const prompt of [sourceTeamPrompt, packagedTeamPrompt]) {
      expect(prompt).toContain("researcher starts the fresh run, writes `brief-studio/research.md`, publishes it with `publish_artifacts`");
      expect(prompt).toContain("writer begins only after that handoff arrives");
      expect(prompt).toContain("avoid freeform prose when a tool sequence is required");
      expect(prompt).toContain("researcher should publish a short structured research checkpoint, not a long report");
      expect(prompt).toContain("use the exact absolute file path returned by the write step");
    }

    for (const sourceText of [sourceLaunchService, packagedLaunchService]) {
      expect(sourceText).toContain("Fresh-run workflow is research-first: the researcher starts, writes the research file, publishes it with publish_artifacts");
      expect(sourceText).toContain("Researcher: keep the research checkpoint concise and finish the required publication + handoff flow instead of replying with plain prose.");
      expect(sourceText).toContain('publish_artifacts is only for publishing files after they have already been written, and single-file publication should use artifacts: [{ path: "<exact absolute path returned by write_file>" }] with the exact absolute file path returned by that write step.');
    }
  });
});
