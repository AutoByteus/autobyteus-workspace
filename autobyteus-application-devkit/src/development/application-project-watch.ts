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

const watcherOptions = {
  ignoreInitial: true,
  // Native recursive file events are not reliable for dynamically replaced
  // directory roots on macOS. Poll only there; other platforms retain their
  // native watcher implementation.
  usePolling: process.platform === 'darwin',
  interval: 100,
  ignored: [
    /(^|[/\\])node_modules([/\\]|$)/,
    /(^|[/\\])\.autobyteus([/\\]|$)/,
    /(^|[/\\])dist([/\\]|$)/,
  ],
};

const awaitWatcherReady = async (watcher: FSWatcher): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    watcher.once('ready', resolve);
    watcher.once('error', reject);
  });
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
  let watcher: FSWatcher = watch(watchedPaths, watcherOptions);
  await awaitWatcherReady(watcher);

  let closed = false;
  let running = false;
  let pendingPath: string | null = null;
  const refresh = async (): Promise<void> => {
    if (closed) {
      return;
    }
    const nextPaths = await resolveApplicationProjectWatchPaths(projectRoot);
    if (nextPaths.length === watchedPaths.length &&
      nextPaths.every((candidate, index) => candidate === watchedPaths[index])) {
      return;
    }

    const replacement = watch(nextPaths, watcherOptions);
    replacement.on('all', (_eventName, changedPath) => schedule(changedPath));
    await awaitWatcherReady(replacement);
    const previous = watcher;
    watcher = replacement;
    watchedPaths = nextPaths;
    await previous.close();
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
