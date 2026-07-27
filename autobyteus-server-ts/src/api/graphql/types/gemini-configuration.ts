import { Field, ObjectType, registerEnumType } from 'type-graphql';
import type { GeminiConfigurationOption } from '../../../llm-management/services/gemini-configuration-service.js';

export enum GeminiSetupModeGraphql {
  AI_STUDIO = 'AI_STUDIO',
  VERTEX_EXPRESS = 'VERTEX_EXPRESS',
  VERTEX_PROJECT = 'VERTEX_PROJECT',
}

registerEnumType(GeminiSetupModeGraphql, { name: 'GeminiSetupMode' });

@ObjectType()
export class GeminiVertexProjectObject {
  @Field(() => String)
  project!: string;

  @Field(() => String)
  location!: string;
}

@ObjectType()
export class GeminiSetupStateObject {
  @Field(() => GeminiSetupModeGraphql, { nullable: true })
  activeMode!: GeminiConfigurationOption | null;

  @Field(() => Boolean, { nullable: true })
  aiStudioConfigured!: boolean | null;

  @Field(() => Boolean, { nullable: true })
  vertexExpressConfigured!: boolean | null;

  @Field(() => GeminiVertexProjectObject, { nullable: true })
  vertexProject!: GeminiVertexProjectObject | null;
}
