import { defaultToolRegistry } from './registry/tool-registry.js';
import { registerToolClass } from './tool-meta.js';
import { registerReadFileTool } from './file/read-file.js';
import { registerWriteFileTool } from './file/write-file.js';
import { registerEditFileTool } from './file/edit-file.js';
import { registerRunBashTool } from './terminal/tools/run-bash.js';
import { registerStartBackgroundProcessTool } from './terminal/tools/start-background-process.js';
import { registerGetBackgroundProcessesTool } from './terminal/tools/get-background-processes.js';
import { registerGetProcessOutputTool } from './terminal/tools/get-process-output.js';
import { registerStopBackgroundProcessTool } from './terminal/tools/stop-background-process.js';
import { Search } from './search-tool.js';
import { ReadMediaFile } from './multimedia/media-reader-tool.js';
import { DownloadMediaTool } from './multimedia/download-media-tool.js';
import { ReadUrl } from './web/read-url-tool.js';
import { AddToDo } from '../task-management/tools/todo-tools/add-todo.js';
import { CreateToDoList } from '../task-management/tools/todo-tools/create-todo-list.js';
import { GetToDoList } from '../task-management/tools/todo-tools/get-todo-list.js';
import { UpdateToDoStatus } from '../task-management/tools/todo-tools/update-todo-status.js';

let toolsRegistered = false;

export function registerTools(): void {
  if (toolsRegistered && defaultToolRegistry.listTools().length > 0) return;

  registerReadFileTool();
  registerWriteFileTool();
  registerEditFileTool();
  registerRunBashTool();
  registerStartBackgroundProcessTool();
  registerGetBackgroundProcessesTool();
  registerGetProcessOutputTool();
  registerStopBackgroundProcessTool();

  registerToolClass(Search);
  registerToolClass(ReadMediaFile);
  registerToolClass(DownloadMediaTool);
  registerToolClass(ReadUrl);
  registerToolClass(AddToDo);
  registerToolClass(CreateToDoList);
  registerToolClass(GetToDoList);
  registerToolClass(UpdateToDoStatus);

  toolsRegistered = true;
}
