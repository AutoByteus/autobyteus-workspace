import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SharedMountBinding } from "./shared-workspace-binding.js";
export type SharedMountObservation = Pick<SharedMountBinding, "endpoint" | "export"> & { protocol: string };
const exec = promisify(execFile);
const unescapeMount = (value: string): string => value.replace(/\\([0-7]{3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));

export function parseLinuxSharedMount(mountinfo: string, root: string): SharedMountObservation | null {
  const row = mountinfo.split("\n").find(line => unescapeMount(line.split(" ")[4] ?? "") === root);
  if (!row) return null;
  const fields = row.split(" - ")[1]?.split(" ") ?? [];
  if (fields[0] !== "nfs" && fields[0] !== "nfs4") return null;
  const source = unescapeMount(fields[1] ?? "");
  const options = new Map((fields[2] ?? "").split(",").map(option => {
    const [key, value = ""] = option.split("="); return [key!, value];
  }));
  const separator = source.indexOf(":/");
  if (separator < 0) return null;
  // Docker's local driver may report :/export with the actual server in addr=.
  return { endpoint: options.get("addr") ?? source.slice(0, separator),
    export: source.slice(separator + 1), protocol: options.get("vers") ?? "" };
}

export function parseDarwinSharedMount(mounts: string, parameters: string, root: string): SharedMountObservation | null {
  const suffix = ` on ${root} (`;
  const row = mounts.split("\n").find(line => line.includes(suffix) && line.slice(line.indexOf(suffix)).includes("nfs"));
  if (!row) return null;
  const source = row.slice(0, row.indexOf(suffix));
  const separator = source.indexOf(":/");
  if (separator < 0) return null;
  // Use current, not original/requested mount options (Apple nfsstat -m).
  const current = parameters.split("Current mount parameters:")[1] ?? "";
  const protocol = /(?:[\s,])vers=([0-9.]+)(?:[,\s]|$)/.exec(current)?.[1] ?? "";
  return { endpoint: source.slice(0, separator), export: source.slice(separator + 1), protocol };
}

export async function observeSharedMount(binding: SharedMountBinding): Promise<SharedMountObservation | null> {
  if (process.platform === "linux") return parseLinuxSharedMount(await fs.readFile("/proc/self/mountinfo", "utf8"), binding.mountRoot);
  if (process.platform === "darwin") {
    const mounts = await exec("/sbin/mount", ["-t", "nfs"], { maxBuffer: 1024 * 1024 });
    if (!mounts.stdout.includes(` on ${binding.mountRoot} (`)) return null;
    const parameters = await exec("/usr/bin/nfsstat", ["-m", binding.mountRoot], { maxBuffer: 1024 * 1024 });
    return parseDarwinSharedMount(mounts.stdout, parameters.stdout, binding.mountRoot);
  }
  throw new Error("Shared NFS workspace admission is supported on macOS and Linux only.");
}
