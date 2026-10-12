import { Arg, Field, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import type {
  AgentPackageDefinitionKind,
  DefinitionLoadIssue as DomainDefinitionLoadIssue,
  DefinitionLoadIssueEntry as DomainDefinitionLoadIssueEntry,
} from "../../../agent-package-definitions/domain/agent-package-definition-types.js";
import type { RootSubjectKind } from "../../../collaboration-definition-admission/domain/definition-admission-result.js";
import {
  getStudioAgentDefinitionService,
  getStudioAgentOrgDefinitionService,
  getStudioAgentTeamDefinitionService,
  getStudioDefinitionAdmissionService,
} from "../studio-application-api-services.js";

/** The kind of a definition: agent, agent team or agent org. */
export enum DefinitionKind {
  AGENT = "AGENT",
  AGENT_TEAM = "AGENT_TEAM",
  AGENT_ORG = "AGENT_ORG",
}

registerEnumType(DefinitionKind, { name: "DefinitionKind" });

/**
 * Why a definition's files could not be read. On a listed definition it means "using the last
 * working version".
 */
@ObjectType()
export class DefinitionLoadIssue {
  @Field(() => String) code!: string;
  @Field(() => String) reason!: string;
  @Field(() => String) definitionPath!: string;
  @Field(() => String) packageRoot!: string;
}

export const toGraphqlDefinitionLoadIssue = (
  issue: DomainDefinitionLoadIssue | null | undefined,
): DefinitionLoadIssue | null => issue
  ? { code: issue.code, reason: issue.reason, definitionPath: issue.definitionPath, packageRoot: issue.packageRoot }
  : null;

const GRAPHQL_KIND: Record<AgentPackageDefinitionKind, DefinitionKind> = {
  agent: DefinitionKind.AGENT,
  agent_team: DefinitionKind.AGENT_TEAM,
  agent_org: DefinitionKind.AGENT_ORG,
};

/**
 * One load issue inside a Team or Org definition folder: the Team or Org itself or a nested
 * definition (team-local agent, org-owned agent or Team, or its local agent). `name` is the last
 * working version's name.
 */
@ObjectType()
export class DefinitionLoadIssueEntry {
  @Field(() => DefinitionKind) kind!: DefinitionKind;
  @Field(() => String) definitionId!: string;
  @Field(() => String, { nullable: true }) name!: string | null;
  @Field(() => String) code!: string;
  @Field(() => String) reason!: string;
  @Field(() => String) definitionPath!: string;
  @Field(() => String) packageRoot!: string;
  @Field(() => Boolean) usingLastGood!: boolean;
}

/** The one mapper for definition folder load issues, shared by the Team and Org projections. */
export const toGraphqlDefinitionLoadIssueEntries = (
  entries: readonly DomainDefinitionLoadIssueEntry[] | null | undefined,
): DefinitionLoadIssueEntry[] => (entries ?? []).map((entry) => ({
  kind: GRAPHQL_KIND[entry.kind],
  definitionId: entry.definitionId,
  name: entry.name,
  ...toGraphqlDefinitionLoadIssue(entry.issue)!,
  usingLastGood: entry.usingLastGood,
}));

/** Why a definition cannot be used, or uses its last working version: a load issue or a Team/Org reference problem. */
@ObjectType()
export class DefinitionProblem {
  @Field(() => DefinitionKind) kind!: DefinitionKind;
  @Field(() => String) definitionId!: string;
  @Field(() => String) code!: string;
  @Field(() => String) reason!: string;
  @Field(() => String) definitionPath!: string;
  @Field(() => String) packageRoot!: string;
  @Field(() => Boolean) usingLastGood!: boolean;
  @Field(() => [String]) dependencyChain!: string[];
}

type LoadIssueEntry = Readonly<{ definitionId: string; issue: DomainDefinitionLoadIssue; usingLastGood: boolean }>;

const fromLoadIssue = (kind: DefinitionKind, entry: LoadIssueEntry): DefinitionProblem => ({
  kind,
  definitionId: entry.definitionId,
  code: entry.issue.code,
  reason: entry.issue.reason,
  definitionPath: entry.issue.definitionPath,
  packageRoot: entry.issue.packageRoot,
  usingLastGood: entry.usingLastGood,
  dependencyChain: [],
});

@Resolver()
export class DefinitionProblemsResolver {
  /**
   * The web list of definition problems for one kind. Agents: load issues. Teams and Orgs:
   * admission unavailability (which carries load issues) plus load issues on last-good definitions.
   */
  @Query(() => [DefinitionProblem])
  async definitionProblems(
    @Arg("kind", () => DefinitionKind) kind: DefinitionKind,
  ): Promise<DefinitionProblem[]> {
    if (kind === DefinitionKind.AGENT) {
      return (await getStudioAgentDefinitionService().listLoadIssues()).map((entry) => fromLoadIssue(kind, entry));
    }
    const subjectKind: RootSubjectKind = kind === DefinitionKind.AGENT_TEAM ? "agent_team" : "agent_org";
    const unavailable = (await getStudioDefinitionAdmissionService().scan()).flatMap((result) =>
      result.status === "unavailable" && result.subjectKind === subjectKind
        ? [{
            kind,
            definitionId: result.definitionId ?? "",
            code: result.code,
            reason: result.reason,
            definitionPath: result.definitionPath,
            packageRoot: result.packageRoot,
            usingLastGood: false,
            dependencyChain: [...result.dependencyChain],
          }]
        : []);
    const issues = subjectKind === "agent_team"
      ? await getStudioAgentTeamDefinitionService().listLoadIssues()
      : await getStudioAgentOrgDefinitionService().listLoadIssues();
    return [
      ...unavailable,
      ...issues.filter((entry) => entry.usingLastGood).map((entry) => fromLoadIssue(kind, entry)),
    ];
  }
}
