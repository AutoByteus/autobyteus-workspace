import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaAgentTeamDefinitionConverter } from "../../../src/agent-team-definition/converters/prisma-converter.js";

const prisma = new PrismaClient();

const currentFilePath = fileURLToPath(import.meta.url);
const migrationFilePath = path.resolve(
  path.dirname(currentFilePath),
  "../../../prisma/migrations/20260212220000_backfill_team_member_home_node_id/migration.sql",
);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Migration 20260212220000 backfill_team_member_home_node_id", () => {
  it("backfills missing home_node_id values on legacy team-member rows", async () => {
    const uniqueName = `migration-backfill-${Date.now()}`;

    const created = await prisma.agentTeamDefinition.create({
      data: {
        name: uniqueName,
        description: "migration test",
        role: "test",
        coordinatorMemberName: "leader",
        nodes: JSON.stringify([
          {
            member_name: "leader",
            reference_id: "agent-1",
            reference_type: "AGENT",
          },
          {
            member_name: "helper",
            reference_id: "agent-2",
            reference_type: "AGENT",
            home_node_id: "node-remote-1",
          },
        ]),
      },
    });

    const migrationSql = fs.readFileSync(migrationFilePath, "utf8");
    await prisma.$executeRawUnsafe(migrationSql);

    const reloaded = await prisma.agentTeamDefinition.findUnique({
      where: { id: created.id },
    });

    expect(reloaded).toBeTruthy();
    const nodes = JSON.parse(reloaded!.nodes) as Array<Record<string, unknown>>;
    expect(nodes[0]?.home_node_id).toBe("embedded-local");
    expect(nodes[1]?.home_node_id).toBe("node-remote-1");

    const converted = PrismaAgentTeamDefinitionConverter.toDomain(reloaded!);
    expect(converted.nodes[0]?.homeNodeId).toBe("embedded-local");
    expect(converted.nodes[1]?.homeNodeId).toBe("node-remote-1");
  });
});
