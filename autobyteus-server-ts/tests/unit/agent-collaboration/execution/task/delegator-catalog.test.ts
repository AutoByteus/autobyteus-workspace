import { afterEach, describe, expect, it, vi } from "vitest";
import { NOTHING_REACHED, type CollaboratorRootPort } from "../../../../../src/agent-collaboration/collaborators/collaborator-root-port.js";
import { DelegatorCatalog } from "../../../../../src/agent-collaboration/execution/task/delegator-catalog.js";
import type { RootExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { standaloneRootCollaboratorPortFor } from "../../../../../src/standalone-agent-run-root/services/standalone-root-collaborators.js";
import { teamCollaboratorPortFor } from "../../../../../src/agent-team-execution/services/team-run-collaborators.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../../fixtures/current-team-run-fixtures.js";
import { admission } from "../../../agent-team-execution/helpers/team-root-collaborator-harness.js";

/**
 * autobyteus-461 CR-461-041 (F-16): a delegated run's member gets the catalog copy its delegator's agent would get at a
 * catalog address its own catalog does not offer, as base answered a hosted copy from its host's catalog: a delegated
 * team whose member is a Code Reviewer offers no '/code_reviewer' copy (that definition is in its run), its Manager does.
 */
afterEach(() => { vi.restoreAllMocks(); });

const run = (rootSubjectKind: RootExecutionIdentity["rootSubjectKind"], rootRunId: string) => ({ rootSubjectKind, rootRunId }) as RootExecutionIdentity;
const SQUAD = run("agent_team", "squad");
const launch = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" };
const squadPort = () => teamCollaboratorPortFor(testExecutionTree({ rootTeamRunId: "squad", rootTeamDefinitionId: "squad-team", coordinatorAddress: "/lead",
  children: [testAgentNode("/lead", { agentRunId: "squad-lead", agentDefinitionId: "lead" }), testAgentNode("/reviewer", { agentRunId: "squad-reviewer", agentDefinitionId: "code-reviewer" })] }), NOTHING_REACHED);
const managerPort = () => standaloneRootCollaboratorPortFor({ address: "/manager" as never, agentRunId: "manager", agentDefinitionId: "manager-def" }, launch, "manager", NOTHING_REACHED);
const work = { kind: "description", description: "Review it." } as never;

const catalogOf = (delegatingRun: RootExecutionIdentity | null, ports: (run: RootExecutionIdentity) => CollaboratorRootPort | null) => {
  const portOf = vi.fn(async (target: RootExecutionIdentity) => ports(target));
  const catalog = new DelegatorCatalog({ tree: { parentOf: () => delegatingRun ? { delegatingRun, delegatorAgentRunId: "manager" } : null } as never,
    portOf, admission: () => admission(true) });
  return { catalog, portOf };
};

describe("DelegatorCatalog", () => {
  it("its own catalog offers nothing at the address; its delegator's gives the catalog copy, from the delegator's launch base", async () => {
    expect(await admission(true).catalogDefinitionAt(squadPort(), "/code_reviewer")).toBeNull();
    const { catalog, portOf } = catalogOf(run("agent", "manager"), (target) => target.rootSubjectKind === "agent_team" ? squadPort() : managerPort());
    const placement = await catalog.placementAt({ senderRun: SQUAD, senderAgentRunId: "squad-lead", address: "/code_reviewer", work, folder: null });
    expect(placement).toMatchObject({ kind: "agent", address: "/code_reviewer", source: { agentDefinitionId: "code-reviewer" } });
    expect(portOf).toHaveBeenCalledWith(run("agent", "manager"), "manager");
  });

  it("asks the delegator of each root kind (an agent run, a team run, an org run) through its port", async () => {
    for (const delegating of [run("agent", "manager"), run("agent_team", "home"), run("agent_org", "company")]) {
      const { catalog, portOf } = catalogOf(delegating, (target) => target === SQUAD || target.rootRunId === "squad" ? squadPort() : managerPort());
      await expect(catalog.placementAt({ senderRun: SQUAD, senderAgentRunId: "squad-lead", address: "/code_reviewer", work, folder: null }))
        .resolves.toMatchObject({ kind: "agent", source: { agentDefinitionId: "code-reviewer" } });
      expect(portOf).toHaveBeenCalledWith(delegating, "manager");
    }
  });

  it("never offers the run its own definition, and a run no Task names gets nothing", async () => {
    const { catalog } = catalogOf(run("agent", "manager"), (target) => target.rootSubjectKind === "agent_team" ? squadPort() : managerPort());
    await expect(catalog.placementAt({ senderRun: SQUAD, senderAgentRunId: "squad-lead", address: "/product_team", work, folder: null })).resolves.toMatchObject({ kind: "agent_team" });
    const own = catalogOf(run("agent", "manager"), (target) => target.rootSubjectKind === "agent_team"
      ? { ...squadPort(), ownDefinition: () => ({ kind: "agent_team" as const, definitionId: "product-team" }) } : managerPort());
    await expect(own.catalog.placementAt({ senderRun: SQUAD, senderAgentRunId: "squad-lead", address: "/product_team", work, folder: null })).resolves.toBeNull();
    const orphan = catalogOf(null, () => managerPort());
    await expect(orphan.catalog.placementAt({ senderRun: SQUAD, senderAgentRunId: "squad-lead", address: "/code_reviewer", work, folder: null })).resolves.toBeNull();
    expect(orphan.portOf).not.toHaveBeenCalled();
  });
});
