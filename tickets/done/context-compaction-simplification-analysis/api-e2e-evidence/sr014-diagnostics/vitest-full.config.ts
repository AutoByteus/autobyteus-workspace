import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({plugins:[tsconfigPaths({projects:['./tsconfig.json']})],test:{environment:'node',pool:'forks',fileParallelism:false,include:['tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts'],setupFiles:['../tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/sr014-diagnostics/full-observation-setup.ts']}});
