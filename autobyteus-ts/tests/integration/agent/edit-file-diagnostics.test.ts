import { describe, it, beforeEach, afterEach, expect } from 'vitest';
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
import { resetFactory, waitForStatus } from '../helpers/benchmark-utils.js';

const parseTimeoutEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const FLOW_TIMEOUT_MS = parseTimeoutEnv(process.env.LMSTUDIO_FLOW_TEST_TIMEOUT_MS, 180000);
const DIAGNOSTICS_TIMEOUT_MS = parseTimeoutEnv(process.env.AUTOBYTEUS_EDIT_FILE_DIAGNOSTICS_TIMEOUT_MS, 90000);
const shouldRunDiagnostics =
  hasLmstudioConfig() &&
  ['1', 'true', 'yes'].includes((process.env.AUTOBYTEUS_EDIT_FILE_DIAGNOSTICS ?? '').toLowerCase());

const runDiagnostics = shouldRunDiagnostics ? describe : describe.skip;

const EDIT_TOOL_NAMES = new Set(['edit_file', 'replace_in_file', 'insert_in_file', 'write_file']);

const EDITING_TOOL_GUIDANCE =
  'Use absolute file paths for every tool call. ' +
  'You may use edit_file for diff-style patches, replace_in_file for exact block replacement, ' +
  'insert_in_file for exact anchored insertion, and write_file only when rewriting most of a file is simpler. ' +
  'If one editing tool fails, inspect the error and retry with another editing tool. Preserve unrelated content.';

type ScenarioFileSpec = {
  key: string;
  relativePath: string;
  content: string;
  kind: string;
};

type ScenarioExpectation = {
  key: string;
  expected: string;
};

type DifferenceSummary = {
  lineNumber: number;
  expectedLine: string;
  actualLine: string;
};

type ScenarioMismatch = {
  relativePath: string;
  kind: string;
  mismatchType: 'missing_file' | 'final_content_mismatch' | 'untouched_modified';
  summary: string;
};

type ScenarioValidation = {
  success: boolean;
  details: string;
  mismatch?: ScenarioMismatch;
};

type ScenarioRuntime = {
  prompt: string;
  contentKinds: string[];
  validate: () => Promise<ScenarioValidation>;
};

type ScenarioDefinition = {
  id: string;
  description: string;
  setup: (workspace: string) => Promise<ScenarioRuntime>;
};

type ScenarioSpec = {
  id: string;
  description: string;
  successDetails: string;
  files: ScenarioFileSpec[];
  expected: ScenarioExpectation[];
  untouched?: string[];
  prompt: (paths: ScenarioPathMap) => string;
};

type ToolFailureInfo = {
  invocationId: string | null;
  toolName: string;
  category: string;
  error: string;
  argumentsSummary: string | null;
};

type ScenarioRunResult = {
  id: string;
  success: boolean;
  details: string;
  durationMs: number;
  contentKinds: string[];
  succeededEditTools: string[];
  failedEditTools: ToolFailureInfo[];
  mismatch?: ScenarioMismatch;
};

type ScenarioPathMap = Record<string, string>;

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

const extractToolError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const error = (payload as Record<string, unknown>).error;
  return typeof error === 'string' ? error : null;
};

const extractInvocationId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const invocationId = (payload as Record<string, unknown>).invocation_id;
  return typeof invocationId === 'string' ? invocationId : null;
};

const extractToolArguments = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const argumentsValue = (payload as Record<string, unknown>).arguments;
  if (!argumentsValue || typeof argumentsValue !== 'object' || Array.isArray(argumentsValue)) {
    return null;
  }
  return argumentsValue as Record<string, unknown>;
};

const truncateForLog = (value: string, maxLength = 180): string =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;

const summarizeArguments = (argumentsValue: Record<string, unknown> | null): string | null => {
  if (!argumentsValue) {
    return null;
  }
  const summary = Object.entries(argumentsValue).map(([key, value]) => {
    if (typeof value === 'string') {
      return `${key}=${JSON.stringify(truncateForLog(value))}`;
    }
    return `${key}=${JSON.stringify(value)}`;
  });
  return summary.length > 0 ? summary.join(', ') : null;
};

const describeFirstDifference = (expected: string, actual: string): DifferenceSummary | null => {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const maxLength = Math.max(expectedLines.length, actualLines.length);

  for (let index = 0; index < maxLength; index += 1) {
    const expectedLine = expectedLines[index] ?? '<missing>';
    const actualLine = actualLines[index] ?? '<missing>';
    if (expectedLine !== actualLine) {
      return {
        lineNumber: index + 1,
        expectedLine,
        actualLine
      };
    }
  }

  return null;
};

