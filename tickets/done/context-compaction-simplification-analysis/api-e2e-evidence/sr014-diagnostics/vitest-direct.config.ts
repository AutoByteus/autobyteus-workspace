import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({plugins:[tsconfigPaths({projects:['./tsconfig.json']})],test:{environment:'node',pool:'forks',fileParallelism:false,include:['../tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/sr014-diagnostics/direct-diagnostics.test.ts']}});
