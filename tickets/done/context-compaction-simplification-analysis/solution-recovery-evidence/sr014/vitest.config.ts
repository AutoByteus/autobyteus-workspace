import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({plugins:[tsconfigPaths({projects:['./tsconfig.json']})],test:{environment:'node',pool:'forks',fileParallelism:false,include:['../tickets/in-progress/context-compaction-simplification-analysis/solution-recovery-evidence/sr014/recovery-probes.test.ts']}});
