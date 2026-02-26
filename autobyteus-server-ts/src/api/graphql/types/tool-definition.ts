import { Field, ObjectType, registerEnumType } from "type-graphql";

export enum ToolOriginEnum {
  LOCAL = "local",
  MCP = "mcp",
}

export enum ToolParameterTypeEnum {
  STRING = "string",
  INTEGER = "integer",
  FLOAT = "float",
  BOOLEAN = "boolean",
  ENUM = "enum",
  OBJECT = "object",
  ARRAY = "array",
}

registerEnumType(ToolOriginEnum, {
  name: "ToolOriginEnum",
});

registerEnumType(ToolParameterTypeEnum, {
  name: "ToolParameterTypeEnum",
});

@ObjectType()
export class ToolParameterDefinition {
  @Field(() => String)
  name!: string;

  @Field(() => ToolParameterTypeEnum)
  paramType!: ToolParameterTypeEnum;

  @Field(() => String)
  description!: string;

  @Field(() => Boolean)
  required!: boolean;

  @Field(() => String, { nullable: true })
  defaultValue?: string | null;

  @Field(() => [String], { nullable: true })
  enumValues?: string[] | null;
}

@ObjectType()
export class ToolArgumentSchema {
  @Field(() => [ToolParameterDefinition])
  parameters!: ToolParameterDefinition[];
}

@ObjectType()
export class ToolDefinitionDetail {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => ToolOriginEnum)
  origin!: ToolOriginEnum;

  @Field(() => String)
  category!: string;

  @Field(() => ToolArgumentSchema, { nullable: true })
  argumentSchema?: ToolArgumentSchema | null;
}

@ObjectType()
export class ToolCategoryGroup {
  @Field(() => String)
  categoryName!: string;

  @Field(() => [ToolDefinitionDetail])
  tools!: ToolDefinitionDetail[];
}

@ObjectType()
export class ReloadToolSchemaResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => ToolDefinitionDetail, { nullable: true })
  tool?: ToolDefinitionDetail | null;
}
