import { spawn } from "node:child_process";

/** Labels on every sandbox container (C6): which sandbox it is, and which host node created it. */
export const SANDBOX_LABEL = "autobyteus.sandbox";
export const SANDBOX_HOST_LABEL = "autobyteus.sandbox.host";

/** The container name of a sandbox. */
export const sandboxContainerName = (sandboxId: string): string => `autobyteus-${sandboxId}`;

/** One `docker` command's outcome; output is capped at `maxOutputBytes` per stream. */
export type DockerCommandResult = Readonly<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  timedOut: boolean;
}>;

/** What a sandbox container starts with (C8): never a key, token, credential or peer secret. */
export type SandboxContainerSpec = Readonly<{
  sandboxId: string;
  hostNodeId: string;
  image: string;
  hostPort: number;
  memory: string;
  cpus: string;
  /** Host folder → container folder, with read-only for shared folders. */
  mounts: readonly Readonly<{ hostPath: string; containerPath: string; readOnly: boolean }>[];
  /** Fresh anonymous volumes (data, `/root`, server packages): removed with the container. */
  anonymousVolumes: readonly string[];
  environment: Readonly<Record<string, string>>;
}>;

const DEFAULT_OUTPUT_CAP = 64 * 1024;

/**
 * The host's Docker (the only owner of Docker calls). Every command is an argument list for the `docker` CLI, never a
 * shell string. Values in a container's environment are passed by name from this process's environment
 * (`-e NAME`), so they never appear in a command line.
 */
export class SandboxDocker {
  constructor(private readonly options: Readonly<{ command?: string }> = {}) {}

  /** Whether a Docker daemon answers, and what it is (`Docker Desktop` on macOS). */
  async info(): Promise<Readonly<{ available: boolean; operatingSystem: string | null }>> {
    const result = await this.run(["info", "--format", "{{.OperatingSystem}}"], { timeoutMs: 15_000 });
    return result.exitCode === 0
      ? { available: true, operatingSystem: result.stdout.trim() || null }
      : { available: false, operatingSystem: null };
  }

  /** Starts one sandbox container (detached); the result's stderr tells why when it fails (an unknown image). */
  startContainer(spec: SandboxContainerSpec): Promise<DockerCommandResult> {
    const args = [
      "run", "-d", "--name", sandboxContainerName(spec.sandboxId),
      "--label", `${SANDBOX_LABEL}=${spec.sandboxId}`, "--label", `${SANDBOX_HOST_LABEL}=${spec.hostNodeId}`,
      "-p", `127.0.0.1:${spec.hostPort}:8000`,
      "--memory", spec.memory, "--cpus", spec.cpus,
    ];
    for (const mount of spec.mounts) {
      args.push("--mount", `type=bind,src=${mount.hostPath},dst=${mount.containerPath}${mount.readOnly ? ",readonly" : ""}`);
    }
    for (const volume of spec.anonymousVolumes) args.push("-v", volume);
    for (const name of Object.keys(spec.environment)) args.push("-e", name);
    args.push(spec.image);
    return this.run(args, { timeoutMs: 15 * 60_000, env: spec.environment });
  }

  /** Runs an argument list inside a running sandbox; the docker client is stopped at the time limit. */
  exec(sandboxId: string, argv: readonly string[], options: Readonly<{ timeoutMs: number; maxOutputBytes?: number }>): Promise<DockerCommandResult> {
    return this.run(["exec", sandboxContainerName(sandboxId), ...argv], options);
  }

  /** Copies a host folder into the container (`docker cp`, the copy belongs to the container). */
  async copyInto(sandboxId: string, hostPath: string, containerPath: string): Promise<void> {
    const result = await this.run(["cp", `${hostPath}/.`, `${sandboxContainerName(sandboxId)}:${containerPath}`], { timeoutMs: 5 * 60_000 });
    if (result.exitCode !== 0) throw new Error(`docker cp failed: ${result.stderr.trim().slice(0, 300)}`);
  }

  /** Makes a folder in the container. */
  async makeDirectory(sandboxId: string, containerPath: string): Promise<void> {
    const result = await this.exec(sandboxId, ["mkdir", "-p", containerPath], { timeoutMs: 30_000 });
    if (result.exitCode !== 0) throw new Error(`mkdir in the sandbox failed: ${result.stderr.trim().slice(0, 300)}`);
  }

  /** Removes the container with its anonymous volumes; an absent container is already removed. */
  async remove(sandboxId: string): Promise<void> {
    const result = await this.run(["rm", "-f", "-v", sandboxContainerName(sandboxId)], { timeoutMs: 120_000 });
    if (result.exitCode !== 0 && !/No such container/i.test(result.stderr)) {
      throw new Error(`docker rm failed: ${result.stderr.trim().slice(0, 300)}`);
    }
  }

  /** The sandbox IDs of every container labelled as created by this host node, running or not. */
  async listHostSandboxes(hostNodeId: string): Promise<readonly string[]> {
    const result = await this.run(["ps", "-a", "--filter", `label=${SANDBOX_HOST_LABEL}=${hostNodeId}`,
      "--format", `{{.Label "${SANDBOX_LABEL}"}}`], { timeoutMs: 30_000 });
    if (result.exitCode !== 0) throw new Error(`docker ps failed: ${result.stderr.trim().slice(0, 300)}`);
    return result.stdout.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  }

  private run(
    args: readonly string[],
    options: Readonly<{ timeoutMs: number; maxOutputBytes?: number; env?: Readonly<Record<string, string>> }>,
  ): Promise<DockerCommandResult> {
    const cap = options.maxOutputBytes ?? DEFAULT_OUTPUT_CAP;
    return new Promise((resolve) => {
      const child = spawn(this.options.command ?? "docker", [...args], {
        env: { ...process.env, ...(options.env ?? {}) },
        stdio: ["ignore", "pipe", "pipe"],
      });
      const out = { stdout: [] as Buffer[], stderr: [] as Buffer[], sizes: { stdout: 0, stderr: 0 }, truncated: false };
      const collect = (stream: "stdout" | "stderr") => (chunk: Buffer) => {
        const room = cap - out.sizes[stream];
        if (room <= 0) { out.truncated = true; return; }
        if (chunk.length > room) out.truncated = true;
        const kept = chunk.subarray(0, room);
        out[stream].push(kept);
        out.sizes[stream] += kept.length;
      };
      child.stdout.on("data", collect("stdout"));
      child.stderr.on("data", collect("stderr"));
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, options.timeoutMs);
      const finish = (exitCode: number | null, error?: Error) => {
        clearTimeout(timer);
        resolve(Object.freeze({
          exitCode,
          stdout: Buffer.concat(out.stdout).toString("utf8"),
          stderr: error ? error.message : Buffer.concat(out.stderr).toString("utf8"),
          truncated: out.truncated,
          timedOut,
        }));
      };
      child.once("error", (error) => finish(null, error));
      child.once("close", (code) => finish(timedOut ? null : code));
    });
  }
}
