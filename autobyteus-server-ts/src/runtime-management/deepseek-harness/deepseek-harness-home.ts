import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  buildDshHomePatch,
  DSH_INSTRUCTIONS_PLUGIN_FILE_NAME,
  DSH_INSTRUCTIONS_PLUGIN_SOURCE,
} from "./deepseek-harness-home-files.js";

/** One run's launch files: its instructions file, and their removal once the run's process stopped. */
export type DeepSeekHarnessRunFiles = Readonly<{ instructionsFile: string; release(): Promise<void> }>;

const safeFolderName = (runId: string): string => runId.replace(/[^A-Za-z0-9._-]/g, "_") || "_";

/** Writes `content` to `file` through a temporary file in the same folder and a rename, when the file differs. */
const writeAtomically = async (file: string, content: string): Promise<void> => {
  const current = await fs.readFile(file, "utf8").catch(() => null);
  if (current === content) return;
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, content, "utf8");
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
};

/**
 * The AutoByteus-owned dsh home and its runtime folders, under `<appData>/runtimes/deepseek-harness/`: `home` (the
 * `DSH_HOME` of every dsh process: the home patch, the instructions plugin, and dsh's own session store; never a key,
 * DEC-007), `runs/<runId>` (one run's instructions file) and `discovery` (the model-discovery session's folder).
 * The user's own `~/.dsh` is never read or written.
 */
export class DeepSeekHarnessHome {
  constructor(private readonly root: string) {}

  get homeDir(): string { return path.join(this.root, "home"); }
  get discoveryDir(): string { return path.join(this.root, "discovery"); }

  /** The home files as this server writes them (each rewritten atomically only when it differs). */
  async ensure(): Promise<void> {
    const pluginsDir = path.join(this.homeDir, "plugins");
    await fs.mkdir(pluginsDir, { recursive: true });
    const pluginPath = path.join(pluginsDir, DSH_INSTRUCTIONS_PLUGIN_FILE_NAME);
    await writeAtomically(pluginPath, DSH_INSTRUCTIONS_PLUGIN_SOURCE);
    await writeAtomically(path.join(this.homeDir, "cordis.patch.yml"), buildDshHomePatch(pluginPath));
  }

  async ensureDiscoveryDir(): Promise<string> {
    await fs.mkdir(this.discoveryDir, { recursive: true });
    return this.discoveryDir;
  }

  /** Writes the run's instructions for its next process; `release` removes the run's folder. */
  async prepareRun(runId: string, instructions: string): Promise<DeepSeekHarnessRunFiles> {
    const runDir = path.join(this.root, "runs", safeFolderName(runId));
    await fs.mkdir(runDir, { recursive: true });
    const instructionsFile = path.join(runDir, "instructions.md");
    await writeAtomically(instructionsFile, instructions);
    return Object.freeze({
      instructionsFile,
      release: () => fs.rm(runDir, { recursive: true, force: true }),
    });
  }
}

let processHome: DeepSeekHarnessHome | null = null;

/** The server's dsh home, under its app data folder. */
export const getDeepSeekHarnessHome = (): DeepSeekHarnessHome => {
  processHome ??= new DeepSeekHarnessHome(path.join(appConfigProvider.config.getAppDataDir(), "runtimes", "deepseek-harness"));
  return processHome;
};
