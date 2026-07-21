import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ALLOWED_PARENT_KEYS = [
  'PATH', 'PATHEXT', 'SystemRoot', 'WINDIR', 'COMSPEC', 'LANG', 'LC_ALL', 'TERM',
] as const;

export const buildAgentChildEnvironment = (
  source: NodeJS.ProcessEnv = process.env,
  additions: Record<string, string> = {},
): NodeJS.ProcessEnv => {
  const sandboxHome = path.join(os.tmpdir(), 'autobyteus-agent-runtime');
  fs.mkdirSync(sandboxHome, { recursive: true, mode: 0o700 });
  const env: NodeJS.ProcessEnv = {
    HOME: sandboxHome,
    USERPROFILE: sandboxHome,
    TMPDIR: sandboxHome,
  };
  for (const key of ALLOWED_PARENT_KEYS) {
    const value = source[key];
    if (typeof value === 'string' && value.length > 0) env[key] = value;
  }
  for (const [key, value] of Object.entries(additions)) env[key] = value;
  return env;
};
