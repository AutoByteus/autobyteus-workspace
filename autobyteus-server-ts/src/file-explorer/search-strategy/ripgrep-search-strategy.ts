import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { BaseFileSearchStrategy } from "./base-search-strategy.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class RipgrepSearchStrategy extends BaseFileSearchStrategy {
  private maxResults: number;
  private rgPath: string | null = null;
  private checked = false;

  constructor(maxResults = 50) {
    super();
    this.maxResults = maxResults;
  }

  isAvailable(): boolean {
    if (!this.checked) {
      this.rgPath = this.findRipgrep();
      this.checked = true;
    }
    return this.rgPath !== null;
  }

  async search(rootPath: string, query: string): Promise<string[]> {
    if (!this.isAvailable() || !this.rgPath) {
      throw new Error("Ripgrep is not available");
    }

    const globPattern = `*${query}*`;

    const results = await this.runRipgrep(rootPath, globPattern);
    const absPaths = results.map((entry) => path.join(rootPath, entry));
    return absPaths.slice(0, this.maxResults);
  }

  private findRipgrep(): string | null {
    const rgBinary = process.platform === "win32" ? "rg.exe" : "rg";

    const bundledPath = path.join(path.dirname(process.execPath), rgBinary);
    if (fs.existsSync(bundledPath)) {
      logger.info(`Found bundled ripgrep at: ${bundledPath}`);
      return bundledPath;
    }

    const systemPath = this.findOnPath(rgBinary);
    if (systemPath) {
      logger.info(`Found system ripgrep at: ${systemPath}`);
      return systemPath;
    }

    logger.debug("Ripgrep not found");
    return null;
  }

  private findOnPath(binary: string): string | null {
    const pathEnv = process.env.PATH ?? "";
    const pathExt = process.platform === "win32" ? process.env.PATHEXT ?? ".EXE;.CMD;.BAT" : "";
    const extensions = process.platform === "win32" ? pathExt.split(";") : [""];

    for (const entry of pathEnv.split(path.delimiter)) {
      const base = entry.trim();
      if (!base) {
        continue;
      }
      for (const ext of extensions) {
        const fullPath = path.join(base, `${binary}${ext}`);
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      }
    }

    return null;
  }

  private runRipgrep(rootPath: string, globPattern: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        this.rgPath as string,
        ["--files", "--ignore-case", "--glob", globPattern],
        { cwd: rootPath },
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => reject(error));

      child.on("close", (code) => {
        if (code === 0 || code === 1) {
          const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
          resolve(lines);
          return;
        }

        reject(new Error(`rg exited with code ${code}: ${stderr}`));
      });
    });
  }
}
