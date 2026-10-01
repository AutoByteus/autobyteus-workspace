import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({plugins:[tsconfigPaths({projects:['./tsconfig.json']})],test:{environment:'node',pool:'forks',fileParallelism:false,include:['tests/unit/secret-management/live-e2e-compaction-observation.test.ts','../tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/sr014-diagnostics/instrumentation.test.ts']}});
