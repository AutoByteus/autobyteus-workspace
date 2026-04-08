import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { registerEditFileTool } from '../../../src/tools/file/edit-file.js';
import { registerReadFileTool } from '../../../src/tools/file/read-file.js';
import { registerReplaceInFileTool } from '../../../src/tools/file/replace-in-file.js';
import { registerInsertInFileTool } from '../../../src/tools/file/insert-in-file.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { EventType } from '../../../src/events/event-types.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';
import {
  resetFactory,
  waitForStatus
} from '../helpers/benchmark-utils.js';

const parseTimeoutEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const FLOW_TIMEOUT_MS = parseTimeoutEnv(process.env.LMSTUDIO_FLOW_TEST_TIMEOUT_MS, 180000);
const BENCHMARK_TIMEOUT_MS = parseTimeoutEnv(process.env.AUTOBYTEUS_EDIT_FILE_BENCHMARK_TIMEOUT_MS, 90000);
const MIN_SUCCESS_RATE = Number(process.env.AUTOBYTEUS_EDIT_FILE_BENCHMARK_MIN_SUCCESS_RATE ?? '0.6');

const shouldRunBenchmark =
  hasLmstudioConfig() &&
  ['1', 'true', 'yes'].includes((process.env.AUTOBYTEUS_EDIT_FILE_BENCHMARK ?? '').toLowerCase());

const runIntegration = shouldRunBenchmark ? describe : describe.skip;

type ScenarioValidation = {
  success: boolean;
  details: string;
};

type ScenarioRuntime = {
  prompt: string;
  validate: () => Promise<ScenarioValidation>;
};

type ScenarioDefinition = {
  id: string;
  description: string;
  setup: (workspace: string) => Promise<ScenarioRuntime>;
};

type ScenarioRunResult = {
  id: string;
  success: boolean;
  details: string;
  durationMs: number;
};

type ScenarioFileSpec = {
  key: string;
  relativePath: string;
  content: string;
};

type ScenarioExpectation = {
  key: string;
  expected: string;
};

type ScenarioSpec = {
  id: string;
  description: string;
  successDetails: string;
  files: ScenarioFileSpec[];
  expected: ScenarioExpectation[];
  untouched?: string[];
  prompt: (paths: Record<string, string>) => string;
};

const EDIT_TOOL_NAMES = new Set(['edit_file', 'replace_in_file', 'insert_in_file', 'write_file']);

const EDITING_TOOL_GUIDANCE =
  'Use absolute file paths for every tool call. ' +
  'You may use edit_file for diff-style patches, replace_in_file for exact block replacement, ' +
  'insert_in_file for exact anchored insertion, and write_file only when rewriting most of a file is simpler. ' +
  'If one editing tool fails, inspect the error and retry with another editing tool. Preserve unrelated content.';

const normalizeScenarioPrompt = (prompt: string): string =>
  prompt
    .replace(/^Use read_file if needed, but .*?\.\s*/i, '')
    .replace(/^Use absolute file paths for every tool call\.\s*/i, '')
    .trim();

const extractToolName = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const toolName = (payload as Record<string, unknown>).tool_name;
  return typeof toolName === 'string' ? toolName : null;
};

const exactContentMatch = async (filePath: string, expected: string): Promise<boolean> => {
  if (!fsSync.existsSync(filePath)) {
    return false;
  }
  return (await fs.readFile(filePath, 'utf8')) === expected;
};

