import type {
  TaskDelegationRecord,
  TaskDelegationReferenceFilePayload,
  TaskDelegationReferenceFileType,
  TaskDelegationTaskInput,
  TaskReferenceFile,
} from "./task-delegation-record.js";
import { getTaskDelegationTargetName } from "./task-delegation-target.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";

const normalizeReferencePath = (value: string): string => value.replace(/\\/g, "/").trim();

export const inferTaskDelegationReferenceFileType = (
  filePath: string,
): TaskDelegationReferenceFileType => {
  const lower = filePath.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return "image";
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) return "audio";
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return "video";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".csv")) return "csv";
  if (/\.(xlsx|xls)$/.test(lower)) return "excel";
  return "file";
};

export const buildTaskDelegationReferenceId = (
  index: number,
  filePath: string,
): string => `task-reference:${index}:${filePath}`;

export const normalizeTaskDelegationReferenceFiles = (
  rawReferenceFiles: readonly string[],
  timestamp: string,
): TaskReferenceFile[] => {
  const byPath = new Map<string, TaskReferenceFile>();
  rawReferenceFiles.forEach((rawPath, index) => {
    const normalizedPath = normalizeReferencePath(rawPath);
    if (!normalizedPath || byPath.has(normalizedPath)) return;
    byPath.set(normalizedPath, {
      referenceId: buildTaskDelegationReferenceId(index, normalizedPath),
      path: normalizedPath,
      type: inferTaskDelegationReferenceFileType(normalizedPath),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });
  return [...byPath.values()];
};

export const buildTaskDelegationReferenceFiles = (
  record: Pick<TaskDelegationRecord, "referenceFiles">,
): TaskDelegationReferenceFilePayload[] => record.referenceFiles.map((reference) => ({ ...reference }));

export const buildTaskDelegationArguments = (input: {
  target: TaskDelegationTarget;
  content: string;
  referenceFiles: readonly TaskReferenceFile[];
}): TaskDelegationTaskInput => ({
  target: {
    kind: input.target.kind,
    name: getTaskDelegationTargetName(input.target),
  },
  description: input.content,
  reference_files: input.referenceFiles.map((reference) => reference.path),
});
