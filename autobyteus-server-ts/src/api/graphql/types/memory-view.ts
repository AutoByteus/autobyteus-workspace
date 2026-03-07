import { Arg, Field, Float, Int, ObjectType, Query, Resolver } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { MemoryFileStore } from "../../../agent-memory-view/store/memory-file-store.js";
import { AgentMemoryViewService } from "../../../agent-memory-view/services/agent-memory-view-service.js";
import { TeamMemberMemoryLayoutStore } from "../../../run-history/store/team-member-memory-layout-store.js";
import { MemoryViewConverter } from "../converters/memory-view-converter.js";

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
  @Field(() => String)
  traceType!: string;

  @Field(() => String, { nullable: true })
  content?: string | null;

  @Field(() => String, { nullable: true })
  toolName?: string | null;

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
export class MemoryConversationEntry {
  @Field(() => String)
  kind!: string;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => String, { nullable: true })
  content?: string | null;

  @Field(() => String, { nullable: true })
  toolName?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  toolArgs?: Record<string, unknown> | null;

  @Field(() => GraphQLJSON, { nullable: true })
  toolResult?: unknown | null;

  @Field(() => String, { nullable: true })
  toolError?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  media?: Record<string, string[]> | null;

  @Field(() => Float, { nullable: true })
  ts?: number | null;
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

  @Field(() => [MemoryConversationEntry], { nullable: true })
  conversation?: MemoryConversationEntry[] | null;

  @Field(() => [MemoryTraceEvent], { nullable: true })
  rawTraces?: MemoryTraceEvent[] | null;
}

@Resolver()
export class MemoryViewResolver {
  @Query(() => AgentMemoryView)
  async getRunMemoryView(
    @Arg("runId", () => String) runId: string,
    @Arg("includeWorkingContext", () => Boolean, { defaultValue: true })
    includeWorkingContext = true,
    @Arg("includeEpisodic", () => Boolean, { defaultValue: true }) includeEpisodic = true,
    @Arg("includeSemantic", () => Boolean, { defaultValue: true }) includeSemantic = true,
    @Arg("includeConversation", () => Boolean, { defaultValue: true }) includeConversation = true,
    @Arg("includeRawTraces", () => Boolean, { defaultValue: false }) includeRawTraces = false,
    @Arg("includeArchive", () => Boolean, { defaultValue: false }) includeArchive = false,
    @Arg("rawTraceLimit", () => Int, { nullable: true }) rawTraceLimit?: number | null,
    @Arg("conversationLimit", () => Int, { nullable: true }) conversationLimit?: number | null,
  ): Promise<AgentMemoryView> {
    const baseDir = appConfigProvider.config.getMemoryDir();
    const store = new MemoryFileStore(baseDir);
    const service = new AgentMemoryViewService(store);
    const view = service.getRunMemoryView(runId, {
      includeWorkingContext,
      includeEpisodic,
      includeSemantic,
      includeConversation,
      includeRawTraces,
      includeArchive,
      rawTraceLimit: rawTraceLimit ?? null,
      conversationLimit: conversationLimit ?? null,
    });
    return MemoryViewConverter.toGraphql(view);
  }

  @Query(() => AgentMemoryView)
  async getTeamMemberRunMemoryView(
    @Arg("teamRunId", () => String) teamRunId: string,
    @Arg("memberRunId", () => String) memberRunId: string,
    @Arg("includeWorkingContext", () => Boolean, { defaultValue: true })
    includeWorkingContext = true,
    @Arg("includeEpisodic", () => Boolean, { defaultValue: true }) includeEpisodic = true,
    @Arg("includeSemantic", () => Boolean, { defaultValue: true }) includeSemantic = true,
    @Arg("includeConversation", () => Boolean, { defaultValue: true }) includeConversation = true,
    @Arg("includeRawTraces", () => Boolean, { defaultValue: false }) includeRawTraces = false,
    @Arg("includeArchive", () => Boolean, { defaultValue: false }) includeArchive = false,
    @Arg("rawTraceLimit", () => Int, { nullable: true }) rawTraceLimit?: number | null,
    @Arg("conversationLimit", () => Int, { nullable: true }) conversationLimit?: number | null,
  ): Promise<AgentMemoryView> {
    const baseDir = appConfigProvider.config.getMemoryDir();
    const layoutStore = new TeamMemberMemoryLayoutStore(baseDir);
    const teamDir = layoutStore.getTeamDirPath(teamRunId);
    const store = new MemoryFileStore(teamDir, { runRootSubdir: "" });
    const service = new AgentMemoryViewService(store);
    const view = service.getRunMemoryView(memberRunId, {
      includeWorkingContext,
      includeEpisodic,
      includeSemantic,
      includeConversation,
      includeRawTraces,
      includeArchive,
      rawTraceLimit: rawTraceLimit ?? null,
      conversationLimit: conversationLimit ?? null,
    });
    return MemoryViewConverter.toGraphql(view);
  }
}
