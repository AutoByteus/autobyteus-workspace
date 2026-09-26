import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { expect, it, vi } from "vitest";
import { createAgyRunCapsule } from "../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import { resolveAgyNativeToolProfile } from "../../../src/agent-execution/backends/antigravity/capsule/agy-native-tool-policy.js";
import { AgyStreamProcess } from "../../../src/agent-execution/backends/antigravity/stream/agy-stream-process.js";
import { AgyStreamEventConverter } from "../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { fingerprintConfiguredSkillSource } from "../../../src/skills/services/configured-skill-source-fingerprint.js";
import { Skill } from "../../../src/skills/domain/models.js";
import type { DetailedConfiguredSkillResolution } from "../../../src/skills/domain/configured-agent-skill-binding.js";
import type { AgyStreamMessage } from "../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";

const enabled = process.env["RUN_AGY_CAPABILITY_E2E"] === "1";
const evidenceDir = path.resolve(process.env["AGY_CAPABILITY_EVIDENCE_DIR"] ?? path.join(os.tmpdir(), "agy-capability-e2e-evidence"));
const packageRoot = process.env["AGY_CODEX_PACKAGE_ROOT"] ?? "";
const model = "gemini-3.8-flash-low";
const summarize = (messages: AgyStreamMessage[]) => messages.filter((m) => m.event === "step_update" && m.step_update["step_type"] === "tool")
  .map((m) => m.event === "step_update" ? ({
    toolName: m.step_update["tool_name"], state: m.step_update["state"],
    stepKeys: Object.keys(m.step_update),
    toolInfoFieldTypes: m.step_update["tool_info"] && typeof m.step_update["tool_info"] === "object"
      ? Object.fromEntries(Object.entries(m.step_update["tool_info"] as Record<string, unknown>)
        .map(([key, value]) => [key, Array.isArray(value) ? "array" : typeof value])) : {},
    parameterKeys: m.step_update["tool_info"] && typeof m.step_update["tool_info"] === "object"
      && (m.step_update["tool_info"] as Record<string, unknown>)["parameters"]
      && typeof (m.step_update["tool_info"] as Record<string, unknown>)["parameters"] === "object"
      ? Object.keys((m.step_update["tool_info"] as Record<string, unknown>)["parameters"] as Record<string, unknown>) : [],
    outputType: m.step_update["tool_info"] && typeof m.step_update["tool_info"] === "object"
      ? Array.isArray((m.step_update["tool_info"] as Record<string, unknown>)["output"]) ? "array"
        : typeof (m.step_update["tool_info"] as Record<string, unknown>)["output"] : "absent",
    outputKeys: m.step_update["tool_info"] && typeof m.step_update["tool_info"] === "object"
      ? Object.keys((m.step_update["tool_info"] as Record<string, unknown>)["output"] as Record<string, unknown> ?? {}) : [],
  }) : null);

async function run(input: { name: string; prompt: string; skillSource?: string;
  extraSkillBindings?: DetailedConfiguredSkillResolution[] }) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-capability-e2e-"));
  const workspace = path.join(base, "workspace");
  await fs.mkdir(workspace);
  const source = input.skillSource;
  const bindings: DetailedConfiguredSkillResolution[] = source ? [{
    kind: "resolved" as const,
    skill: new Skill({ name: "software-engineering-workflow-skill",
      description: "Software engineering workflow", content: "", rootPath: source }),
    source: { origin: "agent_private" as const, sourceRoot: await fs.realpath(source),
      trustedRoot: await fs.realpath(path.dirname(path.dirname(source))) },
    sourceTreeSha256: fingerprintConfiguredSkillSource(source, path.dirname(path.dirname(source))),
  }] : [];
  const capsule = await createAgyRunCapsule({ runId: input["name"], memoryDir: path.join(base, "memory"),
    workspacePath: workspace, identity: "You are an AutoByteus agent. Follow the user's request using your available tools and configured skills.",
    agentDefinitionId: "codex", configuredSkillBindings: [...bindings, ...(input.extraSkillBindings ?? [])],
    nativeToolProfile: resolveAgyNativeToolProfile("1.2.11"),
    skillAccessMode: source || input.extraSkillBindings?.length ? "PRELOADED_ONLY" : "NONE",
    mcpDescriptor: null });
  const stream = new AgyStreamProcess();
  const observed: AgyStreamMessage[] = [];
  const closed: string[] = [];
  try {
    const init = await stream.start({ capsulePath: capsule.path, agentName: capsule.manifest.agentName,
      workspacePath: workspace, model, autoExecuteTools: true, conversationId: null });
    stream.subscribe((message) => observed.push(message));
    stream.onClose((error) => closed.push(error.message));
    await stream.sendUserMessage(input.prompt);
    for (let count = 0; count < 240 && !observed.some((m) => m.event === "result") && closed.length === 0; count++)
      await new Promise((resolve) => setTimeout(resolve, 500));
    const result = observed.find((m) => m.event === "result");
    const terminalTools = observed.filter((m) => m.event === "step_update"
      && m.step_update["step_type"] === "tool" && (m.step_update["state"] === "DONE" || m.step_update["state"] === "ERROR"));
    const report = { name: input["name"], cliVersion: "1.2.11", model, initAgent: init.init["agent"],
      initToolCount: Array.isArray(init.init["tools"]) ? init.init["tools"].length : null,
      initToolNames: Array.isArray(init.init["tools"]) ? init.init["tools"].map((tool: unknown) =>
        tool && typeof tool === "object" ? String((tool as Record<string, unknown>)["name"] ?? "") : String(tool)) : null,
      manifestSkills: capsule.manifest.skills.map((skill) => skill["name"]),
      configuredNativeToolCount: resolveAgyNativeToolProfile("1.2.11").permittedNativeToolNames.length,
      toolSteps: summarize(observed), resultStatus: result?.event === "result" ? result["result"]["status"] : null,
      response: result?.event === "result" ? String(result["result"]["response"] ?? "").slice(0, 1000) : null,
      unknownToolNames: [...closed.join("\n").matchAll(/unknown component: tool "([^"]+)" not found in registry/g)].map((match) => match[1]),
      closeReasons: closed.map((value) => value.split("\n")[0]), terminalCount: terminalTools.length };
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.writeFile(path.join(evidenceDir, input["name"] + ".json"), JSON.stringify(report, null, 2));
    return { capsule, observed, result, terminalTools, report };
  } finally {
    stream.stop();
    await fs.rm(base, { recursive: true, force: true });
  }
}

