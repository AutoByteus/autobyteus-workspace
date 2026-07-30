import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { packApplicationProject } from '../package/package-assembler.js';

export const packApplicationProjectAtomically = async (input: {
  projectRoot: string;
  packageRoot: string;
}): Promise<void> => {
  const packageRoot = path.resolve(input.packageRoot);
  const parent = path.dirname(packageRoot);
  const nonce = randomUUID();
  const stagingRoot = path.join(parent, `.pack-staging-${nonce}`);
  const previousRoot = path.join(parent, `.pack-previous-${nonce}`);
  await fs.mkdir(parent, { recursive: true });
  await fs.rm(stagingRoot, { recursive: true, force: true });
  await packApplicationProject({
    projectRoot: input.projectRoot,
    outputPackageRootOverride: stagingRoot,
    metadataPackageRootOverride: packageRoot,
  });
  let movedPrevious = false;
  try {
    await fs.rename(packageRoot, previousRoot);
    movedPrevious = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    await fs.rename(stagingRoot, packageRoot);
  } catch (error) {
    if (movedPrevious) {
      await fs.rename(previousRoot, packageRoot).catch(() => undefined);
    }
    throw error;
  }
  await fs.rm(previousRoot, { recursive: true, force: true });
};
