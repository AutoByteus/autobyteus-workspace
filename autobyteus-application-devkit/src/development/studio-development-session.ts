import path from 'node:path';
import { loadApplicationDevkitConfig } from '../config/load-application-devkit-config.js';
import { readApplicationSourceManifest } from '../package/package-assembler.js';
import { packApplicationProjectAtomically } from './atomic-application-pack.js';
import { watchApplicationProject } from './application-project-watch.js';
import { waitForDevelopmentShutdown } from './development-process-lifetime.js';
import { StudioApplicationClient } from './studio-application-client.js';

export const runStudioDevelopmentSession = async (input: {
  projectRoot: string;
  studioUrl: string;
}): Promise<void> => {
  const projectRoot = path.resolve(input.projectRoot);
  const config = await loadApplicationDevkitConfig(projectRoot);
  const packageRoot = path.resolve(projectRoot, config.config.output.packageRoot);
  const manifest = await readApplicationSourceManifest(projectRoot);
  const client = new StudioApplicationClient(input.studioUrl);
  await packApplicationProjectAtomically({ projectRoot, packageRoot });
  const selected = await client.ensureLocalPackage(packageRoot, manifest.id);
  await client.reloadApplication(selected.applicationId);
  console.log(`Studio package ready: ${selected.packageId}`);
  console.log("Use Studio's “Reload application” action to remount the current application view.");
  const watcher = await watchApplicationProject({
    projectRoot,
    onChange: async (changedPath) => {
      console.log(`Application source changed: ${path.relative(projectRoot, changedPath)}`);
      await packApplicationProjectAtomically({ projectRoot, packageRoot });
      await client.reloadApplication(selected.applicationId);
      console.log('Studio package reload complete; remount the view with “Reload application”.');
    },
  });
  await waitForDevelopmentShutdown(() => watcher.close());
};
