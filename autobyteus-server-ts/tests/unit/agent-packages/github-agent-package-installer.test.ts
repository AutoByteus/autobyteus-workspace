import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import {
  buildTarExtractionCommandSpecs,
  extractTarGzArchive,
} from "../../../src/agent-packages/installers/github-agent-package-installer.js";

describe("GitHubAgentPackageInstaller archive extraction", () => {
  it("uses tar.exe first on Windows and falls back to plain tar when the first command is unavailable", async () => {
    const calls: string[] = [];

    const spawnImpl = ((command: string) => {
      calls.push(command);

      const child = new EventEmitter() as EventEmitter & {
        on: (event: string, listener: (...args: any[]) => void) => typeof child;
      };

      queueMicrotask(() => {
        if (command === "tar.exe") {
          const error = Object.assign(new Error("command not found"), {
            code: "ENOENT",
          });
          child.emit("error", error);
          return;
        }

        child.emit("close", 0);
      });

      return child as any;
    }) as any;

    await extractTarGzArchive("/tmp/archive.tar.gz", "/tmp/output", {
      platform: "win32",
      spawnImpl,
    });

    expect(calls).toEqual(["tar.exe", "tar"]);
  });

  it("builds a single tar command on non-Windows platforms", () => {
    expect(buildTarExtractionCommandSpecs("linux")).toEqual([
      { executable: "tar", shell: false },
    ]);
  });
});
