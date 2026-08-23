import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
} from '../../autobyteus-application-sdk-contracts/dist/index.js';
import {
  createApplicationClient,
  createApplicationBackendMountTransport,
} from '../dist/index.js';
import { composeApplicationWebSocketUrl } from '../dist/application-websocket-url.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const createSocket = () => {
  const listeners = new Map();
  const sent = [];
  const socket = {
    binaryType: '',
    sent,
    closeCalls: [],
    addEventListener(type, listener) { const set = listeners.get(type) ?? new Set(); set.add(listener); listeners.set(type, set); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    send(value) { sent.push(value); },
    close(code = 1000, reason = '') { this.closeCalls.push({ code, reason }); },
    emit(type, event = {}) { for (const listener of listeners.get(type) ?? []) listener(event); },
  };
  return socket;
};

const createTransport = (overrides = {}) => createApplicationBackendMountTransport({
  backendBaseUrl: 'http://node/rest/applications/app/backend',
  backendNotificationsUrl: null,
  backendWebSocketBaseUrl: 'ws://node/ws/applications/app/backend/routes',
  agentCommunicationWebSocketBaseUrl: 'ws://node/ws/applications/app/agent-communication',
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '', headers: { get: () => 'application/json' } }),
  ...overrides,
});

test('application client exposes the exact capability groups and notification sibling', () => {
  const notificationHandle = { close() {} };
  const transport = {
    invokeQuery: async () => null,
    invokeCommand: async () => null,
    executeGraphql: async () => null,
    connectAgentCommunication: () => null,
    subscribeNotifications: ({ applicationId, listener }) => {
      assert.equal(applicationId, 'app');
      assert.equal(typeof listener, 'function');
      return notificationHandle;
    },
  };
  const client = createApplicationClient({ applicationId: 'app', transport });

  assert.deepEqual(Object.keys(client).sort(), ['agentCommunication', 'backend', 'getApplicationInfo', 'notifications']);
  assert.deepEqual(Object.keys(client.backend).sort(), ['command', 'connectWebSocket', 'graphql', 'query', 'route']);
  assert.deepEqual(Object.keys(client.notifications), ['subscribe']);
  assert.deepEqual(Object.keys(client.agentCommunication), ['connect']);
  assert.equal('subscribeNotifications' in client.backend, false);
  assert.equal(client.notifications.subscribe(() => undefined), notificationHandle);
});

test('canonical WebSocket URL composition appends ordered business query values', () => {
  assert.equal(
    composeApplicationWebSocketUrl({
      baseUrl: 'wss://node/base',
      pathSegments: ['binding/one', 'targets', 'agent-run'],
      query: { room: ['one', 'two'] },
    }),
    'wss://node/base/binding%2Fone/targets/agent-run?room=one&room=two',
  );
});

test('standard agent connection derives the fixed target URL, opens on exact READY, and correlates input', async () => {
  const socket = createSocket();
  let openedUrl = '';
  const address = { bindingId: 'binding/one', target: { kind: 'AGENT_TEAM_MEMBER', agentRunId: 'reviewer two' } };
  const connection = createTransport({
    agentCommunicationWebSocketFactory: (url) => { openedUrl = url; return socket; },
  }).connectAgentCommunication(address);
  assert.equal(connection.state, 'connecting');
  assert.equal(openedUrl, 'ws://node/ws/applications/app/agent-communication/binding%2Fone/targets/agent-team-member/reviewer%20two');
  socket.emit('message', { data: JSON.stringify({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: 'READY', address }) });
  await connection.ready;
  assert.equal(connection.state, 'open');
  const accepted = connection.sendInput({ text: 'continue' });
  const input = JSON.parse(socket.sent.at(-1));
  assert.equal(input.type, 'INPUT');
  socket.emit('message', { data: JSON.stringify({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: 'INPUT_ACCEPTED', requestId: input.requestId }) });
  await accepted;
});

test('standard establishment failure settles ready, error, and close once', async () => {
  const socket = createSocket();
  const address = { bindingId: 'binding-1', target: { kind: 'AGENT_RUN' } };
  const connection = createTransport({ agentCommunicationWebSocketFactory: () => socket }).connectAgentCommunication(address);
  const observed = [];
  connection.onError((error) => observed.push(`error:${error.code}`));
  connection.onClose((close) => observed.push(`close:${close.reason}`));
  socket.emit('message', { data: JSON.stringify({
    protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
    type: 'ERROR',
    error: { code: 'TARGET_NOT_AVAILABLE', message: 'The application agent target is not available.', recoverable: true },
  }) });
  socket.emit('message', { data: JSON.stringify({
    protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
    type: 'CLOSED',
    close: { reason: 'ESTABLISHMENT_FAILED' },
  }) });
  await assert.rejects(connection.ready, { code: 'TARGET_NOT_AVAILABLE' });
  await tick();
  assert.deepEqual(observed, ['error:TARGET_NOT_AVAILABLE', 'close:ESTABLISHMENT_FAILED']);
  assert.equal(connection.state, 'closed');
});

