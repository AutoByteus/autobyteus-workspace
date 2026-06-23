import type { MemorySyncJobState } from "./memory-sync-types.js";

export const normalizeMemorySyncJobState = (value: string | null | undefined): MemorySyncJobState => {
  switch (value) {
    case "running":
    case "success":
    case "error":
      return value;
    default:
      return "idle";
  }
};
