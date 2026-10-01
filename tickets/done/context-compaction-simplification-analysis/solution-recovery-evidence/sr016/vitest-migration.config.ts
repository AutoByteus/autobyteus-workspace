import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({plugins:[tsconfigPaths({projects:['./tsconfig.json']})],test:{environment:'node',pool:'forks',fileParallelism:false,include:['tests/unit/startup/compaction-model-settings-migration.test.ts']}});
