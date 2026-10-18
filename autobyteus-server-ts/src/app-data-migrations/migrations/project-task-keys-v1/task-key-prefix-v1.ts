/**
 * FROZEN copy of the Task key prefix rule and its uniqueness suffix from `projects/domain/task-keys.ts`
 * as released with `project-task-keys-v1`. The migration's plan must stay deterministic for the same
 * input even if the runtime rule changes later; current runtime code never imports this file.
 */
export const taskKeyPrefixOfV1 = (name: string): string => {
  const folded = name.toLowerCase().normalize("NFD").replace(/(\p{Script=Latin})\p{M}+/gu, "$1").normalize("NFC");
  return folded.replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "project";
};

export const uniqueTaskKeyPrefixV1 = (base: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

export const formatTaskKeyV1 = (prefix: string, taskNumber: number): string => `${prefix}-${taskNumber}`;
