import { assertContainedContextFile, ContextFilePathUnavailableError } from "../../../context-files/services/context-file-path-validation.js";
import path from "node:path";
import { ContextFileDescriptorError, assertStoredFilename, parseFinalContextFileOwnerDescriptor } from "../../../context-files/domain/context-file-owner-types.js";
import type { CurrentRunPackage, CurrentContextFileOwner } from "../../../run-history/services/root-run-package-current-validator.js";
import { ContextFileRecordValidationError } from "../../../context-files/services/context-file-record-locators.js";

export class ContextFileReferenceUnavailableError extends Error {}
export const isContextFileReferenceUnavailable = (error: unknown): boolean =>
  error instanceof ContextFilePathUnavailableError || error instanceof ContextFileReferenceUnavailableError || error instanceof ContextFileRecordValidationError
  || error instanceof ContextFileDescriptorError || error instanceof URIError;

/** URI spelling is retained; only local app routes participate in conversion. */
export function localContextFileRoute(uri: string, baseUrl: string): { prefix: string; pathname: string; suffix: string; relative: boolean } | null {
  let prefix = "";
  if (/^https?:\/\//i.test(uri)) {
    let parsed: URL;
    try { parsed = new URL(uri); }
    catch { throw new ContextFileReferenceUnavailableError("Malformed HTTP(S) attachment URI."); }
    if (parsed.origin !== new URL(baseUrl).origin && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) return null;
    prefix = uri.match(/^https?:\/\/[^/?#]+/i)![0];
  } else if (!uri.startsWith("/rest/") && !uri.startsWith("rest/")) return null;
  const remainder = uri.slice(prefix.length);
  const cut = remainder.search(/[?#]/);
  const rawPath = cut < 0 ? remainder : remainder.slice(0, cut);
  return { prefix, pathname: rawPath.startsWith("rest/") ? `/${rawPath}` : rawPath,
    suffix: cut < 0 ? "" : remainder.slice(cut), relative: rawPath.startsWith("rest/") };
}

/** Uses unfiltered structural facts, never a location service/catalog or historical selector decoder. */
export class ContextFileCurrentLocatorValidator {
  private readonly owners: CurrentContextFileOwner[];
  constructor(private readonly memoryDir: string, private readonly baseUrl: string, groups: readonly CurrentRunPackage[]) {
    this.owners = groups.flatMap((group) => group.owners);
  }

  async validateLocator(uri: string): Promise<void> {
    const route = localContextFileRoute(uri, this.baseUrl);
    if (!route) return;
    const pathname = route.pathname;
    if (!/^\/rest\/(?:runs|team-runs|agent-org-runs|drafts)\//.test(pathname) || !pathname.includes("context-files")) return;
    const team = pathname.match(/^\/rest\/team-runs\/([^/]+)\/agent-runs\/([^/]+)\/context-files\/([^/]+)$/);
    const org = pathname.match(/^\/rest\/agent-org-runs\/([^/]+)\/agent-runs\/([^/]+)\/context-files\/([^/]+)$/);
    const standalone = pathname.match(/^\/rest\/runs\/([^/]+)\/context-files\/([^/]+)$/);
    const match = team ?? org ?? standalone;
    if (!match) throw new ContextFileReferenceUnavailableError("Unsupported current app-owned context-file locator.");
    const id = decodeURIComponent(match[1]!);
    const agentId = standalone ? id : decodeURIComponent(match[2]!);
    // The common safe execution-ID grammar is checked even for standalone owners.
    parseFinalContextFileOwnerDescriptor({kind: "team_member_final", teamRunId: id, agentRunId: agentId});
    const filename = assertStoredFilename(decodeURIComponent(match[standalone ? 2 : 3]!));
    const owners = this.owners.filter(({descriptor: owner}) => team ? owner.kind === "team_member_final" && owner.teamRunId === id && owner.agentRunId === agentId
      : org ? owner.kind === "org_member_final" && owner.orgRunId === id && owner.agentRunId === agentId
      : owner.kind === "agent_final" && owner.runId === id);
    if (owners.length !== 1) throw new ContextFileReferenceUnavailableError(`Current attachment owner is unavailable or ambiguous: '${id}/${agentId}'.`);
    const owner = owners[0]!;
    try { await assertContainedContextFile(this.memoryDir, path.join(owner.directory, "context_files", filename)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new ContextFileReferenceUnavailableError(`Current attachment file is missing for '${id}/${agentId}'.`);
      throw error;
    }
  }
}
