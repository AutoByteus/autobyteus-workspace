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
  defaultLaunchConfig?: {
    runtimeKind?: string;
    llmModelIdentifier?: string;
  };
};

type TeamConfigFile = {
  coordinatorMemberName?: string;
  defaultLaunchConfig?: {
    runtimeKind?: string;
    llmModelIdentifier?: string;
  };
};

const expectedLaunchConfig = {
  runtimeKind: "codex_app_server",
  llmModelIdentifier: "gpt-5.6-luna",
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

const expectInOrder = (text: string, fragments: string[]) => {
  let previousIndex = -1;
  for (const fragment of fragments) {
    const index = text.indexOf(fragment);
    expect(index, `Expected fragment '${fragment}'`).toBeGreaterThan(previousIndex);
    previousIndex = index;
  }
};

const staleWorkspaceBoundPublishGuidance = "target file has already been written in the workspace";

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
      expect(config.defaultLaunchConfig).toEqual(expectedLaunchConfig);
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
      expect(config.defaultLaunchConfig).toEqual(expectedLaunchConfig);
      expectRequiredTools(config.toolNames, [
        "get_brief_context",
        "publish_artifacts",
        "send_message_to",
      ]);
      expectMissingTools(config.toolNames, [
        "read_file",
        "write_file",
        "apply_patch",
        "edit_file",
        "run_bash",
        "publish_artifact",
      ]);
    }

    for (const config of [sourceWriterConfig, packagedWriterConfig]) {
      expect(config.defaultLaunchConfig).toEqual(expectedLaunchConfig);
      expectRequiredTools(config.toolNames, [
        "get_brief_context",
        "publish_artifacts",
        "send_message_to",
      ]);
      expectMissingTools(config.toolNames, [
        "read_file",
        "write_file",
        "apply_patch",
        "edit_file",
        "run_bash",
        "publish_artifact",
      ]);
    }
  });

  it("ships source and packaged role prompts with context-first validation and publication ordering", async () => {
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
      expect(prompt).not.toContain(staleWorkspaceBoundPublishGuidance);
      expect(prompt).toContain("you are the first active member for a new Brief Studio run");
      expect(prompt).toContain(
        "your first tool action must be exactly one call to `get_brief_context` with `{}`",
      );
      expect(prompt.match(/Call `get_brief_context` exactly once with `\{\}`/g)).toHaveLength(1);
      expectInOrder(prompt, [
        "Brief context requirement:",
        "Call `get_brief_context` exactly once with `{}` before creating or publishing the research artifact.",
        "Require a successful result",
        "Required sequence after successful context validation:",
        "Compose a complete 200-500-word research body",
        "Create or replace the canonical workspace-relative artifact `brief-studio/research.md`",
        "Confirm the required artifact was created successfully.",
        'Call `publish_artifacts` exactly for the canonical relative path with `artifacts: [{ path: "brief-studio/research.md" }]`.',
        'Call `send_message_to` with `recipient_address: "/writer"`.',
      ]);
      expect(prompt).toContain("complete 200-500-word research body verbatim—not a summary or truncated excerpt");
      expect(prompt).toContain("never calculate, capture, or hand off an absolute path");
      expect(prompt).toContain("never claim the artifact exists");
      expect(prompt).toContain("stop without creating or publishing a file");
      expect(prompt).not.toMatch(/apply_patch|edit_file|read_file|write_file|run_bash|provider-native|provider-reported|protocol|normalized trace|shell/i);
      expect(prompt).not.toContain("exact absolute path returned");
    }

    for (const prompt of [sourceWriterPrompt, packagedWriterPrompt]) {
      expect(prompt).not.toContain(staleWorkspaceBoundPublishGuidance);
      expect(prompt).toContain("wait for the researcher handoff");
      expect(prompt).toContain(
        "after the handoff, your first tool action must be exactly one call to `get_brief_context` with `{}`",
      );
      expect(prompt.match(/Call `get_brief_context` exactly once with `\{\}`/g)).toHaveLength(1);
      expectInOrder(prompt, [
        "wait for the researcher handoff",
        "Brief context and handoff validation:",
        "Call `get_brief_context` exactly once with `{}` before creating or publishing the final artifact.",
        "Require your returned `briefId` to equal",
        "Require the handoff to contain the canonical relative path and the complete research body",
        "Required sequence after successful validation:",
        "Use the complete research body carried in the Team message as your only research source.",
        "Under `Key evidence`, copy at least one complete non-marker bullet",
        "Create or replace the canonical workspace-relative artifact `brief-studio/final-brief.md`",
        "Confirm the required artifact was created successfully.",
        'Call `publish_artifacts` exactly for the canonical relative path with `artifacts: [{ path: "brief-studio/final-brief.md" }]`.',
        'Call `send_message_to` with `recipient_address: "/researcher"`',
      ]);
      expect(prompt).toContain("Do not open `brief-studio/research.md` or access the researcher's separate workspace");
      expect(prompt).toContain("Preserve the bullet's complete wording as the deterministic research-use witness.");
      expect(prompt).toContain("the handed-off body, not cross-workspace access, is the only research source");
      expect(prompt).toContain("stop without creating or publishing a file");
      expect(prompt).not.toMatch(/apply_patch|edit_file|read_file|write_file|run_bash|provider-native|provider-reported|protocol|normalized trace|shell/i);
      expect(prompt).not.toContain("exact absolute path returned");
    }
  });

  it("ships source and packaged team/launch reinforcement without replacing role-local ownership", async () => {
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
      path.join(packagedApplicationRoot, "backend", "dist", "entry.mjs"),
    );

    for (const prompt of [sourceTeamPrompt, packagedTeamPrompt]) {
      expect(prompt).toContain("each member's own `agent.md` is authoritative for its ordered work");
      expect(prompt).toContain("configuration only determines which required business calls are available");
      expect(prompt).toContain("creates `brief-studio/research.md` with the exact marker and required business content");
      expect(prompt).toContain("complete 200-500-word research body verbatim");
      expect(prompt).toContain("without cross-workspace access");
      expect(prompt).toContain("`Key findings` bullet verbatim under final `Key evidence`");
      expect(prompt).toContain("reports completion to `/researcher`");
      expect(prompt).toContain("prompts and launch input never supply routing identity");
      expect(prompt).not.toMatch(/apply_patch|edit_file|read_file|write_file|run_bash|provider-native|provider-reported|protocol|normalized trace|shell/i);
    }

    for (const sourceText of [sourceLaunchService, packagedLaunchService]) {
      expect(sourceText).toContain("this launch text reinforces but does not replace them");
      expect(sourceText).toContain("required 200-500-word research body");
      expect(sourceText).toContain("complete body verbatim");
      expect(sourceText).toContain("without cross-workspace access");
      expect(sourceText).toContain("complete non-marker Key findings bullet verbatim under Key evidence");
      expect(sourceText).toContain("report completion to /researcher");
      expect(sourceText).toContain("without fabricating an artifact");
      expect(sourceText).toContain("do not pass or guess applicationId, bindingId, or briefId as tool arguments");
      expect(sourceText).not.toContain("exact absolute path returned");
      expect(sourceText).not.toMatch(/apply_patch|edit_file|read_file|write_file|run_bash|provider-native|provider-reported|protocol|normalized trace|shell/i);
    }
  });
});