test('standard connection accepts exact events and rejects malformed nested payloads', async () => {
  const socket = createSocket();
  const address = { bindingId: 'binding-1', target: { kind: 'AGENT_RUN' } };
  const connection = createTransport({ agentCommunicationWebSocketFactory: () => socket }).connectAgentCommunication(address);
  const observedEvents = [];
  const observedErrors = [];
  connection.onEvent((event) => observedEvents.push(event));
  connection.onError((error) => observedErrors.push(error.code));
  socket.emit('message', { data: JSON.stringify({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: 'READY', address }) });
  await connection.ready;
  const event = (sequence, publicEvent) => ({
    sequence,
    observedAt: '2026-07-21T00:00:00.000Z',
    applicationId: 'app',
    address,
    runtimeSubject: 'AGENT_RUN',
    producer: {
      agentRunId: 'run-1',
      displayName: null,
      runtimeKind: 'AGENT',
    },
    event: publicEvent,
  });
  const exactEvents = [
    event(1, { type: 'TURN_STARTED' }),
    event(2, { type: 'TEXT_DELTA', delta: ' exact \n' }),
    event(3, { type: 'TURN_COMPLETED' }),
    event(4, { type: 'TURN_INTERRUPTED' }),
    event(5, { type: 'ERROR', message: 'Provider request limit reached.' }),
  ];
  for (const exactEvent of exactEvents) {
    socket.emit('message', { data: JSON.stringify({
      protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
      type: 'EVENT',
      event: exactEvent,
    }) });
  }
  await tick();
  assert.deepEqual(observedEvents, exactEvents);

  socket.emit('message', { data: JSON.stringify({
    protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
    type: 'EVENT',
    event: event(6, { type: 'AGENT_RESPONSE_COMPLETED', content: 'removed' }),
  }) });
  await tick();
  assert.deepEqual(observedEvents, exactEvents);
  assert.deepEqual(observedErrors, ['PROTOCOL_ERROR']);
  assert.deepEqual(socket.closeCalls.at(-1), { code: 1002, reason: 'Protocol error' });
});

test('standard connection rejects removed event shapes, nullable producers, and extra fields', async () => {
  const address = { bindingId: 'binding-1', target: { kind: 'AGENT_RUN' } };
  const producer = {
    agentRunId: 'run-1',
    displayName: null,
    runtimeKind: 'AGENT',
  };
  const envelope = (event, overrides = {}) => ({
    sequence: 1,
    observedAt: '2026-07-21T00:00:00.000Z',
    applicationId: 'app',
    address,
    runtimeSubject: 'AGENT_RUN',
    producer,
    event,
    ...overrides,
  });
  const malformedEvents = [
    envelope({ type: 'SEGMENT_CONTENT', delta: 'removed' }),
    envelope({ type: 'AGENT_RESPONSE_COMPLETED', content: 'removed' }),
    envelope({ type: 'ASSISTANT_COMPLETE', content: 'removed' }),
    envelope({ type: 'TOOL_EXECUTION_STARTED', toolName: 'publish_artifacts' }),
    envelope({ type: 'TEAM_STATUS', status: 'IDLE' }),
    envelope({ type: 'TEXT_DELTA', delta: 'valid', providerThreadId: 'secret' }),
    envelope({
      type: 'ERROR',
      message: 'Provider request limit reached.',
      providerStatus: 429,
      providerCode: 'rate_limit',
      providerRequestId: 'request-123',
      details: 'safe diagnostic detail',
    }),
    envelope({ type: 'TURN_COMPLETED', content: 'not allowed' }),
    envelope({ type: 'TURN_STARTED' }, { producer: null }),
  ];

  for (const malformedEvent of malformedEvents) {
    const socket = createSocket();
    const connection = createTransport({ agentCommunicationWebSocketFactory: () => socket })
      .connectAgentCommunication(address);
    const errors = [];
    connection.onError((error) => errors.push(error.code));
    socket.emit('message', { data: JSON.stringify({
      protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
      type: 'READY',
      address,
    }) });
    await connection.ready;
    socket.emit('message', { data: JSON.stringify({
      protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
      type: 'EVENT',
      event: malformedEvent,
    }) });
    await tick();
    assert.deepEqual(errors, ['PROTOCOL_ERROR']);
    assert.deepEqual(socket.closeCalls.at(-1), { code: 1002, reason: 'Protocol error' });
  }
});

test('standard connection rejects unsupported frames and unserializable or oversized input safely', async () => {
  const malformedSocket = createSocket();
  const address = { bindingId: 'binding-1', target: { kind: 'AGENT_RUN' } };
  const malformedConnection = createTransport({ agentCommunicationWebSocketFactory: () => malformedSocket })
    .connectAgentCommunication(address);
  malformedSocket.emit('message', { data: JSON.stringify({
    protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL,
    type: 'READY_V2',
    address,
  }) });
  await assert.rejects(malformedConnection.ready, { code: 'PROTOCOL_ERROR' });
  assert.deepEqual(malformedSocket.closeCalls, [{ code: 1002, reason: 'Protocol error' }]);

  const socket = createSocket();
  const connection = createTransport({ agentCommunicationWebSocketFactory: () => socket }).connectAgentCommunication(address);
  socket.emit('message', { data: JSON.stringify({ protocol: APPLICATION_AGENT_COMMUNICATION_PROTOCOL, type: 'READY', address }) });
  await connection.ready;
  const cyclicInput = { text: 'continue' };
  cyclicInput.metadata = { cyclicInput };
  await assert.rejects(connection.sendInput(cyclicInput), { code: 'INPUT_REJECTED' });
  await assert.rejects(connection.sendInput({ text: 'x'.repeat(1024 * 1024) }), { code: 'INPUT_REJECTED' });
  assert.deepEqual(socket.sent, []);
  assert.equal(connection.state, 'open');
});

test('custom backend WebSocket hides readiness', async () => {
  const socket = createSocket();
  const messages = [];
  const connection = createTransport({ applicationWebSocketFactory: () => socket }).connectWebSocket('/rooms/one');
  connection.onMessage((frame) => messages.push(frame));
  socket.emit('message', { data: JSON.stringify({ protocol: 'autobyteus.application-backend.websocket.v1', type: 'CONNECTION_READY' }) });
  await connection.ready;
  socket.emit('message', { data: 'business' });
  await tick();
  assert.deepEqual(messages, [{ kind: 'text', text: 'business' }]);
});
