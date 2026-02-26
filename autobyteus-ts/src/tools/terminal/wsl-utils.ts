import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { accessSync } from 'node:fs';

const WSL_MISSING_MESSAGE =
  'WSL is not available. Install it with `wsl --install` and reboot, then ensure a Linux distro is installed.';

function decodeWslBytes(raw: Buffer): string {
  if (!raw || raw.length === 0) {
    return '';
  }
  if (raw.includes(0)) {
    return raw.toString('utf16le');
  }
  return raw.toString('utf8');
}

function fileExists(candidate: string): boolean {
  try {
    accessSync(candidate);
    return true;
  } catch {
    return false;
  }
}

function which(command: string): string | null {
  const envPath = process.env.PATH ?? '';
  const parts = envPath.split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT?.split(';').filter(Boolean) ?? ['.EXE', '.CMD', '.BAT'])
    : [''];

  for (const dir of parts) {
    if (!dir) {
      continue;
    }
    if (process.platform === 'win32') {
      const base = path.join(dir, command);
      if (fileExists(base)) {
        return base;
      }
      for (const ext of extensions) {
        const candidate = base.endsWith(ext) ? base : `${base}${ext}`;
        if (fileExists(candidate)) {
          return candidate;
        }
      }
    } else {
      const candidate = path.join(dir, command);
      if (fileExists(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

export function findWslExecutable(): string | null {
  return which('wsl.exe') ?? which('wsl');
}

export function ensureWslAvailable(): string {
  const wslExe = findWslExecutable();
  if (!wslExe) {
    throw new Error(WSL_MISSING_MESSAGE);
  }
  return wslExe;
}

export function listWslDistros(wslExe: string): string[] {
  const result = spawnSync(wslExe, ['-l', '-q'], { encoding: 'buffer', timeout: 5000 });
  if (result.status !== 0) {
    return [];
  }
  const output = decodeWslBytes(result.stdout ?? Buffer.alloc(0));
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function getDefaultWslDistro(wslExe: string): string | null {
  const result = spawnSync(wslExe, ['-l', '-v'], { encoding: 'buffer', timeout: 5000 });
  if (result.status !== 0) {
    return null;
  }
  const output = decodeWslBytes(result.stdout ?? Buffer.alloc(0));
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('*')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        return parts[1];
      }
    }
  }
  return null;
}

export function ensureWslDistroAvailable(wslExe: string): void {
  const distros = listWslDistros(wslExe);
  if (distros.length === 0) {
    throw new Error(
      'No WSL distro is installed. Run `wsl --install` or install a distro from the Microsoft Store.'
    );
  }
}

export function selectWslDistro(wslExe: string): string {
  const distros = listWslDistros(wslExe);
  if (distros.length === 0) {
    throw new Error(
      'No WSL distro is installed. Run `wsl --install` or install a distro from the Microsoft Store.'
    );
  }

  const defaultDistro = getDefaultWslDistro(wslExe);
  const excluded = new Set(['docker-desktop', 'docker-desktop-data']);

  if (defaultDistro && !excluded.has(defaultDistro)) {
    return defaultDistro;
  }

  for (const distro of distros) {
    if (distro && !excluded.has(distro)) {
      return distro;
    }
  }

  return defaultDistro ?? distros[0];
}

function runWslpath(wslExe: string, inputPath: string): string | null {
  const result = spawnSync(wslExe, ['wslpath', '-a', '-u', inputPath], { encoding: 'buffer', timeout: 5000 });
  if (result.status !== 0) {
    return null;
  }
  const output = decodeWslBytes(result.stdout ?? Buffer.alloc(0)).trim();
  return output || null;
}

function manualWindowsPathToWsl(inputPath: string): string {
  const parsed = path.win32.parse(inputPath);
  if (!parsed.root) {
    throw new Error(`Unsupported Windows path format: ${inputPath}`);
  }

  const drive = parsed.root.replace(/[:\\]+/g, '').toLowerCase();
  const tail = inputPath.slice(parsed.root.length).replace(/\\/g, '/');
  if (tail) {
    return `/mnt/${drive}/${tail}`;
  }
  return `/mnt/${drive}`;
}

export function windowsPathToWsl(inputPath: string, wslExe?: string): string {
  if (!inputPath) {
    throw new Error('Path must be a non-empty string.');
  }
  if (inputPath.startsWith('/')) {
    return inputPath;
  }
  if (inputPath.startsWith('\\\\')) {
    throw new Error('UNC paths are not supported for WSL conversion.');
  }

  const exe = wslExe ?? ensureWslAvailable();
  const converted = runWslpath(exe, inputPath);
  if (converted) {
    return converted;
  }

  return manualWindowsPathToWsl(inputPath);
}
