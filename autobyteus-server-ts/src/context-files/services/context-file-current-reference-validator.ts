import fs from "node:fs/promises";
import path from "node:path";
import { ContextFileDescriptorError, assertStoredFilename, parseFinalContextFileOwnerDescriptor } from "../domain/context-file-owner-types.js";
import type { CurrentRunPackage, CurrentContextFileOwner } from "../../run-history/services/root-run-package-current-validator.js";
import { ContextFileRecordValidationError, listContextFileRecordSources, transformContextFileRecordLocators } from "./context-file-record-locators.js";

export class ContextFileReferenceUnavailableError extends Error {}
export const isContextFileReferenceUnavailable = (error: unknown): boolean =>
  error instanceof ContextFileReferenceUnavailableError || error instanceof ContextFileRecordValidationError
  || error instanceof ContextFileDescriptorError || error instanceof URIError;

/** URI spelling is retained; only local app routes participate in package admission. */
export function localContextFileRoute(uri: string, baseUrl: string | (() => string)): { prefix: string; pathname: string; suffix: string; relative: boolean } | null {
  let prefix = "";
  if (/^https?:\/\//i.test(uri)) {
    let parsed: URL;
    try { parsed = new URL(uri); }
    catch { throw new ContextFileReferenceUnavailableError("Malformed HTTP(S) attachment URI."); }
    if (parsed.origin !== new URL(typeof baseUrl === "function" ? baseUrl() : baseUrl).origin && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) return null;
    prefix = uri.match(/^https?:\/\/[^/?#]+/i)![0];
  } else if (!uri.startsWith("/rest/") && !uri.startsWith("rest/")) return null;
  const remainder = uri.slice(prefix.length);
  const cut = remainder.search(/[?#]/);
  const rawPath = cut < 0 ? remainder : remainder.slice(0, cut);
  return { prefix, pathname: rawPath.startsWith("rest/") ? `/${rawPath}` : rawPath,
    suffix: cut < 0 ? "" : remainder.slice(cut), relative: rawPath.startsWith("rest/") };
}

export async function assertContainedContextRecord(memoryDir: string, file: string): Promise<void> {
  const root = await fs.realpath(memoryDir);
  const actual = await fs.realpath(file);
  if (actual !== path.resolve(root, path.relative(memoryDir, file)) || !actual.startsWith(`${root}${path.sep}`)
    || !(await fs.lstat(file)).isFile()) throw new ContextFileReferenceUnavailableError(`Not a contained regular context record: '${file}'.`);
}

/** Uses unfiltered structural facts, never a location service/catalog or historical selector decoder. */
export class ContextFileCurrentReferenceValidator {
  private readonly owners: CurrentContextFileOwner[];
  constructor(private readonly memoryDir: string, private readonly baseUrl: string | (() => string), groups: readonly CurrentRunPackage[]) {
    this.owners = groups.flatMap((group) => group.owners);
  }

  async validateLocator(uri: string, dependencies: Set<string>): Promise<void> {
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
    dependencies.add(owner.groupKey);
    try { await assertContainedContextRecord(this.memoryDir, path.join(owner.directory, "context_files", filename)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new ContextFileReferenceUnavailableError(`Current attachment file is missing for '${id}/${agentId}'.`);
      throw error;
    }
  }

  async validate(group: CurrentRunPackage, dependencies: Set<string>): Promise<void> {
    for (const source of await listContextFileRecordSources(group)) {
      await assertContainedContextRecord(this.memoryDir, source.filePath);
      await transformContextFileRecordLocators(source, await fs.readFile(source.filePath, "utf8"), async (uri) => {
        await this.validateLocator(uri, dependencies);
        return uri;
      });
    }
  }
}

/** Remove dependants to a fixed point; a cycle of otherwise valid packages stays admitted. */
export function closeUnavailableDependencies(
  dependencies: ReadonlyMap<string, ReadonlySet<string>>, unavailable: Set<string>,
  exclude: (key: string, dependency: string) => void,
): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const [key, refs] of dependencies) {
      if (unavailable.has(key)) continue;
      const dependency = [...refs].find((ref) => unavailable.has(ref));
      if (dependency) { unavailable.add(key); exclude(key, dependency); changed = true; }
    }
  }
}
