import { Field, ObjectType } from "type-graphql";
import type { MemoryRunSubject as DomainSubject } from "../../../agent-memory/domain/discovered-run.js";

/** How the page opens a result: the run's memory view by its subject (one shape per run kind). */
@ObjectType()
export class MemoryRunSubject {
  /** `AGENT`, `TEAM_MEMBER`, `ORG_MEMBER` or `RUN_FOLDER`. */
  @Field(() => String)
  kind!: DomainSubject["kind"];

  @Field(() => String, { nullable: true })
  runId!: string | null;

  @Field(() => String, { nullable: true })
  agentDefinitionId!: string | null;

  @Field(() => String, { nullable: true })
  teamRunId!: string | null;

  @Field(() => String, { nullable: true })
  orgRunId!: string | null;

  @Field(() => String, { nullable: true })
  agentRunId!: string | null;

  @Field(() => String, { nullable: true })
  runKey!: string | null;
}

/** The GraphQL form of a domain subject: the fields of its kind set, the others null. */
export const toMemoryRunSubject = (subject: DomainSubject): MemoryRunSubject => ({
  kind: subject.kind,
  runId: subject.kind === "AGENT" ? subject.runId : null,
  agentDefinitionId: subject.kind === "AGENT" ? subject.agentDefinitionId : null,
  teamRunId: subject.kind === "TEAM_MEMBER" ? subject.teamRunId : null,
  orgRunId: subject.kind === "ORG_MEMBER" ? subject.orgRunId : null,
  agentRunId: subject.kind === "TEAM_MEMBER" || subject.kind === "ORG_MEMBER" ? subject.agentRunId : null,
  runKey: subject.kind === "RUN_FOLDER" ? subject.runKey : null,
});
