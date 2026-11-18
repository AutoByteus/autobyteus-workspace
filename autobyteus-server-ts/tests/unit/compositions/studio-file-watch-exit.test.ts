/**
 * autobyteus-524 FU-007 (SR-002): only the process-shutdown cleanups end the studio's file watches for the exit
 * (`stopFileWatchesForProcessExit`, both watchers, no OS close); any other close of the studio (an in-process
 * server's `fastify.close()`, as here and in the E2E tests) closes the watchers normally, which closes their OS
 * watches. The watchers' own unit tests prove what each way of ending does to the OS watches.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { buildStudioServer } from "../../../src/compositions/build-studio-server.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentPackageFolderWatcher } from "../../../src/agent-package-definitions/monitor/agent-package-folder-watcher.js";
import { SkillFolderWatcher } from "../../../src/skill-update-notices/monitor/skill-folder-watcher.js";

const LOGGING = { pinoLogLevel: "silent", httpAccessLogMode: "off", includeNoisyHttpAccessRoutes: false, scopedLogLevelOverrides: [] } as const;
let dataDir: string | null = null;
afterEach(() => { vi.restoreAllMocks(); });
afterAll(() => { if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true }); });

/** One data folder for the file (the app config takes it once per process); each case builds and closes a studio. */
const buildStudio = async () => {
  if (!dataDir) {
    dataDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "studio-file-watch-exit-")));
    fs.writeFileSync(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    if (!appConfigProvider.config.isInitialized()) appConfigProvider.config.initialize();
  }
  return buildStudioServer({ appConfig: appConfigProvider.config, loggingConfig: LOGGING as never });
};

/** Records, in order, how each of the two watchers is ended. */
const recordEnds = () => {
  const ends: string[] = [];
  for (const [label, prototype] of [["package", AgentPackageFolderWatcher.prototype], ["skill", SkillFolderWatcher.prototype]] as const) {
    const stop = prototype.stopForProcessExit, close = prototype.close;
    vi.spyOn(prototype, "stopForProcessExit").mockImplementation(function (this: never) { ends.push(`${label}:stop`); return stop.call(this); });
    vi.spyOn(prototype, "close").mockImplementation(function (this: never) { ends.push(`${label}:close`); return close.call(this); });
  }
  return ends;
};

describe("studio file watches at process exit", () => {
  it("stops both watchers for the exit before the close; the close then finds them stopped", async () => {
    const ends = recordEnds();
    const studio = await buildStudio();
    studio.stopFileWatchesForProcessExit();
    expect(ends).toEqual(["package:stop", "skill:stop"]);
    await studio.fastify.close();
    expect(ends.slice(0, 2)).toEqual(["package:stop", "skill:stop"]);
    expect(ends.slice(2).sort()).toEqual(["package:close", "skill:close"]);
  }, 60_000);

  it("closes both watchers normally (OS watches released) when the studio is closed without the exit stop", async () => {
    const ends = recordEnds();
    const studio = await buildStudio();
    await studio.fastify.close();
    expect(ends.sort()).toEqual(["package:close", "skill:close"]);
  }, 60_000);
});
