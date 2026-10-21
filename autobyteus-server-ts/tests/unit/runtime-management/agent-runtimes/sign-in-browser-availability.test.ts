import { describe, expect, it } from "vitest";
import { isSignInBrowserAvailable } from "../../../../src/runtime-management/agent-runtimes/sign-in-browser-availability.js";

describe("isSignInBrowserAvailable", () => {
  it("is always true on macOS and Windows desktops", () => {
    expect(isSignInBrowserAvailable("darwin", {})).toBe(true);
    expect(isSignInBrowserAvailable("win32", {})).toBe(true);
  });

  it("is true on a Docker node (BROWSER bridge to its VNC Chromium and DISPLAY=:99)", () => {
    expect(isSignInBrowserAvailable("linux", { BROWSER: "/usr/local/bin/autobyteus-browser", DISPLAY: ":99" })).toBe(true);
  });

  it("is true on Linux with any one of BROWSER, DISPLAY or WAYLAND_DISPLAY", () => {
    expect(isSignInBrowserAvailable("linux", { BROWSER: "firefox" })).toBe(true);
    expect(isSignInBrowserAvailable("linux", { DISPLAY: ":0" })).toBe(true);
    expect(isSignInBrowserAvailable("linux", { WAYLAND_DISPLAY: "wayland-0" })).toBe(true);
  });

  it("is false on a headless Linux node: none set, or set but empty", () => {
    expect(isSignInBrowserAvailable("linux", { PATH: "/usr/bin", HOME: "/root" })).toBe(false);
    expect(isSignInBrowserAvailable("linux", { BROWSER: "", DISPLAY: "", WAYLAND_DISPLAY: "" })).toBe(false);
  });
});
