import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
const hasGit = (() => {
    try {
        execFileSync("git", ["--version"], { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
})();
const describeGit = hasGit ? describe : describe.skip;
describeGit("Skills GraphQL e2e", () => {
    let schema;
    let graphql;
    let tempDir;
    beforeAll(async () => {
        schema = await buildGraphqlSchema();
        const require = createRequire(import.meta.url);
        const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
        const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
        const graphqlModule = await import(graphqlPath);
        graphql = graphqlModule.graphql;
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
    const execGraphql = async (query, variables) => {
        const result = await graphql({
            schema,
            source: query,
            variableValues: variables,
        });
        if (result.errors?.length) {
            throw result.errors[0];
        }
        return result.data;
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
        const created = await execGraphql(createMutation, {
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
        const listQuery = `
      query {
        skills {
          name
        }
      }
    `;
        const listResult = await execGraphql(listQuery);
        expect(listResult.skills.map((skill) => skill.name)).toEqual(["test_skill"]);
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
        const getResult = await execGraphql(getQuery, { name: "test_skill" });
        expect(getResult.skill?.name).toBe("test_skill");
        expect(getResult.skill?.description).toBe("Skill for e2e");
        expect(getResult.skill?.fileCount).toBe(1);
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
        const uploadResult = await execGraphql(uploadMutation, {
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
        const contentResult = await execGraphql(contentQuery, {
            skillName: "file_skill",
            path: "scripts/run.sh",
        });
        expect(contentResult.skillFileContent).toContain("echo 'hello'");
        const treeQuery = `
      query SkillFileTree($name: String!) {
        skillFileTree(name: $name)
      }
    `;
        const treeResult = await execGraphql(treeQuery, {
            name: "file_skill",
        });
        const tree = JSON.parse(treeResult.skillFileTree);
        expect(tree.name).toBe("file_skill");
        const childPaths = new Set(tree.children.map((child) => child.path));
        expect(childPaths.has("SKILL.md")).toBe(true);
        const scriptsNode = tree.children.find((child) => child.name === "scripts");
        const scriptPaths = new Set(scriptsNode.children.map((child) => child.path));
        expect(scriptPaths.has("scripts/run.sh")).toBe(true);
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
        const deleteResult = await execGraphql(deleteMutation, { name: "delete_me" });
        expect(deleteResult.deleteSkill.success).toBe(true);
        const getQuery = `
      query GetSkill($name: String!) {
        skill(name: $name) {
          name
        }
      }
    `;
        const getResult = await execGraphql(getQuery, {
            name: "delete_me",
        });
        expect(getResult.skill).toBeNull();
    });
});
