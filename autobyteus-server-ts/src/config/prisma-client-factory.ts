import { PrismaClient } from "@prisma/client";
import { appConfigProvider } from "./app-config-provider.js";

export const createConfiguredPrismaClient = (): PrismaClient =>
  new PrismaClient({
    datasources: {
      db: { url: appConfigProvider.config.getOperationalDatabaseUrl() },
    },
  });
