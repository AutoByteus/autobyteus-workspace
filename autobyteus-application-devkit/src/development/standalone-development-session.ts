import path from 'node:path';
import {
  startStandaloneApplicationHost,
  type StandaloneApplicationHostHandle,
} from 'autobyteus-server-ts';
import { readApplicationSourceManifest } from '../package/package-assembler.js';
import { packApplicationProjectAtomically } from './atomic-application-pack.js';
import { watchApplicationProject } from './application-project-watch.js';
import { openDevelopmentBrowser } from './open-development-browser.js';
import {
  closeWithinTimeout,
  waitForDevelopmentShutdown,
} from './development-process-lifetime.js';

export const runStandaloneDevelopmentSession = async (input: {
  projectRoot: string;
  host: string;
  port: number;
  publicBaseUrl: string | null;
  openBrowser: boolean;
}): Promise<void> => {
  const projectRoot = path.resolve(input.projectRoot);
  const packageRoot = path.join(projectRoot, '.autobyteus', 'dev', 'package');
  const appDataDir = path.join(projectRoot, '.autobyteus', 'dev', 'data');
  const manifest = await readApplicationSourceManifest(projectRoot);
  let hostHandle: StandaloneApplicationHostHandle | null = null;
  const buildAndStart = async (): Promise<void> => {
    if (hostHandle) {
      await closeWithinTimeout(hostHandle.close, 'Standalone development host');
      hostHandle = null;
    }
    await packApplicationProjectAtomically({ projectRoot, packageRoot });
    hostHandle = await startStandaloneApplicationHost({
      packageRoot,
      localApplicationId: manifest.id,
      appDataDir,
      host: input.host,
      port: input.port,
      publicBaseUrl: input.publicBaseUrl,
    });
    console.log(`Standalone application ready: ${hostHandle.url}`);
    if (input.openBrowser) openDevelopmentBrowser(hostHandle.url);
  };
  await buildAndStart();
  const watcher = await watchApplicationProject({
    projectRoot,
    onChange: async (changedPath) => {
      console.log(`Application source changed: ${path.relative(projectRoot, changedPath)}`);
      await buildAndStart();
    },
  });
  await waitForDevelopmentShutdown(async () => {
    await watcher.close();
    await hostHandle?.close();
  });
};
