import type {
  TaskDelegationRecord,
  TaskDelegationReferenceFilePayload,
  TaskDelegationReferenceFileType,
  TaskDelegationTaskInput,
} from "./task-delegation-record.js";
import { getTaskDelegationTargetName } from "./task-delegation-target.js";

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

export const buildTaskDelegationReferenceFiles = (
  record: Pick<TaskDelegationRecord, "referenceFiles" | "createdAt" | "updatedAt">,
): TaskDelegationReferenceFilePayload[] => {
  const byPath = new Map<string, TaskDelegationReferenceFilePayload>();
  record.referenceFiles.forEach((rawPath, index) => {
    const normalizedPath = normalizeReferencePath(rawPath);
    if (!normalizedPath || byPath.has(normalizedPath)) return;
    byPath.set(normalizedPath, {
      referenceId: buildTaskDelegationReferenceId(index, normalizedPath),
      path: normalizedPath,
      type: inferTaskDelegationReferenceFileType(normalizedPath),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt || record.createdAt,
    });
  });
  return [...byPath.values()];
};

export const buildTaskDelegationArguments = (
  record: Pick<TaskDelegationRecord, "target" | "description" | "referenceFiles" | "taskArguments">,
): TaskDelegationTaskInput => ({
  target: {
    kind: record.taskArguments.target.kind,
    name: record.taskArguments.target.name || getTaskDelegationTargetName(record.target),
  },
  description: record.taskArguments.description || record.description,
  reference_files: [...(record.taskArguments.reference_files ?? record.referenceFiles)],
});
