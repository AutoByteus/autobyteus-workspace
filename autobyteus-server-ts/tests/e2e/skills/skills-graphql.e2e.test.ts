import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";

describe("Skills GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempDir: string;

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-skill-graphql-"));
    fs.mkdirSync(path.join(tempDir, "skills"), { recursive: true });
    appConfigProvider.config.setCustomAppDataDir(tempDir);
    SkillService.resetInstance();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  it("creates and queries a skill", async () => {
    const createMutation = `
      mutation CreateSkill($input: CreateSkillInput!) {
        createSkill(input: $input) {
          name
          description
          content
          fileCount
        }
      }
    `;

    const created = await execGraphql<{
      createSkill: { name: string; description: string; content: string; fileCount: number };
    }>(createMutation, {
      input: {
        name: "test_skill",
        description: "Skill for e2e",
        content: "# Test Skill\n\nE2E content",
      },
    });

    expect(created.createSkill.name).toBe("test_skill");
    expect(created.createSkill.description).toBe("Skill for e2e");
    expect(created.createSkill.content).toBe("# Test Skill\n\nE2E content");
    expect(created.createSkill.fileCount).toBe(1);
    expect(fs.existsSync(path.join(tempDir, "skills", "test_skill", ".git"))).toBe(false);

    const listQuery = `
      query {
        skills {
          name
        }
      }
    `;
    const listResult = await execGraphql<{ skills: Array<{ name: string }> }>(listQuery);
    expect(listResult.skills.map((skill) => skill.name)).toContain("test_skill");

    const getQuery = `
      query GetSkill($name: String!) {
        skill(name: $name) {
          name
          description
          content
          fileCount
        }
      }
    `;
    const getResult = await execGraphql<{
      skill: { name: string; description: string; content: string; fileCount: number } | null;
    }>(getQuery, { name: "test_skill" });

    expect(getResult.skill?.name).toBe("test_skill");
    expect(getResult.skill?.description).toBe("Skill for e2e");
    expect(getResult.skill?.fileCount).toBe(1);
  });

  it("does not expose removed skill history fields, operations, or types", async () => {
    const introspectionQuery = `
      query SkillApiRemovalAbsence {
        __schema {
          queryType {
            fields {
              name
            }
          }
          mutationType {
            fields {
              name
            }
          }
          types {
            name
            fields {
              name
            }
            inputFields {
              name
            }
          }
        }
      }
    `;

    const result = await execGraphql<{
      __schema: {
        queryType: { fields: Array<{ name: string }> };
        mutationType: { fields: Array<{ name: string }> };
        types: Array<{
          name: string;
          fields?: Array<{ name: string }> | null;
          inputFields?: Array<{ name: string }> | null;
        }>;
      };
    }>(introspectionQuery);

    const queryNames = result.__schema.queryType.fields.map((field) => field.name);
    const mutationNames = result.__schema.mutationType.fields.map((field) => field.name);
    const typeNames = result.__schema.types.map((type) => type.name);
    const skillType = result.__schema.types.find((type) => type.name === "Skill");
    const skillFieldNames = skillType?.fields?.map((field) => field.name) ?? [];

    const removedQueryNames = [
      `skill${"Versions"}`,
      `skill${"Version"}Diff`,
    ];
    const removedMutationNames = [
      `enableSkill${"Versioning"}`,
      `activateSkill${"Version"}`,
    ];
    const removedTypeNames = [
      `Skill${"Version"}`,
      `Skill${"Diff"}`,
      `EnableSkill${"Versioning"}Input`,
      `ActivateSkill${"Version"}Input`,
    ];
    const removedSkillFieldNames = [
      `is${"Versioned"}`,
      `active${"Version"}`,
    ];

    for (const fieldName of removedQueryNames) {
      expect(queryNames).not.toContain(fieldName);
    }
    for (const fieldName of removedMutationNames) {
      expect(mutationNames).not.toContain(fieldName);
    }
    for (const typeName of removedTypeNames) {
      expect(typeNames).not.toContain(typeName);
    }
    for (const fieldName of removedSkillFieldNames) {
      expect(skillFieldNames).not.toContain(fieldName);
    }
  });

  it("uploads a file and reads content/tree", async () => {
    const createMutation = `
      mutation CreateSkill($input: CreateSkillInput!) {
        createSkill(input: $input) {
          name
        }
      }
    `;
    await execGraphql(createMutation, {
      input: {
        name: "file_skill",
        description: "Skill with files",
        content: "# File Skill",
      },
    });

    const uploadMutation = `
      mutation UploadSkillFile($skillName: String!, $path: String!, $content: String!) {
        uploadSkillFile(skillName: $skillName, path: $path, content: $content)
      }
    `;
    const uploadResult = await execGraphql<{ uploadSkillFile: boolean }>(uploadMutation, {
      skillName: "file_skill",
      path: "scripts/run.sh",
      content: "#!/bin/bash\necho 'hello'",
    });
    expect(uploadResult.uploadSkillFile).toBe(true);

    const contentQuery = `
      query SkillFileContent($skillName: String!, $path: String!) {
        skillFileContent(skillName: $skillName, path: $path)
      }
    `;
    const contentResult = await execGraphql<{ skillFileContent: string }>(contentQuery, {
      skillName: "file_skill",
      path: "scripts/run.sh",
    });
    expect(contentResult.skillFileContent).toContain("echo 'hello'");

    const treeQuery = `
      query SkillFileTree($name: String!) {
        skillFileTree(name: $name)
      }
    `;
    const treeResult = await execGraphql<{ skillFileTree: string }>(treeQuery, {
      name: "file_skill",
    });
    const tree = JSON.parse(treeResult.skillFileTree);

    expect(tree.name).toBe("file_skill");
    const childPaths = new Set(tree.children.map((child: { path: string }) => child.path));
    expect(childPaths.has("SKILL.md")).toBe(true);

    const scriptsNode = tree.children.find((child: { name: string }) => child.name === "scripts");
    const scriptPaths = new Set(
      scriptsNode.children.map((child: { path: string }) => child.path),
    );
    expect(scriptPaths.has("scripts/run.sh")).toBe(true);
  }, 15000);

  it("reloads the skill catalog after external file edits and returns refreshed sources", async () => {
    const skillDir = path.join(tempDir, "skills", "external_skill");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      "---\nname: external_skill\ndescription: External skill\n---\n\nExternal content\n",
      "utf-8",
    );
    const removedSkillDir = path.join(tempDir, "skills", "removed_skill");
    fs.mkdirSync(removedSkillDir, { recursive: true });
    fs.writeFileSync(
      path.join(removedSkillDir, "SKILL.md"),
      "---\nname: removed_skill\ndescription: Removed skill\n---\n\nRemoved content\n",
      "utf-8",
    );

    const reloadMutation = `
      mutation ReloadSkillCatalog {
        reloadSkillCatalog {
          skills {
            name
            description
            content
          }
          skillSources {
            path
            skillCount
            isDefault
          }
        }
      }
    `;

    const initialReload = await execGraphql<{
      reloadSkillCatalog: {
        skills: Array<{ name: string; description: string; content: string }>;
        skillSources: Array<{ path: string; skillCount: number; isDefault: boolean }>;
      };
    }>(reloadMutation);

    expect(initialReload.reloadSkillCatalog.skills).toContainEqual(
      expect.objectContaining({
        name: "external_skill",
        description: "External skill",
        content: "External content",
      }),
    );
    expect(initialReload.reloadSkillCatalog.skillSources).toContainEqual(
      expect.objectContaining({
        path: path.join(tempDir, "skills"),
        skillCount: 2,
        isDefault: true,
      }),
    );

    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      "---\nname: external_skill\ndescription: Updated external skill\n---\n\nUpdated external content\n",
      "utf-8",
    );
    fs.rmSync(removedSkillDir, { recursive: true, force: true });
    const addedSkillDir = path.join(tempDir, "skills", "added_skill");
    fs.mkdirSync(addedSkillDir, { recursive: true });
    fs.writeFileSync(
      path.join(addedSkillDir, "SKILL.md"),
      "---\nname: added_skill\ndescription: Added skill\n---\n\nAdded content\n",
      "utf-8",
    );

    const refreshedReload = await execGraphql<{
      reloadSkillCatalog: {
        skills: Array<{ name: string; description: string; content: string }>;
        skillSources: Array<{ path: string; skillCount: number; isDefault: boolean }>;
      };
    }>(reloadMutation);

    expect(refreshedReload.reloadSkillCatalog.skills).toContainEqual(
      expect.objectContaining({
        name: "external_skill",
        description: "Updated external skill",
        content: "Updated external content",
      }),
    );
    expect(refreshedReload.reloadSkillCatalog.skills).toContainEqual(
      expect.objectContaining({
        name: "added_skill",
        description: "Added skill",
      }),
    );
    expect(refreshedReload.reloadSkillCatalog.skills.map((skill) => skill.name)).not.toContain(
      "removed_skill",
    );
    expect(refreshedReload.reloadSkillCatalog.skillSources).toContainEqual(
      expect.objectContaining({
        path: path.join(tempDir, "skills"),
        skillCount: 2,
        isDefault: true,
      }),
    );
  });

  it("deletes a skill", async () => {
    const createMutation = `
      mutation CreateSkill($input: CreateSkillInput!) {
        createSkill(input: $input) {
          name
        }
      }
    `;
    await execGraphql(createMutation, {
      input: {
        name: "delete_me",
        description: "Skill to delete",
        content: "# Delete Skill",
      },
    });

    const deleteMutation = `
      mutation DeleteSkill($name: String!) {
        deleteSkill(name: $name) {
          success
          message
        }
      }
    `;
    const deleteResult = await execGraphql<{
      deleteSkill: { success: boolean; message: string };
    }>(deleteMutation, { name: "delete_me" });
    expect(deleteResult.deleteSkill.success).toBe(true);

    const getQuery = `
      query GetSkill($name: String!) {
        skill(name: $name) {
          name
        }
      }
    `;
    const getResult = await execGraphql<{ skill: { name: string } | null }>(getQuery, {
      name: "delete_me",
    });
    expect(getResult.skill).toBeNull();
  });
});
