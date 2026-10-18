import type { TaskAgentSection } from "./agent-run-metadata-types.js";
import { objectRecord } from "./run-execution-tree-shared-record-schemas.js";

/**
 * The exact, reversible change adoption makes to a hand-started run's own file (design SR-008, "Step 3 keeps
 * every fact and is exactly reversible"). Pure: raw JSON in, raw JSON out; every key not named here is kept.
 *
 * - Agent run (`run_metadata.json`): add the top-level `taskAgent` key; the inverse removes it.
 * - Team run (`team_run_execution_tree.json`): add `taskAgent` and rebase the address frame from `/` to the
 *   catalog address `A` (`rootTeam.address`, each member's address, `coordinatorAddress`, every handoff's
 *   addresses). Teams are flat, so the rebase is a prefix swap and its inverse is exact.
 */

type Json = Record<string, unknown>;

const ROOT = "/";

/** `/` → `A`, `/x` → `A/x`. */
const intoFrame = (address: unknown, frame: string, label: string): string => {
  if (typeof address !== "string" || !address.startsWith(ROOT)) throw new Error(`${label} is not a team address.`);
  return address === ROOT ? frame : `${frame}${address}`;
};

/** `A` → `/`, `A/x` → `/x`; an address outside `A` is not this team's. */
const outOfFrame = (address: unknown, frame: string, label: string): string => {
  if (address === frame) return ROOT;
  if (typeof address !== "string" || !address.startsWith(`${frame}/`)) throw new Error(`${label} is not inside '${frame}'.`);
  return address.slice(frame.length);
};

const rebaseTeamTree = (tree: Json, rebase: (address: unknown, label: string) => string): Json => {
  const rootTeam = objectRecord(tree.rootTeam, "rootTeam");
  const members = Array.isArray(rootTeam.members) ? rootTeam.members : [];
  const handoffs = Array.isArray(tree.handoffs) ? tree.handoffs : [];
  return {
    ...tree,
    handoffs: handoffs.map((handoff, index) => {
      const entry = objectRecord(handoff, `handoffs[${index}]`);
      return { ...entry, from: rebase(entry.from, `handoffs[${index}].from`), to: rebase(entry.to, `handoffs[${index}].to`) };
    }),
    rootTeam: {
      ...rootTeam,
      address: rebase(rootTeam.address, "rootTeam.address"),
      coordinatorAddress: rebase(rootTeam.coordinatorAddress, "rootTeam.coordinatorAddress"),
      members: members.map((member, index) => {
        const entry = objectRecord(member, `rootTeam.members[${index}]`);
        return { ...entry, address: rebase(entry.address, `rootTeam.members[${index}].address`) };
      }),
    },
  };
};

const withoutTaskAgent = (file: Json): Json => {
  const { taskAgent: _taskAgent, ...rest } = file;
  return rest;
};

/** An adopted agent run's `run_metadata.json`: the hand-started file plus `taskAgent`. */
export const adoptedAgentRunFile = (raw: unknown, section: TaskAgentSection): Json =>
  ({ ...withoutTaskAgent(objectRecord(raw, "run_metadata.json")), taskAgent: section });

/** An adopted team run's tree: rebased from `/` to `section.address`, plus `taskAgent`. */
export const adoptedTeamRunFile = (raw: unknown, section: TaskAgentSection): Json => {
  const tree = withoutTaskAgent(objectRecord(raw, "team_run_execution_tree.json"));
  return { ...rebaseTeamTree(tree, (address, label) => intoFrame(address, section.address, label)), taskAgent: section };
};

/** The inverse of `adoptedAgentRunFile`: the file without `taskAgent`. */
export const handStartedAgentRunFile = (raw: unknown): Json => withoutTaskAgent(objectRecord(raw, "run_metadata.json"));

/** The inverse of `adoptedTeamRunFile`: rebased back from `taskAgent.address` to `/`, without `taskAgent`. */
export const handStartedTeamRunFile = (raw: unknown): Json => {
  const tree = objectRecord(raw, "team_run_execution_tree.json");
  const frame = objectRecord(tree.taskAgent, "taskAgent").address;
  if (typeof frame !== "string") throw new Error("taskAgent.address is required.");
  return rebaseTeamTree(withoutTaskAgent(tree), (address, label) => outOfFrame(address, frame, label));
};
