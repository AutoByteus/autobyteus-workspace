import { Field, ObjectType, registerEnumType } from 'type-graphql';
import type {
  GeminiConfigurationOperationResult,
  GeminiConfigurationOption,
  GeminiConfigurationStageOutcome,
  GeminiConfigurationState,
} from '../../../llm-management/services/gemini-configuration-service.js';

export enum GeminiConfigurationOptionGraphql {
  AI_STUDIO = 'AI_STUDIO',
  VERTEX_EXPRESS = 'VERTEX_EXPRESS',
  VERTEX_PROJECT = 'VERTEX_PROJECT',
}

export enum GeminiConfigurationOperationGraphql {
  SAVED = 'SAVED',
  ACTIVATED = 'ACTIVATED',
  SAVED_AND_ACTIVATED = 'SAVED_AND_ACTIVATED',
  REMOVED = 'REMOVED',
}

export enum GeminiConfigurationStateGraphql {
  MISSING = 'MISSING',
  CONFIGURED = 'CONFIGURED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export enum GeminiConfigurationOutcomeGraphql {
  SUCCEEDED = 'SUCCEEDED',
  PARTIAL = 'PARTIAL',
}

export enum GeminiConfigurationStageOutcomeGraphql {
  NOT_REQUESTED = 'NOT_REQUESTED',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

registerEnumType(GeminiConfigurationOptionGraphql, {
  name: 'GeminiConfigurationOption',
});
registerEnumType(GeminiConfigurationOperationGraphql, {
  name: 'GeminiConfigurationOperation',
});
registerEnumType(GeminiConfigurationStateGraphql, {
  name: 'GeminiConfigurationState',
});
registerEnumType(GeminiConfigurationOutcomeGraphql, {
  name: 'GeminiConfigurationOutcome',
});
registerEnumType(GeminiConfigurationStageOutcomeGraphql, {
  name: 'GeminiConfigurationStageOutcome',
});

@ObjectType()
export class GeminiConfigurationOperationResultObject
implements GeminiConfigurationOperationResult {
  @Field(() => GeminiConfigurationOperationGraphql)
  operation!: GeminiConfigurationOperationResult['operation'];

  @Field(() => GeminiConfigurationOutcomeGraphql)
  outcome!: GeminiConfigurationOperationResult['outcome'];

  @Field(() => GeminiConfigurationOptionGraphql)
  option!: GeminiConfigurationOption;

  @Field(() => GeminiConfigurationStateGraphql)
  optionStatus!: GeminiConfigurationState;

  @Field(() => GeminiConfigurationOptionGraphql, { nullable: true })
  activeMode!: GeminiConfigurationOption | null;

  @Field(() => GeminiConfigurationStageOutcomeGraphql)
  configurationOutcome!: GeminiConfigurationStageOutcome;

  @Field(() => GeminiConfigurationStageOutcomeGraphql)
  modeOutcome!: GeminiConfigurationStageOutcome;

  @Field(() => String, { nullable: true })
  instructionCode!: string | null;
}
