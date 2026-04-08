import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 8000,
  intervalMs = 50
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

export const waitForStatus = async (
  agentId: string,
  getStatus: () => AgentStatus,
  timeoutMs = 8000,
  intervalMs = 50
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = getStatus();
    if (status === AgentStatus.IDLE || status === AgentStatus.ERROR) {
      return true;
    }
    await delay(intervalMs);
  }
  console.warn(`Agent '${agentId}' did not reach IDLE/ERROR within ${timeoutMs}ms.`);
  return false;
};

export const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

export const toPromptPath = (inputPath: string): string => inputPath.split('\\').join('/');