function createScenarioDefinition(spec: ScenarioSpec): ScenarioDefinition {
  return {
    id: spec.id,
    description: spec.description,
    setup: async (workspace) => {
      const pathMap: Record<string, string> = {};
      const fileMap = new Map<string, ScenarioFileSpec>();

      for (const file of spec.files) {
        const absolutePath = path.join(workspace, file.relativePath);
        pathMap[file.key] = absolutePath;
        fileMap.set(file.key, file);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, file.content, 'utf8');
      }

      return {
        prompt: `${EDITING_TOOL_GUIDANCE} ${normalizeScenarioPrompt(spec.prompt(pathMap))}`,
        validate: async () => {
          for (const key of spec.untouched ?? []) {
            const file = fileMap.get(key);
            const absolutePath = pathMap[key];
            if (!file || !absolutePath) {
              return { success: false, details: `Scenario misconfigured: missing untouched file '${key}'.` };
            }
            const current = fsSync.existsSync(absolutePath) ? await fs.readFile(absolutePath, 'utf8') : null;
            if (current !== file.content) {
              return { success: false, details: `${file.relativePath} was modified.` };
            }
          }

          for (const expectation of spec.expected) {
            const file = fileMap.get(expectation.key);
            const absolutePath = pathMap[expectation.key];
            if (!file || !absolutePath) {
              return { success: false, details: `Scenario misconfigured: missing expected file '${expectation.key}'.` };
            }
            if (!(await exactContentMatch(absolutePath, expectation.expected))) {
              return { success: false, details: `${file.relativePath} did not match the expected edited content.` };
            }
          }

          return { success: true, details: spec.successDetails };
        }
      };
    }
  };
}

