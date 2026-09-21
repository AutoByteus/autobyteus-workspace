import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({ plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })], test: { environment: 'node', include: ['tests/unit/collaboration-definition-admission/org-avatar-delete.test.ts'] } });