it.skipIf(!enabled)("direct capsule invokes native AGY image and reports pathless DONE truthfully", async () => {
  const output = await run({ name: "real-native-image",
    prompt: "Use your own native generate_image tool (not an MCP tool) to make a small simple blue dog illustration. Then respond normally." });
  const native = output.terminalTools.find((m) => m.event === "step_update" && m.step_update["tool_name"] === "generate_image");
  expect(native, JSON.stringify(output.report)).toBeDefined();
  expect(output.terminalTools.some((m) => m.event === "step_update" && m.step_update["tool_name"] === "call_mcp_tool")).toBe(false);
  if (!native || native.event !== "step_update") return;
  expect(native.step_update["state"]).toBe("DONE");
  const converter = new AgyStreamEventConverter("real-native-image", String(native.step_update["conversation_id"]), model);
  converter.startTurn("turn-native");
  const events = converter.convert(native);
  const success = events.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
  expect(success, JSON.stringify(output.report)).toBeDefined();
  expect(success?.payload["result"]).toEqual({ provider_state: "DONE", output: null });
  expect(output.report.resultStatus).toBe("SUCCESS");
  expect(output.report["response"]?.length).toBeGreaterThan(0);
}, 180_000);

it.skipIf(!enabled || !packageRoot)("starts bundled Codex skill on a real AGY first turn", async () => {
  const source = path.join(packageRoot, "agents/codex/skills/software-engineering-workflow-skill");
  const output = await run({ name: "real-codex-skill", skillSource: source,
    prompt: "Use your configured software-engineering-workflow-skill. In one sentence, what is its first stage for a new software request?" });
  expect(output.capsule.manifest.skills.map((skill) => skill["name"])).toContain("software-engineering-workflow-skill");
  expect(output["result"], JSON.stringify(output.report)).toBeDefined();
  expect(output.report.resultStatus, JSON.stringify(output.report)).toBe("SUCCESS");
  expect(output.report["response"]?.length).toBeGreaterThan(0);
}, 180_000);

it.skipIf(!enabled)("warns/omits absent and semantic-invalid skills but completes a real AGY first turn", async () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  try {
    const output = await run({ name: "real-skills-warn-skip",
      extraSkillBindings: [{ kind: "certified_absent", name: "missing-skill" },
        { kind: "invalid_candidate", name: "invalid-skill", reason: "malformed_manifest" }],
      prompt: "Reply with exactly READY and nothing else." });
    expect(output.capsule.manifest.skills).toEqual([]);
    expect(output.report.resultStatus).toBe("SUCCESS");
    expect(output.report["response"]).toMatch(/READY/);
    const warnings = warning.mock.calls.flat().join(" ");
    expect(warnings).toContain("skill=missing-skill, disposition=skipped-missing");
    expect(warnings).toContain("skill=invalid-skill, disposition=skipped-invalid, reason=malformed_manifest");
  } finally { warning.mockRestore(); }
}, 180_000);
