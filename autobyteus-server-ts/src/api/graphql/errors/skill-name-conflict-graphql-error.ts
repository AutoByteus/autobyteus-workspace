import { GraphQLError } from "graphql";
import { SkillNameConflictError } from "../../../skills/domain/skill-name-conflict-error.js";

/**
 * Surfaces a duplicate skill name as a structured GraphQL error (REQ-023):
 * `extensions: { code: 'SKILL_NAME_CONFLICT', conflicts: [{ name, existingPath, incomingPath }] }`.
 * Any other error passes through unchanged.
 */
export const toSkillNameConflictGraphqlError = (error: unknown): unknown =>
  error instanceof SkillNameConflictError
    ? new GraphQLError(error.message, {
        extensions: { code: error.code, conflicts: error.conflicts },
      })
    : error;

export const withSkillNameConflictMapping = async <T>(operation: () => T | Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    throw toSkillNameConflictGraphqlError(error);
  }
};
