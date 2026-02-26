import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export function loadEnv(): string | null {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '..', '..', '.env')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return candidate;
    }
  }

  return null;
}

export function resolveAutobyteusTsRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), 'autobyteus-ts'),
    path.resolve(process.cwd())
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'src'))) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), 'autobyteus-ts');
}

export function resolveExamplesRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), 'autobyteus-ts', 'examples'),
    path.resolve(process.cwd(), 'examples')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(resolveAutobyteusTsRoot(), 'examples');
}

export function resolveExamplePath(...segments: string[]): string {
  return path.join(resolveExamplesRoot(), ...segments);
}
