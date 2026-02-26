import { describe, it, expect, beforeEach } from 'vitest';
import { ActivationPolicy } from '../../../../src/agent-team/task-notification/activation-policy.js';
import type { Task } from '../../../../src/task-management/task.js';

const createMockTask = (assignee: string): Task => ({ assignee_name: assignee } as Task);

describe('ActivationPolicy', () => {
  let policy: ActivationPolicy;

  beforeEach(() => {
    policy = new ActivationPolicy('test_policy_team');
  });

  it('initializes with empty activated agents set', () => {
    expect(policy.getActivatedAgents()).toEqual(new Set());
  });

  it('activates new agents on first call', () => {
    const runnableTasks = [createMockTask('AgentA'), createMockTask('AgentB'), createMockTask('AgentA')];

    const activations = policy.determineActivations(runnableTasks);

    expect(activations.sort()).toEqual(['AgentA', 'AgentB']);
    expect(policy.getActivatedAgents()).toEqual(new Set(['AgentA', 'AgentB']));
  });

  it('returns empty list if no new agents', () => {
    policy.reset();
    policy.determineActivations([createMockTask('AgentA'), createMockTask('AgentB')]);
    const runnableTasks = [createMockTask('AgentA'), createMockTask('AgentB')];

    const activations = policy.determineActivations(runnableTasks);

    expect(activations).toEqual([]);
    expect(policy.getActivatedAgents()).toEqual(new Set(['AgentA', 'AgentB']));
  });

  it('activates new agent on handoff', () => {
    policy.determineActivations([createMockTask('AgentA')]);
    const runnableTasks = [createMockTask('AgentB')];

    const activations = policy.determineActivations(runnableTasks);

    expect(activations).toEqual(['AgentB']);
    expect(policy.getActivatedAgents()).toEqual(new Set(['AgentA', 'AgentB']));
  });

  it('activates only new agents in mixed batch', () => {
    policy.determineActivations([createMockTask('AgentA')]);
    const runnableTasks = [createMockTask('AgentA'), createMockTask('AgentB')];

    const activations = policy.determineActivations(runnableTasks);

    expect(activations).toEqual(['AgentB']);
    expect(policy.getActivatedAgents()).toEqual(new Set(['AgentA', 'AgentB']));
  });

  it('reset clears activation state', () => {
    policy.determineActivations([createMockTask('AgentA'), createMockTask('AgentB')]);

    policy.reset();

    expect(policy.getActivatedAgents()).toEqual(new Set());
  });

  it('activates after reset', () => {
    policy.determineActivations([createMockTask('AgentA')]);
    policy.reset();

    const activations = policy.determineActivations([createMockTask('AgentA')]);

    expect(activations).toEqual(['AgentA']);
    expect(policy.getActivatedAgents()).toEqual(new Set(['AgentA']));
  });

  it('returns empty list for empty input', () => {
    const activations = policy.determineActivations([]);

    expect(activations).toEqual([]);
    expect(policy.getActivatedAgents()).toEqual(new Set());
  });
});