const summarizeDifference = (expected: string, actual: string): string => {
  const diff = describeFirstDifference(expected, actual);
  if (!diff) {
    if (expected.length !== actual.length) {
      return `content length differed: expected ${expected.length} chars, actual ${actual.length} chars`;
    }
    return 'content differed, but no line-level difference was detected';
  }

  return `first differing line ${diff.lineNumber}: expected ${JSON.stringify(diff.expectedLine)}, actual ${JSON.stringify(diff.actualLine)}`;
};

const classifyToolFailure = (error: string): string => {
  const normalized = error.toLowerCase();
  if (normalized.includes('malformed hunk header')) return 'patch_malformed_hunk_header';
  if (normalized.includes('unexpected content outside of hunk header')) return 'patch_unexpected_content';
  if (normalized.includes('unsupported patch line')) return 'patch_unsupported_line';
  if (normalized.includes('could not find context for hunk')) return 'patch_context_not_found';
  if (normalized.includes('patch content is empty')) return 'patch_empty';
  if (normalized.includes('[no_exact_match]')) return 'replace_no_exact_match';
  if (normalized.includes('[multiple_matches]')) return 'replace_multiple_matches';
  if (normalized.includes('[old_text_empty]')) return 'replace_old_text_empty';
  if (normalized.includes('[anchor_not_found]')) return 'insert_anchor_not_found';
  if (normalized.includes('[multiple_anchor_matches]')) return 'insert_multiple_anchor_matches';
  if (normalized.includes('[invalid_anchor_selection]')) return 'insert_invalid_anchor_selection';
  if (normalized.includes('[anchor_text_empty]')) return 'insert_anchor_text_empty';
  if (normalized.includes('does not exist')) return 'path_not_found';
  return 'other';
};

function createScenarioDefinition(spec: ScenarioSpec): ScenarioDefinition {
  return {
    id: spec.id,
    description: spec.description,
    setup: async (workspace) => {
      const pathMap: ScenarioPathMap = {};
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
        contentKinds: spec.files.map((file) => file.kind),
        validate: async () => {
          for (const key of spec.untouched ?? []) {
            const file = fileMap.get(key);
            const absolutePath = pathMap[key];
            if (!file || !absolutePath) {
              return { success: false, details: `Scenario misconfigured: missing untouched file '${key}'.` };
            }
            const current = fsSync.existsSync(absolutePath) ? await fs.readFile(absolutePath, 'utf8') : null;
            if (current !== file.content) {
              const summary = current == null
                ? 'file was deleted'
                : summarizeDifference(file.content, current);
              return {
                success: false,
                details: `${file.relativePath} was modified.`,
                mismatch: {
                  relativePath: file.relativePath,
                  kind: file.kind,
                  mismatchType: 'untouched_modified',
                  summary
                }
              };
            }
          }

          for (const expectation of spec.expected) {
            const file = fileMap.get(expectation.key);
            const absolutePath = pathMap[expectation.key];
            if (!file || !absolutePath) {
              return { success: false, details: `Scenario misconfigured: missing expected file '${expectation.key}'.` };
            }
            if (!fsSync.existsSync(absolutePath)) {
              return {
                success: false,
                details: `${file.relativePath} was not created or is missing.`,
                mismatch: {
                  relativePath: file.relativePath,
                  kind: file.kind,
                  mismatchType: 'missing_file',
                  summary: 'expected file was missing at validation time'
                }
              };
            }
            const current = await fs.readFile(absolutePath, 'utf8');
            if (current !== expectation.expected) {
              return {
                success: false,
                details: `${file.relativePath} did not match the expected edited content.`,
                mismatch: {
                  relativePath: file.relativePath,
                  kind: file.kind,
                  mismatchType: 'final_content_mismatch',
                  summary: summarizeDifference(expectation.expected, current)
                }
              };
            }
          }

          return { success: true, details: spec.successDetails };
        }
      };
    }
  };
}

