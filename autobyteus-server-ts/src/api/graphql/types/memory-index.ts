import { Arg, Field, Int, ObjectType, Query, Resolver } from "type-graphql";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { MemoryFileStore } from "../../../agent-memory-view/store/memory-file-store.js";
import { AgentMemoryIndexService } from "../../../agent-memory-view/services/agent-memory-index-service.js";
import { MemoryIndexConverter } from "../converters/memory-index-converter.js";

@ObjectType()
export class MemorySnapshotSummary {
  @Field(() => String)
  runId!: string;

  @Field(() => String, { nullable: true })
  lastUpdatedAt?: string | null;

  @Field(() => Boolean)
  hasWorkingContext!: boolean;

  @Field(() => Boolean)
  hasEpisodic!: boolean;

  @Field(() => Boolean)
  hasSemantic!: boolean;

  @Field(() => Boolean)
  hasRawTraces!: boolean;

  @Field(() => Boolean)
  hasRawArchive!: boolean;
}

@ObjectType()
export class MemorySnapshotPage {
  @Field(() => [MemorySnapshotSummary])
  entries!: MemorySnapshotSummary[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;

  @Field(() => Int)
  totalPages!: number;
}

@Resolver()
export class MemoryIndexResolver {
  @Query(() => MemorySnapshotPage)
  async listRunMemorySnapshots(
    @Arg("search", () => String, { nullable: true }) search?: string | null,
    @Arg("page", () => Int, { defaultValue: 1 }) page = 1,
    @Arg("pageSize", () => Int, { defaultValue: 50 }) pageSize = 50,
  ): Promise<MemorySnapshotPage> {
    const baseDir = appConfigProvider.config.getMemoryDir();
    const store = new MemoryFileStore(baseDir);
    const service = new AgentMemoryIndexService(store);
    const snapshotPage = service.listSnapshots(search ?? null, page, pageSize);
    return MemoryIndexConverter.toGraphql(snapshotPage);
  }
}
