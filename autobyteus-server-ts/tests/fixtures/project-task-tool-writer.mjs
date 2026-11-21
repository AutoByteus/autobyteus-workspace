// External selected native tool writer for the Projects live browser probe.
// Runs against only the probe's disposable node root; requires the worktree server build.
import fs from 'node:fs/promises';
import { appConfigProvider } from '../../dist/config/app-config-provider.js';
import { defaultToolRegistry } from 'autobyteus-ts/tools/registry/tool-registry.js';
import { registerProjectTaskTools } from '../../dist/agent-tools/project-tasks/project-task-native-tools.js';
import { composeTaskSide } from '../../dist/compositions/collaboration-composition.js';
import { initializeProjectTaskServiceProcessInstance } from '../../dist/projects/services/project-task-service.js';
import { runIdentityOf } from '../../dist/agent-collaboration/execution/task/task-execution-resource-port.js';
const [root, name, raw, output] = process.argv.slice(2);
if (!root || !['list_projects', 'list_project_tasks', 'create_task', 'update_task'].includes(name) || !output) throw new Error('Explicit owned root, selected tool and output required');
appConfigProvider.initialize({ appDataDir: root });
// The process Task service is the composition's (autobyteus-500 FU-011: there is no lazy process instance). This tool-only
// process composes its Task side as a host does, with no running roots: no stop is asked, a run is its own top.
const side = await composeTaskSide({ appDataDir: appConfigProvider.config.getAppDataDir(), memoryDir: appConfigProvider.config.getMemoryDir() });
initializeProjectTaskServiceProcessInstance({ taskExecutionResources: side.resources, requestRelease: () => null, noticePeerRun: async () => undefined, workerStatus: () => null,
  topRun: runIdentityOf, displayName: () => null, searchCleanup: { forgetTask: () => undefined, forgetProject: () => undefined } });
registerProjectTaskTools();
const result = await defaultToolRegistry.createTool(name).execute(null, JSON.parse(raw));
await fs.writeFile(output, result);
