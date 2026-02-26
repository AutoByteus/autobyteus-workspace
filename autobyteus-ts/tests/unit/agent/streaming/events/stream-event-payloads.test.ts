import { describe, it, expect } from 'vitest';
import {
  ArtifactPersistedData,
  createArtifactPersistedData,
  ArtifactUpdatedData,
  createArtifactUpdatedData,
  AssistantChunkData,
  createAssistantChunkData,
  ToDoListUpdateData,
  createTodoListUpdateData,
  AgentStatusUpdateData,
  createAgentStatusUpdateData,
  ErrorEventData,
  createErrorEventData
} from '../../../../../src/agent/streaming/events/stream-event-payloads.js';
import { AgentStatus } from '../../../../../src/agent/status/status-enum.js';

describe('ArtifactPersistedData', () => {
  it('creates with valid fields', () => {
    const data = {
      artifact_id: 'art_123',
      path: '/tmp/file.txt',
      agent_id: 'agent_001',
      type: 'file'
    };
    const payload = new ArtifactPersistedData(data);
    expect(payload.artifact_id).toBe('art_123');
    expect(payload.path).toBe('/tmp/file.txt');
    expect(payload.agent_id).toBe('agent_001');
    expect(payload.type).toBe('file');
  });

  it('keeps extra fields', () => {
    const data = {
      artifact_id: 'art_123',
      status: 'saved',
      path: '/tmp/file.txt',
      agent_id: 'agent_001',
      type: 'file'
    };
    const payload = new ArtifactPersistedData(data);
    expect(payload.artifact_id).toBe('art_123');
    expect(payload.status).toBe('saved');
  });

  it('factory creates payload', () => {
    const data = {
      artifact_id: 'art_123',
      path: '/tmp/file.txt',
      agent_id: 'agent_001',
      type: 'file'
    };
    const payload = createArtifactPersistedData(data);
    expect(payload).toBeInstanceOf(ArtifactPersistedData);
    expect(payload.path).toBe('/tmp/file.txt');
  });

  it('throws when required fields are missing', () => {
    const data = {
      artifact_id: 'art_123',
      agent_id: 'agent_001',
      type: 'file'
    };
    expect(() => new ArtifactPersistedData(data)).toThrow(/path/);
  });
});

describe('ArtifactUpdatedData', () => {
  it('creates with valid fields', () => {
    const data = {
      path: '/tmp/file.txt',
      agent_id: 'agent_001',
      type: 'file'
    };
    const payload = new ArtifactUpdatedData(data);
    expect(payload.path).toBe('/tmp/file.txt');
    expect(payload.agent_id).toBe('agent_001');
    expect(payload.type).toBe('file');
  });

  it('factory creates payload', () => {
    const data = {
      path: '/tmp/file.txt',
      agent_id: 'agent_001',
      type: 'file'
    };
    const payload = createArtifactUpdatedData(data);
    expect(payload).toBeInstanceOf(ArtifactUpdatedData);
    expect(payload.path).toBe('/tmp/file.txt');
  });
});

describe('Stream payload factories', () => {
  it('creates AssistantChunkData from dict', () => {
    const payload = createAssistantChunkData({ content: 'Hello', is_complete: false });
    expect(payload).toBeInstanceOf(AssistantChunkData);
    expect(payload.content).toBe('Hello');
    expect(payload.is_complete).toBe(false);
  });

  it('creates ToDoListUpdateData with nested list', () => {
    const payload = createTodoListUpdateData({
      todos: [
        { description: 'Task 1', todo_id: '1', status: 'pending' },
        { description: 'Task 2', todo_id: '2', status: 'done' }
      ]
    });
    expect(payload).toBeInstanceOf(ToDoListUpdateData);
    expect(payload.todos).toHaveLength(2);
    expect(payload.todos[0].description).toBe('Task 1');
  });

  it('throws when todos is not a list', () => {
    expect(() => createTodoListUpdateData({ todos: 'not a list' })).toThrow(/Expected 'todos' to be a list/);
  });

  it('creates AgentStatusUpdateData', () => {
    const payload = createAgentStatusUpdateData({ new_status: AgentStatus.IDLE });
    expect(payload).toBeInstanceOf(AgentStatusUpdateData);
    expect(payload.new_status).toBe(AgentStatus.IDLE);
  });

  it('creates ErrorEventData', () => {
    const payload = createErrorEventData({ source: 'test', message: 'error msg' });
    expect(payload).toBeInstanceOf(ErrorEventData);
    expect(payload.source).toBe('test');
    expect(payload.message).toBe('error msg');
  });
});