const DIAGNOSTIC_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'payments_yaml_tuning',
    description: 'Tune a nested YAML config while preserving unrelated sections.',
    successDetails: 'YAML tuning scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'services/payments/config/settings.yaml',
        kind: 'yaml',
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
        kind: 'markdown',
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
        kind: 'typescript',
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
        kind: 'markdown',
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
      `Update ${paths.doc} so that "Publish changelog" is checked off and add a new notes bullet saying "Confirm the rollback owner before deploy." ` +
      `Do not alter the other checklist items or the title.`
  },
  {
    id: 'search_indexer_json_update',
    description: 'Retune a JSON indexer config while preserving sibling docs.',
    successDetails: 'JSON indexer scenario passed.',
    files: [
      {
        key: 'config',
        relativePath: 'services/search/config/indexer.json',
        kind: 'json',
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
        kind: 'markdown',
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
        kind: 'dotenv',
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
        kind: 'toml',
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
      `In ${paths.config}, extend the window end time to 18:30, increase retries.count from 2 to 3, and add jitter_ms = 200 under the retries section. ` +
      `Keep window.start and backoff_ms unchanged.`
  },
  {
    id: 'publish_script_flag_update',
    description: 'Update a release shell script to stop using dry-run.',
    successDetails: 'Release shell scenario passed.',
    files: [
      {
        key: 'script',
        relativePath: 'tools/release/publish.sh',
        kind: 'shell',
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
        kind: 'makefile',
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
        kind: 'python',
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
      `In ${paths.module}, change the status value from "draft" to "ready" and add a generated_by key with value "benchmark" after rows. ` +
      `Preserve the rest of the function formatting.`
  },
  {
    id: 'package_json_script_update',
    description: 'Update a package.json version and add a lint script.',
    successDetails: 'package.json scenario passed.',
    files: [
      {
        key: 'packageJson',
        relativePath: 'packages/ui-kit/package.json',
        kind: 'json',
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
      `In ${paths.packageJson}, bump version from 1.0.0 to 1.0.1 and add a lint script with value "eslint src --max-warnings=0" between build and test. ` +
      `Keep the package name and private flag unchanged.`
  }
].map(createScenarioDefinition);

runDiagnostics('edit_file diagnostics integration (LM Studio)', () => {
  let originalParserEnv: string | undefined;
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
  };
  const shouldEmitConsole = (firstArg: unknown): boolean =>
    typeof firstArg === 'string' && firstArg.startsWith('[edit_file diagnostics]');

  beforeEach(() => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
    console.log = (...args: unknown[]) => {
      if (shouldEmitConsole(args[0])) {
        originalConsole.log(...args);
      }
    };
    console.info = (...args: unknown[]) => {
      if (shouldEmitConsole(args[0])) {
        originalConsole.info(...args);
      }
    };
    console.warn = (...args: unknown[]) => {
      if (shouldEmitConsole(args[0])) {
        originalConsole.warn(...args);
      }
    };
    console.error = (...args: unknown[]) => {
      if (shouldEmitConsole(args[0])) {
        originalConsole.error(...args);
      }
    };
  });

  afterEach(() => {
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactory();
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  async function runScenario(definition: ScenarioDefinition): Promise<ScenarioRunResult> {
    const startedAt = Date.now();
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `edit-file-diagnostics-${definition.id}-`));
    const runtime = await definition.setup(workspace);
    const llm = await createLmstudioLLM({ requireToolChoice: true, temperature: 0 });

    if (!llm) {
      await fs.rm(workspace, { recursive: true, force: true });
      return {
        id: definition.id,
        success: false,
        details: 'LM Studio model unavailable.',
        durationMs: Date.now() - startedAt,
        contentKinds: runtime.contentKinds,
        succeededEditTools: [],
        failedEditTools: []
      };
    }

    const config = new AgentConfig(
      `EditFileDiagnostics_${definition.id}`,
      'Tester',
      `edit_file diagnostics: ${definition.description}`,
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
    const startedToolArguments = new Map<string, string>();
    const succeededToolPayloads: unknown[] = [];
    const failedToolPayloads: unknown[] = [];
    let turnCompletedCount = 0;

    const onToolStarted = (payload?: unknown) => {
      const invocationId = extractInvocationId(payload);
      if (!invocationId) {
        return;
      }
      const summary = summarizeArguments(extractToolArguments(payload));
      if (summary) {
        startedToolArguments.set(invocationId, summary);
      }
    };
    const onToolSucceeded = (payload?: unknown) => {
      succeededToolPayloads.push(payload ?? null);
    };
    const onToolFailed = (payload?: unknown) => {
      failedToolPayloads.push(payload ?? null);
    };
    const onTurnCompleted = () => {
      turnCompletedCount += 1;
    };

    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_STARTED, onToolStarted);
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
          durationMs: Date.now() - startedAt,
          contentKinds: runtime.contentKinds,
          succeededEditTools: [],
          failedEditTools: []
        };
      }

      await agent.postUserMessage(new AgentInputUserMessage(runtime.prompt));

      const deadline = DIAGNOSTICS_TIMEOUT_MS === 0 ? Number.POSITIVE_INFINITY : Date.now() + DIAGNOSTICS_TIMEOUT_MS;
      let lastValidation: ScenarioValidation | null = null;

      while (Date.now() < deadline) {
        if (succeededToolPayloads.length > 0) {
          lastValidation = await runtime.validate();
          if (lastValidation.success) {
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
            .filter((toolName): toolName is string => toolName !== null && EDIT_TOOL_NAMES.has(toolName))
        )
      );
      const failedEditTools = failedToolPayloads
        .map((payload) => {
          const toolName = extractToolName(payload);
          const error = extractToolError(payload);
          const invocationId = extractInvocationId(payload);
          if (!toolName || !EDIT_TOOL_NAMES.has(toolName) || !error) {
            return null;
          }
          return {
            invocationId,
            toolName,
            category: classifyToolFailure(error),
            error,
            argumentsSummary: invocationId ? (startedToolArguments.get(invocationId) ?? null) : null
          } satisfies ToolFailureInfo;
        })
        .filter((item): item is ToolFailureInfo => item !== null);

      return {
        id: definition.id,
        success: validation.success,
        details: validation.details,
        durationMs,
        contentKinds: runtime.contentKinds,
        succeededEditTools,
        failedEditTools,
        mismatch: validation.mismatch
      };
    } catch (error) {
      return {
        id: definition.id,
        success: false,
        details: `Unhandled scenario error: ${String(error)}`,
        durationMs: Date.now() - startedAt,
        contentKinds: runtime.contentKinds,
        succeededEditTools: [],
        failedEditTools: []
      };
    } finally {
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_STARTED, onToolStarted);
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
    `logs diagnostic failure reasons across ${DIAGNOSTIC_SCENARIOS.length} focused edit scenarios`,
    async () => {
      const results: ScenarioRunResult[] = [];

      for (const scenario of DIAGNOSTIC_SCENARIOS) {
        const result = await runScenario(scenario);
        results.push(result);
        const failureSummary = result.failedEditTools.length === 0
          ? 'none'
          : result.failedEditTools.map((tool) => {
            const args = tool.argumentsSummary ? ` args={${tool.argumentsSummary}}` : '';
            return `${tool.toolName}:${tool.category}${args} error=${JSON.stringify(truncateForLog(tool.error, 220))}`;
          }).join(' | ');
        const mismatchSummary = result.mismatch
          ? ` mismatch=${result.mismatch.mismatchType} (${result.mismatch.kind}) ${result.mismatch.summary}`
          : '';
        console.info(
          `[edit_file diagnostics] ${scenario.id}: ${result.success ? 'PASS' : 'FAIL'} ` +
          `kinds=[${result.contentKinds.join(', ')}] ` +
          `successTools=[${result.succeededEditTools.join(', ') || 'none'}] ` +
          `failedTools=[${failureSummary}] ` +
          `details=${result.details}.${mismatchSummary} (${(result.durationMs / 1000).toFixed(1)}s)`
        );
      }

      const successCount = results.filter((result) => result.success).length;
      const successRate = successCount / DIAGNOSTIC_SCENARIOS.length;
      const averageDurationMs =
        results.reduce((total, result) => total + result.durationMs, 0) / DIAGNOSTIC_SCENARIOS.length;

      const failureCategoryCounts = new Map<string, number>();
      const mismatchTypeCounts = new Map<string, number>();
      const contentKindOutcomes = new Map<string, { pass: number; total: number }>();

      for (const result of results) {
        for (const failure of result.failedEditTools) {
          failureCategoryCounts.set(failure.category, (failureCategoryCounts.get(failure.category) ?? 0) + 1);
        }
        if (result.mismatch) {
          mismatchTypeCounts.set(
            result.mismatch.mismatchType,
            (mismatchTypeCounts.get(result.mismatch.mismatchType) ?? 0) + 1
          );
        }
        const uniqueKinds = new Set(result.contentKinds);
        for (const kind of uniqueKinds) {
          const current = contentKindOutcomes.get(kind) ?? { pass: 0, total: 0 };
          current.total += 1;
          if (result.success) {
            current.pass += 1;
          }
          contentKindOutcomes.set(kind, current);
        }
      }

      const failureCategorySummary = Array.from(failureCategoryCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([category, count]) => `${category}=${count}`)
        .join(', ') || 'none';
      const mismatchSummary = Array.from(mismatchTypeCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([category, count]) => `${category}=${count}`)
        .join(', ') || 'none';
      const contentKindSummary = Array.from(contentKindOutcomes.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([kind, stats]) => `${kind}=${stats.pass}/${stats.total}`)
        .join(', ');

      console.info(
        `[edit_file diagnostics] summary: ${successCount}/${DIAGNOSTIC_SCENARIOS.length} passed ` +
        `(${(successRate * 100).toFixed(1)}%), avg ${(averageDurationMs / 1000).toFixed(1)}s.`
      );
      console.info(`[edit_file diagnostics] failure categories: ${failureCategorySummary}`);
      console.info(`[edit_file diagnostics] mismatch types: ${mismatchSummary}`);
      console.info(`[edit_file diagnostics] content kinds: ${contentKindSummary}`);

      expect(results).toHaveLength(DIAGNOSTIC_SCENARIOS.length);
    },
    FLOW_TIMEOUT_MS
  );
});
