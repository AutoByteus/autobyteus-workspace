import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

describe("Server settings GraphQL e2e", () => {
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
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-server-settings-graphql-"));
    fs.writeFileSync(
      path.join(tempDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    appConfigProvider.config.setCustomAppDataDir(tempDir);
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

  it("supports update/list/delete lifecycle for custom server settings", async () => {
    const key = `CUSTOM_SETTING_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const value = "http://legacy-host:9000";

    const upsertMutation = `
      mutation UpdateServerSetting($key: String!, $value: String!) {
        updateServerSetting(key: $key, value: $value)
      }
    `;

    const updated = await execGraphql<{ updateServerSetting: string }>(upsertMutation, {
      key,
      value,
    });
    expect(updated.updateServerSetting).toContain("updated successfully");

    const listQuery = `
      query GetServerSettings {
        getServerSettings {
          key
          value
          description
        }
      }
    `;

    const listed = await execGraphql<{
      getServerSettings: Array<{ key: string; value: string; description: string }>;
    }>(listQuery);

    const created = listed.getServerSettings.find((entry) => entry.key === key);
    expect(created).toBeTruthy();
    expect(created?.value).toBe(value);
    expect(created?.description).toBe("Custom user-defined setting");

    const deleteMutation = `
      mutation DeleteServerSetting($key: String!) {
        deleteServerSetting(key: $key)
      }
    `;

    const deleted = await execGraphql<{ deleteServerSetting: string }>(deleteMutation, { key });
    expect(deleted.deleteServerSetting).toContain("deleted successfully");

    const listedAfterDelete = await execGraphql<{
      getServerSettings: Array<{ key: string }>;
    }>(listQuery);

    expect(listedAfterDelete.getServerSettings.find((entry) => entry.key === key)).toBeUndefined();
  });
});
