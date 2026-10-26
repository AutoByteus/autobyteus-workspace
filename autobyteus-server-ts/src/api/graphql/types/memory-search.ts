import path from "node:path";
import { Arg, Field, Int, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import type {
  MemoryIndexStatus as DomainIndexStatus,
  MemoryRunSubject as DomainSubject,
  MemorySearchMatch as DomainMatch,
  MemorySearchRunResult as DomainRunResult,
} from "../../../memory-search/domain/memory-search-models.js";
import { getMemorySearch } from "../../../memory-search/memory-search.js";
import { readWorkJournalView, WorkJournalView, WorkJournalWindowInput } from "./work-journal-view.js";

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

@ObjectType()
export class MemorySearchMatch {
  @Field(() => String)
  journalFile!: string;

  /** The journal file's name, for opening it in the run's Work Journal view. */
  @Field(() => String)
  journalFileName!: string;

  @Field(() => Int)
  lineStart!: number;

  @Field(() => Int)
  lineEnd!: number;

  @Field(() => String, { nullable: true })
  day!: string | null;

  @Field(() => String)
  snippet!: string;

  /** `TEXT` (Words on the page) or `MEANING`. */
  @Field(() => String)
  matchedBy!: "TEXT" | "MEANING";

  /** `STRONG`, `FAIR` or `WEAK`. */
  @Field(() => String)
  strength!: "STRONG" | "FAIR" | "WEAK";
}

@ObjectType()
export class MemorySearchRunResult {
  @Field(() => String)
  agent!: string;

  @Field(() => String, { nullable: true })
  team!: string | null;

  @Field(() => String, { nullable: true })
  member!: string | null;

  @Field(() => String, { nullable: true })
  org!: string | null;

  @Field(() => String)
  runId!: string;

  @Field(() => String, { nullable: true })
  workspace!: string | null;

  @Field(() => String, { nullable: true })
  firstDay!: string | null;

  @Field(() => String, { nullable: true })
  latestDay!: string | null;

  @Field(() => String)
  source!: string;

  @Field(() => [MemorySearchMatch])
  matches!: MemorySearchMatch[];

  @Field(() => MemoryRunSubject)
  subject!: MemoryRunSubject;
}

@ObjectType()
export class MemorySearchResult {
  @Field(() => [MemorySearchRunResult])
  results!: MemorySearchRunResult[];

  @Field(() => String, { nullable: true })
  coverage!: string | null;

  @Field(() => String, { nullable: true })
  note!: string | null;
}

@ObjectType()
export class MemoryIndexStep {
  /** `FIND_RUNS`, `JOURNALS`, `TEXT_INDEX` or `MEANING_INDEX`. */
  @Field(() => String)
  step!: string;

  /** `WAITING`, `RUNNING`, `DONE` or `FAILED`. */
  @Field(() => String)
  state!: string;

  @Field(() => Int)
  done!: number;

  @Field(() => Int)
  total!: number;

  /** `RUNS` or `JOURNAL_FILES`. */
  @Field(() => String)
  unit!: string;

  @Field(() => String, { nullable: true })
  failureMessage!: string | null;
}

@ObjectType()
export class MemoryIndexStatus {
  /** `NOT_INDEXED`, `BUILDING`, `READY`, `FAILED` or `MODEL_CHANGED`. */
  @Field(() => String)
  state!: string;

  @Field(() => [MemoryIndexStep])
  steps!: MemoryIndexStep[];

  @Field(() => Int)
  runCount!: number;

  @Field(() => Int)
  journalFileCount!: number;

  @Field(() => String, { nullable: true })
  updatedAt!: string | null;

  /** Search is available once the text index has content. */
  @Field(() => Boolean)
  textIndexHasContent!: boolean;

  @Field(() => String)
  activeModelId!: string;

  @Field(() => String, { nullable: true })
  meaningIndexModelId!: string | null;

  @Field(() => String, { nullable: true })
  meaningNote!: string | null;
}

/** `meaningIndex` → `MEANING_INDEX`. */
const constantCase = (value: string): string => value.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();

const toSubject = (subject: DomainSubject): MemoryRunSubject => ({
  kind: subject.kind,
  runId: subject.kind === "AGENT" ? subject.runId : null,
  agentDefinitionId: subject.kind === "AGENT" ? subject.agentDefinitionId : null,
  teamRunId: subject.kind === "TEAM_MEMBER" ? subject.teamRunId : null,
  orgRunId: subject.kind === "ORG_MEMBER" ? subject.orgRunId : null,
  agentRunId: subject.kind === "TEAM_MEMBER" || subject.kind === "ORG_MEMBER" ? subject.agentRunId : null,
  runKey: subject.kind === "RUN_FOLDER" ? subject.runKey : null,
});

const toMatch = (match: DomainMatch): MemorySearchMatch => ({
  journalFile: match.journalFile, journalFileName: path.basename(match.journalFile), lineStart: match.lineStart, lineEnd: match.lineEnd,
  day: match.day, snippet: match.snippet, matchedBy: match.matchedBy === "text" ? "TEXT" : "MEANING",
  strength: match.strength.toUpperCase() as MemorySearchMatch["strength"],
});

const toRunResult = (run: DomainRunResult): MemorySearchRunResult => ({
  agent: run.agent, team: run.team, member: run.member, org: run.org, runId: run.runId, workspace: run.workspace,
  firstDay: run.firstDay, latestDay: run.latestDay, source: run.source, matches: run.matches.map(toMatch), subject: toSubject(run.subject),
});

const toStatus = (status: DomainIndexStatus): MemoryIndexStatus => ({
  state: constantCase(status.state),
  steps: status.steps.map((step) => ({
    step: constantCase(step.step), state: constantCase(step.state), done: step.done, total: step.total,
    unit: constantCase(step.unit), failureMessage: step.failureMessage,
  })),
  runCount: status.runCount, journalFileCount: status.journalFileCount, updatedAt: status.updatedAt,
  textIndexHasContent: status.textIndexHasContent, activeModelId: status.activeModelId,
  meaningIndexModelId: status.meaningIndexModelId, meaningNote: status.meaningNote,
});

/** The Memory page's memory search, index panel, and the Work Journal of runs known only by their folder. */
@Resolver()
export class MemorySearchResolver {
  @Query(() => MemorySearchResult)
  async memorySearch(
    @Arg("query", () => String) query: string,
    @Arg("limit", () => Int, { nullable: true }) limit?: number | null,
  ): Promise<MemorySearchResult> {
    const result = await getMemorySearch().search(query, { limit: limit ?? null });
    return { results: result.results.map(toRunResult), coverage: result.coverage, note: result.note };
  }

  @Query(() => MemoryIndexStatus)
  memoryIndexStatus(): MemoryIndexStatus {
    return toStatus(getMemorySearch().indexStatus());
  }

  /** Index now / Try again; false while a pass runs. */
  @Mutation(() => Boolean)
  startMemoryIndexing(): boolean {
    return getMemorySearch().startIndexing();
  }

  /** Drops the index and builds it again; false while a pass runs. */
  @Mutation(() => Boolean)
  rebuildMemoryIndex(): boolean {
    return getMemorySearch().rebuild();
  }

  /** The Work Journal of a run the index knows only by its folder; null for any other key. */
  @Query(() => WorkJournalView, { nullable: true })
  async runFolderWorkJournal(
    @Arg("runKey", () => String) runKey: string,
    @Arg("workJournal", () => WorkJournalWindowInput, { nullable: true }) workJournal?: WorkJournalWindowInput | null,
  ): Promise<WorkJournalView | null> {
    return readWorkJournalView(getMemorySearch().runFolderMemoryDir(runKey), workJournal ?? {});
  }
}
