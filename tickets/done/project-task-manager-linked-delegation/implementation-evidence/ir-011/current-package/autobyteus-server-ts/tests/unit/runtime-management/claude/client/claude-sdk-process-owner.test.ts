import { afterEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { ClaudeSdkProcessOwner } from "../../../../../src/runtime-management/claude/client/claude-sdk-process-owner.js";
import { beginClaudeSdkSessionOpening } from "../../../../../src/runtime-management/claude/client/claude-sdk-session-opening.js";

const spawnMock = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", async importOriginal => ({ ...await importOriginal<typeof import("node:child_process")>(), spawn: spawnMock }));
class OwnedChild extends EventEmitter {
  stdin = new PassThrough(); stdout = new PassThrough(); stderr = new PassThrough();
  killed = false; exitCode: number | null = null; signalCode: NodeJS.Signals | null = null;
  failKill = true;
  kill = vi.fn((signal: NodeJS.Signals) => {
    if (this.failKill) return false;
    this.killed = true; this.signalCode = signal;
    queueMicrotask(() => { this.emit("exit", null, signal); this.stderr.end(); });
    return true;
  });
  constructor() {
    super();
    let buffered = "";
    this.stdin.on("data", bytes => {
      buffered += bytes.toString();
      while (buffered.includes("\n")) {
        const at = buffered.indexOf("\n"); const line = buffered.slice(0, at); buffered = buffered.slice(at + 1);
        const frame = JSON.parse(line);
        if (frame.type === "control_request") this.stdout.write(JSON.stringify({ type: "control_response", response: {
          subtype: "success", request_id: frame.request_id, response: { commands: [], models: [], account: {}, available_output_styles: [] },
        } }) + "\n");
      }
    });
  }
}
const install = (child: OwnedChild) => spawnMock.mockImplementation(() => {
  queueMicrotask(() => child.emit("spawn")); return child;
});
afterEach(() => { vi.useRealTimers(); spawnMock.mockReset(); });

describe("concrete SDK child release proof", () => {
  it("preserves EOF 2s, TERM 5s, then KILL grace; no signal is a release certificate", async () => {
    const child = new OwnedChild(); install(child); vi.useFakeTimers();
    const owner = new ClaudeSdkProcessOwner();
    owner.spawn({ command: 'test-owned', args: [], env: {}, signal: new AbortController().signal });
    await vi.advanceTimersByTimeAsync(0);
    const release = owner.release();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(child.stdin.writableEnded).toBe(true); expect(child.kill).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(child.kill.mock.calls).toEqual([['SIGTERM']]);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(child.kill.mock.calls).toEqual([['SIGTERM']]);
    await vi.advanceTimersByTimeAsync(1);
    expect(child.kill.mock.calls).toEqual([['SIGTERM'], ['SIGKILL']]);
    const failure = expect(release).rejects.toThrow('CLAUDE_CHILD_RELEASE_FAILED');
    await vi.advanceTimersByTimeAsync(2_000); await failure;
    child.exitCode = 0; child.emit('exit', 0, null); child.stderr.destroy();
    const retry = owner.release(); await vi.advanceTimersByTimeAsync(250); await retry;
    expect(child.kill).toHaveBeenCalledTimes(2);
  });

  it("requires IO proof after actual exit, retains failures, and retries only those same streams", async () => {
    const child = new OwnedChild(); install(child); vi.useFakeTimers();
    const owner = new ClaudeSdkProcessOwner();
    const facade = owner.spawn({ command: 'test-owned', args: [], env: {}, signal: new AbortController().signal });
    await vi.advanceTimersByTimeAsync(0);
    const destroys = [child.stdin, child.stdout, child.stderr].map(stream => vi.spyOn(stream, 'destroy').mockImplementation(() => stream));
    child.exitCode = 0; child.emit('exit', 0, null);
    const exit = vi.fn(); facade.on('exit', exit);
    await vi.advanceTimersByTimeAsync(199); expect(exit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); expect(exit).toHaveBeenCalledTimes(1);
    const failure = expect(owner.release()).rejects.toThrow('CLAUDE_CHILD_RELEASE_FAILED');
    await vi.advanceTimersByTimeAsync(10_000); await failure;
    expect(child.kill).not.toHaveBeenCalled(); expect(spawnMock).toHaveBeenCalledTimes(1);
    destroys.forEach(spy => spy.mockRestore());
    const retry = owner.release(); await vi.advanceTimersByTimeAsync(250); await retry;
    expect(child.stdin.closed && child.stdout.closed && child.stderr.closed).toBe(true);
    expect(() => facade.stdin).toThrow('IO is released');
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("does not confuse spawn error or throwing diagnostic observers with closed/exit proof", async () => {
    const child = new OwnedChild(); spawnMock.mockReturnValue(child); vi.useFakeTimers();
    const owner = new ClaudeSdkProcessOwner(() => { throw new Error('observer failure'); });
    const facade = owner.spawn({ command: 'test-owned', args: [], env: {}, signal: new AbortController().signal });
    facade.on('error', () => { throw new Error('SDK listener failure'); });
    child.stderr.write(Buffer.from('diagnostic'));
    child.emit('error', new Error('spawn failed'));
    const failure = expect(owner.release()).rejects.toThrow('CLAUDE_CHILD_RELEASE_FAILED');
    await vi.advanceTimersByTimeAsync(10_000); await failure;
    // Failed spawn is proved only when its concrete Node close also arrives.
    child.emit('close', -1, null); child.stderr.destroy();
    const retry = owner.release(); await vi.advanceTimersByTimeAsync(250); await retry;
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("never certifies a post-spawn setup fault as never-started", async () => {
    const child = new OwnedChild(); install(child); vi.useFakeTimers();
    vi.spyOn(child.stderr, 'on').mockImplementationOnce(() => { throw new Error('post-acquisition setup fault'); });
    const owner = new ClaudeSdkProcessOwner();
    expect(() => owner.spawn({ command: 'test-owned', args: [], env: {}, signal: new AbortController().signal })).toThrow('setup fault');
    await vi.advanceTimersByTimeAsync(0);
    const failure = expect(owner.release()).rejects.toThrow('CLAUDE_CHILD_RELEASE_FAILED');
    await vi.advanceTimersByTimeAsync(10_000); await failure;
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    child.exitCode = 0; child.emit('exit', 0, null);
    const retry = owner.release(); await vi.advanceTimersByTimeAsync(250); await retry;
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("real pinned Query/public hook failure retains same child and retry resends, without reopen", async () => {
    const child = new OwnedChild(); install(child);
    let initialization!: Promise<unknown>;
    const opening = beginClaudeSdkSessionOpening({ createQuery: async control => {
      const q = query({ prompt: control.channel as never, options: { settingSources: [],
        env: { HOME: "/test-owned-fake-home", ANTHROPIC_API_KEY: "" }, spawnClaudeCodeProcess: control.spawn } });
      control.registerQuery(q); initialization = q.initializationResult();
    } });
    await opening.open(); await initialization;
    vi.useFakeTimers();
    const first = opening.release();
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await first).kind).toBe("failed");
    expect(child.exitCode).toBeNull();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    const before = child.kill.mock.calls.length;
    child.failKill = false;
    const retry = opening.release();
    await vi.advanceTimersByTimeAsync(250);
    expect(await retry).toEqual({ kind: "released" });
    expect(child.kill.mock.calls.length).toBeGreaterThan(before);
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const after = child.kill.mock.calls.length;
    expect(await opening.release()).toEqual({ kind: "released" });
    expect(child.kill).toHaveBeenCalledTimes(after);
    await expect(opening.open()).rejects.toThrow("CLAUDE_OPENING_CLOSED");
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("preserves public spawn args/environment/forwarded signal and drains split UTF8 before SDK exit", async () => {
    const child = new OwnedChild(); install(child);
    const tail: string[] = [];
    const owner = new ClaudeSdkProcessOwner(text => tail.push(text));
    const options = { command: "/test-owned/node", args: ["cli.mjs", "--test"], cwd: "/test-owned", env: { TEST_ONLY: "yes" }, signal: new AbortController().signal };
    const facade = owner.spawn(options);
    await Promise.resolve();
    expect(spawnMock).toHaveBeenCalledWith(options.command, options.args, { cwd: options.cwd, env: options.env,
      signal: options.signal, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    const exit = vi.fn(); facade.on("exit", exit);
    const euro = Buffer.from("€"); child.stderr.write(euro.subarray(0, 1));
    child.exitCode = 0; child.emit("exit", 0, null);
    expect(exit).not.toHaveBeenCalled();
    child.stderr.write(euro.subarray(1)); child.stderr.destroy();
    await owner.release();
    expect(tail.join("")).toContain("€");
    expect(exit).toHaveBeenCalledTimes(1);
    expect(await owner.release()).toBeUndefined();
    expect(child.kill).not.toHaveBeenCalled();
  });

  it("keeps child acquired before a query throw and closes late hook, without declaring missing Query release", async () => {
    const child = new OwnedChild(); install(child);
    let hook!: (options: never) => unknown;
    const opening = beginClaudeSdkSessionOpening({ createQuery: async control => {
      hook = control.spawn;
      hook({ command: "test", args: [], env: {}, signal: new AbortController().signal } as never);
      throw new Error("query construction rejected after spawn");
    } });
    await expect(opening.open()).rejects.toThrow("after spawn");
    vi.useFakeTimers();
    const release = opening.release(); await vi.advanceTimersByTimeAsync(10_000);
    expect((await release).kind).toBe("failed");
    expect(() => hook({} as never)).toThrow("CLAUDE_OPENING_CLOSED");
    child.exitCode = 0; child.emit("exit", 0, null); child.stderr.destroy();
    const retry = opening.release(); await vi.advanceTimersByTimeAsync(250);
    expect(await retry).toEqual({ kind: "released" });
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});
