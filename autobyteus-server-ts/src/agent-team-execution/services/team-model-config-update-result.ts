import {
  runModelConfigEditability,
  type RunModelConfigUpdateResult,
} from "../../run-history/domain/run-model-config.js";
import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";

type TeamModelConfigUpdateResult = RunModelConfigUpdateResult<TeamRunExecutionTreeSnapshot | null>;

/** The answer of a stopped Team run's model-settings Save (moved out of `AgentTeamRunManager` for its size). */
export const teamModelConfigUpdateResult = (
  outcome: TeamModelConfigUpdateResult["outcome"],
  message: string,
  tree: TeamRunExecutionTreeSnapshot | null,
  isActive: boolean,
  archived = false,
  fieldErrors: TeamModelConfigUpdateResult["fieldErrors"] = [],
): TeamModelConfigUpdateResult => Object.freeze({
  success: outcome === "UPDATED" || outcome === "UNCHANGED",
  outcome,
  message,
  isActive,
  editability: runModelConfigEditability({ isActive, archived, available: outcome !== "NOT_FOUND" }),
  canonical: tree,
  fieldErrors: Object.freeze([...fieldErrors]),
});
