import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentFactory } from '../../../../src/agent/factory/agent-factory.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForStatus = async (
  context: AgentContext,
  predicate: (status: AgentStatus) => boolean,
  timeoutMs = 8000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate(context.currentStatus)) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

export const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 8000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

export const resetAgentFactory = (): void => {
  (AgentFactory as any).instance = undefined;
};
