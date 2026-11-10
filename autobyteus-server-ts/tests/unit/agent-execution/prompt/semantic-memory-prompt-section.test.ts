import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import { renderSemanticMemorySection } from "../../../../src/agent-execution/prompt/carpenter-prompt-sections.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * The Semantic Memory section against `semantic-memory-prompt-contract.md` (ticket agent-semantic-memory):
 * §2 exact text, §4 placement, §5 examples, §6 verification. The expected strings are copied from the contract.
 */
const FOLDER = "/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator";

const SECTION_5_1 = [
  "## Project",
  "",
  "You work in the Project Marketing (Project ID project_abc). Use this Project ID with the Project tools; ask the user before working on another Project.",
  "",
  "## Semantic Memory",
  "",
  "Your semantic memory is the folder `/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.",
  "",
  "## Working Environment",
  "",
  "- Agent workspace: `/home/u/work/marketing`",
].join("\n");

const operator = () => new AgentDefinition({
  id: "computer-use-operator", name: "Computer Use Operator", description: "Operates the computer", instructions: "Operate.",
  semanticMemoryEnabled: true,
});
const project = { projectId: "project_abc", name: "Marketing" };

const memberContext = () => testMemberExecutionContext({
  rootTeamRunId: "team-run",
  memberAddress: "/computer_use_operator", agentRunId: "run-operator",
  deliverInterAgentMessage: vi.fn(async () => undefined) as never,
});

describe("Semantic Memory section (semantic-memory-prompt-contract.md)", () => {
  it("§2: renders exactly the three lines of the contract", () => {
    expect(renderSemanticMemorySection(FOLDER)).toBe(
      "## Semantic Memory\n\nYour semantic memory is the folder `/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.",
    );
  });

  it("§5.1: enabled, standalone, under a Project, native AutoByteus: follows the Project section, before Working Environment", () => {
    const prompt = composeNativeAutoByteusPrompt({
      agentDefinition: operator(), workspaceRootPath: "/home/u/work/marketing", memberExecutionContext: null,
      project, semanticMemoryPath: FOLDER,
    });
    expect(prompt).toContain(SECTION_5_1);
    expect(prompt.split("## Semantic Memory")).toHaveLength(2);
  });

  it("§5.2: enabled team member without a Project (shared composer): the section comes last, with the same folder", () => {
    const prompt = composeSharedCarpenterPrompt({
      agentDefinition: operator(), memberExecutionContext: memberContext(), project: null, semanticMemoryPath: FOLDER,
    });
    const withoutSection = composeSharedCarpenterPrompt({
      agentDefinition: operator(), memberExecutionContext: memberContext(), project: null, semanticMemoryPath: null,
    });
    expect(prompt).toBe(`${withoutSection}\n\n${renderSemanticMemorySection(FOLDER)}`);
    expect(prompt.indexOf("## Working With Other Agents")).toBeLessThan(prompt.indexOf("## Semantic Memory"));
  });

  it("§5.3: renders a Windows folder as given", () => {
    expect(renderSemanticMemorySection("C:\\Users\\u\\.autobyteus\\server-data\\memory\\semantic\\computer-use-operator"))
      .toContain("Your semantic memory is the folder `C:\\Users\\u\\.autobyteus\\server-data\\memory\\semantic\\computer-use-operator`. It belongs to you");
  });

  it("§5.4: disabled: no heading anywhere; the Project section is followed directly by Working Environment", () => {
    const prompt = composeNativeAutoByteusPrompt({
      agentDefinition: operator(), workspaceRootPath: "/home/u/work/marketing", memberExecutionContext: null,
      project, semanticMemoryPath: null,
    });
    expect(prompt).not.toContain("Semantic Memory");
    expect(prompt).not.toContain("semantic memory");
    expect(prompt).toContain(
      "ask the user before working on another Project.\n\n## Working Environment\n\n- Agent workspace: `/home/u/work/marketing`",
    );
  });

  it("§5.4: disabled on the shared path: the prompt ends where it ended before", () => {
    const prompt = composeSharedCarpenterPrompt({ agentDefinition: operator(), project, semanticMemoryPath: null });
    expect(prompt.endsWith("ask the user before working on another Project.")).toBe(true);
  });

  it("§6: refuses a relative folder", () => {
    for (const compose of [
      () => composeSharedCarpenterPrompt({ agentDefinition: operator(), semanticMemoryPath: "memory/semantic/computer-use-operator" }),
      () => composeNativeAutoByteusPrompt({
        agentDefinition: operator(), workspaceRootPath: "/tmp/workspace", semanticMemoryPath: "memory/semantic/computer-use-operator",
      }),
    ]) {
      expect(compose).toThrow("Semantic memory folder must be an absolute path.");
    }
  });
});
