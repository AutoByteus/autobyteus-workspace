import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isBrowserSupportedMock,
  registerOpenTabToolMock,
  registerNavigateToToolMock,
  registerCloseTabToolMock,
  registerListTabsToolMock,
  registerReadPageToolMock,
  registerScreenshotToolMock,
  registerDomSnapshotToolMock,
  registerRunScriptToolMock,
} = vi.hoisted(() => ({
  isBrowserSupportedMock: vi.fn(),
  registerOpenTabToolMock: vi.fn(),
  registerNavigateToToolMock: vi.fn(),
  registerCloseTabToolMock: vi.fn(),
  registerListTabsToolMock: vi.fn(),
  registerReadPageToolMock: vi.fn(),
  registerScreenshotToolMock: vi.fn(),
  registerDomSnapshotToolMock: vi.fn(),
  registerRunScriptToolMock: vi.fn(),
}));

vi.mock("../../../../src/agent-tools/browser/browser-tool-service.js", () => ({
  getBrowserToolService: () => ({
    isBrowserSupported: isBrowserSupportedMock,
  }),
}));

vi.mock("../../../../src/agent-tools/browser/open-tab.js", () => ({
  registerOpenTabTool: registerOpenTabToolMock,
}));

vi.mock("../../../../src/agent-tools/browser/navigate-to.js", () => ({
  registerNavigateToTool: registerNavigateToToolMock,
}));

vi.mock("../../../../src/agent-tools/browser/close-tab.js", () => ({
  registerCloseTabTool: registerCloseTabToolMock,
}));

vi.mock("../../../../src/agent-tools/browser/list-tabs.js", () => ({
  registerListTabsTool: registerListTabsToolMock,
}));

vi.mock("../../../../src/agent-tools/browser/read-page.js", () => ({
  registerReadPageTool: registerReadPageToolMock,
}));

vi.mock("../../../../src/agent-tools/browser/screenshot.js", () => ({
  registerScreenshotTool: registerScreenshotToolMock,
}));

vi.mock("../../../../src/agent-tools/browser/dom-snapshot.js", () => ({
  registerDomSnapshotTool: registerDomSnapshotToolMock,
}));

vi.mock("../../../../src/agent-tools/browser/run-script.js", () => ({
  registerRunScriptTool: registerRunScriptToolMock,
}));

import { registerBrowserTools } from "../../../../src/agent-tools/browser/register-browser-tools.js";

describe("registerBrowserTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not register browser tools when the browser bridge is unavailable", () => {
    isBrowserSupportedMock.mockReturnValue(false);

    registerBrowserTools();

    expect(registerOpenTabToolMock).not.toHaveBeenCalled();
    expect(registerNavigateToToolMock).not.toHaveBeenCalled();
    expect(registerCloseTabToolMock).not.toHaveBeenCalled();
    expect(registerListTabsToolMock).not.toHaveBeenCalled();
    expect(registerReadPageToolMock).not.toHaveBeenCalled();
    expect(registerScreenshotToolMock).not.toHaveBeenCalled();
    expect(registerDomSnapshotToolMock).not.toHaveBeenCalled();
    expect(registerRunScriptToolMock).not.toHaveBeenCalled();
  });

  it("registers the full browser tool surface when the browser bridge is configured", () => {
    isBrowserSupportedMock.mockReturnValue(true);

    registerBrowserTools();

    expect(registerOpenTabToolMock).toHaveBeenCalledTimes(1);
    expect(registerNavigateToToolMock).toHaveBeenCalledTimes(1);
    expect(registerCloseTabToolMock).toHaveBeenCalledTimes(1);
    expect(registerListTabsToolMock).toHaveBeenCalledTimes(1);
    expect(registerReadPageToolMock).toHaveBeenCalledTimes(1);
    expect(registerScreenshotToolMock).toHaveBeenCalledTimes(1);
    expect(registerDomSnapshotToolMock).toHaveBeenCalledTimes(1);
    expect(registerRunScriptToolMock).toHaveBeenCalledTimes(1);
  });
});
