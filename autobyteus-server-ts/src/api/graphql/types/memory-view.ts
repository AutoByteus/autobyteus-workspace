import { Arg, Field, Float, Int, ObjectType, Query, Resolver } from "type-graphql";
import path from "node:path";
import { GraphQLJSON } from "graphql-scalars";
import { MemoryFileStore } from "../../../agent-memory/store/memory-file-store.js";
import { AgentMemoryService, type AgentMemoryViewOptions } from "../../../agent-memory/services/agent-memory-service.js";
import { AgentMemoryLocationService } from "../../../agent-memory/services/agent-memory-location-service.js";
import { getMemoryExplorerSourceService } from "../../../agent-memory/services/memory-explorer-source-service.js";
import { MemoryViewConverter } from "../converters/memory-view-converter.js";
import { MemoryExplorerSourceInput } from "./memory-explorer-schema.js";
import { readWorkJournalView, WorkJournalView, WorkJournalWindowInput } from "./work-journal-view.js";

@ObjectType()
export class MemoryFileAttachment {
  @Field(() => String)
  uri!: string;

  @Field(() => String)
  fileType!: string;

  @Field(() => String, { nullable: true })
  fileName!: string | null;
}

@ObjectType()
export class MemoryTraceEvent {
  @Field(() => String)
  scope!: string;

  @Field(() => String, { nullable: true })
  id?: string | null;

  @Field(() => String)
  traceType!: string;

  @Field(() => String, { nullable: true })
  sourceEvent?: string | null;

  @Field(() => String, { nullable: true })
  content?: string | null;

  @Field(() => String, { nullable: true })
  toolName?: string | null;

  @Field(() => String, { nullable: true })
  toolCallId?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  toolArgs?: Record<string, unknown> | null;

  @Field(() => GraphQLJSON, { nullable: true })
  toolResult?: unknown | null;

  @Field(() => String, { nullable: true })
  toolError?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  media?: Record<string, string[]> | null;

  @Field(() => [MemoryFileAttachment], { nullable: true })
  fileAttachments?: readonly MemoryFileAttachment[];

  @Field(() => String, { nullable: true })
  turnId!: string | null;

  @Field(() => Int, { nullable: true })
  seq!: number | null;

  @Field(() => Float)
  ts!: number;
}

@ObjectType()
export class RawTraceFileSummary {
  @Field(() => String)
  fileName!: string;

  @Field(() => String)
  kind!: string;

  @Field(() => Int)
  recordCount!: number;

  @Field(() => Int, { nullable: true })
  segmentIndex?: number | null;

  @Field(() => Float, { nullable: true })
  firstTimestamp?: number | null;

  @Field(() => Float, { nullable: true })
  lastTimestamp?: number | null;
}

@ObjectType()
export class AgentMemoryView {
  @Field(() => String)
  runId!: string;

  @Field(() => [MemoryTraceEvent], { nullable: true })
  rawTraces?: MemoryTraceEvent[] | null;

  @Field(() => [RawTraceFileSummary], { nullable: true })
  rawTraceFiles?: RawTraceFileSummary[] | null;

  @Field(() => String, { nullable: true })
  selectedRawTraceFileName?: string | null;

  /** The run's Work Journal when asked for; null when the run has none yet. */
  @Field(() => WorkJournalView, { nullable: true })
  workJournal?: WorkJournalView | null;
}

type RawTraceArgs = {
  includeRawTraces: boolean;
  includeRawTraceFiles: boolean;
  includeArchive: boolean;
  rawTraceLimit?: number | null;
  rawTraceFileName?: string | null;
};

const rawTraceOptions = (args: RawTraceArgs): AgentMemoryViewOptions => ({
  includeRawTraces: args.includeRawTraces,
  includeRawTraceFiles: args.includeRawTraceFiles,
  includeArchive: args.includeArchive,
  rawTraceLimit: args.rawTraceLimit ?? null,
  rawTraceFileName: args.rawTraceFileName ?? null,
});

/** One run's memory view: its raw traces from its memory folder, and its Work Journal when asked for. */
const readRunMemoryView = async (input: {
  memoryDir: string | null;
  agentRunId: string;
  readOnly: boolean;
  options: AgentMemoryViewOptions;
  workJournal: WorkJournalWindowInput | null;
}): Promise<AgentMemoryView> => {
  if (!input.memoryDir) return MemoryViewConverter.toGraphql({ runId: input.agentRunId });
  const store = new MemoryFileStore(path.dirname(input.memoryDir), { runRootSubdir: "", warnOnMissingFiles: !input.readOnly });
  const view = MemoryViewConverter.toGraphql(new AgentMemoryService(store).getRunMemoryView(input.agentRunId, input.options));
  return input.workJournal ? { ...view, workJournal: await readWorkJournalView(input.memoryDir, input.workJournal) } : view;
};

