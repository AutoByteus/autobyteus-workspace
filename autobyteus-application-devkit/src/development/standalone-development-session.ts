import path from 'node:path';
import {
  startStandaloneApplicationHost,
  type StandaloneApplicationHostHandle,
} from 'autobyteus-server-ts';
import { resolveApplicationDevelopmentProjectState } from './application-development-project-state.js';
import { packApplicationProjectAtomically } from './atomic-application-pack.js';
import { watchApplicationProject } from './application-project-watch.js';
import {
  openDevelopmentBrowserSession,
  type DevelopmentBrowserSession,
} from './development-browser-session.js';
import {
  closeWithinTimeout,
  waitForDevelopmentShutdown,
} from './development-process-lifetime.js';

export const runStandaloneDevelopmentSession = async (input: {
  projectRoot: string;
  host: string;
  portOverride: number | null;
  publicBaseUrl: string | null;
  openBrowser: boolean;
}): Promise<void> => {
  const projectRoot = path.resolve(input.projectRoot);
  const packageRoot = path.join(projectRoot, '.autobyteus', 'dev', 'package');
  const appDataDir = path.join(projectRoot, '.autobyteus', 'dev', 'data');
  let hostHandle: StandaloneApplicationHostHandle | null = null;
  let browserSession: DevelopmentBrowserSession | null = null;
  let watcher: Awaited<ReturnType<typeof watchApplicationProject>> | null = null;
  let closePromise: Promise<void> | null = null;
  const closeSession = (): Promise<void> => {
    closePromise ??= (async () => {
      await watcher?.close();
      try {
        await browserSession?.close();
      } finally {
        await hostHandle?.close();
      }
    })();
    return closePromise;
  };
  const buildAndStart = async (reloadBrowser: boolean): Promise<void> => {
    if (hostHandle) {
      await closeWithinTimeout(hostHandle.close, 'Standalone development host');
      hostHandle = null;
    }
    await packApplicationProjectAtomically({ projectRoot, packageRoot });
    const state = await resolveApplicationDevelopmentProjectState(projectRoot);
    hostHandle = await startStandaloneApplicationHost({
      packageRoot,
      localApplicationId: state.manifest.id,
      appDataDir,
      host: input.host,
      port: input.portOverride ?? state.config.config.dev.port,
      publicBaseUrl: input.publicBaseUrl,
    });
    console.log(`Standalone application ready: ${hostHandle.url}`);
    if (input.openBrowser) {
      if (browserSession && reloadBrowser) {
        await browserSession.reload(hostHandle.url);
      } else if (!browserSession) {
        browserSession = await openDevelopmentBrowserSession(hostHandle.url);
      }
    }
  };
  try {
    await buildAndStart(false);
    watcher = await watchApplicationProject({
      projectRoot,
      onChange: async (changedPath) => {
        console.log(`Application source changed: ${path.relative(projectRoot, changedPath)}`);
        await buildAndStart(true);
      },
    });
    await waitForDevelopmentShutdown(closeSession);
  } catch (error) {
    await closeSession();
    throw error;
  }
};
