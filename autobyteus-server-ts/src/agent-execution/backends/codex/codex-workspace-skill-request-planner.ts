import fs from "node:fs";
import path from "node:path";
import type { ConfiguredAgentSkillBinding } from "../../../skills/domain/configured-agent-skill-binding.js";
import type {
  CodexAppServerClientLease,
  CodexAppServerClientManager,
} from "../../../runtime-management/codex/client/codex-app-server-client-manager.js";
import type { WorkspaceSkillReconciliationRequest } from "../shared/workspace-skill-materializer.js";
import { exposedWorkspaceSkillRequests } from "../shared/run-workspace-skills.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const asTrimmedString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const canonicalSkillDirectory = (value: string): string => {
  const directory = path.basename(value) === "SKILL.md" ? path.dirname(value) : value;
  try {
    return fs.realpathSync(directory);
  } catch {
    return path.resolve(directory);
  }
};

/** Enabled `skills/list` entries: name → the real skill directories Codex found for it. */
const collectDiscoverableSkillPaths = (payload: unknown): Map<string, string[]> => {
  const result = new Map<string, string[]>();
  const root = asObjectRecord(payload);
  const data = Array.isArray(root?.data) ? root.data : [];
  for (const entryValue of data) {
    const entry = asObjectRecord(entryValue);
    const skills = Array.isArray(entry?.skills) ? entry.skills : [];
    for (const skillValue of skills) {
      const skill = asObjectRecord(skillValue);
      if (skill?.enabled !== true) {
        continue;
      }
      const skillName = asTrimmedString(skill?.name);
      const skillPath = asTrimmedString(skill?.path);
      if (skillName) {
        result.set(skillName, [...(result.get(skillName) ?? []), ...(skillPath ? [canonicalSkillDirectory(skillPath)] : [])]);
      }
    }
  }
  return result;
};

/**
 * Codex's workspace skill requests, at run start and for skills added mid-run (one rule for both). Codex is asked
 * (`skills/list`) which skills it already discovers in the workspace, so a copy it finds itself is not linked again
 * (D-19). If Codex cannot be asked, every resolved skill is exposed.
 */
export class CodexWorkspaceSkillRequestPlanner {
  constructor(private readonly clientManager: CodexAppServerClientManager) {}

  async plan(input: Readonly<{
    workingDirectory: string;
    bindings: readonly ConfiguredAgentSkillBinding[];
    assertAccepting: () => void;
    /** At preparation: the client lease belongs to the preparation from acquisition on. */
    ownClient?: (lease: CodexAppServerClientLease) => void;
  }>): Promise<WorkspaceSkillReconciliationRequest[]> {
    if (input.bindings.length === 0) {
      return [];
    }

    input.assertAccepting();
    const lease = this.clientManager.beginAcquire(input.workingDirectory);
    input.ownClient?.(lease);
    try {
      const client = await lease.acquire();
      input.assertAccepting();
      const response = await client.request<unknown>("skills/list", {
        cwds: [input.workingDirectory],
        forceReload: true,
      });
      const discoverableSkillPaths = collectDiscoverableSkillPaths(response);
      return input.bindings.map((binding) => {
        if (binding.kind === "unresolved") {
          return { kind: "reconcile-unresolved", name: binding.name };
        }
        const skillName = asTrimmedString(binding.skill.name);
        const codexPaths = (skillName && discoverableSkillPaths.get(skillName)) || [];
        // D-19: Codex discovers the catalog's copy natively only when every entry it lists for the
        // name is that copy. A different copy (e.g. a stale `~/.codex/skills` one) is exposed.
        const chosenPath = canonicalSkillDirectory(binding.skill.rootPath);
        const otherPaths = codexPaths.filter((codexPath) => codexPath !== chosenPath);
        if (codexPaths.length > 0 && otherPaths.length === 0) {
          return { kind: "reconcile-discoverable", skill: binding.skill };
        }
        if (otherPaths.length > 0) {
          logger.warn(
            `codex-runtime-duplicate: skill='${binding.skill.name}', codexPaths='${otherPaths.join(",")}', chosenPath='${chosenPath}'; exposing the chosen copy in the workspace.`,
          );
        }
        return { kind: "expose-resolved", skill: binding.skill };
      });
    } catch (error) {
      logger.warn(
        `Failed to preflight discoverable Codex skills for '${input.workingDirectory}'; falling back to workspace materialization: ${String(error)}`,
      );
      return exposedWorkspaceSkillRequests(input.bindings);
    } finally {
      await lease.release();
    }
  }
}
