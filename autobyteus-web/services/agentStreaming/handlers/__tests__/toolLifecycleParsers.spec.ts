import { describe, expect, it } from 'vitest';
import {
  parseToolApprovalRequestedPayload,
  parseToolApprovedPayload,
  parseToolDeniedPayload,
  parseToolExecutionFailedPayload,
  parseToolExecutionStartedPayload,
  parseToolExecutionSucceededPayload,
  parseToolLogPayload,
  parseToolApprovalTarget,
} from '../toolLifecycleParsers';

describe('toolLifecycleParsers', () => {
  it('parses valid lifecycle payloads', () => {
    expect(
      parseToolApprovalRequestedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        turn_id: null,
        arguments: { path: '/tmp/a.txt' },
      } as any),
    ).toEqual({
      invocationId: 'inv-1',
      toolName: 'read_file',
      turnId: null,
      arguments: { path: '/tmp/a.txt' },
      approvalTarget: null,
    });

    expect(
      parseToolApprovedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        turn_id: null,
        reason: 'ok',
      } as any),
    )?.toMatchObject({ invocationId: 'inv-1', reason: 'ok' });

    expect(
      parseToolExecutionStartedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        turn_id: null,
        arguments: { path: '/tmp/a.txt' },
      } as any),
    )?.toMatchObject({ invocationId: 'inv-1', arguments: { path: '/tmp/a.txt' } });

    expect(
      parseToolExecutionSucceededPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        turn_id: null,
        arguments: { path: '/tmp/a.txt' },
        result: { content: 'hello' },
      } as any),
    )?.toMatchObject({
      invocationId: 'inv-1',
      arguments: { path: '/tmp/a.txt' },
      result: { content: 'hello' },
    });

    expect(
      parseToolExecutionFailedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        turn_id: null,
        arguments: { path: '/tmp/a.txt' },
        error: 'failure',
      } as any),
    )?.toMatchObject({
      invocationId: 'inv-1',
      arguments: { path: '/tmp/a.txt' },
      error: 'failure',
    });

    expect(
      parseToolDeniedPayload({
        invocation_id: 'inv-1',
        tool_name: 'read_file',
        turn_id: null,
        arguments: { path: '/tmp/a.txt' },
        reason: 'denied',
      } as any),
    )?.toMatchObject({
      invocationId: 'inv-1',
      arguments: { path: '/tmp/a.txt' },
      reason: 'denied',
    });

    expect(
      parseToolLogPayload({
        tool_invocation_id: 'inv-1',
        tool_name: 'read_file',
        turn_id: 'turn-1',
        log_entry: 'log line',
      } as any),
    ).toEqual({
      invocationId: 'inv-1',
      toolName: 'read_file',
      turnId: 'turn-1',
      logEntry: 'log line',
    });
  });

  it('rejects malformed payloads', () => {
    expect(parseToolApprovalRequestedPayload({ invocation_id: '', tool_name: 'x', arguments: {} } as any)).toBeNull();
    expect(parseToolApprovedPayload({ invocation_id: 'inv', tool_name: '' } as any)).toBeNull();
    expect(
      parseToolDeniedPayload({
        invocation_id: 'inv',
        tool_name: 'x',
        reason: null,
        error: null,
      } as any),
    ).toBeNull();
    expect(parseToolExecutionFailedPayload({ invocation_id: 'inv', tool_name: 'x', error: '' } as any)).toBeNull();
    expect(parseToolLogPayload({ tool_invocation_id: 'inv', tool_name: 'x', log_entry: '' } as any)).toBeNull();
  });

  it('parses lifecycle arguments when payload.arguments is serialized JSON', () => {
    expect(
      parseToolExecutionStartedPayload({
        invocation_id: 'inv-json-1',
        tool_name: 'generate_image',
        turn_id: null,
        arguments: '{"prompt":"cute fox","output_file_path":"/tmp/cute-fox.png"}',
      } as any),
    )?.toMatchObject({
      invocationId: 'inv-json-1',
      toolName: 'generate_image',
      arguments: {
        prompt: 'cute fox',
        output_file_path: '/tmp/cute-fox.png',
      },
    });
  });

  it('parses only an exact current Team execution address as an approval target', () => {
    expect(
      parseToolApprovalTarget({
        execution_address: {
          rootTeamRunId: 'root-team-run-1',
          taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
          memberAddress: '/BuildSquad/review_lead',
          taskAgentRunId: null,
        },
      }),
    ).toEqual({
      executionAddress: {
        rootTeamRunId: 'root-team-run-1',
        taskTeamRunIds: ['task-team-outer', 'task-team-inner'],
        memberAddress: '/BuildSquad/review_lead',
        taskAgentRunId: null,
      },
    });
  });

  it('does not reconstruct approval identity from retired route or task-run selectors', () => {
    expect(
      parseToolApprovalRequestedPayload({
        invocation_id: 'inv-legacy',
        tool_name: 'run_bash',
        turn_id: null,
        arguments: { command: 'pwd' },
        member_route_key: 'worker',
        source_route_key: 'worker',
        task_agent_run_id: 'task-agent-run-1',
      } as any),
    ).toMatchObject({
      invocationId: 'inv-legacy',
      approvalTarget: null,
    });
    expect(parseToolApprovalTarget({
      execution_address: {
        rootTeamRunId: 'root-team-run-1',
        taskTeamRunIds: [],
        memberAddress: '/worker',
        taskAgentRunId: 'task-agent-run-1',
        memberRouteKey: 'worker',
      },
    })).toBeNull();
  });
});
