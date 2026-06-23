import { Field, Float, InputType, Int, ObjectType } from "type-graphql";

@ObjectType()
export class MemorySyncHubConfigGql {
  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String, { nullable: true })
  advertisedHubBaseUrl?: string | null;

  @Field(() => String, { nullable: true })
  updatedAt?: string | null;
}

@ObjectType()
export class MemorySyncSourceConfigGql {
  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => String, { nullable: true })
  sourceNodeId?: string | null;

  @Field(() => String, { nullable: true })
  displayName?: string | null;

  @Field(() => String, { nullable: true })
  hubBaseUrl?: string | null;

  @Field(() => Boolean)
  hubTokenConfigured!: boolean;

  @Field(() => String, { nullable: true })
  hubTokenPreview?: string | null;

  @Field(() => Boolean)
  backgroundEnabled!: boolean;

  @Field(() => Int)
  intervalMs!: number;

  @Field(() => Int)
  batchSize!: number;

  @Field(() => String, { nullable: true })
  updatedAt?: string | null;
}

@ObjectType()
export class MemoryHubCredentialSummaryGql {
  @Field(() => String)
  credentialId!: string;

  @Field(() => String, { nullable: true })
  label?: string | null;

  @Field(() => String, { nullable: true })
  boundSourceNodeId?: string | null;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String, { nullable: true })
  lastUsedAt?: string | null;

  @Field(() => String, { nullable: true })
  revokedAt?: string | null;

  @Field(() => String)
  status!: string;
}

@ObjectType()
export class MemoryImportSummaryGql {
  @Field(() => String)
  sourceNodeId!: string;

  @Field(() => String, { nullable: true })
  displayName?: string | null;

  @Field(() => String, { nullable: true })
  lastKnownEndpoint?: string | null;

  @Field(() => String, { nullable: true })
  firstImportedAt?: string | null;

  @Field(() => String, { nullable: true })
  lastImportedAt?: string | null;

  @Field(() => String, { nullable: true })
  lastSyncStatus?: string | null;

  @Field(() => String, { nullable: true })
  lastError?: string | null;

  @Field(() => Int)
  fileCount!: number;

  @Field(() => Float)
  totalBytes!: number;

  @Field(() => String, { nullable: true })
  lastCommittedBatchId?: string | null;

  @Field(() => String, { nullable: true })
  lastCommittedAt?: string | null;
}

@ObjectType()
export class MemorySyncSourceStateGql {
  @Field(() => String)
  jobState!: string;

  @Field(() => String, { nullable: true })
  lastSuccessfulSyncAt?: string | null;

  @Field(() => String, { nullable: true })
  lastError?: string | null;

  @Field(() => Int)
  trackedFileCount!: number;
}

@ObjectType()
export class MemoryHubConnectionInfoGql {
  @Field(() => Boolean)
  hubEnabled!: boolean;

  @Field(() => String, { nullable: true })
  advertisedHubBaseUrl?: string | null;

  @Field(() => String, { nullable: true })
  ingestEndpointUrl?: string | null;

  @Field(() => String, { nullable: true })
  healthEndpointUrl?: string | null;

  @Field(() => [MemoryHubCredentialSummaryGql])
  credentials!: MemoryHubCredentialSummaryGql[];

  @Field(() => String, { nullable: true })
  secureTransportWarning?: string | null;
}

@ObjectType()
export class MemorySyncStatusGql {
  @Field(() => MemorySyncHubConfigGql)
  hub!: MemorySyncHubConfigGql;

  @Field(() => MemorySyncSourceConfigGql)
  source!: MemorySyncSourceConfigGql;

  @Field(() => MemoryHubConnectionInfoGql)
  connectionInfo!: MemoryHubConnectionInfoGql;

  @Field(() => MemorySyncSourceStateGql, { nullable: true })
  sourceState?: MemorySyncSourceStateGql | null;

  @Field(() => [MemoryImportSummaryGql])
  imports!: MemoryImportSummaryGql[];

  @Field(() => String, { nullable: true })
  oneTimePlaintextToken?: string | null;
}

@ObjectType()
export class ServerAddressCandidateGql {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  kind!: string;

  @Field(() => String)
  label!: string;

  @Field(() => String)
  baseUrl!: string;

  @Field(() => String)
  source!: string;
}

@ObjectType()
export class MemoryHubCredentialMutationResultGql {
  @Field(() => MemoryHubCredentialSummaryGql)
  credential!: MemoryHubCredentialSummaryGql;

  @Field(() => String, { nullable: true })
  plaintextToken?: string | null;
}

@ObjectType()
export class MemorySyncRunResultGql {
  @Field(() => String)
  startedAt!: string;

  @Field(() => String)
  finishedAt!: string;

  @Field(() => Int)
  scannedFiles!: number;

  @Field(() => Int)
  changedFiles!: number;

  @Field(() => Int)
  unchangedFiles!: number;

  @Field(() => Int)
  deferredFiles!: number;

  @Field(() => Int)
  committedBatches!: number;

  @Field(() => Int)
  duplicateBatches!: number;
}

@ObjectType()
export class MemoryHubConnectionTestResultGql {
  @Field(() => Boolean)
  ok!: boolean;

  @Field(() => Boolean)
  hubEnabled!: boolean;

  @Field(() => String)
  sourceNodeId!: string;

  @Field(() => Boolean)
  authenticated!: boolean;

  @Field(() => String, { nullable: true })
  message?: string | null;
}

@InputType()
export class UpdateMemoryHubConfigInput {
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean | null;

  @Field(() => String, { nullable: true })
  advertisedHubBaseUrl?: string | null;
}

@InputType()
export class UpdateMemorySyncSourceConfigInput {
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean | null;

  @Field(() => String, { nullable: true })
  sourceNodeId?: string | null;

  @Field(() => String, { nullable: true })
  displayName?: string | null;

  @Field(() => String, { nullable: true })
  hubBaseUrl?: string | null;

  @Field(() => String, { nullable: true })
  hubToken?: string | null;

  @Field(() => Boolean, { nullable: true })
  backgroundEnabled?: boolean | null;

  @Field(() => Int, { nullable: true })
  intervalMs?: number | null;

  @Field(() => Int, { nullable: true })
  batchSize?: number | null;
}

@InputType()
export class CreateMemoryHubCredentialInput {
  @Field(() => String, { nullable: true })
  label?: string | null;

  @Field(() => String, { nullable: true })
  boundSourceNodeId?: string | null;
}

@InputType()
export class TestMemoryHubConnectionInput {
  @Field(() => String)
  hubBaseUrl!: string;

  @Field(() => String)
  token!: string;

  @Field(() => String)
  sourceNodeId!: string;
}

