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
        "Call `get_brief_context` exactly once with `{}` before any file change or publication.",
        "Require a successful result",
        "Required sequence after successful context validation:",
        "Compose a complete 200-500-word research body",
        "Use Luna's built-in `apply_patch` operation",
        "Do not use `run_bash` for any file operation.",
        "Require the provider-reported `apply_patch` result to succeed.",
        'Call `publish_artifacts` exactly for the canonical relative path with `artifacts: [{ path: "brief-studio/research.md" }]`.',
        'Call `send_message_to` with `recipient_address: "/writer"`.',
      ]);
      expect(prompt).toContain("complete 200-500-word research body verbatim—not a summary or truncated excerpt");
      expect(prompt).toContain("never calculate, capture, or hand off an absolute path");
      expect(prompt).toContain("never use a shell fallback or claim the file exists");
      expect(prompt).toContain("do not inspect provider protocol events or internal normalized traces");
      expect(prompt).toContain("stop without creating or publishing a file");
      expect(prompt).not.toContain("edit_file");
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
        "Call `get_brief_context` exactly once with `{}` before any file change or publication.",
        "Require your returned `briefId` to equal",
        "Require the handoff to contain the canonical relative path and the complete research body",
        "Required sequence after successful validation:",
        "Do not call `read_file`",
        "Under `Key evidence`, copy at least one complete non-marker bullet",
        "Use Luna's built-in `apply_patch` operation",
        "Do not use `run_bash` for any file operation.",
        "Require the provider-reported `apply_patch` result to succeed.",
        'Call `publish_artifacts` exactly for the canonical relative path with `artifacts: [{ path: "brief-studio/final-brief.md" }]`.',
      ]);
      expect(prompt).toContain("do not access the researcher's separate workspace");
      expect(prompt).toContain("Preserve the bullet's complete wording as the deterministic research-use witness.");
      expect(prompt).toContain("the handed-off body, not a cross-workspace file read, is the only research source");
      expect(prompt).toContain("do not inspect provider protocol events or internal normalized traces");
      expect(prompt).toContain("stop without creating or publishing a file");
      expect(prompt).not.toContain("edit_file");
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
      expect(prompt).toContain("does not list the provider's built-in patch operation");
      expect(prompt).toContain("uses Luna's built-in `apply_patch` without `run_bash`");
      expect(prompt).toContain("complete 200-500-word research body verbatim");
      expect(prompt).toContain("without `read_file` or cross-workspace access");
      expect(prompt).toContain("`Key findings` bullet verbatim under final `Key evidence`");
      expect(prompt).toContain("neither role uses ordinary registry `read_file`/`write_file`, a shell fallback, or absolute publication paths");
      expect(prompt).toContain("never inspects provider protocol events or internal normalized traces");
      expect(prompt).toContain("prompts and launch input never supply routing identity");
      expect(prompt).not.toContain("edit_file");
    }

    for (const sourceText of [sourceLaunchService, packagedLaunchService]) {
      expect(sourceText).toContain("Configured tool selection covers only routed capabilities; Luna's built-in apply_patch is not a configured tool name.");
      expect(sourceText).toContain("complete 200-500-word research body verbatim");
      expect(sourceText).toContain("without read_file or cross-workspace access");
      expect(sourceText).toContain("complete non-marker Key findings bullet verbatim under Key evidence");
      expect(sourceText).toContain("React only to provider-reported patch success or failure; do not inspect provider protocol events or internal normalized traces.");
      expect(sourceText).toContain("without shell fallback or a fabricated artifact");
      expect(sourceText).toContain("do not pass or guess applicationId, bindingId, or briefId as tool arguments");
      expect(sourceText).not.toContain("exact absolute path returned");
      expect(sourceText).not.toContain("edit_file");
    }
  });
});