const EDIT_FILE_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'payments_yaml_tuning',
    description: 'Tune a nested YAML config while preserving unrelated sections.',
    successDetails: 'YAML tuning scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'services/payments/config/settings.yaml',
        content: `# Payments service defaults
server:
  host: 0.0.0.0
  port: 8080

logging:
  level: info
  format: json

database:
  poolSize: 12
  ssl: true
`
      },
      {
        key: 'sibling',
        relativePath: 'apps/customer-portal/README.md',
        content: '# Customer Portal\nDo not edit this file.\n'
      }
    ],
    expected: [
      {
        key: 'config',
        expected: `# Payments service defaults
server:
  host: 0.0.0.0
  port: 8095
  request_timeout_ms: 15000

logging:
  level: debug
  format: json

database:
  poolSize: 12
  ssl: true
`
      }
    ],
    untouched: ['sibling'],
    prompt: (paths) =>
      `Use read_file if needed, but perform file modifications with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.config}, change server.port from 8080 to 8095, add request_timeout_ms: 15000 under the server block, and change logging.level from info to debug. ` +
      `Keep the comment and database section untouched. Do not modify ${paths.sibling}.`
  },
  {
    id: 'formatter_typescript_update',
    description: 'Update a TypeScript formatter return shape without clobbering the file.',
    successDetails: 'TypeScript formatter scenario passed.',
    files: [
      {
        key: 'formatter',
        relativePath: 'packages/reporting/src/formatter.ts',
        content: `type Summary = {
  title: string;
  status: 'draft' | 'ready';
  count: number;
};

export function buildSummary(count: number): Summary {
  return {
    title: \`Revenue snapshot (\${count})\`,
    status: 'draft',
    count
  };
}
`
      }
    ],
    expected: [
      {
        key: 'formatter',
        expected: `type Summary = {
  title: string;
  status: 'draft' | 'ready';
  count: number;
  generatedBy: string;
};

export function buildSummary(count: number): Summary {
  return {
    title: \`Revenue snapshot (\${count})\`,
    status: 'ready',
    count,
    generatedBy: 'benchmark'
  };
}
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but all edits must be done with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.formatter}, add a generatedBy field to the Summary type and set it to the string "benchmark" in buildSummary. ` +
      `Also change the returned status from 'draft' to 'ready'. Preserve the rest of the file formatting and content.`
  },
  {
    id: 'shiproom_markdown_update',
    description: 'Apply a narrow markdown checklist and notes update.',
    successDetails: 'Markdown shiproom scenario passed.',
    files: [
      {
        key: 'doc',
        relativePath: 'docs/releases/2026-04-shiproom.md',
        content: `# April Shiproom

## Checklist
- [x] Smoke tests
- [ ] Publish changelog
- [ ] Notify support

## Notes
- Keep rollout under 20 minutes.
`
      }
    ],
    expected: [
      {
        key: 'doc',
        expected: `# April Shiproom

## Checklist
- [x] Smoke tests
- [x] Publish changelog
- [ ] Notify support

## Notes
- Keep rollout under 20 minutes.
- Confirm the rollback owner before deploy.
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but perform modifications with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `Update ${paths.doc} so that "Publish changelog" is checked off and add a new notes bullet saying "Confirm the rollback owner before deploy." ` +
      `Do not alter the other checklist items or the title.`
  },
  {
    id: 'ledger_dual_file_update',
    description: 'Edit two related files in one package and keep sibling content untouched.',
    successDetails: 'Dual-file ledger update scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'packages/ledger-api/src/config.ts',
        content: `export const featureFlags = {
  ledgerRebuild: false,
  verboseAudit: false
};

export const runtimeConfig = {
  queueName: 'ledger-jobs',
  workerCount: 2
};
`
      },
      {
        key: 'readme',
        relativePath: 'packages/ledger-api/README.md',
        content: `# Ledger API

Current worker count: 2
Verbose audit logging: disabled
`
      },
      {
        key: 'sibling',
        relativePath: 'packages/mobile-app/README.md',
        content: '# Mobile App\nDo not edit this sibling package.\n'
      }
    ],
    expected: [
      {
        key: 'config',
        expected: `export const featureFlags = {
  ledgerRebuild: false,
  verboseAudit: true
};

export const runtimeConfig = {
  queueName: 'ledger-jobs',
  workerCount: 4
};
`
      },
      {
        key: 'readme',
        expected: `# Ledger API

Current worker count: 4
Verbose audit logging: enabled
`
      }
    ],
    untouched: ['sibling'],
    prompt: (paths) =>
      `Use read_file if needed, but use edit_file for every modification. ` +
      `Use absolute file paths for every tool call. ` +
      `Update ${paths.config} so verboseAudit becomes true and workerCount becomes 4. ` +
      `Then update ${paths.readme} so it says current worker count 4 and verbose audit logging enabled. ` +
      `Do not modify ${paths.sibling}.`
  },
  {
    id: 'search_indexer_json_update',
    description: 'Retune a JSON indexer config while preserving sibling docs.',
    successDetails: 'JSON indexer scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'services/search/config/indexer.json',
        content: `{
  "batchSize": 50,
  "mode": "rebuild",
  "retry": {
    "count": 2,
    "backoffMs": 500
  }
}
`
      },
      {
        key: 'sibling',
        relativePath: 'apps/search-ui/README.md',
        content: '# Search UI\nNo changes expected here.\n'
      }
    ],
    expected: [
      {
        key: 'config',
        expected: `{
  "batchSize": 75,
  "mode": "incremental",
  "retry": {
    "count": 4,
    "backoffMs": 500
  }
}
`
      }
    ],
    untouched: ['sibling'],
    prompt: (paths) =>
      `Use read_file if needed, but perform modifications with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.config}, change batchSize from 50 to 75, change mode from "rebuild" to "incremental", and change retry.count from 2 to 4. ` +
      `Keep retry.backoffMs unchanged and do not modify ${paths.sibling}.`
  },
  {
    id: 'billing_env_rollover',
    description: 'Update a dotenv file with a release ring and queue changes.',
    successDetails: 'Dotenv rollover scenario passed.',
    files: [
      {
        key: 'env',
        relativePath: 'services/billing/.env.staging',
        content: `API_BASE_URL=https://billing.internal
ENABLE_LEDGER=false
QUEUE_CONCURRENCY=2
LOG_LEVEL=info
`
      }
    ],
    expected: [
      {
        key: 'env',
        expected: `API_BASE_URL=https://billing.internal
ENABLE_LEDGER=true
QUEUE_CONCURRENCY=4
LOG_LEVEL=info
RELEASE_RING=canary
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but make all changes with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.env}, turn ENABLE_LEDGER on, change QUEUE_CONCURRENCY from 2 to 4, and append RELEASE_RING=canary after LOG_LEVEL. ` +
      `Keep API_BASE_URL and LOG_LEVEL unchanged.`
  },
  {
    id: 'scheduler_toml_window_update',
    description: 'Adjust a TOML scheduler window and retry settings.',
    successDetails: 'Scheduler TOML scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'ops/scheduler/config.toml',
        content: `[window]
start = "08:00"
end = "17:00"

[retries]
count = 2
backoff_ms = 500
`
      }
    ],
    expected: [
      {
        key: 'config',
        expected: `[window]
start = "08:00"
end = "18:30"

[retries]
count = 3
backoff_ms = 500
jitter_ms = 200
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but use edit_file for changes. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.config}, extend the window end time to 18:30, increase retries.count from 2 to 3, and add jitter_ms = 200 under the retries section. ` +
      `Keep window.start and backoff_ms unchanged.`
  },
  {
    id: 'nginx_proxy_timeout_update',
    description: 'Increase proxy timeouts in one nginx server block only.',
    successDetails: 'nginx proxy scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'infra/nginx/payments.conf',
        content: `server {
  listen 8080;
  location /api/ {
    proxy_pass http://payments_upstream;
    proxy_read_timeout 30s;
  }
}

server {
  listen 8081;
  location /health {
    return 200 'ok';
  }
}
`
      }
    ],
    expected: [
      {
        key: 'config',
        expected: `server {
  listen 8080;
  location /api/ {
    proxy_pass http://payments_upstream;
    proxy_read_timeout 45s;
    proxy_send_timeout 45s;
  }
}

server {
  listen 8081;
  location /health {
    return 200 'ok';
  }
}
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but apply all edits with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.config}, update the /api/ location so proxy_read_timeout becomes 45s and add proxy_send_timeout 45s right after it. ` +
      `Do not change the health server block.`
  },
  {
    id: 'dockerfile_release_base_update',
    description: 'Refresh a service Dockerfile base image and runtime port.',
    successDetails: 'Dockerfile scenario passed.',
    files: [
      {
        key: 'dockerfile',
        relativePath: 'services/checkout/Dockerfile',
        content: `FROM node:20-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

CMD ["node", "server.js"]
`
      }
    ],
    expected: [
      {
        key: 'dockerfile',
        expected: `FROM node:22-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV PORT=8081

CMD ["node", "server.js"]
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but make the change with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.dockerfile}, bump the base image from node:20-alpine to node:22-alpine and add ENV PORT=8081 below ENV NODE_ENV=production. ` +
      `Keep the install and command lines unchanged.`
  },
  {
    id: 'publish_script_flag_update',
    description: 'Update a release shell script to stop using dry-run.',
    successDetails: 'Release shell scenario passed.',
    files: [
      {
        key: 'script',
        relativePath: 'tools/release/publish.sh',
        content: `#!/usr/bin/env bash
