import path from 'node:path';
import { accessSync, constants as fsConstants, statSync } from 'node:fs';
import {
  ensureWslAvailable,
  selectWslDistro,
  windowsPathToWsl
} from '../wsl-utils.js';
import { HOST_PROCESS_TARGET, type ProcessExecutionTarget } from './process-identity.js';
import type { CommandShell } from './command-wrapper.js';

export type ShellInvocationKind = 'posix' | 'windows-wsl';

export interface NonInteractiveShellInvocation {
  executable: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
  kind: ShellInvocationKind;
  processTarget: ProcessExecutionTarget;
  wslCwd?: string;
  /** Set when the script is the command wrapper: the nonce of its control frames. */
  wrapperNonce?: string;
}

export interface NonInteractiveShellResolverOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  ensureWslAvailable?: () => string;
  selectWslDistro?: (wslExecutable: string) => string;
  windowsPathToWsl?: (inputPath: string, wslExecutable?: string) => string;
}

function isAndroidEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return process.platform === 'android' || Boolean(env.ANDROID_ROOT) || Boolean(env.ANDROID_DATA);
}

function findExecutable(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): string | null {
  const envPath = env.PATH ?? '';
  const segments = envPath.split(path.delimiter).filter(Boolean);
  const extensions = platform === 'win32'
    ? (env.PATHEXT?.split(';').filter(Boolean) ?? ['.EXE', '.CMD', '.BAT'])
    : [''];

  for (const dir of segments) {
    const base = path.join(dir, command);
    for (const ext of extensions) {
      const candidate = ext ? `${base}${ext}` : base;
      try {
        const stats = statSync(candidate);
        if (!stats.isFile()) {
          continue;
        }
        const accessMode = platform === 'win32' ? fsConstants.F_OK : fsConstants.X_OK;
        accessSync(candidate, accessMode);
        return candidate;
      } catch {
        // Keep searching PATH.
      }
    }
  }

  return null;
}

export class NonInteractiveShellResolver {
  constructor(private readonly options: NonInteractiveShellResolverOptions = {}) {}

  /** The shell `resolve` runs a script with: bash (WSL always), or the POSIX `sh` fallback without bash. */
  shell(): CommandShell {
    if ((this.options.platform ?? process.platform) === 'win32') return 'bash';
    return findExecutable('bash', this.options.env ?? process.env, this.options.platform ?? process.platform) ? 'bash' : 'sh';
  }

  /** A host file's path as the command's shell sees it (a WSL path on Windows). */
  shellPath(hostPath: string): string {
    if ((this.options.platform ?? process.platform) !== 'win32') return hostPath;
    const wslExe = this.options.ensureWslAvailable?.() ?? ensureWslAvailable();
    return this.options.windowsPathToWsl?.(hostPath, wslExe) ?? windowsPathToWsl(hostPath, wslExe);
  }

  resolve(command: string, cwd: string): NonInteractiveShellInvocation {
    if ((this.options.platform ?? process.platform) === 'win32') {
      return this.resolveWsl(command, cwd);
    }

    return this.resolvePosix(command, cwd);
  }

  private resolvePosix(command: string, cwd: string): NonInteractiveShellInvocation {
    const env = this.options.env ?? process.env;
    const platform = this.options.platform ?? process.platform;
    const bash = findExecutable('bash', env, platform);
    if (bash) {
      return {
        executable: bash,
        args: ['--noprofile', '--norc', '-lc', command],
        cwd,
        env: { ...env },
        kind: 'posix',
        processTarget: HOST_PROCESS_TARGET
      };
    }

    const shell = findExecutable('sh', env, platform) ?? (isAndroidEnvironment(env) ? '/system/bin/sh' : '/bin/sh');
    return {
      executable: shell,
      args: ['-c', command],
      cwd,
      env: { ...env },
      kind: 'posix',
      processTarget: HOST_PROCESS_TARGET
    };
  }

  private resolveWsl(command: string, cwd: string): NonInteractiveShellInvocation {
    const wslExe = this.options.ensureWslAvailable?.() ?? ensureWslAvailable();
    const distro = this.options.selectWslDistro?.(wslExe) ?? selectWslDistro(wslExe);
    const wslCwd = this.options.windowsPathToWsl?.(cwd, wslExe) ?? windowsPathToWsl(cwd, wslExe);

    return {
      executable: 'bash',
      args: ['--noprofile', '--norc', '-lc', command],
      wslCwd,
      env: { ...(this.options.env ?? process.env) },
      kind: 'windows-wsl',
      processTarget: { kind: 'wsl', wslExecutable: wslExe, distro },
    };
  }
}
