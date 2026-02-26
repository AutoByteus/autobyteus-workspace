import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test from the project root (autobyteus-ts/.env.test) 
// OR the workspace root if shared? 
// Python uses workspace root likely. Let's try to look up.
// Assuming .env.test is in autobyteus-ts root for now, or we can look 2 dirs up.
// The user mentioned "resolve the enviornmetn variables from the .env.test file which we setup for all the test keys".
// Usually this file is at the repo root. 

const repoRootEnv = path.resolve(__dirname, '../../.env.test');
const localEnv = path.resolve(__dirname, '../.env.test');

// Try loading repo root first (overrides?), then local? 
// Dotenv doesn't override by default.
dotenv.config({ path: repoRootEnv });
dotenv.config({ path: localEnv });

console.log(`[Test Setup] Loaded environment variables. OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);