set -euo pipefail

pnpm release --dry-run "$@"
`
      }
    ],
    expected: [
      {
        key: 'script',
        expected: `#!/usr/bin/env bash
set -euo pipefail

pnpm release --registry https://registry.npmjs.org "$@"
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but edit the file with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.script}, replace the dry-run release command with pnpm release --registry https://registry.npmjs.org "$@". ` +
      `Keep the shebang and shell options untouched.`
  },
  {
    id: 'makefile_smoke_target_update',
    description: 'Insert a lint step into a Makefile smoke target.',
    successDetails: 'Makefile smoke scenario passed.',
    files: [
      {
        key: 'makefile',
        relativePath: 'services/identity/Makefile',
        content: `smoke:
\tpnpm test:smoke

deploy:
\tpnpm deploy
`
      }
    ],
    expected: [
      {
        key: 'makefile',
        expected: `smoke:
\tpnpm lint
\tpnpm test:smoke

deploy:
\tpnpm deploy
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but make the update with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.makefile}, add a pnpm lint command at the top of the smoke target before pnpm test:smoke. ` +
      `Do not change the deploy target.`
  },
  {
    id: 'python_metrics_summary_update',
    description: 'Update a Python summary builder with a generated_by field.',
    successDetails: 'Python summary scenario passed.',
    files: [
      {
        key: 'module',
        relativePath: 'packages/analytics/reporting.py',
        content: `def build_report(rows: int) -> dict[str, object]:
    return {
        "status": "draft",
        "rows": rows,
    }
`
      }
    ],
    expected: [
      {
        key: 'module',
        expected: `def build_report(rows: int) -> dict[str, object]:
    return {
        "status": "ready",
        "rows": rows,
        "generated_by": "benchmark",
    }
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but do the modification with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.module}, change the status value from "draft" to "ready" and add a generated_by key with value "benchmark" after rows. ` +
      `Preserve the rest of the function formatting.`
  },
  {
    id: 'sql_rollout_window_update',
    description: 'Adjust a SQL rollout migration without disturbing transaction structure.',
    successDetails: 'SQL rollout scenario passed.',
    files: [
      {
        key: 'migration',
        relativePath: 'db/migrations/20260408_enable_reconciliation.sql',
        content: `BEGIN;

UPDATE feature_flags
SET enabled = false
WHERE name = 'reconciliation-v2';

COMMIT;
`
      }
    ],
    expected: [
      {
        key: 'migration',
        expected: `BEGIN;

UPDATE feature_flags
SET enabled = true
WHERE name = 'reconciliation-v2';

UPDATE feature_flags
SET rollout_window = 'nightly'
WHERE name = 'reconciliation-v2';

COMMIT;
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but use edit_file for the update. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.migration}, change enabled from false to true for reconciliation-v2, then add a second UPDATE before COMMIT that sets rollout_window = 'nightly' for the same flag. ` +
      `Keep the BEGIN and COMMIT structure intact.`
  },
  {
    id: 'html_status_panel_update',
    description: 'Refresh an HTML status panel copy without changing structure.',
    successDetails: 'HTML status panel scenario passed.',
    files: [
      {
        key: 'page',
        relativePath: 'apps/ops-console/public/status.html',
        content: `<section class="status-panel">
  <h1>Queue Monitor</h1>
  <p class="state">Status: Paused</p>
  <p class="owner">Owner: TBD</p>
</section>
`
      }
    ],
    expected: [
      {
        key: 'page',
        expected: `<section class="status-panel">
  <h1>Queue Monitor</h1>
  <p class="state">Status: Running</p>
  <p class="owner">Owner: release-bot</p>
</section>
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but edit the file with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.page}, change the status text from "Paused" to "Running" and change the owner text from "TBD" to "release-bot". ` +
      `Do not change the heading or HTML structure.`
  },
  {
    id: 'css_dashboard_card_update',
    description: 'Increase dashboard card padding and add a subtle shadow.',
    successDetails: 'CSS dashboard scenario passed.',
    files: [
      {
        key: 'style',
        relativePath: 'apps/ops-console/src/styles/dashboard.css',
        content: `.card {
  padding: 12px;
  border: 1px solid #d0d7de;
}
`
      }
    ],
    expected: [
      {
        key: 'style',
        expected: `.card {
  padding: 16px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  border: 1px solid #d0d7de;
}
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but use edit_file for changes. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.style}, change padding from 12px to 16px and add box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08); above the border rule. ` +
      `Keep the selector and border rule unchanged.`
  },
  {
    id: 'package_json_script_update',
    description: 'Update a package.json version and add a lint script.',
    successDetails: 'package.json scenario passed.',
    files: [
      {
        key: 'packageJson',
        relativePath: 'packages/ui-kit/package.json',
        content: `{
  "name": "@autobyteus/ui-kit",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "build": "tsup src/index.ts",
    "test": "vitest run"
  }
}
`
      }
    ],
    expected: [
      {
        key: 'packageJson',
        expected: `{
  "name": "@autobyteus/ui-kit",
  "private": true,
  "version": "1.0.1",
  "scripts": {
    "build": "tsup src/index.ts",
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run"
  }
}
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but apply the change with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.packageJson}, bump version from 1.0.0 to 1.0.1 and add a lint script with value "eslint src --max-warnings=0" between build and test. ` +
      `Keep the package name and private flag unchanged.`
  },
  {
    id: 'runbook_mdx_update',
    description: 'Tighten a runbook step list and add a final verification step.',
    successDetails: 'MDX runbook scenario passed.',
    files: [
      {
        key: 'runbook',
        relativePath: 'docs/runbooks/queue-drain.mdx',
        content: `# Queue Drain

1. Pause producers.
2. Drain backlog.
3. Resume consumers.
`
      }
    ],
    expected: [
      {
        key: 'runbook',
        expected: `# Queue Drain

1. Pause producers.
2. Drain backlog to fewer than 20 jobs.
3. Resume consumers.
4. Confirm dashboards are green.
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but make the edit with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.runbook}, change step 2 so it says "Drain backlog to fewer than 20 jobs." and add a new step 4 that says "Confirm dashboards are green." ` +
      `Do not change the title or the other step wording.`
  },
  {
    id: 'daemon_ini_update',
    description: 'Switch a daemon ini file into active mode with more workers.',
    successDetails: 'INI daemon scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'ops/daemon/daemon.ini',
        content: `[daemon]
workers=2
mode=passive

[logging]
level=info
`
      }
    ],
    expected: [
      {
        key: 'config',
        expected: `[daemon]
workers=5
mode=active

[logging]
level=debug
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but use edit_file for the modification. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.config}, change workers from 2 to 5, change mode from passive to active, and change the logging level from info to debug.`
  },
  {
    id: 'xml_feed_mapping_update',
    description: 'Update an XML feed mapping with a renamed price field and availability.',
    successDetails: 'XML feed mapping scenario passed.',
    files: [
      {
        key: 'mapping',
        relativePath: 'integrations/catalog/feed.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<mapping>
  <field name="sku">sku</field>
  <field name="price">price_cents</field>
</mapping>
`
      }
    ],
    expected: [
      {
        key: 'mapping',
        expected: `<?xml version="1.0" encoding="UTF-8"?>
<mapping>
  <field name="sku">sku</field>
  <field name="price">price_amount</field>
  <field name="availability">inventory_status</field>
</mapping>
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but perform the update with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.mapping}, change the price field value from price_cents to price_amount and add a new field named availability with value inventory_status after it. ` +
      `Keep the XML declaration and sku mapping unchanged.`
  },
  {
    id: 'build_config_js_update',
    description: 'Modernize a build config with minification and a target.',
    successDetails: 'Build config JS scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'packages/renderer/build.config.js',
        content: `export default {
  minify: false,
  sourcemap: true,
  outDir: 'dist'
};
`
      }
    ],
    expected: [
      {
        key: 'config',
        expected: `export default {
  minify: true,
  sourcemap: true,
  outDir: 'dist',
  target: 'es2022'
};
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but make the change with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.config}, set minify to true and add target: 'es2022' after outDir, keeping sourcemap enabled. ` +
      `Preserve the object style.`
  },
  {
    id: 'audit_yaml_allowlist_update',
    description: 'Expand a YAML allowlist without disturbing the rest of the policy.',
    successDetails: 'Audit allowlist YAML scenario passed.',
    files: [
      {
        key: 'policy',
        relativePath: 'security/audit/policy.yaml',
        content: `enabled: true
allowlist:
  - services/payments
  - services/search
mode: strict
`
      }
    ],
    expected: [
      {
        key: 'policy',
        expected: `enabled: true
allowlist:
  - services/payments
  - services/search
  - services/checkout
mode: strict
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but apply the update with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.policy}, append services/checkout to the allowlist while keeping enabled and mode unchanged.`
  },
  {
    id: 'workspace_json_task_update',
    description: 'Update a VS Code tasks file with a new default label and problem matcher.',
    successDetails: 'Workspace tasks JSON scenario passed.',
    files: [
      {
        key: 'tasks',
        relativePath: '.vscode/tasks.json',
        content: `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "test",
      "type": "shell",
      "command": "pnpm test"
    }
  ]
}
`
      }
    ],
    expected: [
      {
        key: 'tasks',
        expected: `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "test:ci",
      "type": "shell",
      "command": "pnpm test",
      "problemMatcher": []
    }
  ]
}
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but do the modification with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.tasks}, rename the task label from "test" to "test:ci" and add an empty problemMatcher array after the command field. ` +
      `Keep the version and shell command unchanged.`
  },
  {
    id: 'terraform_vars_update',
    description: 'Edit a terraform vars file with higher capacity and enabled audit logs.',
    successDetails: 'Terraform vars scenario passed.',
    files: [
      {
        key: 'tfvars',
        relativePath: 'infra/terraform/envs/staging/vars.tfvars',
        content: `instance_count = 2
enable_audit_logs = false
region = "eu-central-1"
`
      }
    ],
    expected: [
      {
        key: 'tfvars',
        expected: `instance_count = 3
enable_audit_logs = true
region = "eu-central-1"
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but perform the change with edit_file. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.tfvars}, change instance_count from 2 to 3 and enable audit logs. ` +
      `Do not modify the region value.`
  },
  {
    id: 'csv_threshold_table_update',
    description: 'Update a CSV threshold row while preserving headers and sibling rows.',
    successDetails: 'CSV threshold scenario passed.',
    files: [
      {
        key: 'table',
        relativePath: 'ops/thresholds/retries.csv',
        content: `service,max_retries,timeout_ms
payments,3,15000
search,2,10000
`
      }
    ],
    expected: [
      {
        key: 'table',
        expected: `service,max_retries,timeout_ms
payments,4,20000
search,2,10000
`
      }
    ],
    prompt: (paths) =>
      `Use read_file if needed, but use edit_file for the change. ` +
      `Use absolute file paths for every tool call. ` +
      `In ${paths.table}, update the payments row so max_retries becomes 4 and timeout_ms becomes 20000. ` +
      `Leave the header and search row unchanged.`
  }
].map(createScenarioDefinition);

runIntegration('edit_file scenario benchmark integration (LM Studio)', () => {
  let originalParserEnv: string | undefined;

  beforeEach(() => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  afterEach(() => {
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactory();
  });

  async function runScenario(definition: ScenarioDefinition): Promise<ScenarioRunResult> {
    const startedAt = Date.now();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `edit-file-scenario-${definition.id}-`));
    const runtime = await definition.setup(workspace);
    const llm = await createLmstudioLLM({ requireToolChoice: true, temperature: 0 });
    if (!llm) {
      await fs.rm(workspace, { recursive: true, force: true });
      return {
        id: definition.id,
        success: false,
        details: 'LM Studio model unavailable.',
        durationMs: Date.now() - startedAt
      };
    }

    const config = new AgentConfig(
      `EditFileScenario_${definition.id}`,
      'Tester',
      `edit_file scenario benchmark: ${definition.description}`,
      llm,
      `${EDITING_TOOL_GUIDANCE} Use read_file to inspect files before editing when needed.`,
      [
        registerReadFileTool(),
        registerEditFileTool(),
        registerReplaceInFileTool(),
        registerInsertInFileTool(),
        registerWriteFileTool()
      ],
      true,
      null,
      null,
      null,
      null,
      null,
      workspace
    );

    const factory = new AgentFactory();
    const agent = factory.createAgent(config);
    const notifier = agent.context.statusManager?.notifier ?? null;
    const succeededToolPayloads: unknown[] = [];
    const failedToolPayloads: unknown[] = [];
    let turnCompletedCount = 0;

    const onToolSucceeded = (payload?: unknown) => succeededToolPayloads.push(payload ?? null);
    const onToolFailed = (payload?: unknown) => failedToolPayloads.push(payload ?? null);
    const onTurnCompleted = () => {
      turnCompletedCount += 1;
    };

    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
    notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);

    try {
      agent.start();
      const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus, 10000, 50);
      if (!ready) {
        return {
          id: definition.id,
          success: false,
          details: 'Agent did not become ready.',
          durationMs: Date.now() - startedAt
        };
      }

      await agent.postUserMessage(new AgentInputUserMessage(runtime.prompt));

      const deadline = BENCHMARK_TIMEOUT_MS === 0 ? Number.POSITIVE_INFINITY : Date.now() + BENCHMARK_TIMEOUT_MS;
      let lastValidation: ScenarioValidation | null = null;
      let validationPassedBeforeTurnSettled = false;

      while (Date.now() < deadline) {
        if (succeededToolPayloads.length > 0) {
          lastValidation = await runtime.validate();
          if (lastValidation.success) {
            validationPassedBeforeTurnSettled = turnCompletedCount === 0;
            break;
          }
        }

        if (turnCompletedCount > 0 || agent.context.currentStatus === AgentStatus.ERROR) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await waitForStatus(agent.agentId, () => agent.context.currentStatus, 10000, 50);

      const validation = lastValidation ?? (await runtime.validate());
      const durationMs = Date.now() - startedAt;
      const succeededEditTools = Array.from(
        new Set(
          succeededToolPayloads
            .map(extractToolName)
            .filter((toolName): toolName is string => Boolean(toolName) && EDIT_TOOL_NAMES.has(toolName))
        )
      );
      const failedEditTools = Array.from(
        new Set(
          failedToolPayloads
            .map(extractToolName)
            .filter((toolName): toolName is string => Boolean(toolName) && EDIT_TOOL_NAMES.has(toolName))
        )
      );
      if (!validation.success) {
        const toolSummary =
          `tool successes=${succeededToolPayloads.length}, failures=${failedToolPayloads.length}, ` +
          `edit tools succeeded=[${succeededEditTools.join(', ') || 'none'}], failed=[${failedEditTools.join(', ') || 'none'}]`;
        const timeoutSuffix =
          Number.isFinite(deadline) &&
          Date.now() >= deadline &&
          turnCompletedCount === 0 &&
          agent.context.currentStatus !== AgentStatus.ERROR
            ? ' Timed out before validation passed.'
            : '';
        return {
          id: definition.id,
          success: false,
          details: `${validation.details} ${toolSummary}${timeoutSuffix}`,
          durationMs
        };
      }

      if (succeededEditTools.length === 0) {
        return {
          id: definition.id,
          success: false,
          details: 'Validation passed, but no successful editing tool execution was observed.',
          durationMs
        };
      }

      const completionNote = validationPassedBeforeTurnSettled ? ' Completed before the agent turn fully settled.' : '';
      return {
        id: definition.id,
        success: true,
        details: `${validation.details} Tools used: ${succeededEditTools.join(', ')}.${completionNote}`,
        durationMs
      };
    } catch (error) {
      return {
        id: definition.id,
        success: false,
        details: `Unhandled scenario error: ${String(error)}`,
        durationMs: Date.now() - startedAt
      };
    } finally {
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
      notifier?.unsubscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);
      if (agent.isRunning) {
        await agent.stop(20);
      }
      await llm.cleanup();
      await fs.rm(workspace, { recursive: true, force: true });
    }
  }

  it(
    `meets minimum success rate ${MIN_SUCCESS_RATE} across ${EDIT_FILE_SCENARIOS.length} realistic edit_file scenarios`,
    async () => {
      const results: ScenarioRunResult[] = [];

      for (const scenario of EDIT_FILE_SCENARIOS) {
        const result = await runScenario(scenario);
        results.push(result);
        console.info(
          `[edit_file scenario benchmark] ${scenario.id}: ${result.success ? 'PASS' : 'FAIL'} - ${result.details} (${(result.durationMs / 1000).toFixed(1)}s)`
        );
      }

      const successCount = results.filter((result) => result.success).length;
      const successRate = successCount / EDIT_FILE_SCENARIOS.length;
      const averageDurationMs =
        results.reduce((total, result) => total + result.durationMs, 0) / EDIT_FILE_SCENARIOS.length;
      console.info(
        `[edit_file scenario benchmark] summary: ${successCount}/${EDIT_FILE_SCENARIOS.length} passed (${(successRate * 100).toFixed(1)}%), avg ${(averageDurationMs / 1000).toFixed(1)}s.`
      );

      expect(successRate).toBeGreaterThanOrEqual(MIN_SUCCESS_RATE);
    },
    FLOW_TIMEOUT_MS
  );
});
