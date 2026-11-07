import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const hostNameWithoutLocalSuffix = (): string => os.hostname().trim().replace(/\.local\.?$/i, "");

/**
 * This computer's name as its owner knows it: macOS `scutil --get ComputerName` ("MacBook Pro"),
 * otherwise the host name without `.local`. Empty when neither can be read.
 */
export const readComputerName = async (platform: NodeJS.Platform = process.platform): Promise<string> => {
  if (platform === "darwin") {
    try {
      const { stdout } = await execFileAsync("/usr/sbin/scutil", ["--get", "ComputerName"], { timeout: 1000 });
      const name = stdout.trim();
      if (name) {
        return name;
      }
    } catch {
      // Fall back to the host name.
    }
  }
  return hostNameWithoutLocalSuffix();
};
