import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { getTestDatabaseUrl } from "./prisma-test-config.js";
const envPath = path.resolve(process.cwd(), ".env.test");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}
process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL;
