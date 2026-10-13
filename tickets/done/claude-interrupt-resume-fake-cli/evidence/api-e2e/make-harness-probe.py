# Temporary executable evidence only. Run from worktree root; remove the emitted sibling.
from pathlib import Path
import hashlib
w=Path(__file__).resolve().parents[5]
original=w/'autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts'
target=original.with_name('claude-interrupt-resume-owned-harness.probe.test.ts')
if target.exists():raise RuntimeError('Refuse to overwrite an existing probe')
source=original.read_text();prefix=source.split('describe("Claude Agent SDK websocket streaming session (fake CLI)"',1)[0]
prefix=prefix.replace('describe, expect, it, onTestFinished, vi','afterAll, describe, expect, it, onTestFinished, vi')
prefix=prefix.replace('const createClaudeWebSocketHarnessWithSdkClient = async', 'let probeAppObserver: ((app: FastifyInstance) => void) | undefined;\nconst createClaudeWebSocketHarnessWithSdkClient = async')
prefix=prefix.replace('  const app = fastify();','  const app = fastify();\n  probeAppObserver?.(app);')
# Only injection is observation/failure of test-owned app setup. Opening/session/child helpers unchanged.
code=r'''
const probeWorkspaces: string[] = [];
const probeClient = () => createFakeCliSdkClient({ onInput: (message, cli) => {
  cli.init(); cli.assistant("PROBE_DONE"); cli.result([message.uuid]);
} });
const rememberWorkspace = (harness: Awaited<ReturnType<typeof createClaudeWebSocketHarnessWithSdkClient>>) => {
  probeWorkspaces.push(harness.runContext.runtimeContext.sessionConfig.workingDirectory!);
};
const primeProbe = async (harness: Awaited<ReturnType<typeof createClaudeWebSocketHarnessWithSdkClient>>, clis: FakeClaudeCliQuery[]) => {
  const completed = waitForJsonMessage(harness.socket, message => message.type === "TURN_COMPLETED", "probe normal turn");
  sendE2eSendMessageCommand(harness.socket, { content: "Run probe-owned normal work" });
  await completed;
  expectOwnedChildRunning(clis[0]!);
};
const checkProbeCleanup = (harness: Awaited<ReturnType<typeof createClaudeWebSocketHarnessWithSdkClient>>, clis: FakeClaudeCliQuery[]) => {
  expect(harness.socket.readyState).toBe(WebSocket.CLOSED);
  expect(harness.app.server.listening).toBe(false);
  expect(harness.sessionManager.hasRunSession(harness.runContext.runId)).toBe(false);
  expect(clis).toHaveLength(1);
  expect(clis[0]!.child.exitCode).toBe(0);
  expect(clis[0]!.stdin.closed).toBe(true);
  expect(clis[0]!.stdout.closed).toBe(true);
};
afterAll(() => {
  for (const workspace of probeWorkspaces) expect(fsSync.existsSync(workspace)).toBe(false);
  console.log(JSON.stringify({ probeWorkspacesRemoved: probeWorkspaces.length }));
});
describe("Temporary operational harness evidence, not extra product scenarios", () => {
  it("PROBE-BODY retains original body failure and releases exact owned child/session/socket/app", async () => {
    const { sdkClient, sdkCalls, clis } = probeClient();
    const harness = await createClaudeWebSocketHarnessWithSdkClient({runId: "probe-body",sdkClient,sdkCalls});
    rememberWorkspace(harness);
    const appClose = vi.spyOn(harness.app,"close");
    const primary = new Error("probe-owned body assertion failure");
    let observed: unknown;
    try {
      await withHarness(harness, clis, async () => {await primeProbe(harness,clis);throw primary;});
    } catch (error) {observed=error;}
    expect(observed).toBeInstanceOf(AggregateError);
    expect((observed as AggregateError).errors).toEqual([primary]);
    expect(appClose).toHaveBeenCalledTimes(1);
    checkProbeCleanup(harness,clis);
    vi.restoreAllMocks();
  });
  it("PROBE-CLEANUP retains both body and release-reporting errors while still closing app/socket", async () => {
    const { sdkClient, sdkCalls, clis } = probeClient();
    const harness = await createClaudeWebSocketHarnessWithSdkClient({runId: "probe-cleanup",sdkClient,sdkCalls});
    rememberWorkspace(harness);
    const originalClose = harness.sessionManager.closeRunSession.bind(harness.sessionManager);
    const primary = new Error("probe-owned primary failure");
    const releaseError = new Error("probe-owned release reporting failure after real exact release");
    const release = vi.spyOn(harness.sessionManager,"closeRunSession").mockImplementation(async runId => {
      await originalClose(runId); // Do not fake a release receipt or abandon the real child.
      throw releaseError;
    });
    const appClose = vi.spyOn(harness.app,"close");
    let observed: unknown;
    try {
      await withHarness(harness,clis,async()=>{await primeProbe(harness,clis);throw primary;});
    } catch (error) {observed=error;}
    expect(observed).toBeInstanceOf(AggregateError);
    expect((observed as AggregateError).errors).toEqual([primary,releaseError]);
    expect(release).toHaveBeenCalledTimes(1);
    expect(appClose).toHaveBeenCalledTimes(1);
    checkProbeCleanup(harness,clis);
    vi.restoreAllMocks();
  });
  it("PROBE-SETUP preserves listen failure and releases precreated session/app/private cwd", async () => {
    const { sdkClient, sdkCalls, clis } = probeClient();
    const setupError = new Error("probe-owned listen failure before socket construction");
    let app: FastifyInstance | undefined;
    let appClose: ReturnType<typeof vi.spyOn> | undefined;
    let exactRemoved = false;
    const originalClose = ClaudeSessionManager.prototype.closeRunSession;
    const release = vi.spyOn(ClaudeSessionManager.prototype,"closeRunSession").mockImplementation(async function (runId) {
      const existed = this.hasRunSession(runId);
      if (existed) probeWorkspaces.push(this.requireRunSession(runId).runContext.runtimeContext.sessionConfig.workingDirectory!);
      await originalClose.call(this,runId);
      if (existed) exactRemoved = !this.hasRunSession(runId);
    });
    probeAppObserver = instance => {
      app=instance;appClose=vi.spyOn(instance,"close");
      vi.spyOn(instance,"listen").mockRejectedValue(setupError);
    };
    let observed: unknown;
    try {
      await createClaudeWebSocketHarnessWithSdkClient({runId:"probe-setup",sdkClient,sdkCalls});
    } catch (error) {observed=error;}
    finally {probeAppObserver=undefined;}
    expect(observed).toBe(setupError);
    expect(release).toHaveBeenCalledTimes(2); // Pre-create empty close plus setup-failure exact release.
    expect(exactRemoved).toBe(true);
    expect(appClose).toHaveBeenCalledTimes(1);
    expect(app?.server.listening).toBe(false);
    expect(sdkCalls).toHaveLength(0);
    expect(clis).toHaveLength(0);
    vi.restoreAllMocks();
  });
});
'''
target.write_text(prefix+code)
print('Generated',target,'from original SHA256',hashlib.sha256(source.encode()).hexdigest())
