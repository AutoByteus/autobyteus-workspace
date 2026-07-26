import { PrismaClient } from "@prisma/client";
import { appConfigProvider } from "./app-config-provider.js";

export const createConfiguredPrismaClient = (
  databaseUrl = appConfigProvider.config.getOperationalDatabaseUrl(),
): PrismaClient =>
  new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
