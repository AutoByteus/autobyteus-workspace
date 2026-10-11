import { Arg, Field, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import type {
  DefinitionCatalogIssue as DomainDefinitionCatalogIssue,
  DefinitionSubject as DomainDefinitionSubject,
  DefinitionUnitIssueEntry,
} from "../../../definition-catalog/domain/definition-catalog-types.js";
import type { RootSubjectKind } from "../../../collaboration-definition-admission/domain/definition-admission-result.js";
import {
  getStudioAgentDefinitionService,
  getStudioAgentOrgDefinitionService,
  getStudioAgentTeamDefinitionService,
  getStudioDefinitionAdmissionService,
} from "../studio-application-api-services.js";

export enum DefinitionSubject {
  AGENT = "AGENT",
  AGENT_TEAM = "AGENT_TEAM",
  AGENT_ORG = "AGENT_ORG",
}

registerEnumType(DefinitionSubject, { name: "DefinitionSubject" });

/** Why a definition could not be read as current; on a listed definition it means "using the last working version". */
@ObjectType()
export class DefinitionCatalogIssue {
  @Field(() => String) code!: string;
  @Field(() => String) reason!: string;
  @Field(() => String) definitionPath!: string;
  @Field(() => String) packageRoot!: string;
}

export const toGraphqlDefinitionCatalogIssue = (
  issue: DomainDefinitionCatalogIssue | null | undefined,
): DefinitionCatalogIssue | null => issue
  ? { code: issue.code, reason: issue.reason, definitionPath: issue.definitionPath, packageRoot: issue.packageRoot }
  : null;

const SUBJECT_BY_DOMAIN: Record<DomainDefinitionSubject, DefinitionSubject> = {
  agent: DefinitionSubject.AGENT,
  agent_team: DefinitionSubject.AGENT_TEAM,
  agent_org: DefinitionSubject.AGENT_ORG,
};

/**
 * One issue inside a Team or Org unit: the root definition or a nested one (team-local agent,
 * org-owned agent or Team, or its local agent). `name` is the last working version's name.
 */
@ObjectType()
export class DefinitionUnitIssue {
  @Field(() => DefinitionSubject) subject!: DefinitionSubject;
  @Field(() => String) definitionId!: string;
  @Field(() => String, { nullable: true }) name!: string | null;
  @Field(() => String) code!: string;
  @Field(() => String) reason!: string;
  @Field(() => String) definitionPath!: string;
  @Field(() => String) packageRoot!: string;
  @Field(() => Boolean) usingLastGood!: boolean;
}

/** The one mapper for unit issues, shared by the Team and Org projections. */
export const toGraphqlDefinitionUnitIssues = (
  entries: readonly DefinitionUnitIssueEntry[] | null | undefined,
): DefinitionUnitIssue[] => (entries ?? []).map((entry) => ({
  subject: SUBJECT_BY_DOMAIN[entry.subject],
  definitionId: entry.definitionId,
  name: entry.name,
  ...toGraphqlDefinitionCatalogIssue(entry.issue)!,
  usingLastGood: entry.usingLastGood,
}));

/** One definition that is unusable, or usable only through its last working version. */
@ObjectType()
export class DefinitionDiagnostic {
  @Field(() => DefinitionSubject) subject!: DefinitionSubject;
  @Field(() => String) definitionId!: string;
  @Field(() => String) code!: string;
  @Field(() => String) reason!: string;
  @Field(() => String) definitionPath!: string;
  @Field(() => String) packageRoot!: string;
  @Field(() => Boolean) usingLastGood!: boolean;
  @Field(() => [String]) dependencyChain!: string[];
}

type IssueEntry = Readonly<{ definitionId: string; issue: DomainDefinitionCatalogIssue; usingLastGood: boolean }>;

const fromIssue = (subject: DefinitionSubject, entry: IssueEntry): DefinitionDiagnostic => ({
  subject,
  definitionId: entry.definitionId,
  code: entry.issue.code,
  reason: entry.issue.reason,
  definitionPath: entry.issue.definitionPath,
  packageRoot: entry.issue.packageRoot,
  usingLastGood: entry.usingLastGood,
  dependencyChain: [],
});

@Resolver()
export class DefinitionDiagnosticsResolver {
  /**
   * The web diagnostics surface for one subject. Agents: catalog issues. Teams and Orgs:
   * admission unavailability (which carries catalog issues) plus issues on last-good definitions.
   */
  @Query(() => [DefinitionDiagnostic])
  async definitionDiagnostics(
    @Arg("subject", () => DefinitionSubject) subject: DefinitionSubject,
  ): Promise<DefinitionDiagnostic[]> {
    if (subject === DefinitionSubject.AGENT) {
      return (await getStudioAgentDefinitionService().listDefinitionIssues()).map((entry) => fromIssue(subject, entry));
    }
    const kind: RootSubjectKind = subject === DefinitionSubject.AGENT_TEAM ? "agent_team" : "agent_org";
    const unavailable = (await getStudioDefinitionAdmissionService().scan()).flatMap((result) =>
      result.status === "unavailable" && result.subjectKind === kind
        ? [{
            subject,
            definitionId: result.definitionId ?? "",
            code: result.code,
            reason: result.reason,
            definitionPath: result.definitionPath,
            packageRoot: result.packageRoot,
            usingLastGood: false,
            dependencyChain: [...result.dependencyChain],
          }]
        : []);
    const issues = kind === "agent_team"
      ? await getStudioAgentTeamDefinitionService().listDefinitionIssues()
      : await getStudioAgentOrgDefinitionService().listDefinitionIssues();
    return [
      ...unavailable,
      ...issues.filter((entry) => entry.usingLastGood).map((entry) => fromIssue(subject, entry)),
    ];
  }
}
