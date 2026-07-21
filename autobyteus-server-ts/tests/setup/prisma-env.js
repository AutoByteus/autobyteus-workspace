import { getTestDatabaseUrl } from "./prisma-test-config.js";
process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL;
