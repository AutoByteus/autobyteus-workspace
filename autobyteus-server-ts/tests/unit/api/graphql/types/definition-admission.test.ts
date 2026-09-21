import "reflect-metadata";
import { expect, it, vi } from "vitest";
import { buildSchema } from "type-graphql";
import { createRequire } from "node:module";
import type { GraphQLObjectType } from "graphql";
// Match type-graphql's native CommonJS GraphQL realm under Vitest.
const { graphql } = createRequire(import.meta.url)("graphql") as typeof import("graphql");
const scan = vi.hoisted(() => vi.fn());
vi.mock("../../../../../src/api/graphql/studio-application-api-services.js", () => ({
  getStudioDefinitionAdmissionService: () => ({ scan }),
}));
import { DefinitionAdmissionResolver } from "../../../../../src/api/graphql/types/definition-admission.js";

it("projects current-family diagnostics with no numeric field and preserves exact source/dependency/action", async () => {
  const diagnostic = { status: "unavailable", sourceClass: "external_read_only", packageRoot: "/package", definitionPath: "/package/agent-orgs/org",
    definitionId: "org", subjectKind: "agent_org", expectedFamily: "agent_org", code: "DEFINITION_CONTRACT_INVALID",
    reason: "Unsupported keys: schemaVersion", dependencyChain: Object.freeze(["agent_org:org"]), ownerAction: "Use the current definition format." };
  scan.mockResolvedValue([diagnostic, { status: "available" }]);
  const schema = await buildSchema({ resolvers: [DefinitionAdmissionResolver], validate: false });
  const fields = (schema.getType("DefinitionAdmissionDiagnostic") as GraphQLObjectType).getFields();
  expect(Object.keys(fields).sort()).toEqual(["subjectKind", "sourceClass", "packageRoot", "definitionPath", "definitionId", "expectedFamily", "code", "reason", "dependencyChain", "ownerAction"].sort());
  const response = await graphql({ schema, source: `{ definitionAdmissionDiagnostics { subjectKind expectedFamily code reason definitionPath dependencyChain ownerAction } }` });
  expect(response.errors).toBeUndefined();
  expect(response.data?.definitionAdmissionDiagnostics).toEqual([{ subjectKind: diagnostic.subjectKind, expectedFamily: diagnostic.expectedFamily,
    code: diagnostic.code, reason: diagnostic.reason, definitionPath: diagnostic.definitionPath, dependencyChain: [...diagnostic.dependencyChain], ownerAction: diagnostic.ownerAction }]);
});
