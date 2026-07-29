import path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import {
  loadApplicationDevkitConfig,
  resolveApplicationDevkitConfigPath,
} from '../config/load-application-devkit-config.js';

export type ApplicationProjectWatcher = {
  refresh: () => Promise<void>;
  close: () => Promise<void>;
  getWatchedPaths: () => readonly string[];
};

export const resolveApplicationProjectWatchPaths = async (
  projectRoot: string,
): Promise<string[]> => {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const loaded = await loadApplicationDevkitConfig(resolvedProjectRoot);
  return Array.from(new Set([
    path.join(resolvedProjectRoot, 'application.json'),
    resolveApplicationDevkitConfigPath(resolvedProjectRoot),
    path.join(resolvedProjectRoot, loaded.config.source.frontendDir),
    path.join(resolvedProjectRoot, loaded.config.source.backendDir),
    path.join(resolvedProjectRoot, loaded.config.source.agentsDir),
    path.join(resolvedProjectRoot, loaded.config.source.agentTeamsDir),
  ].map((candidate) => path.resolve(candidate)))).sort();
};

export const watchApplicationProject = async (input: {
  projectRoot: string;
  onChange: (changedPath: string) => Promise<void>;
}): Promise<ApplicationProjectWatcher> => {
  const projectRoot = path.resolve(input.projectRoot);
  let watchedPaths = await resolveApplicationProjectWatchPaths(projectRoot);
  const watcher: FSWatcher = watch(watchedPaths, {
    ignoreInitial: true,
    ignored: [
      /(^|[/\\])node_modules([/\\]|$)/,
      /(^|[/\\])\.autobyteus([/\\]|$)/,
      /(^|[/\\])dist([/\\]|$)/,
    ],
  });
  await new Promise<void>((resolve, reject) => {
    watcher.once('ready', resolve);
    watcher.once('error', reject);
  });

  let closed = false;
  let running = false;
  let pendingPath: string | null = null;
  const refresh = async (): Promise<void> => {
    if (closed) {
      return;
    }
    const nextPaths = await resolveApplicationProjectWatchPaths(projectRoot);
    const currentSet = new Set(watchedPaths);
    const nextSet = new Set(nextPaths);
    const removedPaths = watchedPaths.filter((candidate) => !nextSet.has(candidate));
    const addedPaths = nextPaths.filter((candidate) => !currentSet.has(candidate));
    if (removedPaths.length > 0) {
      await watcher.unwatch(removedPaths);
    }
    if (addedPaths.length > 0) {
      watcher.add(addedPaths);
    }
    watchedPaths = nextPaths;
  };
  const schedule = (changedPath: string): void => {
    pendingPath = changedPath;
    if (running) return;
    running = true;
    void (async () => {
      try {
        while (pendingPath) {
          const nextPath = pendingPath;
          pendingPath = null;
          try {
            await input.onChange(nextPath);
            await refresh();
          } catch (error) {
            console.error(
              `Application rebuild failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      } finally {
        running = false;
      }
    })();
  };
  watcher.on('all', (_eventName, changedPath) => schedule(changedPath));
  return {
    refresh,
    close: async () => {
      if (closed) {
        return;
      }
      closed = true;
      pendingPath = null;
      await watcher.close();
    },
    getWatchedPaths: () => [...watchedPaths],
  };
};
