// External selected native tool writer for the Projects live browser probe.
// Runs against only the probe's disposable node root; requires the worktree server build.
import fs from 'node:fs/promises';
import { appConfigProvider } from '../../dist/config/app-config-provider.js';
import { defaultToolRegistry } from 'autobyteus-ts/tools/registry/tool-registry.js';
import { registerProjectTaskTools } from '../../dist/agent-tools/project-tasks/project-task-native-tools.js';
const [root, name, raw, output] = process.argv.slice(2);
if (!root || !['list_projects', 'list_project_tasks', 'create_or_update_task'].includes(name) || !output) throw new Error('Explicit owned root, selected tool and output required');
appConfigProvider.initialize({ appDataDir: root });
registerProjectTaskTools();
const result = await defaultToolRegistry.createTool(name).execute(null, JSON.parse(raw));
await fs.writeFile(output, result);
