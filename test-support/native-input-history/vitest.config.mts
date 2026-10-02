import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webConfig from '../../autobyteus-web/vitest.config.mts';

const harnessRoot = path.dirname(fileURLToPath(import.meta.url));

// Workspace-owned integration composes native/server and renderer boundaries.
// Reuse the renderer's Nuxt test environment, not a web import of this harness.
export default async (...args: Parameters<typeof webConfig>) => {
  const config = await webConfig(...args);
  return {
    ...config,
    resolve: {
      ...config.resolve,
      // Resolve shared test dependencies from the reused web tooling root.
      // Core stays an explicit import in this workspace harness, never an alias.
      dedupe: [
        ...(config.resolve?.dedupe ?? []),
        'vitest', 'pinia', 'reflect-metadata', '@autobyteus/collaboration-stream-contracts',
      ],
    },
    test: {
      ...config.test,
      include: [path.join(harnessRoot, '*.integration.test.ts')],
    },
  };
};
