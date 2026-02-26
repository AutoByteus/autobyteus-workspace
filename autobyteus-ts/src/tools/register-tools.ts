import { defaultToolRegistry } from './registry/tool-registry.js';
import { registerToolClass } from './tool-meta.js';
import { registerReadFileTool } from './file/read-file.js';
import { registerWriteFileTool } from './file/write-file.js';
import { registerEditFileTool } from './file/edit-file.js';
import { registerLoadSkillTool } from './skill/load-skill.js';
import { registerRunBashTool } from './terminal/tools/run-bash.js';
import { registerStartBackgroundProcessTool } from './terminal/tools/start-background-process.js';
import { registerGetProcessOutputTool } from './terminal/tools/get-process-output.js';
import { registerStopBackgroundProcessTool } from './terminal/tools/stop-background-process.js';
import { SendMessageTo } from '../agent/message/send-message-to.js';
import { Search } from './search-tool.js';
import { GenerateImageTool, EditImageTool } from './multimedia/image-tools.js';
import { GenerateSpeechTool } from './multimedia/audio-tools.js';
import { ReadMediaFile } from './multimedia/media-reader-tool.js';
import { DownloadMediaTool } from './multimedia/download-media-tool.js';
import { ReadUrl } from './web/read-url-tool.js';
import { AssignTaskTo } from '../task-management/tools/task-tools/assign-task-to.js';
import { CreateTasks } from '../task-management/tools/task-tools/create-tasks.js';
import { CreateTask } from '../task-management/tools/task-tools/create-task.js';
import { GetMyTasks } from '../task-management/tools/task-tools/get-my-tasks.js';
import { GetTaskPlanStatus } from '../task-management/tools/task-tools/get-task-plan-status.js';
import { UpdateTaskStatus } from '../task-management/tools/task-tools/update-task-status.js';
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
  registerLoadSkillTool();
  registerRunBashTool();
  registerStartBackgroundProcessTool();
  registerGetProcessOutputTool();
  registerStopBackgroundProcessTool();

  registerToolClass(Search);
  registerToolClass(GenerateImageTool);
  registerToolClass(EditImageTool);
  registerToolClass(GenerateSpeechTool);
  registerToolClass(ReadMediaFile);
  registerToolClass(DownloadMediaTool);
  registerToolClass(ReadUrl);
  registerToolClass(SendMessageTo);
  registerToolClass(AssignTaskTo);
  registerToolClass(CreateTasks);
  registerToolClass(CreateTask);
  registerToolClass(GetMyTasks);
  registerToolClass(GetTaskPlanStatus);
  registerToolClass(UpdateTaskStatus);
  registerToolClass(AddToDo);
  registerToolClass(CreateToDoList);
  registerToolClass(GetToDoList);
  registerToolClass(UpdateToDoStatus);

  toolsRegistered = true;
}
