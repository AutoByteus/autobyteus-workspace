import { getTestDatabaseUrl } from "./prisma-test-config.js";
import { configureTokenUsageMigrationReadiness } from "../../src/token-usage/providers/token-usage-migration-readiness.js";

process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL;
configureTokenUsageMigrationReadiness({ kind: "READY" });
