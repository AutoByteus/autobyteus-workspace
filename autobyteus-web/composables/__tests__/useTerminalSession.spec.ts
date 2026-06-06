import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { useTerminalSession } from "../useTerminalSession";
import type { TerminalTarget } from "~/types/terminal/TerminalTarget";

vi.mock("~/stores/windowNodeContextStore", () => ({
  useWindowNodeContextStore: () => ({
    getBoundEndpoints: () => ({
      terminalWs: "ws://test-host:8000/ws/terminal",
    }),
  }),
}));

// Mock WebSocket
class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState = 1; // OPEN
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
  }
}

const bytesToBase64ForTest = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const textToBase64Utf8ForTest = (text: string): string =>
  bytesToBase64ForTest(new TextEncoder().encode(text));

const decodeBase64Utf8ForTest = (base64Data: string): string =>
  new TextDecoder("utf-8").decode(
    Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0)),
  );

const terminalTarget = (
  overrides: Partial<TerminalTarget> = {},
): TerminalTarget => ({
  rootPath: "/tmp/ws-1",
  workspaceId: "ws-1",
  displayName: "Workspace 1",
  ...overrides,
});

describe("useTerminalSession", () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    // @ts-ignore
    global.WebSocket = vi.fn((url) => {
      mockWs = new MockWebSocket(url);
      return mockWs;
    });
    // @ts-ignore
    global.WebSocket.OPEN = 1;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("connects to the cwd-based WebSocket URL", () => {
    const target = ref(
      terminalTarget({ rootPath: "/tmp/project", workspaceId: "ws-123" }),
    );
    const session = useTerminalSession({ target });

    session.connect();

    expect(global.WebSocket).toHaveBeenCalledTimes(1);
    const url = new URL(mockWs.url);
    expect(url.origin).toBe("ws://test-host:8000");
    expect(url.pathname).toContain("/ws/terminal/");
    expect(url.pathname).not.toContain("/ws-123/");
    expect(url.searchParams.get("cwd")).toBe("/tmp/project");
    expect(url.searchParams.has("rootPath")).toBe(false);
    expect(session.connectionStatus.value).toBe("connecting");
  });

  it("connects without cwd or rootPath query params when server-home default is enabled", () => {
    const session = useTerminalSession({
      target: null,
      defaultCwd: "server-home",
    });

    session.connect();

    expect(global.WebSocket).toHaveBeenCalledTimes(1);
    const url = new URL(mockWs.url);
    expect(url.origin).toBe("ws://test-host:8000");
    expect(url.pathname).toContain("/ws/terminal/");
    expect(url.searchParams.has("cwd")).toBe(false);
    expect(url.searchParams.has("rootPath")).toBe(false);
    expect(session.connectionStatus.value).toBe("connecting");
  });

  it("keeps explicit empty root paths explicit instead of falling back to server home", () => {
    const session = useTerminalSession({
      target: terminalTarget({ rootPath: "" }),
      defaultCwd: "server-home",
    });

    session.connect();

    expect(global.WebSocket).toHaveBeenCalledTimes(1);
    const url = new URL(mockWs.url);
    expect(url.searchParams.has("cwd")).toBe(true);
    expect(url.searchParams.get("cwd")).toBe("");
    expect(url.searchParams.has("rootPath")).toBe(false);
  });

  it("updates status to connected on open", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    session.connect();

    // Simulate open
    mockWs.onopen?.();

    expect(session.connectionStatus.value).toBe("connected");
    expect(session.isConnected.value).toBe(true);
  });

  it("sends UTF-8 encoded input when connected", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    session.connect();
    mockWs.onopen?.();

    session.sendInput("ls");

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "input",
        data: textToBase64Utf8ForTest("ls"),
      }),
    );
  });

  it("sends non-ASCII input as UTF-8 bytes instead of browser binary-string text", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    session.connect();
    mockWs.onopen?.();

    expect(() => session.sendInput("✓你好")).not.toThrow();

    const sentMessage = JSON.parse(String(mockWs.send.mock.calls[0][0]));
    expect(sentMessage).toMatchObject({ type: "input" });
    expect(decodeBase64Utf8ForTest(sentMessage.data)).toBe("✓你好");
  });

  it("sends resize events", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    session.connect();
    mockWs.onopen?.();

    session.sendResize(24, 80);

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "resize",
        rows: 24,
        cols: 80,
      }),
    );
  });

  it("handles output messages", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    const outputSpy = vi.fn();
    session.onOutput(outputSpy);

    session.connect();

    const message = {
      type: "output",
      data: textToBase64Utf8ForTest("hello world"),
    };

    mockWs.onmessage?.({ data: JSON.stringify(message) });

    expect(outputSpy).toHaveBeenCalledWith("hello world");
  });

  it("decodes Unicode output bytes before dispatching terminal text", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    const outputSpy = vi.fn();
    const unicodeOutput = "┌─┐\n│✓│\n└─┘\n";
    session.onOutput(outputSpy);

    session.connect();

    mockWs.onmessage?.({
      data: JSON.stringify({
        type: "output",
        data: textToBase64Utf8ForTest(unicodeOutput),
      }),
    });

    expect(outputSpy).toHaveBeenCalledWith(unicodeOutput);
  });

  it("streams split UTF-8 output chunks through one session decoder", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    const outputSpy = vi.fn();
    session.onOutput(outputSpy);
    const bytes = new TextEncoder().encode("┌");

    session.connect();

    mockWs.onmessage?.({
      data: JSON.stringify({
        type: "output",
        data: bytesToBase64ForTest(bytes.subarray(0, 1)),
      }),
    });
    expect(outputSpy).not.toHaveBeenCalled();

    mockWs.onmessage?.({
      data: JSON.stringify({
        type: "output",
        data: bytesToBase64ForTest(bytes.subarray(1)),
      }),
    });

    expect(outputSpy).toHaveBeenCalledTimes(1);
    expect(outputSpy).toHaveBeenCalledWith("┌");
  });

  it("handles disconnection", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    session.connect();

    session.disconnect();

    expect(mockWs.close).toHaveBeenCalled();
    expect(session.connectionStatus.value).toBe("disconnected");
  });

  it("does not crash on garbage JSON", () => {
    const session = useTerminalSession({ target: terminalTarget() });
    session.connect();

    // Should catch JSON.parse error and log it, but not crash
    expect(() => {
      mockWs.onmessage?.({ data: "invalid json" });
    }).not.toThrow();
  });

  it("does not connect without a root path", () => {
    const session = useTerminalSession({ target: null });

    session.connect();

    expect(global.WebSocket).not.toHaveBeenCalled();
    expect(session.errorMessage.value).toBe("No terminal root path provided");
  });
});
