import path from 'node:path';
import { resolveApplicationDevelopmentProjectState } from './application-development-project-state.js';
import { packApplicationProjectAtomically } from './atomic-application-pack.js';
import { watchApplicationProject } from './application-project-watch.js';
import { waitForDevelopmentShutdown } from './development-process-lifetime.js';
import { StudioApplicationClient } from './studio-application-client.js';

export const runStudioDevelopmentSession = async (input: {
  projectRoot: string;
  studioUrl: string;
}): Promise<void> => {
  const projectRoot = path.resolve(input.projectRoot);
  const client = new StudioApplicationClient(input.studioUrl);
  const buildAndReload = async (): Promise<void> => {
    const state = await resolveApplicationDevelopmentProjectState(projectRoot);
    await packApplicationProjectAtomically({
      projectRoot,
      packageRoot: state.outputPackageRoot,
    });
    const selected = await client.ensureLocalPackage(
      state.outputPackageRoot,
      state.manifest.id,
    );
    await client.reloadApplication(selected.applicationId);
    console.log(`Studio package ready: ${selected.packageId}`);
  };
  await buildAndReload();
  console.log("Use Studio's “Reload application” action to remount the current application view.");
  const watcher = await watchApplicationProject({
    projectRoot,
    onChange: async (changedPath) => {
      console.log(`Application source changed: ${path.relative(projectRoot, changedPath)}`);
      await buildAndReload();
      console.log('Studio package reload complete; remount the view with “Reload application”.');
    },
  });
  await waitForDevelopmentShutdown(() => watcher.close());
};
