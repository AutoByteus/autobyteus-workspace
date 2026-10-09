import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";

/**
 * Unit and integration test files run with a reduced environment.
 *
 * Agent shells spawned by the AutoByteus app inherit the live app's variables
 * (data, memory and database paths, package/skill roots, settings, provider
 * modes and keys). Production code reads several of them straight from
 * `process.env`, so an inherited variable can change a test's result or point
 * it at the user's real data (TESTING.md Rule 2).
 *
 * Before a unit or integration test file imports anything, every variable is
 * removed except the names below:
 * - system essentials the OS, Node, pnpm and Vitest need;
 * - test-owned knobs: opt-in gates, fake-CLI controls and fixture inputs that
 *   unit/integration files read as their own input.
 *
 * Tests that need an app variable (for example `AUTOBYTEUS_MEMORY_DIR` or
 * `DATABASE_URL`) set and restore it themselves. When a new opt-in gated test
 * reads its own variable, add that name here. E2E and other test folders are
 * not affected.
 */
export const TEST_ENVIRONMENT_ALLOWLIST: ReadonlyArray<string | RegExp> = [
  // System essentials.
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "PWD",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LANG",
  /^LC_/,
  "TZ",
  "TERM",
  "COLORTERM",
  "CI",
  "FORCE_COLOR",
  "NO_COLOR",
  "FORCE_TTY",
  "__CF_USER_TEXT_ENCODING",
  /^XDG_/,
  /^(HTTP|HTTPS|NO|ALL)_PROXY$/i,
  // Windows essentials.
  "USERPROFILE",
  "APPDATA",
  "LOCALAPPDATA",
  "SystemRoot",
  "SYSTEMROOT",
  "PATHEXT",
  "ComSpec",
  "COMSPEC",
  "windir",
  "WINDIR",
  // Node, package manager and Vitest/Vite runtime.
  /^NODE_/,
  /^npm_/i,
  /^PNPM_/,
  /^VITEST/,
  "TEST",
  "MODE",
  "BASE_URL",
  "DEV",
  "PROD",
  "SSR",
  // Test-owned knobs read by unit/integration files and their fixtures.
  // CODEX_, CLAUDE_ and LMSTUDIO_ are listed by exact test-owned names only:
  // the same prefixes carry live-app and provider settings
  // (CODEX_APP_SERVER_SANDBOX, CLAUDE_CODE_*, LMSTUDIO_HOSTS), which must not
  // reach the code under test. Tests that exercise those settings set them.
  /^RUN_/,
  /^TEST_/,
  /^FAKE_/,
  /^AGY_/,
  /^IR055_/,
  /^CODEX_(BACKEND|PAIRED_PROBE|NATIVE_SURFACE)_/,
  /^CLAUDE_(FLOW_TEST|BACKEND_EVENT|APPROVAL_STEP)_/,
  /^LMSTUDIO_(FLOW_TEST|EVENT_WAIT|FILE_WAIT)_TIMEOUT_MS$/,
  "LMSTUDIO_MODEL_ID",
  "LMSTUDIO_TARGET_TEXT_MODEL",
  "GROK_BUILD_COMMAND",
  "ANTIGRAVITY_CLI_COMMAND",
  "AUTOBYTEUS_LIVE_E2E_SCENARIOS",
  "AUTOBYTEUS_DOWNLOAD_TEST_URL",
  "AUTOBYTEUS_GITHUB_AGENT_PACKAGE_TEST_URL",
  // Opt-in gate of tests/integration/mcp-server-management/mcp-config-service.integration.test.ts.
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
];

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ISOLATED_TEST_ROOTS = [
  path.join(PACKAGE_ROOT, "tests", "unit") + path.sep,
  path.join(PACKAGE_ROOT, "tests", "integration") + path.sep,
];

export const isAllowedTestEnvironmentVariable = (name: string): boolean =>
  TEST_ENVIRONMENT_ALLOWLIST.some((entry) =>
    typeof entry === "string" ? entry === name : entry.test(name),
  );

const isIsolatedTestFile = (testPath: string | undefined): boolean => {
  if (!testPath) {
    return false;
  }
  const resolved = path.resolve(testPath);
  return ISOLATED_TEST_ROOTS.some((root) => resolved.startsWith(root));
};

if (isIsolatedTestFile(expect.getState().testPath)) {
  for (const name of Object.keys(process.env)) {
    if (!isAllowedTestEnvironmentVariable(name)) {
      delete process.env[name];
    }
  }
}
