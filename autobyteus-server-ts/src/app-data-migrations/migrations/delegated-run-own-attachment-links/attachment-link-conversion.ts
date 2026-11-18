import fs from "node:fs";
import path from "node:path";
import { assertStoredFilename } from "../../frozen/server/context-files/domain/context-file-owner-types.js";

/**
 * The one fixed mapping of `20261119_delegated_run_own_attachment_links` (design M-2, M-3): a stored link that named a
 * delegated child through the run that hosted it, `/rest/agent-collaborations/{host}/agent-runs/{child}/context-files/{file}`,
 * becomes the child's own link, derived from the folder that holds the trace:
 * - `memory/agents/{child}/` → `/rest/runs/{child}/context-files/{file}`;
 * - `memory/agent_teams/…/{team}/{child}/` → `/rest/team-runs/{team}/agent-runs/{child}/context-files/{file}` (its
 *   parent folder is its containing team run).
 * Admission checks both ends of the reference: the link's child is the folder's own run, and the file is in the
 * folder's `context_files/` under a valid stored name. The host is not checked: it can be any ancestor (the old hosted
 * tree's top); the folder and the file prove the owner.
 */

/**
 * The bytes every host-scoped attachment link contains (the pre-check, M-4). A string is one when it also names
 * `/context-files/`: the exact final form, or another (a draft, an absolute URL). The kept references route
 * (`/rest/agent-collaborations/:runId/communication/…`) is not an attachment link.
 */
export const HOST_SCOPED_MARKER = "/agent-collaborations/";
const isHostScopedAttachmentLink = (link: string): boolean => link.includes(HOST_SCOPED_MARKER) && link.includes("/context-files/");
const SOURCE = /^\/rest\/agent-collaborations\/([^/?#]+)\/agent-runs\/([^/?#]+)\/context-files\/([^/?#]+)$/;

/** Where a scanned trace file's links are owned: an agent run's own folder, or a team member's folder. */
export type LinkOwnerFolder =
  | Readonly<{ kind: "agent_run"; folder: string; runId: string }>
  | Readonly<{ kind: "team_member"; folder: string; teamRunId: string; agentRunId: string }>;

export type LinkConversion =
  | Readonly<{ kind: "not_host_scoped" }>
  | Readonly<{ kind: "converted"; target: string }>
  | Readonly<{ kind: "unconvertible"; reason: string }>;

const decode = (segment: string): string | null => {
  try { return decodeURIComponent(segment); } catch { return null; }
};

const ownRunIdOf = (owner: LinkOwnerFolder): string => owner.kind === "agent_run" ? owner.runId : owner.agentRunId;

const targetOf = (owner: LinkOwnerFolder, file: string): string => owner.kind === "agent_run"
  ? `/rest/runs/${encodeURIComponent(owner.runId)}/context-files/${encodeURIComponent(file)}`
  : `/rest/team-runs/${encodeURIComponent(owner.teamRunId)}/agent-runs/${encodeURIComponent(owner.agentRunId)}/context-files/${encodeURIComponent(file)}`;

const isFile = (filePath: string): boolean => {
  try { return fs.statSync(filePath).isFile(); } catch { return false; }
};

/** The conversion of one stored locator string held by a trace file in `owner`'s folder. */
export const convertAttachmentLink = (link: string, owner: LinkOwnerFolder): LinkConversion => {
  if (!isHostScopedAttachmentLink(link)) return { kind: "not_host_scoped" };
  const match = SOURCE.exec(link);
  if (!match) return { kind: "unconvertible", reason: "not the stored final link form (a draft or an absolute URL)" };
  const child = decode(match[2]!);
  const file = decode(match[3]!);
  if (child === null || file === null) return { kind: "unconvertible", reason: "a segment is not valid URL encoding" };
  if (child !== ownRunIdOf(owner)) return { kind: "unconvertible", reason: `its child '${child}' is not this folder's run` };
  try { assertStoredFilename(file); } catch { return { kind: "unconvertible", reason: "its file name is not a stored context-file name" }; }
  if (!isFile(path.join(owner.folder, "context_files", file))) return { kind: "unconvertible", reason: "its file is not in this run's context_files" };
  return { kind: "converted", target: targetOf(owner, file) };
};
