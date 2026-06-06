import { describe, expect, it } from "vitest";
import { toDomainSelfEvolutionConfigOverride } from "../../src/api/graphql/types/self-evolution-graphql-converters.js";

describe("self-evolution GraphQL converters", () => {
  it("preserves omitted versus explicit clear for run-launch inputs", () => {
    expect(toDomainSelfEvolutionConfigOverride(undefined)).toBeUndefined();
    expect(toDomainSelfEvolutionConfigOverride(null)).toBeNull();
  });
});
