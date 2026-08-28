import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const applicationRoot = path.resolve(process.cwd(), "..", "applications", "brief-studio");

const readApplicationFile = (relativePath: string): Promise<string> =>
  fs.readFile(path.join(applicationRoot, relativePath), "utf8");

const readApplicationJson = async <T>(relativePath: string): Promise<T> =>
  JSON.parse(await readApplicationFile(relativePath)) as T;

const expectInOrder = (text: string, fragments: string[]): void => {
  let previousIndex = -1;
  for (const fragment of fragments) {
    const index = text.indexOf(fragment);
    expect(index, `Expected fragment '${fragment}'`).toBeGreaterThan(previousIndex);
    previousIndex = index;
  }
};

type LaunchConfig = {
  runtimeKind?: string;
  llmModelIdentifier?: string;
};

type AgentConfig = {
  toolNames?: string[];
  defaultLaunchConfig?: LaunchConfig;
};

type TeamConfig = {
  coordinatorMemberName?: string;
  defaultLaunchConfig?: LaunchConfig;
};

const expectedLaunchConfig = {
  runtimeKind: "codex_app_server",
  llmModelIdentifier: "gpt-5.6-luna",
};

const expectedRoutedToolNames = [
  "get_brief_context",
  "publish_artifacts",
  "send_message_to",
];

describe("Brief Studio maintained Codex Agent contract", () => {
  let researcherConfig: AgentConfig;
  let writerConfig: AgentConfig;
  let teamConfig: TeamConfig;
  let researcherPrompt: string;
  let writerPrompt: string;
  let teamPrompt: string;
  let launchServiceSource: string;

  beforeAll(async () => {
    [
      researcherConfig,
      writerConfig,
      teamConfig,
      researcherPrompt,
      writerPrompt,
      teamPrompt,
      launchServiceSource,
    ] = await Promise.all([
      readApplicationJson("agent-teams/brief-studio-team/agents/researcher/agent-config.json"),
      readApplicationJson("agent-teams/brief-studio-team/agents/writer/agent-config.json"),
      readApplicationJson("agent-teams/brief-studio-team/team-config.json"),
      readApplicationFile("agent-teams/brief-studio-team/agents/researcher/agent.md"),
      readApplicationFile("agent-teams/brief-studio-team/agents/writer/agent.md"),
      readApplicationFile("agent-teams/brief-studio-team/team.md"),
      readApplicationFile("backend-src/services/brief-run-launch-service.ts"),
    ]);
  });

  it("keeps Codex/Luna and selects only honest routed capabilities", () => {
    expect(teamConfig.coordinatorMemberName).toBe("researcher");
    expect(teamConfig.defaultLaunchConfig).toEqual(expectedLaunchConfig);
    for (const config of [researcherConfig, writerConfig]) {
      expect(config.defaultLaunchConfig).toEqual(expectedLaunchConfig);
      expect(config.toolNames).toEqual(expectedRoutedToolNames);
      expect(config.toolNames).not.toEqual(expect.arrayContaining([
        "read_file",
        "write_file",
        "apply_patch",
        "edit_file",
        "run_bash",
      ]));
    }
  });

  it("makes the researcher use Luna's built-in patch, relative publication, and a complete bounded handoff", () => {
    expect(researcherPrompt.match(/Call `get_brief_context` exactly once with `\{\}`/g)).toHaveLength(1);
    expect(researcherPrompt).toContain(
      "your first tool action must be exactly one call to `get_brief_context` with `{}`",
    );
    expectInOrder(researcherPrompt, [
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
    expect(researcherPrompt).toContain("complete 200-500-word research body verbatim—not a summary or truncated excerpt");
    expect(researcherPrompt).toContain("never calculate, capture, or hand off an absolute path");
    expect(researcherPrompt).toContain("never use a shell fallback or claim the file exists");
    expect(researcherPrompt).toContain("do not inspect provider protocol events or internal normalized traces");
    expect(researcherPrompt).toContain("stop without creating or publishing a file");
    expect(researcherPrompt).not.toContain("edit_file");
    expect(researcherPrompt).not.toContain("exact absolute path returned");
  });

  it("makes the writer consume the message without a read and preserve a verbatim finding", () => {
    expect(writerPrompt.match(/Call `get_brief_context` exactly once with `\{\}`/g)).toHaveLength(1);
    expect(writerPrompt).toContain(
      "after the handoff, your first tool action must be exactly one call to `get_brief_context` with `{}`",
    );
    expectInOrder(writerPrompt, [
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
    expect(writerPrompt).toContain("do not access the researcher's separate workspace");
    expect(writerPrompt).toContain("Preserve the bullet's complete wording as the deterministic research-use witness.");
    expect(writerPrompt).toContain("the handed-off body, not a cross-workspace file read, is the only research source");
    expect(writerPrompt).toContain("do not inspect provider protocol events or internal normalized traces");
    expect(writerPrompt).toContain("stop without creating or publishing a file");
    expect(writerPrompt).not.toContain("edit_file");
    expect(writerPrompt).not.toContain("exact absolute path returned");
  });

  it("keeps Team and launch text as supporting non-routing reinforcement", () => {
    expect(teamPrompt).toContain("each member's own `agent.md` is authoritative for its ordered work");
    expect(teamPrompt).toContain("does not list the provider's built-in patch operation");
    expect(teamPrompt).toContain("uses Luna's built-in `apply_patch` without `run_bash`");
    expect(teamPrompt).toContain("complete 200-500-word research body verbatim");
    expect(teamPrompt).toContain("without `read_file` or cross-workspace access");
    expect(teamPrompt).toContain("`Key findings` bullet verbatim under final `Key evidence`");
    expect(teamPrompt).toContain("neither role uses ordinary registry `read_file`/`write_file`, a shell fallback, or absolute publication paths");
    expect(teamPrompt).toContain("never inspects provider protocol events or internal normalized traces");
    expect(teamPrompt).not.toContain("edit_file");

    expect(launchServiceSource).toContain("Configured tool selection covers only routed capabilities; Luna's built-in apply_patch is not a configured tool name.");
    expect(launchServiceSource).toContain("complete 200-500-word research body verbatim");
    expect(launchServiceSource).toContain("without read_file or cross-workspace access");
    expect(launchServiceSource).toContain("complete non-marker Key findings bullet verbatim under Key evidence");
    expect(launchServiceSource).toContain("React only to provider-reported patch success or failure; do not inspect provider protocol events or internal normalized traces.");
    expect(launchServiceSource).toContain("without shell fallback or a fabricated artifact");
    expect(launchServiceSource).not.toContain("edit_file");
    expect(launchServiceSource).not.toContain("exact absolute path returned");
  });
});
