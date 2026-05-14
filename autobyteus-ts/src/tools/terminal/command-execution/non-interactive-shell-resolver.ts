import path from 'node:path';
import { accessSync, constants as fsConstants, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import {
  ensureWslAvailable,
  selectWslDistro,
  windowsPathToWsl
} from '../wsl-utils.js';
import { HOST_PROCESS_TARGET, type ProcessExecutionTarget } from './process-identity.js';

export type ShellInvocationKind = 'posix' | 'windows-wsl';

export interface NonInteractiveShellInvocation {
  executable: string;
  args: string[];
  cwd?: string;
  env: NodeJS.ProcessEnv;
  kind: ShellInvocationKind;
  processTarget: ProcessExecutionTarget;
  shellIdentityMarker?: string;
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
    const marker = `__AUTOBYTEUS_SHELL_ID_${randomBytes(4).toString('hex')}__`;
    const markedCommand =
      `__autobyteus_pgid="$(ps -o pgid= -p "$$" | tr -d ' ')"; ` +
      `if [ -z "$__autobyteus_pgid" ]; then __autobyteus_pgid="$$"; fi; ` +
      `printf '%s:%s:%s\\n' ${shellSingleQuote(marker)} "$$" "$__autobyteus_pgid" >&2; ` +
      command;

    return {
      executable: wslExe,
      args: ['-d', distro, '--cd', wslCwd, '--exec', 'bash', '--noprofile', '--norc', '-lc', markedCommand],
      env: { ...(this.options.env ?? process.env) },
      kind: 'windows-wsl',
      processTarget: { kind: 'wsl', wslExecutable: wslExe, distro },
      shellIdentityMarker: marker
    };
  }
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
