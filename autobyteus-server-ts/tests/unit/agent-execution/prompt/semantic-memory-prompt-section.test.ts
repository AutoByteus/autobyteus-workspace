import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import {
  composeNativeAutoByteusPrompt,
  composeSharedCarpenterPrompt,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-composer.js";
import {
  renderGlobalSemanticMemorySection,
  renderSemanticMemorySection,
} from "../../../../src/agent-execution/prompt/carpenter-prompt-sections.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * The Semantic Memory section against `semantic-memory-prompt-contract.md` (ticket agent-semantic-memory):
 * §2 exact text, §4 placement, §5 examples, §6 verification. The expected strings are copied from the contract.
 */
const FOLDER = "/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator";
const GLOBAL = "/home/u/.autobyteus/server-data/memory/semantic-global";

/** DEC-013 (autobyteus-554), copied from the requirements. */
const GLOBAL_SECTION = "## Global Semantic Memory\n\nThe global semantic memory of this node is the folder `/home/u/.autobyteus/server-data/memory/semantic-global`. It is shared by every agent on this node, in every Project and team: facts that are true for everyone, such as what the product is, the words it uses and the user's standing rules. Read it when you need such facts. Write there only what is true for every agent; keep what only you need in your own semantic memory.";

const SECTION_5_1 = [
  "## Project",
  "",
  "You work in the Project Marketing (Project ID project_abc). Use this Project ID with the Project tools; ask the user before working on another Project.",
  "",
  "## Semantic Memory",
  "",
  "Your semantic memory is the folder `/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.",
  "",
  GLOBAL_SECTION,
  "",
  "## Working Environment",
  "",
  "- Agent workspace: `/home/u/work/marketing`",
].join("\n");

const operator = () => new AgentDefinition({
  id: "computer-use-operator", name: "Computer Use Operator", description: "Operates the computer", instructions: "Operate.",
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

  it("§5.1: standalone, under a Project, native AutoByteus: follows the Project section, before Working Environment", () => {
    const prompt = composeNativeAutoByteusPrompt({
      agentDefinition: operator(), workspaceRootPath: "/home/u/work/marketing", memberExecutionContext: null,
      project, semanticMemoryPath: FOLDER, globalSemanticMemoryPath: GLOBAL,
    });
    expect(prompt).toContain(SECTION_5_1);
    expect(prompt.split("## Semantic Memory")).toHaveLength(2);
  });

  it("§5.2: team member without a Project (shared composer): the section follows the collaboration sections, with the same folder, and the global one ends the prompt", () => {
    const prompt = composeSharedCarpenterPrompt({
      agentDefinition: operator(), memberExecutionContext: memberContext(), project: null, semanticMemoryPath: FOLDER, globalSemanticMemoryPath: GLOBAL,
    });
    expect(prompt.endsWith(`\n\n${renderSemanticMemorySection(FOLDER)}\n\n${GLOBAL_SECTION}`)).toBe(true);
    expect(prompt).not.toContain("Long-Running Commands"); // autobyteus-649
    expect(prompt.split("## Semantic Memory")).toHaveLength(2);
    expect(prompt.split("## Global Semantic Memory")).toHaveLength(2);
    expect(prompt.indexOf("## Working With Other Agents")).toBeLessThan(prompt.indexOf("## Semantic Memory"));
  });

  it("§5.3: renders a Windows folder as given", () => {
    expect(renderSemanticMemorySection("C:\\Users\\u\\.autobyteus\\server-data\\memory\\semantic\\computer-use-operator"))
      .toContain("Your semantic memory is the folder `C:\\Users\\u\\.autobyteus\\server-data\\memory\\semantic\\computer-use-operator`. It belongs to you");
  });

  it("autobyteus-554 AC-009: the Global Semantic Memory section is exactly the DEC-013 text with the folder", () => {
    expect(renderGlobalSemanticMemorySection(GLOBAL)).toBe(GLOBAL_SECTION);
  });

  it("autobyteus-554: every prompt carries both sections, the global one right after the agent's; on the shared path they follow the Project section and end the prompt", () => {
    const prompt = composeSharedCarpenterPrompt({ agentDefinition: operator(), project, semanticMemoryPath: FOLDER, globalSemanticMemoryPath: GLOBAL });
    expect(prompt.endsWith(`ask the user before working on another Project.\n\n${renderSemanticMemorySection(FOLDER)}\n\n${GLOBAL_SECTION}`)).toBe(true);
  });

  it("§6: refuses a relative folder, the agent's or the global one", () => {
    for (const compose of [
      () => composeSharedCarpenterPrompt({ agentDefinition: operator(), semanticMemoryPath: "memory/semantic/computer-use-operator", globalSemanticMemoryPath: GLOBAL }),
      () => composeSharedCarpenterPrompt({ agentDefinition: operator(), semanticMemoryPath: FOLDER, globalSemanticMemoryPath: "memory/semantic-global" }),
      () => composeNativeAutoByteusPrompt({
        agentDefinition: operator(), workspaceRootPath: "/tmp/workspace", semanticMemoryPath: "memory/semantic/computer-use-operator",
        globalSemanticMemoryPath: GLOBAL,
      }),
    ]) {
      expect(compose).toThrow("Semantic memory folder must be an absolute path.");
    }
  });
});