@Resolver()
export class MemoryViewResolver {
  @Query(() => AgentMemoryView)
  async getAgentRunMemoryView(
    @Arg("runId", () => String) runId: string,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("includeRawTraces", () => Boolean, { defaultValue: false }) includeRawTraces = false,
    @Arg("includeRawTraceFiles", () => Boolean, { defaultValue: false }) includeRawTraceFiles = false,
    @Arg("includeArchive", () => Boolean, { defaultValue: false }) includeArchive = false,
    @Arg("rawTraceLimit", () => Int, { nullable: true }) rawTraceLimit?: number | null,
    @Arg("rawTraceFileName", () => String, { nullable: true }) rawTraceFileName?: string | null,
    @Arg("workJournal", () => WorkJournalWindowInput, { nullable: true }) workJournal?: WorkJournalWindowInput | null,
  ): Promise<AgentMemoryView> {
    const resolvedSource = await getMemoryExplorerSourceService().resolveSource(source as never);
    const store = new MemoryFileStore(resolvedSource.rootDir, { warnOnMissingFiles: !resolvedSource.readOnly });
    return readRunMemoryView({
      memoryDir: store.getRunDir(runId),
      agentRunId: runId,
      readOnly: resolvedSource.readOnly,
      options: rawTraceOptions({ includeRawTraces, includeRawTraceFiles, includeArchive, rawTraceLimit, rawTraceFileName }),
      workJournal: workJournal ?? null,
    });
  }

  @Query(() => AgentMemoryView)
  async getTeamMemberRunMemoryView(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("includeRawTraces", () => Boolean, { defaultValue: false }) includeRawTraces = false,
    @Arg("includeRawTraceFiles", () => Boolean, { defaultValue: false }) includeRawTraceFiles = false,
    @Arg("includeArchive", () => Boolean, { defaultValue: false }) includeArchive = false,
    @Arg("rawTraceLimit", () => Int, { nullable: true }) rawTraceLimit?: number | null,
    @Arg("rawTraceFileName", () => String, { nullable: true }) rawTraceFileName?: string | null,
    @Arg("workJournal", () => WorkJournalWindowInput, { nullable: true }) workJournal?: WorkJournalWindowInput | null,
  ): Promise<AgentMemoryView> {
    const resolvedSource = await getMemoryExplorerSourceService().resolveSource(source as never);
    const location = await new AgentMemoryLocationService({ memoryDir: resolvedSource.rootDir })
      .resolveTeamMemberLocation({ teamRunId, agentRunId });
    return readRunMemoryView({
      memoryDir: location?.memoryDir ?? null,
      agentRunId,
      readOnly: resolvedSource.readOnly,
      options: rawTraceOptions({ includeRawTraces, includeRawTraceFiles, includeArchive, rawTraceLimit, rawTraceFileName }),
      workJournal: workJournal ?? null,
    });
  }

  @Query(() => AgentMemoryView)
  async getAgentOrgMemberRunMemoryView(
    @Arg("orgRunId", () => String) orgRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("includeRawTraces", () => Boolean, { defaultValue: false }) includeRawTraces = false,
    @Arg("includeRawTraceFiles", () => Boolean, { defaultValue: false }) includeRawTraceFiles = false,
    @Arg("includeArchive", () => Boolean, { defaultValue: false }) includeArchive = false,
    @Arg("rawTraceLimit", () => Int, { nullable: true }) rawTraceLimit?: number | null,
    @Arg("rawTraceFileName", () => String, { nullable: true }) rawTraceFileName?: string | null,
    @Arg("workJournal", () => WorkJournalWindowInput, { nullable: true }) workJournal?: WorkJournalWindowInput | null,
  ): Promise<AgentMemoryView> {
    const resolvedSource = await getMemoryExplorerSourceService().resolveSource(source as never);
    const location = await new AgentMemoryLocationService({ memoryDir: resolvedSource.rootDir })
      .resolveAgentOrgMemberLocation({ orgRunId, agentRunId });
    return readRunMemoryView({
      memoryDir: location?.memoryDir ?? null,
      agentRunId,
      readOnly: resolvedSource.readOnly,
      options: rawTraceOptions({ includeRawTraces, includeRawTraceFiles, includeArchive, rawTraceLimit, rawTraceFileName }),
      workJournal: workJournal ?? null,
    });
  }
}
