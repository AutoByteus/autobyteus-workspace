import type { SandboxDocker } from "./sandbox-docker.js";

/** Whether this host can run sandboxes now, or the refusal that says why not (REQ-014). */
export type SandboxPlatformCheck =
  | Readonly<{ supported: true }>
  | Readonly<{ supported: false; code: "SANDBOX_DOCKER_UNAVAILABLE" | "SANDBOX_PLATFORM_NOT_SUPPORTED"; message: string }>;

/**
 * The hosts sandboxes are implemented on (DEC-105): macOS with Docker Desktop, where `host.docker.internal` reaches the
 * host node's loopback listener and the host sees the sandbox as `127.0.0.1` (P-1). Linux and Windows hosts are
 * designed (the design's platform section) and refused here until FU-581-02.
 */
export const checkSandboxPlatform = async (
  docker: Pick<SandboxDocker, "info">,
  platform: NodeJS.Platform = process.platform,
): Promise<SandboxPlatformCheck> => {
  if (platform !== "darwin") {
    return { supported: false, code: "SANDBOX_PLATFORM_NOT_SUPPORTED",
      message: "Sandboxes are not supported on this host yet: only macOS with Docker Desktop is." };
  }
  const info = await docker.info();
  if (!info.available) {
    return { supported: false, code: "SANDBOX_DOCKER_UNAVAILABLE",
      message: "Docker is not available on this computer: start Docker Desktop and try again." };
  }
  if (!/docker desktop/i.test(info.operatingSystem ?? "")) {
    return { supported: false, code: "SANDBOX_PLATFORM_NOT_SUPPORTED",
      message: `Sandboxes need Docker Desktop on macOS; this Docker is '${info.operatingSystem ?? "unknown"}'.` };
  }
  return { supported: true };
};
