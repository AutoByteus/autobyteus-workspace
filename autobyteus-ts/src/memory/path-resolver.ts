import path from 'node:path';

type ResolveMemoryBaseDirOptions = {
  env?: NodeJS.ProcessEnv;
  overrideDir?: string | null;
  fallbackDir?: string;
};

export const resolveMemoryBaseDir = (options: ResolveMemoryBaseDirOptions = {}): string => {
  const overrideDir = options.overrideDir?.trim();
  if (overrideDir) {
    return overrideDir;
  }

  const env = options.env ?? process.env;
  const envValue = env.AUTOBYTEUS_MEMORY_DIR?.trim();
  if (envValue) {
    return envValue;
  }

  return options.fallbackDir ?? path.join(process.cwd(), 'memory');
};

export const resolveAgentMemoryDir = (baseDir: string, agentId: string): string =>
  path.join(baseDir, 'agents', agentId);
