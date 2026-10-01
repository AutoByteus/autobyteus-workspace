import { assertContainedContextFile } from "../../../context-files/services/context-file-path-validation.js";
import path from "node:path";
import { assertStoredFilename, buildFinalContextFileLocator, parseFinalContextFileOwnerDescriptor } from "../../../context-files/domain/context-file-owner-types.js";
import { listContextFileRecordSources, transformContextFileRecordLocators, type ContextFileRecordSource } from "../../../context-files/services/context-file-record-locators.js";

import { RootRunPackageCurrentValidator, type CurrentRunPackage, type RootRunPackageReadinessDiagnostic } from "../../../run-history/services/root-run-package-current-validator.js";
import { ContextFileCurrentLocatorValidator, ContextFileReferenceUnavailableError, localContextFileRoute } from "./context-file-current-locator-validator.js";
type Owner = { teamRunId: string; agentRunId: string; address: string; directory: string; groupKey: string };
export type TransitionGroup = { current: CurrentRunPackage; sources: ContextFileRecordSource[] };

/** No historical selectors escape this startup-only converter. */
export class TeamContextFileLocatorTransition {
  private readonly owners: Owner[] = [];
  readonly groups: TransitionGroup[] = [];
  readonly diagnostics: RootRunPackageReadinessDiagnostic[] = [];
  private currentValidator!: ContextFileCurrentLocatorValidator;
  constructor(private readonly memoryDir: string, private readonly baseUrl: string) {}

  async discover(): Promise<void> {
    const snapshot = await new RootRunPackageCurrentValidator(this.memoryDir).scan();
    this.diagnostics.push(...snapshot.diagnostics);
    this.currentValidator = new ContextFileCurrentLocatorValidator(this.memoryDir, this.baseUrl, snapshot.groups);
    for (const current of snapshot.groups) {
      for (const owner of current.owners) {
        if (owner.descriptor.kind === "team_member_final" && "address" in owner) {
          this.owners.push({teamRunId: owner.descriptor.teamRunId, agentRunId: owner.descriptor.agentRunId,
            address: owner.address, directory: owner.directory, groupKey: current.key});
        }
      }
      this.groups.push({ current, sources: [] });
    }
  }

  async collectSources(group: TransitionGroup): Promise<void> {
    group.sources = await listContextFileRecordSources(group.current);
  }

  async assertContainedRegularFile(file: string): Promise<void> {
    await assertContainedContextFile(this.memoryDir, file);
  }

  async transform(group: TransitionGroup, source: ContextFileRecordSource, text: string): Promise<string> {
    return transformContextFileRecordLocators(source, text, (uri) => this.locator(uri, group, source));
  }

  private async locator(uri: string, group: TransitionGroup, source: ContextFileRecordSource): Promise<string> {
    const route = localContextFileRoute(uri, this.baseUrl);
    if (!route) return uri;
    const {prefix, pathname, suffix, relative} = route;
    const match = pathname.match(/^\/rest\/team-runs\/([^/]+)\/(members|agent-runs)\/([^/]+)\/context-files\/([^/]+)$/);
    if (!match) { await this.currentValidator.validateLocator(uri); return uri; }
    const teamRunId = decodeURIComponent(match[1]!);
    const current = match[2] === "agent-runs";
    const selector = decodeURIComponent(match[3]!);
    const filename = assertStoredFilename(decodeURIComponent(match[4]!));
    // Validate identities before using any matching data as a filesystem authority.
    parseFinalContextFileOwnerDescriptor({ kind: "team_member_final", teamRunId, agentRunId: current ? selector : "historical-selector" });
    const scoped = this.owners.filter((owner) => owner.teamRunId === teamRunId && (current ? owner.agentRunId === selector
      : owner.address === selector || !selector.startsWith("/") && (owner.address === `/${selector}` || owner.address.split("/").at(-1) === selector)));
    const matches: Owner[] = [];
    for (const owner of scoped) {
      const file = path.join(owner.directory, "context_files", filename);
      try { await this.assertContainedRegularFile(file); matches.push(owner); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    const provenance = source.kind === "trace" ? matches.filter((owner) => owner.groupKey === group.current.key && source.filePath.startsWith(`${owner.directory}${path.sep}`)) : [];
    const candidates = provenance.length === 1 ? provenance : matches;
    if (candidates.length !== 1) throw new ContextFileReferenceUnavailableError(`Expected one proven attachment owner for '${uri}'; found ${candidates.length}.`);
    const owner = candidates[0]!;
    if (current) { await this.currentValidator.validateLocator(uri); return uri; }
    const locator = buildFinalContextFileLocator({ kind: "team_member_final", teamRunId, agentRunId: owner.agentRunId }, filename);
    const target = prefix + (relative ? locator.slice(1) : locator) + suffix;
    await this.currentValidator.validateLocator(target);
    return target;
  }
}
