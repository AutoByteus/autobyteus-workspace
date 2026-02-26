import { GraphQLISODateTime } from "type-graphql";

const parseDateValue = (value: unknown): Date => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("DateTime cannot represent an invalid Date instance");
    }
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(`${trimmed}T00:00:00.000Z`);
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  throw new Error(`DateTime cannot represent an invalid date-time-string ${String(value)}`);
};

type ScalarConfig = {
  name: string;
  description?: string;
  serialize: (value: unknown) => string;
  parseValue: (value: unknown) => Date;
  parseLiteral: (ast: { kind: string; value?: string }) => Date;
};

const GraphQLScalarTypeCtor = GraphQLISODateTime.constructor as unknown as new (
  config: ScalarConfig,
) => typeof GraphQLISODateTime;

export const DateTimeScalar = new GraphQLScalarTypeCtor({
  name: "DateTime",
  description: "DateTime scalar supporting ISO strings and date-only YYYY-MM-DD values",
  serialize(value) {
    const parsed = parseDateValue(value);
    return parsed.toISOString();
  },
  parseValue(value) {
    return parseDateValue(value);
  },
  parseLiteral(ast) {
    if (ast.kind !== "StringValue") {
      throw new Error("DateTime must be provided as a string");
    }
    return parseDateValue(ast.value ?? "");
  },
});
