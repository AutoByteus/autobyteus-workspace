import { getTestDatabaseUrl } from "./prisma-test-config.js";
import { configureTokenUsageCapability } from "../../src/token-usage/providers/token-usage-capability.js";
import { configureCustomLlmProviderAvailability } from "../../src/llm-management/llm-providers/stores/custom-llm-provider-availability.js";

process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.DATABASE_URL_TEST = process.env.DATABASE_URL;
// Tests start as an install whose migrations have all succeeded; a test that needs a pending capability sets it.
configureTokenUsageCapability({ kind: "READY" });
configureCustomLlmProviderAvailability(true);
