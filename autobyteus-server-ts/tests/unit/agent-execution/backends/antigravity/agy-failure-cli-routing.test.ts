import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import readline from "node:readline";
import { afterEach, describe, expect, it } from "vitest";

const fixture = path.resolve(process.cwd(), "tests/fixtures/agy-failure-cli.mjs");
const boundConversation = "1bb59967-f04e-45f5-a1ad-a4dbfe2b0c18";
const roots: string[] = [];
const children = new Set<ChildProcess>();
type Frame = { event: string; conversation_id?: string; step_update?: any; result?: any; init?: any };
const until = async (condition: () => boolean) => {
  for (let count = 0; count < 500; count++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("fixture did not emit its expected boundary");
};
const stop = async (child: ChildProcess) => {
  if (child.exitCode === null && child.signalCode === null) {
    const stopped = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    child.kill("SIGTERM"); await stopped;
  }
};
afterEach(async () => {
  await Promise.all([...children].map(stop));
  children.clear();
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
const ownedRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agy-fixture-routing-")); roots.push(root);
  const workspace = path.join(root, "workspace"); await fs.mkdir(workspace);
  return { root, workspace };
};
const launch = async (mode: string, owned: Awaited<ReturnType<typeof ownedRoot>>, conversation?: string) => {
  const frames: Frame[] = [];
  const child = spawn(process.execPath, [fixture, "--dangerously-skip-permissions",
    ...(conversation ? ["--conversation", conversation] : [])], { cwd: owned.workspace,
    env: { ...process.env, HOME: owned.root, AGY_FAKE_CASE: mode,
      AGY_FAKE_ARGUMENT_HOME: owned.root, AGY_FAKE_ARGUMENT_WORKSPACE: owned.workspace,
      AGY_FAKE_INPUT_LOG: path.join(owned.root, "input.jsonl"), AGY_FAKE_ARGV_LOG: path.join(owned.root, "argv.jsonl"),
      AGY_FAKE_CONVERSATION_ID: boundConversation }, stdio: "pipe" });
  children.add(child);
  const errors: string[] = [];
  child.stderr!.on("data", (chunk) => errors.push(String(chunk)));
  const lines = readline.createInterface({ input: child.stdout! });
  lines.on("line", (line) => frames.push(JSON.parse(line)));
  await until(() => frames.some((frame) => frame.event === "init"));
  const conversationId = frames[0]!.conversation_id!;
  const send = async (content: string) => {
    const from = frames.length;
    child.stdin!.write(JSON.stringify({ message: { content } }) + "\n");
    await until(() => frames.slice(from).some((frame) => frame.event === "result"));
    expect(errors).toEqual([]);
    const batch = frames.slice(from);
    expect(batch.every((frame) => (frame.step_update ?? frame.result).conversation_id === conversationId)).toBe(true);
    return batch;
  };
  return { child, frames, conversationId, send };
};
const transcript = (root: string, conversationId: string) => path.join(root, ".gemini/antigravity-cli/brain", conversationId,
  ".system_generated/logs/transcript_full.jsonl");

describe("merged AGY fixture scenario routing (local process boundary, not server E2E)", () => {
  it("retains new native capture and exact resumed conversation binding with monotonically new step indices", async () => {
    const owned = await ownedRoot(); const first = await launch("native_arguments", owned);
    expect(first.conversationId).toMatch(/^[0-9a-f-]{36}$/i);
    const old = await first.send("SUMMARY_ONLY");
    expect(old[0]!.step_update).toMatchObject({ step_index: 2, tool_name: "write_to_file",
      tool_info: { parameters: { TargetFile: path.join(owned.workspace, "marker.txt") } } });
    expect(old.at(-1)!.result.status).toBe("SUCCESS");
    await expect(fs.access(transcript(owned.root, first.conversationId))).rejects.toThrow();
    await stop(first.child);
    const resumed = await launch("native_arguments", owned, first.conversationId);
    expect(resumed.conversationId).toBe(first.conversationId);
    const full = await resumed.send("FULL");
    const starts = full.filter((frame) => frame.step_update?.state === "ACTIVE");
    expect(starts).toHaveLength(9);
    expect(starts[0]!.step_update.step_index).toBe(4);
    expect(full.at(-1)!.result).toMatchObject({ status: "SUCCESS", response: "NATIVE_ARGUMENTS_DONE" });
    const rows = (await fs.readFile(transcript(owned.root, first.conversationId), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    expect(rows).toHaveLength(18);
    expect(rows[0].tool_calls[0]).toMatchObject({ name: "write_to_file", args: {
      CodeContent: "BEFORE\nsecond 🙂 line\n", Overwrite: false, EmptyFile: false,
      ArtifactMetadata: { empty: "", count: 0, values: [null, false, 0, ""] } } });
    expect(rows[0].step_index).toBe(3);
  });

  it("retains ambiguous native plans and their normal summary stream/completion", async () => {
    const owned = await ownedRoot(); const run = await launch("native_arguments", owned, boundConversation);
    const frames = await run.send("AMBIGUOUS");
    expect(run.conversationId).toBe(boundConversation);
    const rows = (await fs.readFile(transcript(owned.root, boundConversation), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    expect(rows[0].tool_calls).toHaveLength(2);
    expect(frames.filter((frame) => frame.step_update?.state === "ACTIVE")).toHaveLength(1);
    expect(frames.at(-1)!.result.status).toBe("SUCCESS");
  });

  it.each(["quota", "unfamiliar", "structured", "empty", "malformed", "credential"])(
    "retains runtime-error %s routing, partial/tool work, exact conversation and the next user turn", async (kind) => {
      const owned = await ownedRoot(); const run = await launch("runtime_error", owned, boundConversation);
      expect(run.conversationId).toBe(boundConversation);
      const failed = await run.send(`Report runtime case: ${kind}`);
      expect(failed[0]!.step_update.text_delta).toBe("PARTIAL_WORK_PRESERVED");
      expect(failed[1]!.step_update).toMatchObject({ step_index: 11, state: "ACTIVE", tool_name: "run_command" });
      expect(failed[2]!.step_update).toMatchObject({ step_index: 11, state: "DONE",
        tool_info: { output: "COMPLETED_WORK_PRESERVED" } });
      expect(failed.at(-1)!.result).toMatchObject({ status: "ERROR", response: "PRIVATE_RESPONSE_MARKER token=PRIVATE_AGY_SECRET" });
      if (kind === "structured") expect(failed.at(-1)!.result.error.message).toContain("Read limit reached");
      if (kind === "credential") expect(failed.at(-1)!.result.error).toContain("token=PRIVATE_AGY_SECRET");
      const next = await run.send("Continue the same work.");
      expect(next.at(-1)!.result).toMatchObject({ status: "SUCCESS", response: "NEXT_USER_TURN_OK" });
      expect(next.some((frame) => frame.step_update?.step_type === "tool")).toBe(false);
      const inputs = (await fs.readFile(path.join(owned.root, "input.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
      expect(inputs.map((input) => [input.conversation_id, input.turns, input.content])).toEqual([
        [boundConversation, 1, `Report runtime case: ${kind}`], [boundConversation, 2, "Continue the same work."]]);
    });

  it.each(["linked_skills", "image_done", "tool_denied", "mcp_calls", "default_failure", "daemon_background"])(
    "preserves the existing %s branch", async (mode) => {
      const owned = await ownedRoot(); const run = await launch(mode, owned, boundConversation);
      const frames = await run.send(mode === "linked_skills" ? "READ_SKILLS" : "ordinary request");
      const terminal = frames.at(-1)!.result;
      if (mode === "linked_skills") {
        expect(run.conversationId).toBe(boundConversation);
        expect(terminal).toMatchObject({ status: "SUCCESS", response: "SKILLS:[]" });
      } else if (mode === "image_done") {
        expect(run.conversationId).toBe(boundConversation);
        expect(frames[1]!.step_update).toMatchObject({ tool_name: "generate_image", state: "DONE" });
        expect(terminal.status).toBe("SUCCESS");
      } else if (mode === "tool_denied") {
        expect(frames[1]!.step_update).toMatchObject({ tool_name: "generate_image", state: "ERROR" });
        expect(terminal.status).toBe("SUCCESS");
      } else if (mode === "mcp_calls") expect(terminal).toMatchObject({ status: "SUCCESS", response: "MCP_DONE" });
      else if (mode === "daemon_background") {
        expect(frames[0]!.step_update).toMatchObject({ tool_name: "run_command", state: "ACTIVE" });
        expect(terminal.status).toBe("SUCCESS");
      } else expect(terminal).toMatchObject({ status: "ERROR", error: "token=PRIVATE_AGY_SECRET" });
    });
});
