import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isProcessAlive, prepareFakeRuntimes } from "../../e2e/helpers/agent-runtimes-e2e-harness.js";

/**
 * The scripted runtime CLIs' cleanup (autobyteus-579 I-5): a fake the server started can outlive it and keep writing into
 * the temp root (here a real `grok login --oauth`, which ignores SIGTERM and waits for its browser callback). `dispose`
 * stops such a fake and waits for its exit before it removes the root, so the removal never meets a writer (ENOTEMPTY).
 */
describe("prepareFakeRuntimes().dispose", () => {
  const children: ChildProcess[] = [];
  afterEach(() => { for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); });

  it("stops a fake that still runs, waits for its exit, then removes the root", async () => {
    const fake = prepareFakeRuntimes({ label: "fake-dispose-test", grokInstalled: true });
    const login = spawn(path.join(fake.binDir, "grok"), ["login", "--oauth"], { env: { ...process.env }, stdio: "ignore" });
    children.push(login);
    const started = Date.now();
    while (!fs.existsSync(path.join(fake.stateDir, "grok-login.pid")) && Date.now() - started < 10_000) await new Promise((r) => setTimeout(r, 20));
    expect(isProcessAlive(login.pid ?? null), "the login waits for its browser callback").toBe(true);

    const exit = new Promise<NodeJS.Signals | number | null>((resolve) => login.once("exit", (code, signal) => resolve(signal ?? code)));
    await fake.dispose();

    // It was this test's own child, so it is reaped when its exit event runs; it ended by the cleanup's SIGKILL.
    expect(await exit, "the writer was stopped").toBe("SIGKILL");
    expect(fs.existsSync(fake.root)).toBe(false);
  }, 30_000);

  it("never touches a process that is not one of this root's fakes", async () => {
    const fake = prepareFakeRuntimes({ label: "fake-dispose-foreign", grokInstalled: true });
    const other = spawn(process.execPath, ["-e", "setInterval(() => undefined, 60_000)"], { stdio: "ignore" });
    children.push(other);
    // A stale line naming a pid that now belongs to another process.
    fs.appendFileSync(path.join(fake.stateDir, "cli-calls.log"), `${Date.now()} ${other.pid} grok login --oauth\n`);

    await fake.dispose();

    expect(isProcessAlive(other.pid ?? null)).toBe(true);
    expect(fs.existsSync(fake.root)).toBe(false);
  }, 30_000);
});
