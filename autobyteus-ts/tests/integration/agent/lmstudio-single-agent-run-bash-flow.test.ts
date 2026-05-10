import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { EventType } from '../../../src/events/event-types.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { registerRunBashTool } from '../../../src/tools/terminal/tools/run-bash.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';
import {
  parseEnvNumber,
  resetFactory,
  waitForCondition,
  waitForStatus,
} from '../helpers/benchmark-utils.js';

const FLOW_TIMEOUT_MS = parseEnvNumber(process.env.LMSTUDIO_FLOW_TEST_TIMEOUT_MS, 180000);
const ARTIFACT_TIMEOUT_MS = parseEnvNumber(process.env.LMSTUDIO_FILE_WAIT_TIMEOUT_MS, 120000);
const MULTISTEP_FLOW_TIMEOUT_MS = parseEnvNumber(
  process.env.LMSTUDIO_MULTISTEP_FLOW_TEST_TIMEOUT_MS,
  360000,
);
const MULTISTEP_FLOW_ENABLED = ['1', 'true', 'yes'].includes(
  (process.env.AUTOBYTEUS_LMSTUDIO_MULTISTEP_RUN_BASH_FLOW ?? '').toLowerCase(),
);

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('LM Studio single-agent run_bash flow', () => {
  let tempDir: string;
  let originalParserEnv: string | undefined;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lmstudio-run-bash-flow-'));
  });

  afterEach(async () => {
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactory();
    await fs.rm(tempDir, { recursive: true, force: true });
  }, FLOW_TIMEOUT_MS);

  it('uses native LM Studio tool calling to create a realistic nested workspace fixture', async () => {
    const workspace = tempDir;
    const targetDir = path.join(workspace, 'services', 'checkout-api');
    const siblingDir = path.join(workspace, 'apps', 'customer-portal');
    const siblingReadme = path.join(siblingDir, 'README.md');
    const siblingContent = '# Customer Portal\nThis sibling app must not be modified.\n';
    await fs.mkdir(siblingDir, { recursive: true });
    await fs.writeFile(siblingReadme, siblingContent, 'utf8');

    const llm = await createLmstudioLLM({
            temperature: 0,
      forceFactoryDiscovery: true,
    });
    if (!llm) {
      return;
    }
    llm.config.maxTokens = 512;

    const runBashTool = registerRunBashTool();
    const config = new AgentConfig(
      'LmstudioRunBashAgent',
      'Workspace setup tester',
      'Exercises a realistic single-agent run_bash workspace setup flow through LM Studio native tool calls.',
      llm,
      'You must satisfy the user request by calling run_bash. Use provider-native tool calls only.',
      [runBashTool],
      true,
      null,
      null,
      null,
      null,
      null,
      workspace,
    );

    const factory = new AgentFactory();
    const agent = factory.createAgent(config);
    const notifier = agent.context.statusManager?.notifier ?? null;
    const toolSucceededPayloads: unknown[] = [];
    const toolFailedPayloads: unknown[] = [];
    const errorPayloads: unknown[] = [];

    const onToolSucceeded = (payload?: unknown) => toolSucceededPayloads.push(payload ?? null);
    const onToolFailed = (payload?: unknown) => toolFailedPayloads.push(payload ?? null);
    const onError = (payload?: unknown) => errorPayloads.push(payload ?? null);

    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
    notifier?.subscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, onError);

    const setupScript = [
      'set -e',
      'mkdir -p services/checkout-api/config services/checkout-api/scripts services/checkout-api/runtime',
      "cat > services/checkout-api/package.json <<'JSON'",
      '{"name":"checkout-api","version":"0.1.0","private":true}',
      'JSON',
      'printf "PORT=4010\\nLOG_LEVEL=debug\\n" > services/checkout-api/config/env.example',
      "cat > services/checkout-api/scripts/healthcheck.sh <<'SH'",
      '#!/bin/sh',
      'echo ok',
      'SH',
      'chmod +x services/checkout-api/scripts/healthcheck.sh',
      'git -C services/checkout-api init',
      'pwd > services/checkout-api/runtime/workspace-pwd.txt',
    ].join('\n');

    try {
      agent.start();
      const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus, 10000, 50);
      expect(ready).toBe(true);

      await agent.postUserMessage(
        new AgentInputUserMessage(
          [
            'Call run_bash exactly once to create a realistic checkout-api scratch workspace.',
            `Use cwd exactly "${workspace}".`,
            'Use the command below exactly as the command argument.',
            'Do not output a textual [TOOL_CALL] block.',
            'Do not touch apps/customer-portal.',
            'Command:',
            '```bash',
            setupScript,
            '```',
          ].join('\n')
        )
      );

      const artifactsCreated = await waitForCondition(
        () =>
          toolSucceededPayloads.length > 0 &&
          fsSync.existsSync(path.join(targetDir, 'package.json')) &&
          fsSync.existsSync(path.join(targetDir, 'config', 'env.example')) &&
          fsSync.existsSync(path.join(targetDir, 'scripts', 'healthcheck.sh')) &&
          fsSync.existsSync(path.join(targetDir, 'runtime', 'workspace-pwd.txt')) &&
          fsSync.existsSync(path.join(targetDir, '.git')),
        ARTIFACT_TIMEOUT_MS,
        100,
      );
      expect(artifactsCreated).toBe(true);

      expect(toolSucceededPayloads).toHaveLength(1);
      expect(toolFailedPayloads).toHaveLength(0);

      const packageJson = JSON.parse(await fs.readFile(path.join(targetDir, 'package.json'), 'utf8'));
      expect(packageJson).toMatchObject({
        name: 'checkout-api',
        version: '0.1.0',
        private: true,
      });

      await expect(fs.readFile(path.join(targetDir, 'config', 'env.example'), 'utf8')).resolves.toBe(
        'PORT=4010\nLOG_LEVEL=debug\n',
      );
      const healthcheckMode = (await fs.stat(path.join(targetDir, 'scripts', 'healthcheck.sh'))).mode;
      expect(healthcheckMode & 0o111).toBeGreaterThan(0);
      await expect(fs.readFile(path.join(targetDir, 'runtime', 'workspace-pwd.txt'), 'utf8')).resolves.toBe(
        `${workspace}\n`,
      );
      await expect(fs.readFile(siblingReadme, 'utf8')).resolves.toBe(siblingContent);
      expect(fsSync.existsSync(path.join(workspace, '.git'))).toBe(false);

      const errorText = errorPayloads.map((payload) => JSON.stringify(payload)).join('\n');
      expect(errorText).not.toContain('ApiToolCallTextDiagnostic');
      expect(errorText).not.toContain('[TOOL_CALL]');
    } finally {
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
      notifier?.unsubscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, onError);
      if (agent.isRunning) {
        await agent.stop(20);
      }
      await llm.cleanup();
    }
  }, FLOW_TIMEOUT_MS);

  const runMultistepFlow = MULTISTEP_FLOW_ENABLED ? it : it.skip;

  runMultistepFlow(
    'executes a realistic multi-step ops workflow with ten run_bash calls',
    async () => {
      const workspace = tempDir;
      const targetDir = path.join(workspace, 'services', 'checkout-ops');
      const inputDir = path.join(workspace, 'inputs');
      const siblingDir = path.join(workspace, 'apps', 'customer-portal');
      const ordersPath = path.join(inputDir, 'orders.csv');
      const incidentPath = path.join(inputDir, 'incident-notes.md');
      const siblingReadme = path.join(siblingDir, 'README.md');
      const ordersContent = [
        'order_id,amount,status',
        '1001,20,captured',
        '1002,30,captured',
        '1003,25,failed',
        '1004,50,captured',
        '',
      ].join('\n');
      const incidentContent = [
        '# Incident notes',
        'charge retry spike started at 09:30 UTC',
        'checkout-api remained healthy during the rehearsal',
        '',
      ].join('\n');
      const siblingContent = '# Customer Portal\nThis sibling app must not be modified.\n';
      await fs.mkdir(inputDir, { recursive: true });
      await fs.mkdir(siblingDir, { recursive: true });
      await fs.writeFile(ordersPath, ordersContent, 'utf8');
      await fs.writeFile(incidentPath, incidentContent, 'utf8');
      await fs.writeFile(siblingReadme, siblingContent, 'utf8');

      const phaseCommands = [
        {
          cwd: workspace,
          command:
            "mkdir -p services/checkout-ops/runtime && find inputs -maxdepth 1 -type f -print | sort > services/checkout-ops/runtime/input-inventory.txt && printf 'phase=1\\n' >> services/checkout-ops/runtime/execution.log",
        },
        {
          cwd: targetDir,
          command:
            "mkdir -p config docs reports scripts runtime validation && printf '{\"name\":\"checkout-ops\",\"version\":\"0.1.0\",\"private\":true}\\n' > package.json && printf 'phase=2\\n' >> runtime/execution.log",
        },
        {
          cwd: targetDir,
          command:
            "printf 'PORT=4010\\nLOG_LEVEL=debug\\n' > config/env.example && printf 'phase=3\\n' >> runtime/execution.log",
        },
        {
          cwd: targetDir,
          command:
            "awk -F, 'NR>1{count++; total+=$2} END{printf \"order_count=%d\\ntotal_revenue=%d\\n\",count,total}' ../../inputs/orders.csv > reports/order-summary.txt && printf 'phase=4\\n' >> runtime/execution.log",
        },
        {
          cwd: targetDir,
          command:
            "grep -i 'charge retry spike' ../../inputs/incident-notes.md > docs/incident-summary.md && printf '\\nsource=incident-notes.md\\n' >> docs/incident-summary.md && printf 'phase=5\\n' >> runtime/execution.log",
        },
        {
          cwd: targetDir,
          command:
            "printf '#!/bin/sh\\necho checkout-ops-ready\\n' > scripts/smoke-test.sh && chmod +x scripts/smoke-test.sh && ./scripts/smoke-test.sh > runtime/smoke-output.txt && printf 'phase=6\\n' >> runtime/execution.log",
        },
        {
          cwd: targetDir,
          command: "git init && git status > runtime/git-status.txt && printf 'phase=7\\n' >> runtime/execution.log",
        },
        {
          cwd: targetDir,
          command: "find . -maxdepth 3 -type f | sort > runtime/final-tree.txt && printf 'phase=8\\n' >> runtime/execution.log",
        },
        {
          cwd: targetDir,
          command: "wc -l runtime/execution.log > reports/execution-log-lines.txt && printf 'phase=9\\n' >> runtime/execution.log",
        },
        {
          cwd: targetDir,
          command:
            "printf 'multi_step_flow=pass\\nrun_bash_calls_at_least=10\\n' > validation/result.txt && printf 'phase=10\\n' >> runtime/execution.log",
        },
      ];

      const llm = await createLmstudioLLM({
                temperature: 0,
        forceFactoryDiscovery: true,
      });
      if (!llm) {
        return;
      }
      llm.config.maxTokens = 768;

      const runBashTool = registerRunBashTool();
      const config = new AgentConfig(
        'LmstudioMultiStepRunBashAgent',
        'Multi-step ops rehearsal tester',
        'Exercises a realistic multi-step run_bash workflow through LM Studio native tool calls.',
        llm,
        [
          'You must satisfy the user request by using provider-native run_bash tool calls.',
          'Do not output textual [TOOL_CALL] or [TOOL_RESULT] blocks.',
          'Use one run_bash call per operational phase so each phase is auditable.',
          'Do not combine phases into one shell script.',
        ].join(' '),
        [runBashTool],
        true,
        null,
        null,
        null,
        null,
        null,
        workspace,
      );

      const factory = new AgentFactory();
      const agent = factory.createAgent(config);
      const notifier = agent.context.statusManager?.notifier ?? null;
      const toolSucceededPayloads: unknown[] = [];
      const toolFailedPayloads: unknown[] = [];
      const errorPayloads: unknown[] = [];
      let turnCompletedCount = 0;

      const onToolSucceeded = (payload?: unknown) => toolSucceededPayloads.push(payload ?? null);
      const onToolFailed = (payload?: unknown) => toolFailedPayloads.push(payload ?? null);
      const onError = (payload?: unknown) => errorPayloads.push(payload ?? null);
      const onTurnCompleted = () => {
        turnCompletedCount += 1;
      };

      notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
      notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
      notifier?.subscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, onError);
      notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);

      try {
        agent.start();
        const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus, 10000, 50);
        expect(ready).toBe(true);

        await agent.postUserMessage(
          new AgentInputUserMessage(
            [
              'Run a realistic checkout incident-prep workflow. This is intentionally multi-step.',
              `Workspace root: "${workspace}".`,
              `Target service directory: "${targetDir}".`,
              `Source orders CSV: "${ordersPath}".`,
              `Source incident notes: "${incidentPath}".`,
              `Sibling app that must remain unchanged: "${siblingDir}".`,
              '',
              'Use provider-native run_bash only. Execute these ten phases as ten separate run_bash calls.',
              'Use each cwd and command argument exactly. Do not merge phases into one command.',
              ...phaseCommands.map(
                (phase, index) =>
                  [
                    `Phase ${index + 1}:`,
                    `cwd: "${phase.cwd}"`,
                    'command:',
                    '```bash',
                    phase.command,
                    '```',
                  ].join('\n'),
              ),
              '',
              'Do not create .git at the workspace root. Do not modify apps/customer-portal.',
              'Do not answer with final prose until after the validation/result.txt file exists.',
            ].join('\n'),
          ),
        );

        const successCondition = () =>
            toolSucceededPayloads.length >= 10 &&
            fsSync.existsSync(path.join(targetDir, 'validation', 'result.txt')) &&
            fsSync.existsSync(path.join(targetDir, 'runtime', 'smoke-output.txt')) &&
            fsSync.existsSync(path.join(targetDir, 'config', 'env.example')) &&
            fsSync.existsSync(path.join(targetDir, 'reports', 'order-summary.txt'));

        await waitForCondition(
          () =>
            successCondition() ||
            toolFailedPayloads.length > 0 ||
            (errorPayloads.length > 0 && agent.context.currentStatus === AgentStatus.IDLE) ||
            turnCompletedCount > 0,
          MULTISTEP_FLOW_TIMEOUT_MS - 30000,
          500,
        );

        console.info(
          `[lmstudio multi-step run_bash flow] successes=${toolSucceededPayloads.length}, failures=${toolFailedPayloads.length}`,
        );

        expect(successCondition()).toBe(true);
        expect(toolSucceededPayloads.length).toBeGreaterThanOrEqual(10);
        expect(toolFailedPayloads).toHaveLength(0);

        const packageJson = JSON.parse(await fs.readFile(path.join(targetDir, 'package.json'), 'utf8'));
        expect(packageJson).toMatchObject({
          name: 'checkout-ops',
          version: '0.1.0',
          private: true,
        });

        const envExample = await fs.readFile(path.join(targetDir, 'config', 'env.example'), 'utf8');
        expect(envExample).toContain('PORT=4010');
        expect(envExample).toContain('LOG_LEVEL=debug');

        const orderSummary = await fs.readFile(path.join(targetDir, 'reports', 'order-summary.txt'), 'utf8');
        expect(orderSummary).toContain('order_count=4');
        expect(orderSummary).toContain('total_revenue=125');

        const incidentSummary = await fs.readFile(path.join(targetDir, 'docs', 'incident-summary.md'), 'utf8');
        expect(incidentSummary.toLowerCase()).toContain('charge retry spike');

        const smokeScriptPath = path.join(targetDir, 'scripts', 'smoke-test.sh');
        const smokeScriptMode = (await fs.stat(smokeScriptPath)).mode;
        expect(smokeScriptMode & 0o111).toBeGreaterThan(0);
        const smokeOutput = await fs.readFile(path.join(targetDir, 'runtime', 'smoke-output.txt'), 'utf8');
        expect(smokeOutput).toContain('checkout-ops-ready');

        const validationResult = await fs.readFile(path.join(targetDir, 'validation', 'result.txt'), 'utf8');
        expect(validationResult).toContain('multi_step_flow=pass');
        expect(validationResult).toContain('run_bash_calls_at_least=10');
        const executionLog = await fs.readFile(path.join(targetDir, 'runtime', 'execution.log'), 'utf8');
        expect((executionLog.match(/^phase=/gm) ?? []).length).toBeGreaterThanOrEqual(10);

        expect(fsSync.existsSync(path.join(targetDir, '.git'))).toBe(true);
        expect(fsSync.existsSync(path.join(workspace, '.git'))).toBe(false);
        await expect(fs.readFile(ordersPath, 'utf8')).resolves.toBe(ordersContent);
        await expect(fs.readFile(incidentPath, 'utf8')).resolves.toBe(incidentContent);
        await expect(fs.readFile(siblingReadme, 'utf8')).resolves.toBe(siblingContent);

        const errorText = errorPayloads.map((payload) => JSON.stringify(payload)).join('\n');
        expect(errorText).not.toContain('ApiToolCallTextDiagnostic');
        expect(errorText).not.toContain('[TOOL_CALL]');
      } finally {
        notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
        notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
        notifier?.unsubscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, onError);
        notifier?.unsubscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);
        if (agent.isRunning) {
          await agent.stop(20);
        }
        await llm.cleanup();
      }
    },
    MULTISTEP_FLOW_TIMEOUT_MS,
  );
});
