import { createHash } from "node:crypto";
import {
  createTeamExecutionAddress,
  serializeTeamExecutionAddress,
  type TeamExecutionAddress,
} from "../../agent-team-execution/domain/team-execution-address.js";

export type TokenUsageExecutionAddress = TeamExecutionAddress;
export const normalizeTokenUsageExecutionAddress = (value: unknown): TokenUsageExecutionAddress | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try { return createTeamExecutionAddress(value as never); } catch { return null; }
};
export const cloneTokenUsageExecutionAddress = createTeamExecutionAddress;
export const stableTokenUsageExecutionAddressKey = serializeTeamExecutionAddress;
export const hashedTokenUsageExecutionAddressKey = (address: TokenUsageExecutionAddress): string =>
  createHash("sha1").update(stableTokenUsageExecutionAddressKey(address)).digest("hex");
