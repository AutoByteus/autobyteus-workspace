import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";
import {
  toSkillNameConflictGraphqlError,
  withSkillNameConflictMapping,
} from "../../../../../src/api/graphql/errors/skill-name-conflict-graphql-error.js";
import { SkillNameConflictError } from "../../../../../src/skills/domain/skill-name-conflict-error.js";

describe("SKILL_NAME_CONFLICT GraphQL error (REQ-023)", () => {
  const conflicts = [
    { name: "desk-alpha", existingPath: "/skills/desk-alpha", incomingPath: "/pkg/agents/a/skills/desk-alpha" },
    { name: "desk-beta", existingPath: "/skills/desk-beta", incomingPath: "/pkg/agents/a/skills/desk-beta" },
  ];

  it("carries the code and every conflict in the extensions", async () => {
    const error = await withSkillNameConflictMapping(() => { throw new SkillNameConflictError(conflicts); })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GraphQLError);
    expect((error as GraphQLError).message).toBe("Duplicate skill names: desk-alpha, desk-beta");
    expect((error as GraphQLError).extensions).toEqual({ code: "SKILL_NAME_CONFLICT", conflicts });
  });

  it("passes other errors and results through unchanged", async () => {
    const other = new Error("Directory not found");
    expect(toSkillNameConflictGraphqlError(other)).toBe(other);
    await expect(withSkillNameConflictMapping(() => 42)).resolves.toBe(42);
  });
});
