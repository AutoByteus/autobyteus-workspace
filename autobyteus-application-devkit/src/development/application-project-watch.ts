import path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import { loadApplicationDevkitConfig } from '../config/load-application-devkit-config.js';

export const watchApplicationProject = async (input: {
  projectRoot: string;
  onChange: (changedPath: string) => Promise<void>;
}): Promise<FSWatcher> => {
  const projectRoot = path.resolve(input.projectRoot);
  const loaded = await loadApplicationDevkitConfig(projectRoot);
  const watchPaths = [
    path.join(projectRoot, 'application.json'),
    ...(loaded.configPath ? [loaded.configPath] : []),
    path.join(projectRoot, loaded.config.source.frontendDir),
    path.join(projectRoot, loaded.config.source.backendDir),
    path.join(projectRoot, loaded.config.source.agentsDir),
    path.join(projectRoot, loaded.config.source.agentTeamsDir),
  ];
  const watcher = watch(watchPaths, {
    ignoreInitial: true,
    ignored: [
      /(^|[/\\])node_modules([/\\]|$)/,
      /(^|[/\\])\.autobyteus([/\\]|$)/,
      /(^|[/\\])dist([/\\]|$)/,
    ],
  });
  let running = false;
  let pendingPath: string | null = null;
  const schedule = (changedPath: string): void => {
    pendingPath = changedPath;
    if (running) return;
    running = true;
    void (async () => {
      try {
        while (pendingPath) {
          const nextPath = pendingPath;
          pendingPath = null;
          await input.onChange(nextPath);
        }
      } finally {
        running = false;
      }
    })().catch((error) => {
      console.error(`Application rebuild failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  };
  watcher.on('all', (_eventName, changedPath) => schedule(changedPath));
  return watcher;
};
