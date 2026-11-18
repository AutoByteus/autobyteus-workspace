import { describe, expect, it, vi } from "vitest";
import { TeamRunService } from "../../../../../src/agent-team-execution/services/team-run-service.js";
import { AgentOrgRunService } from "../../../../../src/agent-org-execution/services/agent-org-run-service.js";
import { TokenUsageCapabilityUnavailableError } from "../../../../../src/token-usage/providers/token-usage-capability.js";
import { StoredFileDamagedError } from "../../../../../src/run-history/store/stored-file-damaged-error.js";

/**
 * autobyteus-461 SR-078 (CR-461-069): base's restore admission of a stopped team or org root, asked before its stored file
 * is read (the token-usage migration of existing runs, then the package catalog), and a stopped root restored for its
 * first input: the admission's own reason, else a restore that fails after admission answered as not restorable, with the
 * detail (a schema error) in the log only.
 */
const ready = { assertCurrentSchemaReady() {}, assertExistingRunRestoreReady() {} };
const tokenUsagePending = { assertCurrentSchemaReady() {}, assertExistingRunRestoreReady() {
  throw new TokenUsageCapabilityUnavailableError("TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED", { kind: "HISTORY_MIGRATION_PENDING" } as never);
} };
const SCHEMA_ERROR = new Error("team-run-v1: rootTeam.members[0].memberRouteKey is required");

const teams = (input: Readonly<{ cataloged?: boolean; tokenUsage?: typeof ready; restore?: () => Promise<unknown>; managed?: unknown }>) => {
  const manager = { isCatalogedPackage: vi.fn(async () => input.cataloged ?? true), getManagedTeamRun: vi.fn(() => input.managed ?? null),
    restoreTeamRun: vi.fn(input.restore ?? (async () => ({ teamRunId: "team", getExecutionTreeSnapshot: () => ({}) }))) };
  const service = new TeamRunService({ agentTeamRunManager: manager as never, teamDefinitionService: {} as never, workspaceManager: {} as never,
    teamRunHistoryCatalogService: { recordTeamRunRestored: vi.fn(async () => undefined) } as never, definitionAdmissionService: {} as never,
    tokenUsageReadiness: input.tokenUsage ?? ready, agentRunIdentityAllocator: {} as never, teamRunIdentityAllocator: {} as never });
  return { service, manager };
};
const orgs = (input: Readonly<{ cataloged?: boolean; restore?: () => Promise<unknown> }>) => {
  const manager = { isCatalogedPackage: vi.fn(async () => input.cataloged ?? true), getActive: vi.fn(() => null),
    restore: vi.fn(input.restore ?? (async () => ({ orgRunId: "org", getExecutionTreeSnapshot: () => ({}) }))), terminate: vi.fn(async () => true) };
  const service = new AgentOrgRunService({ manager, tokenUsage: ready, history: { recordRestored: vi.fn(async () => undefined) } } as never);
  return { service, manager };
};

describe("the restore admission of a stopped team or org root (SR-078, CR-461-069)", () => {
  it("a team root: base's token-usage reason first, then the catalog's; nothing is read when admitted", async () => {
    await expect(teams({ tokenUsage: tokenUsagePending }).service.restoreRefusal("team")).resolves.toMatchObject({ accepted: false,
      code: "TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED" });
    await expect(teams({ cataloged: false }).service.restoreRefusal("team")).resolves.toEqual({ accepted: false,
      code: "TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED", message: "TeamRun 'team' is not an admitted current package." });
    const admitted = teams({});
    await expect(admitted.service.restoreRefusal("team")).resolves.toBeNull();
    expect(admitted.manager.restoreTeamRun).not.toHaveBeenCalled();
  });

  it("a team root's first input: refused by admission with its reason, nothing restored; a restore failing after admission is not restorable, no schema text", async () => {
    const refused = teams({ cataloged: false });
    await expect(refused.service.restoreForInput("team")).resolves.toMatchObject({ code: "TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED" });
    expect(refused.manager.restoreTeamRun).not.toHaveBeenCalled();
    const broken = teams({ restore: async () => { throw SCHEMA_ERROR; } });
    const answer = await broken.service.restoreForInput("team");
    expect(answer).toEqual({ accepted: false, code: "TEAM_RUN_NOT_RESTORABLE",
      message: "Team run 'team' cannot be restored: its saved state cannot be read. Its files were left unchanged." });
    expect(JSON.stringify(answer)).not.toContain("memberRouteKey");
    await expect(teams({}).service.restoreForInput("team")).resolves.toMatchObject({ teamRunId: "team" });
    // A concurrent restore registered it first: that run.
    const raced = teams({ restore: async () => { throw new Error("RootTeamRun 'team' is already managed."); } });
    const registered = { teamRunId: "team" };
    raced.manager.getManagedTeamRun.mockReturnValueOnce(null).mockReturnValue(registered);
    await expect(raced.service.restoreForInput("team")).resolves.toBe(registered);
  });

  it("CR-461-083 (F-65): a damaged stored file is the reason, in plain words, with what to do; the parser's text stays in the log", async () => {
    const damaged = new StoredFileDamagedError("message log", "team_communication_messages_active.jsonl", 2,
      "team_communication_messages_active.jsonl:line 2 is not valid JSON.");
    const answer = await teams({ restore: async () => { throw new Error("The team could not be read.", { cause: damaged }); } }).service.restoreForInput("team");
    expect(answer).toEqual({ accepted: false, code: "TEAM_RUN_NOT_RESTORABLE",
      message: "Team run 'team' cannot be restored: its message log (team_communication_messages_active.jsonl) is damaged at line 2. "
        + "Its files were left unchanged; start a new run, or repair or remove that file." });
    expect(JSON.stringify(answer)).not.toContain("not valid JSON");
    await expect(orgs({ restore: async () => { throw damaged; } }).service.restoreForInput("org")).resolves.toMatchObject({
      code: "AGENT_ORG_RUN_NOT_RESTORABLE", message: expect.stringContaining("its message log (team_communication_messages_active.jsonl) is damaged at line 2.") });
  });

  it("an org root: the catalog's reason; a restore failing after admission is not restorable", async () => {
    await expect(orgs({ cataloged: false }).service.restoreRefusal("org")).resolves.toEqual({ accepted: false,
      code: "AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED", message: "AgentOrg 'org' is not an admitted current package." });
    await expect(orgs({}).service.restoreRefusal("org")).resolves.toBeNull();
    await expect(orgs({ restore: async () => { throw SCHEMA_ERROR; } }).service.restoreForInput("org")).resolves.toEqual({ accepted: false,
      code: "AGENT_ORG_RUN_NOT_RESTORABLE", message: "AgentOrg run 'org' cannot be restored: its saved state cannot be read. Its files were left unchanged." });
    await expect(orgs({}).service.restoreForInput("org")).resolves.toMatchObject({ orgRunId: "org" });
  });
});
