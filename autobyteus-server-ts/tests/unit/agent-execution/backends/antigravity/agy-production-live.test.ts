import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createAgyRunCapsule } from "../../../../../src/agent-execution/backends/antigravity/capsule/agy-run-capsule.js";
import { AgyStreamProcess } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-process.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { Skill } from "../../../../../src/skills/domain/models.js";

const readIfExists = async (file: string) => fs.readFile(file, "utf8").catch(() => null);

it.skipIf(process.env.AGY_LIVE !== "1")("loads production-generated main agent and targets selected workspace for generic file and shell tasks", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-product-live-"));
  const workspacePath = path.join(base, "real-workspace");
  await fs.mkdir(workspacePath);
  const capsule = await createAgyRunCapsule({ runId: "live-run", memoryDir: path.join(base, "memory"),
    workspacePath, identity: "You are the AutoByteus test main agent. Your identity code is AGY-ID-8614. Answer accurately when asked for this code.",
    configuredSkillBindings: [], skillAccessMode: "NONE", mcpDescriptor: null });
  const process = new AgyStreamProcess();
  const observed: AgyStreamMessage[] = [];
  const init = await process.start({ capsulePath: capsule.path, agentName: capsule.manifest.agentName,
    workspacePath: capsule.manifest.workspacePath, model: "gemini-3.8-flash-low", autoExecuteTools: true, conversationId: null });
  process.subscribe((message) => observed.push(message));
  const ask = async (content: string): Promise<AgyStreamMessage> => {
    const start = observed.length;
    await process.sendUserMessage(content);
    for (let attempt = 0; attempt < 180; attempt++) {
      const result = observed.slice(start).find((event) => event.event === "result");
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Timed out waiting for AGY result.");
  };
  const identity = await ask("What is your assigned identity code? Reply with only the code.");
  const file = await ask("Use write_to_file to create generic-file.txt in the project containing FILE-MARKER-9172. Tell me where it is.");
  const shell = await ask("Use run_command to create generic-shell.txt in the project containing SHELL-MARKER-9172. Tell me where it is.");
  const report = { base, workspacePath: capsule.manifest.workspacePath, capsulePath: capsule.path, init,
    identity, file, shell, toolEvents: observed.filter((event) => event.event === "step_update" && event.step_update.step_type === "tool"),
    workspaceFile: await readIfExists(path.join(capsule.manifest.workspacePath, "generic-file.txt")),
    capsuleFile: await readIfExists(path.join(capsule.path, "generic-file.txt")),
    workspaceShell: await readIfExists(path.join(capsule.manifest.workspacePath, "generic-shell.txt")),
    capsuleShell: await readIfExists(path.join(capsule.path, "generic-shell.txt")) };
  await fs.writeFile(path.resolve(globalThis.process.cwd(), "../tickets/in-progress/antigravity-cli-runtime-redesign-20260924/implementation-local-live-probe.json"), JSON.stringify(report, null, 2));
  process.stop();
  expect(JSON.stringify(identity)).toContain("AGY-ID-8614");
  expect(report.workspaceFile).toContain("FILE-MARKER-9172");
  expect(report.workspaceShell).toContain("SHELL-MARKER-9172");
  expect(report.capsuleFile).toBeNull();
  expect(report.capsuleShell).toBeNull();
}, 240_000);

it.skipIf(process.env.AGY_LIVE !== "1")("loads an AutoByteus-configured PRELOADED_ONLY skill from the production capsule", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-skill-live-"));
  const workspacePath = path.join(base, "workspace");
  const source = path.join(base, "configured-source");
  await fs.mkdir(workspacePath); await fs.mkdir(source);
  await fs.writeFile(path.join(source, "SKILL.md"), "# Codebook\nWhen asked for the codebook marker, answer SKILL-MARKER-6381.\n");
  const binding = { kind: "resolved" as const, skill: new Skill({ name: "codebook", description: "A configured marker codebook.", content: "", rootPath: source }),
    source: { origin: "global" as const, sourceRoot: await fs.realpath(source), trustedRoot: await fs.realpath(source) } };
  const capsule = await createAgyRunCapsule({ runId: "skill-live", memoryDir: path.join(base, "memory"),
    workspacePath, identity: "You are an AutoByteus agent. Consult the codebook skill when asked about its marker.",
    configuredSkillBindings: [binding], skillAccessMode: "PRELOADED_ONLY", mcpDescriptor: null });
  const process = new AgyStreamProcess();
  const observed: AgyStreamMessage[] = [];
  const closeErrors: string[] = [];
  try {
    await process.start({ capsulePath: capsule.path, agentName: capsule.manifest.agentName,
      workspacePath: capsule.manifest.workspacePath, model: "gemini-3.8-flash-low", autoExecuteTools: true, conversationId: null });
    process.subscribe((message) => observed.push(message));
    process.onClose((error) => closeErrors.push(String(error)));
    await process.sendUserMessage("Use your codebook skill and tell me its exact marker. Do not guess.");
    for (let attempt = 0; attempt < 180 && !observed.some((event) => event.event === "result"); attempt++)
      await new Promise((resolve) => setTimeout(resolve, 500));
    const result = observed.find((event) => event.event === "result");
    await fs.writeFile(path.resolve(globalThis.process.cwd(), "../tickets/in-progress/antigravity-cli-runtime-redesign-20260924/implementation-local-skill-live.json"),
      JSON.stringify({ base, observed, closeErrors }, null, 2));
    expect(result).toBeDefined();
    expect(JSON.stringify(result)).toContain("SKILL-MARKER-6381");
    expect(await fs.readFile(path.join(capsule.path, ".agents", "skills", "codebook", "SKILL.md"), "utf8"))
      .toContain("SKILL-MARKER-6381");
    expect(await readIfExists(path.join(workspacePath, ".agents", "skills", "codebook", "SKILL.md"))).toBeNull();
  } finally { process.stop(); }
}, 240_000);
