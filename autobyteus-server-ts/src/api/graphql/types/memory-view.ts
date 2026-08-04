import { Arg, Field, Float, Int, ObjectType, Query, Resolver } from "type-graphql";
import path from "node:path";
import { GraphQLJSON } from "graphql-scalars";
import { MemoryFileStore } from "../../../agent-memory/store/memory-file-store.js";
import { AgentMemoryService } from "../../../agent-memory/services/agent-memory-service.js";
import { AgentMemoryLocationService } from "../../../agent-memory/services/agent-memory-location-service.js";
import { getMemoryExplorerSourceService } from "../../../agent-memory/services/memory-explorer-source-service.js";
import { MemoryViewConverter } from "../converters/memory-view-converter.js";
import { MemoryExplorerSourceInput } from "./memory-explorer-schema.js";

@ObjectType()
export class MemoryMessage {
  @Field(() => String)
  role!: string;

  @Field(() => String, { nullable: true })
  content?: string | null;

  @Field(() => String, { nullable: true })
  reasoning?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  toolPayload?: Record<string, unknown> | null;

  @Field(() => Float, { nullable: true })
  ts?: number | null;
}

@ObjectType()
export class MemoryTraceEvent {
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

  @Field(() => String)
  turnId!: string;

  @Field(() => Int)
  seq!: number;

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

  @Field(() => [MemoryMessage], { nullable: true })
  workingContext?: MemoryMessage[] | null;

  @Field(() => [GraphQLJSON], { nullable: true })
  episodic?: Array<Record<string, unknown>> | null;

  @Field(() => [GraphQLJSON], { nullable: true })
  semantic?: Array<Record<string, unknown>> | null;

  @Field(() => [MemoryTraceEvent], { nullable: true })
  rawTraces?: MemoryTraceEvent[] | null;

  @Field(() => [RawTraceFileSummary], { nullable: true })
  rawTraceFiles?: RawTraceFileSummary[] | null;

  @Field(() => String, { nullable: true })
  selectedRawTraceFileName?: string | null;
}

@Resolver()
export class MemoryViewResolver {
  @Query(() => AgentMemoryView)
  async getAgentRunMemoryView(
    @Arg("runId", () => String) runId: string,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("includeWorkingContext", () => Boolean, { defaultValue: true })
    includeWorkingContext = true,
    @Arg("includeEpisodic", () => Boolean, { defaultValue: true }) includeEpisodic = true,
    @Arg("includeSemantic", () => Boolean, { defaultValue: true }) includeSemantic = true,
    @Arg("includeRawTraces", () => Boolean, { defaultValue: false }) includeRawTraces = false,
    @Arg("includeRawTraceFiles", () => Boolean, { defaultValue: false }) includeRawTraceFiles = false,
    @Arg("includeArchive", () => Boolean, { defaultValue: false }) includeArchive = false,
    @Arg("rawTraceLimit", () => Int, { nullable: true }) rawTraceLimit?: number | null,
    @Arg("rawTraceFileName", () => String, { nullable: true }) rawTraceFileName?: string | null,
  ): Promise<AgentMemoryView> {
    const resolvedSource = await getMemoryExplorerSourceService().resolveSource(source as never);
    const store = new MemoryFileStore(resolvedSource.rootDir, { warnOnMissingFiles: !resolvedSource.readOnly });
    const service = new AgentMemoryService(store);
    const view = service.getRunMemoryView(runId, {
      includeWorkingContext,
      includeEpisodic,
      includeSemantic,
      includeRawTraces,
      includeRawTraceFiles,
      includeArchive,
      rawTraceLimit: rawTraceLimit ?? null,
      rawTraceFileName: rawTraceFileName ?? null,
    });
    return MemoryViewConverter.toGraphql(view);
  }

  @Query(() => AgentMemoryView)
  async getTeamMemberRunMemoryView(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("agentRunId", () => String) agentRunId: string,
    @Arg("source", () => MemoryExplorerSourceInput, { nullable: true }) source?: MemoryExplorerSourceInput | null,
    @Arg("includeWorkingContext", () => Boolean, { defaultValue: true })
    includeWorkingContext = true,
    @Arg("includeEpisodic", () => Boolean, { defaultValue: true }) includeEpisodic = true,
    @Arg("includeSemantic", () => Boolean, { defaultValue: true }) includeSemantic = true,
    @Arg("includeRawTraces", () => Boolean, { defaultValue: false }) includeRawTraces = false,
    @Arg("includeRawTraceFiles", () => Boolean, { defaultValue: false }) includeRawTraceFiles = false,
    @Arg("includeArchive", () => Boolean, { defaultValue: false }) includeArchive = false,
    @Arg("rawTraceLimit", () => Int, { nullable: true }) rawTraceLimit?: number | null,
    @Arg("rawTraceFileName", () => String, { nullable: true }) rawTraceFileName?: string | null,
  ): Promise<AgentMemoryView> {
    const resolvedSource = await getMemoryExplorerSourceService().resolveSource(source as never);
    const location = await new AgentMemoryLocationService({ memoryDir: resolvedSource.rootDir })
      .resolveTeamMemberLocation({ teamRunId, agentRunId: agentRunId });
    const teamDir = location ? path.dirname(location.memoryDir) : null;
    if (!teamDir) {
      return MemoryViewConverter.toGraphql({ runId: agentRunId });
    }
    const store = new MemoryFileStore(teamDir, { runRootSubdir: "", warnOnMissingFiles: !resolvedSource.readOnly });
    const service = new AgentMemoryService(store);
    const view = service.getRunMemoryView(agentRunId, {
      includeWorkingContext,
      includeEpisodic,
      includeSemantic,
      includeRawTraces,
      includeRawTraceFiles,
      includeArchive,
      rawTraceLimit: rawTraceLimit ?? null,
      rawTraceFileName: rawTraceFileName ?? null,
    });
    return MemoryViewConverter.toGraphql(view);
  }
}
